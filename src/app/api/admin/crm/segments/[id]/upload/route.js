import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';

// Upload a CSV/text file of contacts for a specific segment.
// Replaces all existing members of that segment with the rows from the file.
//
// The file must have "Name" and "Phone" columns (case-insensitive header match).
// Delimiter is auto-detected (tab, comma, or semicolon) from the header line.
// Phone numbers are normalized to digits only. Excel scientific-notation values
// (e.g. "9.95574E+11") are converted back to full numbers.
//
// Auth: requires the "apartments" permission (same as broadcast).

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

// Segment id format: "1500-2000-2" (composite id from the segments API)
function parseSegmentId(id) {
    const parts = String(id).split('-');
    if (parts.length !== 3) return null;
    const minBudget = Number(parts[0]);
    const maxBudget = parts[1] === 'plus' || parts[1] === 'null' ? null : Number(parts[1]);
    const minBedrooms = Number(parts[2]);
    if (!Number.isFinite(minBudget) || !Number.isFinite(minBedrooms)) return null;
    return { minBudget, maxBudget, minBedrooms };
}

function normalizePhone(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    // Handle Excel scientific notation: "9.95574E+11" -> "995574000000"
    if (/^\d+\.?\d*[eE]\+?\d+$/.test(s)) {
        const n = Number(s);
        if (Number.isFinite(n)) s = n.toFixed(0);
    }
    return s.replace(/\D/g, '');
}

// Auto-detect the delimiter from the header line.
function detectDelimiter(header) {
    const tab = (header.match(/\t/g) || []).length;
    const comma = (header.match(/,/g) || []).length;
    const semi = (header.match(/;/g) || []).length;
    if (tab >= comma && tab >= semi && tab > 0) return '\t';
    if (semi >= comma && semi > 0) return ';';
    return ',';
}

function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

    const nameIdx = headers.findIndex((h) => h === 'name' || h.startsWith('name'));
    const phoneIdx = headers.findIndex(
        (h) => h === 'phone' || h === 'whatsapp_number' || h === 'whatsapp' || h.startsWith('phone') || h.startsWith('whatsapp')
    );

    if (nameIdx === -1 || phoneIdx === -1) {
        return { headers, rows: [], missingColumns: true };
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter);
        rows.push({
            name: (cols[nameIdx] || '').trim(),
            phone: (cols[phoneIdx] || '').trim(),
        });
    }

    return { headers, rows, missingColumns: false };
}

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'apartments');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    const { id } = await params;
    const criteria = parseSegmentId(id);
    if (!criteria) {
        return NextResponse.json({ success: false, message: 'Invalid segment ID' }, { status: 400 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
        }

        if (file.size > MAX_FILE_BYTES) {
            return NextResponse.json({ success: false, message: 'File too large (max 5 MB)' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const text = buffer.toString('utf8');
        const parsed = parseCsv(text);

        if (parsed.missingColumns) {
            return NextResponse.json(
                { success: false, message: 'CSV must have "Name" and "Phone" columns' },
                { status: 400 }
            );
        }

        if (parsed.rows.length === 0) {
            return NextResponse.json({ success: false, message: 'No data rows found in file' }, { status: 400 });
        }

        const supabase = serviceClient();

        // Resolve composite id to the actual segment UUID.
        const { data: segments, error: segErr } = await supabase
            .from('candidate_segments')
            .select('id, min_budget, max_budget, min_bedrooms');
        if (segErr) throw segErr;

        const segment = (segments || []).find(
            (s) =>
                Number(s.min_budget) === criteria.minBudget &&
                (s.max_budget === null ? criteria.maxBudget === null : Number(s.max_budget) === criteria.maxBudget) &&
                Number(s.min_bedrooms) === criteria.minBedrooms
        );

        if (!segment) {
            return NextResponse.json({ success: false, message: 'Segment not found' }, { status: 404 });
        }

        // Build member rows from the parsed CSV.
        const now = new Date().toISOString();
        const members = [];
        let skipped = 0;

        for (const row of parsed.rows) {
            const phone = normalizePhone(row.phone);
            if (phone.length < 7) {
                skipped++;
                continue;
            }
            members.push({
                segment_id: segment.id,
                phone,
                name: row.name || 'Unknown',
                email: null,
                zoko_customer_id: null,
                tags: null,
                is_archived: false,
                last_sync_at: now,
                zoko_sync_batch_id: 'csv-upload',
            });
        }

        if (members.length === 0) {
            return NextResponse.json(
                { success: false, message: `No valid contacts found (${skipped} rows skipped)` },
                { status: 400 }
            );
        }

        // Dedupe by phone — the candidate_segment_members table has a
        // UNIQUE(segment_id, phone) constraint, so duplicate phones in the
        // CSV would abort the insert (after the delete already ran).
        const seenPhones = new Set();
        const deduped = [];
        for (const m of members) {
            if (seenPhones.has(m.phone)) {
                skipped++;
                continue;
            }
            seenPhones.add(m.phone);
            deduped.push(m);
        }

        if (deduped.length === 0) {
            return NextResponse.json(
                { success: false, message: `No valid contacts found (${skipped} rows skipped)` },
                { status: 400 }
            );
        }

        // Replace: delete all existing members for this segment, then insert new ones.
        const { error: delErr } = await supabase
            .from('candidate_segment_members')
            .delete()
            .eq('segment_id', segment.id);
        if (delErr) throw delErr;

        const { error: insErr } = await supabase.from('candidate_segment_members').insert(deduped);
        if (insErr) throw insErr;

        return NextResponse.json({
            success: true,
            imported: deduped.length,
            skipped,
            totalRows: parsed.rows.length,
            message: `Imported ${deduped.length} contact${deduped.length === 1 ? '' : 's'}${skipped > 0 ? ` (skipped ${skipped})` : ''}`,
        });
    } catch (err) {
        return failed('crm/segments/upload POST', err, 'Failed to upload CSV');
    }
}