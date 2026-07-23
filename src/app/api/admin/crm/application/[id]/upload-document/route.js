import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { phoneCandidates, phoneKey } from '@/services/crmApplications';

// Manual document upload by a CRM agent. Files received via WhatsApp or email
// can be attached to a tenant's dossier directly from the ApplicationDetailView,
// without the tenant having to upload them through the /aanvraag form.
//
// POST (multipart/form-data):
//   file       — the file to upload (any type)
//   persoonId  — UUID of the personen row this document belongs to
//   docType    — document type key (e.g. 'id_bewijs') or free-text label
//   replace    — 'true' to delete existing rows of this type for this persoon
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
        const form = await request.formData();
        const file = form.get('file');
        const persoonId = form.get('persoonId');
        const docType = form.get('docType');
        const replace = String(form.get('replace') || '').toLowerCase() === 'true';

        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
        }
        if (!persoonId || !isUuid(persoonId)) {
            return NextResponse.json({ success: false, message: 'A valid persoonId is required' }, { status: 400 });
        }
        if (!docType) {
            return NextResponse.json({ success: false, message: 'docType is required' }, { status: 400 });
        }

        const supabase = serviceClient();

        // 1. Load the account to get the canonical phone number.
        const { data: account, error: accErr } = await supabase
            .from('accounts').select('whatsapp_number').eq('id', id).maybeSingle();
        if (accErr) throw accErr;
        if (!account) return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 });

        // 2. Load the persoon row, validating it belongs to a dossier reachable
        //    from this account (by phone). This prevents an agent from uploading
        //    to a random persoonId that doesn't belong to the open application.
        const { data: persoon, error: pErr } = await supabase
            .from('personen').select('id, dossier_id, rol, type').eq('id', persoonId).maybeSingle();
        if (pErr) throw pErr;
        if (!persoon) return NextResponse.json({ success: false, message: 'Person not found' }, { status: 404 });

        // Confirm the dossier's phone matches the account.
        const { data: dossier } = await supabase
            .from('dossiers').select('phone_number').eq('id', persoon.dossier_id).maybeSingle();
        const phoneMatches = dossier && phoneCandidates(account.whatsapp_number).includes(dossier.phone_number);
        if (!phoneMatches) {
            // The digits must match at minimum — phone format may differ.
            const accDigits = phoneKey(account.whatsapp_number);
            const dosDigits = phoneKey(dossier?.phone_number || '');
            if (!accDigits || !dosDigits || accDigits !== dosDigits) {
                return NextResponse.json({ success: false, message: 'This person does not belong to this application' }, { status: 400 });
            }
        }

        // 3. Resolve the canonical phone for the storage path. Co-tenants and
        //    guarantors are stored under the main tenant's phone folder, matching
        //    the tenant-facing upload path. We look up the main tenant's phone
        //    from the dossier.
        let folderPhone = phoneKey(account.whatsapp_number);
        const rol = persoon.rol || (persoon.type === 'guarantor' ? 'Garantsteller' : persoon.type === 'co_tenant' ? 'Medehuurder' : 'Hoofdhuurder');
        if (rol !== 'Hoofdhuurder') {
            const { data: mainPersoon } = await supabase
                .from('personen').select('telefoon').eq('dossier_id', persoon.dossier_id)
                .or('rol.eq.Hoofdhuurder,type.eq.tenant').limit(1);
            const mainDigits = phoneKey(mainPersoon?.[0]?.telefoon || '');
            if (mainDigits) folderPhone = mainDigits;
        }

        // 4. Build the storage path. A timestamp suffix prevents collisions when
        //    an agent uploads a second file to a slot that already has one.
        const sub = subFolderForRole(rol);
        const typeKey = safeType(docType);
        const ext = safeExt(file.name);
        const path = `${folderPhone}/${sub}${typeKey}_${Date.now()}.${ext}`;

        // 5. Upload to Storage.
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: upErr } = await supabase.storage
            .from(BUCKET).upload(path, buffer, {
                contentType: file.type || 'application/octet-stream',
                upsert: true,
            });
        if (upErr) throw upErr;

        // 6. If replace=true, delete existing documenten rows of this type for
        //    this persoon (mirrors /api/dossier/save-doc semantics).
        if (replace) {
            await supabase.from('documenten').delete().eq('persoon_id', persoonId).eq('type', docType);
        }

        // 7. Insert the documenten row. status='ontvangen' so the sync trigger
        //    counts it as received and flips accounts.documentation_status.
        const canonicalPhone = dossier?.phone_number || `+${phoneKey(account.whatsapp_number)}`;
        const { error: insertErr } = await supabase.from('documenten').insert({
            persoon_id: persoonId,
            type: docType,
            bestandspad: path,
            bestandsnaam: file.name || null,
            status: 'ontvangen',
            phone_number: canonicalPhone,
        });
        if (insertErr) throw insertErr;

        return NextResponse.json({ success: true, path });
    } catch (err) {
        return failed('crm/application upload-document POST', err, 'Failed to upload document');
    }
}