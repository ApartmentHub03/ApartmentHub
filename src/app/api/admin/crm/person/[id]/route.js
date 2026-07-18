import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { storagePath } from '@/services/crmApplications';

// Remove a co-tenant or guarantor from a dossier.
//
// Main tenants (Hoofdhuurder / type=tenant) are blocked — removing them would
// cascade-delete the entire dossier (personen → documenten via ON DELETE
// CASCADE). That is too destructive for a CRM button.
//
// Cleanup steps:
//   1. Block if the person is a main tenant.
//   2. Collect their document storage paths (bestandspad / file_path).
//   3. Delete the personen row (CASCADE removes documenten rows automatically).
//   4. Remove their files from the dossier-documents bucket.
//   5. Clean up accounts links (linked_account_id, account_role, co_tenants JSONB).

const BUCKET = 'dossier-documents';

function digits(s) {
    return String(s || '').replace(/\D/g, '');
}

export async function DELETE(request, { params }) {
    const auth = await requirePermission(request, 'candidates');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const supabase = serviceClient();

        // 1. Fetch the person and verify they're not a main tenant.
        const { data: person, error: personErr } = await supabase
            .from('personen')
            .select('id, dossier_id, rol, type, telefoon, voornaam, achternaam, naam')
            .eq('id', id)
            .maybeSingle();

        if (personErr) throw personErr;
        if (!person) {
            return NextResponse.json({ success: false, message: 'Person not found' }, { status: 404 });
        }

        const isMain = person.rol === 'Hoofdhuurder' || person.type === 'tenant';
        if (isMain) {
            return NextResponse.json(
                { success: false, message: 'Cannot remove a main tenant. This would delete the entire dossier.' },
                { status: 400 }
            );
        }

        // 2. Collect storage paths before deleting the row (CASCADE would wipe
        //    documenten and we'd lose the paths).
        const { data: docs } = await supabase
            .from('documenten')
            .select('bestandspad, file_path')
            .eq('persoon_id', id);

        const filePaths = (docs || [])
            .map((d) => storagePath(d.bestandspad || d.file_path))
            .filter(Boolean);

        // 3. Delete the personen row — ON DELETE CASCADE removes documenten.
        const { error: deleteErr } = await supabase
            .from('personen')
            .delete()
            .eq('id', id);

        if (deleteErr) throw deleteErr;

        // 4. Remove their files from storage (best-effort, non-blocking).
        if (filePaths.length > 0) {
            const { error: storageErr } = await supabase.storage
                .from(BUCKET)
                .remove(filePaths);
            if (storageErr) {
                console.warn('[crm/person DELETE] Storage cleanup error:', storageErr.message);
            }
        }

        // 5. Clean up accounts links:
        //    a) Any account whose linked_account_id points to the main tenant's
        //       account and matches this person's role → unlink.
        //    b) Remove this person from the main tenant's co_tenants JSONB.
        const personPhone = person.telefoon || null;
        const personName = [person.voornaam, person.achternaam].filter(Boolean).join(' ').trim() || person.naam || null;

        // Find the main tenant's dossier owner account.
        const { data: dossier } = await supabase
            .from('dossiers')
            .select('phone_number')
            .eq('id', person.dossier_id)
            .maybeSingle();

        if (dossier?.phone_number) {
            // Find the main tenant's account by phone.
            const { data: mainAccount } = await supabase
                .from('accounts')
                .select('id, co_tenants')
                .eq('whatsapp_number', dossier.phone_number)
                .maybeSingle();

            if (mainAccount) {
                // a) Unlink any co-tenant/guarantor accounts that were linked to
                //    this main account and match this person's phone.
                if (personPhone) {
                    const { data: linkedAccounts } = await supabase
                        .from('accounts')
                        .select('id, whatsapp_number, account_role')
                        .eq('linked_account_id', mainAccount.id);

                    for (const la of linkedAccounts || []) {
                        if (digits(la.whatsapp_number) === digits(personPhone)) {
                            await supabase
                                .from('accounts')
                                .update({ linked_account_id: null, account_role: null })
                                .eq('id', la.id);
                        }
                    }
                }

                // b) Remove this person from co_tenants JSONB.
                if (Array.isArray(mainAccount.co_tenants) && mainAccount.co_tenants.length > 0) {
                    const updated = mainAccount.co_tenants.filter((ct) => {
                        const ctDigits = digits(ct?.phone || ct?.whatsapp_number || ct?.whatsapp || '');
                        const ctName = (ct?.name || ct?.tenant_name || '').toLowerCase().trim();
                        const matchesPhone = personPhone && ctDigits && ctDigits === digits(personPhone);
                        const matchesName = personName && ctName && ctName === personName.toLowerCase();
                        return !matchesPhone && !matchesName;
                    });

                    if (updated.length !== mainAccount.co_tenants.length) {
                        await supabase
                            .from('accounts')
                            .update({ co_tenants: updated })
                            .eq('id', mainAccount.id);
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return failed('crm/person DELETE', err, 'Failed to remove person');
    }
}