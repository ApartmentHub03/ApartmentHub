import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { phoneCandidates } from '@/services/crmApplications';
import { analyzeCandidateProfile } from '@/app/lib/candidate-profile';

// Analyze a candidate's uploaded documents with Claude and return a structured
// profile (name, job, income, nationality) + auto-generated bio paragraphs.
// Optionally accepts a linkedin_url for profession inference when docs are
// missing. Results are cached on dossiers.ai_profile + ai_profile_at.
//
// Auth: requires the "candidates" permission.
// Body: { account_id } OR { tenant_phone }. Optional { linkedin_url }.

export const maxDuration = 60;

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'candidates');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const body = await request.json();
        const { tenant_phone, account_id, linkedin_url } = body || {};

        // 1. Resolve candidate phone.
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

        // 2. Fetch dossier by phone.
        const { data: dossierRows } = await supabase
            .from('dossiers')
            .select('id, ai_profile, ai_profile_at, linkedin_url, candidate_bio, guarantor_bio')
            .in('phone_number', phoneCandidates(phone))
            .order('created_at', { ascending: false })
            .limit(1);
        const dossier = dossierRows?.[0] || null;
        if (!dossier) {
            return NextResponse.json({ success: false, message: 'No dossier found for this candidate' }, { status: 404 });
        }

        const linkedinUrl = typeof linkedin_url === 'string' ? linkedin_url.trim() || null : null;

        // 3. Run the analysis.
        const result = await analyzeCandidateProfile({
            dossierId: dossier.id,
            phone,
            linkedinUrl,
        });

        // 4. Persist results to the dossier.
        const update = {
            ai_profile: result.profile,
            ai_profile_at: new Date().toISOString(),
        };
        if (linkedinUrl !== undefined) {
            update.linkedin_url = linkedinUrl;
        }
        // Only persist bios if the analysis produced them AND the dossier
        // doesn't already have manually-written bios. This prevents the
        // "Analyze documents" button from overwriting agent-typed bios in
        // the DB even though the UI correctly guards against overwriting
        // the textareas.
        const existingCandidateBio = dossier?.candidate_bio || '';
        const existingGuarantorBio = dossier?.guarantor_bio || '';
        if (result.candidate_bio && !existingCandidateBio.trim()) {
            update.candidate_bio = result.candidate_bio;
        }
        if (result.guarantor_bio && !existingGuarantorBio.trim()) {
            update.guarantor_bio = result.guarantor_bio;
        }

        const { error: updateErr } = await supabase
            .from('dossiers')
            .update(update)
            .eq('id', dossier.id);
        if (updateErr) {
            console.error('[analyze-candidate] persist failed (continuing):', updateErr);
        }

        return NextResponse.json({
            success: true,
            profile: result.profile,
            candidate_bio: result.candidate_bio,
            guarantor_bio: result.guarantor_bio,
            gaps: result.gaps,
            sources: result.profile?.sources || [],
            error: result.error || null,
            dossier_id: dossier.id,
        });
    } catch (err) {
        return failed('crm/analyze-candidate POST', err, 'Failed to analyze candidate documents');
    }
}