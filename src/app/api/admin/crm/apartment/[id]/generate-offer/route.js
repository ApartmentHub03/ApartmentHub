import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { phoneCandidates } from '@/services/crmApplications';
import { createDraft } from '@/lib/gmail/client';
import { renderOfferDraftEmail, deriveCandidateType } from '@/lib/email/offerDraftTemplate';
import { analyzeCandidateProfile } from '@/app/lib/candidate-profile';

// "Generate Offer" — creates a Gmail draft in the LOGGED-IN agent's mailbox,
// addressed to the apartment's real estate agent, presenting the candidate
// with the standard offer template (rent, deposit, start date, candidate bio,
// guarantor bio, per-agent signature with logo).
//
// Replaces the previous n8n-webhook flow: that workflow sent a WhatsApp from
// the agent's personal number (wrong sender) and had no Zoko template for an
// offer-to-tenant message. This route drafts the email for the agent to review
// and send manually — no automated send, no WhatsApp.
//
// Auth: requires the "candidates" permission. The logged-in crm_user's email
// is the Gmail mailbox the draft lands in (via Workspace domain-wide
// delegation — see src/lib/gmail/client.js for setup).
//
// Body: { account_id } OR { tenant_phone }. Optionally { candidate_bio,
// guarantor_bio } — if provided, they're upserted into the dossier row so the
// bio persists for next time. If omitted, the route reads whatever's stored
// (or falls back to a placeholder).

