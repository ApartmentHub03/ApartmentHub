import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { phoneCandidates, phoneKey } from '@/services/crmApplications';

// Manual document upload by a CRM agent. Files received via WhatsApp or email
// can be attached to a tenant's dossier directly from the ApplicationDetailView,
// without the tenant having to upload them through the /aanvraag form.
//
// Two-phase upload to bypass the Vercel serverless 4.5MB body limit:
//   Phase 1 (sign): POST JSON { filename, contentType, persoonId, docType, replace }
//     → validates persoon + builds storage path → returns { uploadUrl, path, ... }
//   Phase 2 (upload): client PUTs raw file to uploadUrl (Supabase Storage)
//   Phase 3 (finalize): POST JSON { path, name, persoonId, docType, replace, canonicalPhone }
//     → inserts documenten row + deletes old rows if replace=true
//
// The file is stored in the `dossier-documents` bucket under the same
// {phoneDigits}/{subFolder}{docType}_{timestamp}.{ext} convention used by the
// tenant-facing upload path, so the ZIP builder and signed-URL logic pick it
// up automatically. A `documenten` row is inserted with status='ontvangen',
// which fires the sync_accounts_from_dossier_data() trigger to refresh
// accounts.documents / accounts.documentation_status.

const BUCKET = 'dossier-documents';

// Sub-folder per role, matching buildStoragePath in documentStorageService.js.
function subFolderForRole(rol) {
    if (rol === 'Medehuurder') return 'co-tenant/';
    if (rol === 'Garantsteller') return 'guarantor/';
    return '';
}

function safeExt(name) {
    const dot = String(name || '').lastIndexOf('.');
    if (dot <= 0) return 'bin';
    return String(name).slice(dot + 1).replace(/[^A-Za-z0-9]/g, '').toLowerCase().slice(0, 10) || 'bin';
}

function safeType(s) {
    return String(s || 'document').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^-+|-+$/g, '').slice(0, 60) || 'document';
}

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'candidates');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const body = await request.json();
        const supabase = serviceClient();

        // ---- Phase 3: finalize ----
        if (body.path && body.name) {
            const persoonId = body.persoonId;
            const docType = body.docType;
            const replace = String(body.replace || '').toLowerCase() === 'true';
            const canonicalPhone = body.canonicalPhone || null;

            if (!persoonId || !isUuid(persoonId)) {
                return NextResponse.json({ success: false, message: 'A valid persoonId is required' }, { status: 400 });
            }
            if (!docType) {
                return NextResponse.json({ success: false, message: 'docType is required' }, { status: 400 });
            }

            // Re-validate persoon belongs to this account.
            const { data: persoon } = await supabase
                .from('personen').select('id, dossier_id, rol, type').eq('id', persoonId).maybeSingle();
            if (!persoon) return NextResponse.json({ success: false, message: 'Person not found' }, { status: 404 });

            // If replace, delete existing rows of this type.
            if (replace) {
                await supabase.from('documenten').delete().eq('persoon_id', persoonId).eq('type', docType);
            }

            // Insert the documenten row.
            const { error: insertErr } = await supabase.from('documenten').insert({
                persoon_id: persoonId,
                type: docType,
                bestandspad: body.path,
                bestandsnaam: body.name || null,
                status: 'ontvangen',
                phone_number: canonicalPhone,
            });
            if (insertErr) throw insertErr;

            return NextResponse.json({ success: true, path: body.path });
        }

        // ---- Phase 1: sign ----
        const { filename, persoonId, docType, replace } = body;
        if (!persoonId || !isUuid(persoonId)) {
            return NextResponse.json({ success: false, message: 'A valid persoonId is required' }, { status: 400 });
        }
        if (!docType) {
            return NextResponse.json({ success: false, message: 'docType is required' }, { status: 400 });
        }

        // 1. Load the account to get the canonical phone number.
        const { data: account, error: accErr } = await supabase
            .from('accounts').select('whatsapp_number').eq('id', id).maybeSingle();
        if (accErr) throw accErr;
        if (!account) return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 });

        // 2. Load the persoon row, validating it belongs to a dossier reachable
        //    from this account (by phone).
        const { data: persoon, error: pErr } = await supabase
            .from('personen').select('id, dossier_id, rol, type').eq('id', persoonId).maybeSingle();
        if (pErr) throw pErr;
        if (!persoon) return NextResponse.json({ success: false, message: 'Person not found' }, { status: 404 });

        // Confirm the dossier's phone matches the account.
        const { data: dossier } = await supabase
            .from('dossiers').select('phone_number').eq('id', persoon.dossier_id).maybeSingle();
        const phoneMatches = dossier && phoneCandidates(account.whatsapp_number).includes(dossier.phone_number);
        if (!phoneMatches) {
            const accDigits = phoneKey(account.whatsapp_number);
            const dosDigits = phoneKey(dossier?.phone_number || '');
            if (!accDigits || !dosDigits || accDigits !== dosDigits) {
                return NextResponse.json({ success: false, message: 'This person does not belong to this application' }, { status: 400 });
            }
        }

        // 3. Resolve the canonical phone for the storage path.
        let folderPhone = phoneKey(account.whatsapp_number);
        const rol = persoon.rol || (persoon.type === 'guarantor' ? 'Garantsteller' : persoon.type === 'co_tenant' ? 'Medehuurder' : 'Hoofdhuurder');
        if (rol !== 'Hoofdhuurder') {
            const { data: mainPersoon } = await supabase
                .from('personen').select('telefoon').eq('dossier_id', persoon.dossier_id)
                .or('rol.eq.Hoofdhuurder,type.eq.tenant').limit(1);
            const mainDigits = phoneKey(mainPersoon?.[0]?.telefoon || '');
            if (mainDigits) folderPhone = mainDigits;
        }

        // 4. Build the storage path.
        const sub = subFolderForRole(rol);
        const typeKey = safeType(docType);
        const ext = safeExt(filename || 'document');
        const path = `${folderPhone}/${sub}${typeKey}_${Date.now()}.${ext}`;

        // 5. Create a signed upload URL.
        const { data: signData, error: signErr } = await supabase.storage
            .from(BUCKET).createSignedUploadUrl(path);
        if (signErr) throw signErr;

        const canonicalPhone = dossier?.phone_number || `+${phoneKey(account.whatsapp_number)}`;

        return NextResponse.json({
            success: true,
            path,
            uploadUrl: signData.signedUrl,
            token: signData.token || null,
            canonicalPhone,
            // Echo back the validated params so the client can pass them in
            // the finalize call without re-sending them.
            persoonId,
            docType,
            replace: String(replace || '').toLowerCase() === 'true',
        });
    } catch (err) {
        return failed('crm/application upload-document POST', err, 'Failed to upload document');
    }
}