const ALLOWED_DOMAIN = process.env.GMAIL_DELEGATION_DOMAIN || 'apartmenthub.nl';

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'candidates');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    const crm = auth.crm; // { id, name, email, role, ... }

    // The Gmail draft is created in the logged-in agent's mailbox via
    // domain-wide delegation. Their crm_users.email MUST be an
    // @apartmenthub.nl (or configured domain) Workspace account — service
    // accounts can't impersonate accounts outside the delegated domain.
    if (!crm.email || !crm.email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
        return NextResponse.json({
            success: false,
            message: `Your CRM email (${crm.email || 'none'}) must be an @${ALLOWED_DOMAIN} Workspace account to use Generate offer.`,
        }, { status: 400 });
    }

    try {
    const body = await request.json();
    const { tenant_phone, account_id, candidate_bio, guarantor_bio, bid_amount, start_date } = body || {};

        // 1. Resolve candidate phone — accept either tenant_phone or account_id.
        let phone = null;
        let accountId = null;

        if (tenant_phone && typeof tenant_phone === 'string' && tenant_phone.trim() !== '') {
            phone = tenant_phone.trim();
        } else if (account_id && typeof account_id === 'string' && account_id.trim() !== '') {
            accountId = account_id.trim();
            const supabase = serviceClient();
            const { data: account, error: acctErr } = await supabase
                .from('accounts')
                .select('whatsapp_number')
                .eq('id', accountId)
                .maybeSingle();
            if (acctErr) throw acctErr;
            if (!account || !account.whatsapp_number) {
                return NextResponse.json({ success: false, message: 'Account not found or has no whatsapp_number' }, { status: 404 });
            }
            phone = account.whatsapp_number.trim();
        }

        if (!phone) {
            return NextResponse.json({ success: false, message: 'Either tenant_phone or account_id is required' }, { status: 400 });
        }

        const supabase = serviceClient();

        // 2. Apartment + real estate agent. Also fetch assigned_crm_user_id
        //    so we can fall back to the internal team member when no external
        //    realtor is linked (or the realtor has no email). This prevents the
        //    "no real estate agent email" 400 that blocked drafting on listings
        //    created without a realtor — the draft is still useful addressed to
        //    the assigned agent or to yourself for review/forwarding.
        const { data: apt, error: aptErr } = await supabase
            .from('apartments')
            .select('id, "Full Address", street, rental_price, real_estate_agent_id, assigned_crm_user_id')
            .eq('id', id)
            .maybeSingle();
        if (aptErr) throw aptErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        // Resolve the offer email recipient with a fallback chain:
        //   1. real_estate_agents row linked via real_estate_agent_id (external realtor)
        //   2. crm_users row linked via assigned_crm_user_id (internal team member)
        //   3. the logged-in agent's own email (draft to self)
        // Only 400 if all three are empty — effectively impossible since
        // crm_users.email is NOT NULL.
        let agent = null;
        let recipientSource = 'self';

        if (apt.real_estate_agent_id) {
            const { data: agentRow, error: agentErr } = await supabase
                .from('real_estate_agents')
                .select('id, name, contact_person_name, email')
                .eq('id', apt.real_estate_agent_id)
                .maybeSingle();
            if (agentErr) throw agentErr;
            if (agentRow && agentRow.email) {
                agent = agentRow;
                recipientSource = 'real_estate_agent';
            }
        }

        if (!agent && apt.assigned_crm_user_id) {
            const { data: assignedUser, error: assignedErr } = await supabase
                .from('crm_users')
                .select('id, name, email')
                .eq('id', apt.assigned_crm_user_id)
                .maybeSingle();
            if (assignedErr) throw assignedErr;
            if (assignedUser && assignedUser.email) {
                // Build a synthetic agent object so renderOfferDraftEmail's
                // agentName / agentEmail logic still works unchanged.
                agent = {
                    id: assignedUser.id,
                    name: assignedUser.name,
                    contact_person_name: assignedUser.name,
                    email: assignedUser.email,
                };
                recipientSource = 'assigned_crm_user';
            }
        }

        if (!agent) {
            // Final fallback: draft to the logged-in agent themselves. They can
            // fill in the real recipient in Gmail before sending. crm.email is
            // guaranteed by requirePermission and crm_users.email is NOT NULL,
            // so this should always succeed.
            if (!crm.email) {
                return NextResponse.json({
                    success: false,
                    message: 'No recipient available — set a real estate agent or assign a CRM user on the listing, or ensure your CRM account has an email.',
                }, { status: 400 });
            }
            agent = {
                id: crm.id,
                name: crm.name || 'there',
                contact_person_name: crm.name || crm.email,
                email: crm.email,
            };
            recipientSource = 'self';
        }

        // 3. Candidate account.
        let account = null;
        if (accountId) {
            const { data, error } = await supabase
                .from('accounts')
                .select('id, tenant_name, whatsapp_number, email, work_status')
                .eq('id', accountId)
                .maybeSingle();
            if (error) throw error;
            account = data;
        } else {
            const { data, error } = await supabase
                .from('accounts')
                .select('id, tenant_name, whatsapp_number, email, work_status')
                .eq('whatsapp_number', phone)
                .maybeSingle();
            if (error) throw error;
            account = data;
        }
        if (!account) {
            return NextResponse.json({ success: false, message: 'Candidate account not found' }, { status: 404 });
        }

        // 4. Dossier (by phone) + personen + latest bid.
        const phoneFilter = phoneCandidates(phone);
        const DOSSIER_COLS_FULL = 'id, bid_amount, start_date, motivation, months_advance, candidate_bio, guarantor_bio, linkedin_url';
        const DOSSIER_COLS_SAFE = 'id, bid_amount, start_date, motivation, months_advance, candidate_bio, guarantor_bio';
        let dossierRes = await supabase.from('dossiers').select(DOSSIER_COLS_FULL).in('phone_number', phoneFilter).order('created_at', { ascending: false }).limit(1);
        if (dossierRes.error) {
            dossierRes = await supabase.from('dossiers').select(DOSSIER_COLS_SAFE).in('phone_number', phoneFilter).order('created_at', { ascending: false }).limit(1);
        }
        const dossier = dossierRes.data?.[0] || null;
        const dossierId = dossier?.id || null;

        let personen = [];
        if (dossierId) {
            const { data: pRows, error: pErr } = await supabase
                .from('personen')
                .select('*')
                .eq('dossier_id', dossierId);
            if (pErr) throw pErr;
            personen = pRows || [];
        }

        let bidAmount = null;
        let startDate = null;
        if (dossierId) {
            const { data: bidRows } = await supabase
                .from('biedingen')
                .select('id, amount, start_date')
                .eq('dossier_id', dossierId)
                .order('created_at', { ascending: false })
                .limit(1);
            if (bidRows && bidRows.length > 0) {
                bidAmount = Number(bidRows[0].amount) || null;
                startDate = bidRows[0].start_date || null;
            } else if (dossier && dossier.bid_amount != null) {
                bidAmount = Number(dossier.bid_amount) || null;
                startDate = dossier.start_date || null;
            }
        }
        if (bidAmount == null && apt.rental_price != null) {
            // Fall back to the asking rent if the candidate hasn't bid yet.
            bidAmount = Number(apt.rental_price);
        }

        // Caller-provided overrides win over the dossier-derived values. The
        // Offers Out "Adjust Offer" flow edits the offers_sent entry (agent
        // counter-offer) — those edits are passed here so the Gmail draft
        // reflects the agent's negotiated amount, not the tenant's original bid.
        if (bid_amount != null) {
            const n = Number(bid_amount);
            if (Number.isFinite(n) && n >= 0) bidAmount = n;
        }
        if (typeof start_date === 'string' && start_date.trim() !== '') {
            startDate = start_date;
        }
        // motivation override is accepted but not rendered in the current
        // email template — kept for future use. The dossier's motivation is
        // not overwritten (agent counter-offer motivation lives in offers_sent).

        const deposit = bidAmount != null ? bidAmount * 2 : null;

        // 5. Persist the bios into the dossier if the caller passed them.
        //    Idempotent: only updates if the value actually differs (or the
        //    column is null). Keeps the bio reusable across apartments.
        let finalCandidateBio = candidate_bio ?? dossier?.candidate_bio ?? '';
        let finalGuarantorBio = guarantor_bio ?? dossier?.guarantor_bio ?? '';
        if (dossierId && (candidate_bio != null || guarantor_bio != null)) {
            const update = {};
            if (candidate_bio != null && candidate_bio !== (dossier?.candidate_bio || '')) {
                update.candidate_bio = candidate_bio;
            }
            if (guarantor_bio != null && guarantor_bio !== (dossier?.guarantor_bio || '')) {
                update.guarantor_bio = guarantor_bio;
            }
            if (Object.keys(update).length > 0) {
                const { error: bioErr } = await supabase
                    .from('dossiers')
                    .update(update)
                    .eq('id', dossierId);
                if (bioErr) console.error('[generate-offer] bio persist failed (continuing):', bioErr);
            }
        }

        // 5b. If both bios are still empty and we have a dossier, auto-analyze
        //     the candidate's documents with Claude to generate the profile and
        //     bio paragraphs. Agent-typed bios always take priority; this only
        //     fills when nobody has written them yet. Never throws — on failure
        //     we continue with empty bios (existing behavior).
        let aiProfileData = null;
        if (dossierId && !finalCandidateBio.trim() && !finalGuarantorBio.trim()) {
            try {
                const aiResult = await analyzeCandidateProfile({
                    dossierId,
                    phone,
                    linkedinUrl: dossier?.linkedin_url || null,
                });
                if (aiResult.candidate_bio) finalCandidateBio = aiResult.candidate_bio;
                if (aiResult.guarantor_bio) finalGuarantorBio = aiResult.guarantor_bio;
                aiProfileData = aiResult.profile;

                // Persist AI-generated bios + profile to the dossier for reuse.
                if (finalCandidateBio || finalGuarantorBio || aiProfileData) {
                    const aiUpdate = { ai_profile: aiProfileData, ai_profile_at: new Date().toISOString() };
                    if (aiResult.candidate_bio) aiUpdate.candidate_bio = aiResult.candidate_bio;
                    if (aiResult.guarantor_bio) aiUpdate.guarantor_bio = aiResult.guarantor_bio;
                    const { error: aiErr } = await supabase
                        .from('dossiers')
                        .update(aiUpdate)
                        .eq('id', dossierId);
                    if (aiErr) {
                        console.error('[generate-offer] AI profile persist failed, trying safe columns:', aiErr);
                        const safeAiUpdate = {};
                        if (aiResult.candidate_bio) safeAiUpdate.candidate_bio = aiResult.candidate_bio;
                        if (aiResult.guarantor_bio) safeAiUpdate.guarantor_bio = aiResult.guarantor_bio;
                        if (Object.keys(safeAiUpdate).length) {
                            const { error: safeErr } = await supabase.from('dossiers').update(safeAiUpdate).eq('id', dossierId);
                            if (safeErr) console.error('[generate-offer] safe persist also failed:', safeErr);
                        }
                    }
                }
            } catch (aiErr) {
                console.error('[generate-offer] AI analysis failed (continuing with empty bios):', aiErr);
            }
        }

        // 6. Resolve the sender's crm_users row (name + email + phone + address).
        //    `crm` from requirePermission already has name/email; we need phone +
        //    address too for the signature.
        const { data: senderRow, error: senderErr } = await supabase
            .from('crm_users')
            .select('id, name, email, phone, address')
            .eq('id', crm.id)
            .maybeSingle();
        if (senderErr) throw senderErr;
        const sender = senderRow || { name: crm.name, email: crm.email, phone: null, address: null };

        // 7. Derive candidate type from personen.
        const candidateType = deriveCandidateType(personen);

        // 8. Render + create the Gmail draft.
        const emailArgs = {
            agent,
            apartment: { address: apt['Full Address'] || apt.street || '' },
            candidate: { name: account.tenant_name || '' },
            rent: bidAmount,
            deposit,
            startDate,
            candidateType,
            candidateBio: finalCandidateBio,
            guarantorBio: finalGuarantorBio,
            sender,
        };
        const { to, subject, html } = renderOfferDraftEmail(emailArgs);

        let draft;
        try {
            draft = await createDraft(crm.email, { to, subject, html });
        } catch (gmailErr) {
            console.error('[generate-offer] Gmail draft creation failed:', gmailErr);
            const msg = gmailErr?.errors?.[0]?.message || gmailErr?.message || 'Gmail API error';
            return NextResponse.json({
                success: false,
                message: `Could not create Gmail draft: ${msg}. Check that the service account has domain-wide delegation for the gmail.compose scope in the Google Workspace Admin Console.`,
            }, { status: 502 });
        }

        return NextResponse.json({
            success: true,
            message: 'Draft created in your Gmail — review and send manually',
            draft_id: draft.id,
            draft_url: 'https://mail.google.com/mail/u/0/#drafts',
            apartment_id: id,
            account_id: account.id,
            to,
            subject,
            recipient_source: recipientSource,
            recipient_name: agent?.contact_person_name || agent?.name || '',
            ai_profile: aiProfileData,
        });
    } catch (err) {
        return failed('crm/generate-offer POST', err, 'Failed to generate offer draft');
    }
}