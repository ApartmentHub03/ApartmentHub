# Buy Lead Database + Apartment Matching + Automation Plan

## Current Status (June 2026)

### Implemented
- ✅ Phase 1: Database migrations for `koop_leads` and `waardebepaling_leads`
- ✅ BuyLead form inserts into `koop_leads` table
- ✅ Valuation form inserts into `waardebepaling_leads` table
- ✅ Both forms show a "thank you" confirmation page after submission

### Deferred — To be revised later
- ⏳ Phase 2: Apartment matching on the results page (no sale properties in DB yet)
- ⏳ Phase 3: n8n webhook automation (email via Resend + WhatsApp via Zoko)
- ⏳ Phase 4: Apartment matching algorithm (no `purchase_price` or `koop_properties` table exists)
- ⏳ Phase 5: Results page UI showing matching apartments
- ⏳ Phase 6: Agent dashboard for koop leads

### Why deferred
- The `apartments` table only has `rental_price` — it's for rentals, not sales
- There is no `koop_properties` or sale properties table yet
- There's no admin UI to add/list properties for sale
- Sale properties would need `asking_price`, `property_type`, sale-specific fields
- The matching algorithm, results page, and automation all depend on having sale properties data

---

## Phase 1: Database Migrations

### 1A. `koop_leads` table

**File:** `supabase/migrations/20260620000000_create_koop_leads.sql`

```sql
CREATE TABLE IF NOT EXISTS public.koop_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    journey TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    nationality TEXT DEFAULT 'Nederland',
    buyer_type TEXT,
    lives_in_nl TEXT,
    household TEXT,
    mortgage_status TEXT,
    budget TEXT,
    own_capital TEXT,
    neighborhoods TEXT[] DEFAULT '{}',
    other_neighborhood TEXT,
    min_bedrooms TEXT,
    property_type TEXT,
    min_sqm TEXT,
    must_haves TEXT[] DEFAULT '{}',
    timeline TEXT,
    city TEXT NOT NULL DEFAULT 'amsterdam',
    marketing_opt_in BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'gecontacteerd', 'bezichtiging_gepland', 'gekocht', 'gestopt')),
    agent_assigned TEXT,
    matched_apartment_ids UUID[] DEFAULT '{}',
    notes TEXT
);

ALTER TABLE public.koop_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can INSERT koop_leads"
    ON public.koop_leads FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_koop_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_koop_leads_updated_at
    BEFORE UPDATE ON public.koop_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_koop_leads_updated_at();

CREATE INDEX idx_koop_leads_email ON public.koop_leads(email);
CREATE INDEX idx_koop_leads_status ON public.koop_leads(status);
CREATE INDEX idx_koop_leads_created_at ON public.koop_leads(created_at DESC);
```

### 1B. `waardebepaling_leads` table

**File:** `supabase/migrations/20260620000001_create_waardebepaling_leads.sql`

```sql
CREATE TABLE IF NOT EXISTS public.waardebepaling_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    adres TEXT NOT NULL,
    postcode TEXT,
    stad TEXT,
    wijk TEXT,
    oppervlakte NUMERIC,
    type TEXT,
    bouwperiode TEXT,
    staat TEXT,
    energielabel TEXT,
    buitenruimte TEXT,
    parkeren TEXT,
    voornaam TEXT,
    achternaam TEXT,
    email TEXT NOT NULL,
    telefoon TEXT,
    geschatte_waarde_laag NUMERIC,
    geschatte_waarde_hoog NUMERIC,
    status TEXT DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'gecontacteerd', 'bezichtiging_gepland', 'verkocht', 'gestopt')),
    agent_assigned TEXT,
    notes TEXT
);

ALTER TABLE public.waardebepaling_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can INSERT waardebepaling_leads"
    ON public.waardebepaling_leads FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE INDEX idx_waardebepaling_leads_email ON public.waardebepaling_leads(email);
CREATE INDEX idx_waardebepaling_leads_status ON public.waardebepaling_leads(status);
CREATE INDEX idx_waardebepaling_leads_created_at ON public.waardebepaling_leads(created_at DESC);
```

---

## Phase 2: Apartment Matching — DEFERRED

> **Status:** ⏳ Deferred — no sale properties in database yet.
> 
> The `apartments` table is for **rentals** (`rental_price`). There is no `koop_properties` 
> table for properties for sale. Without sale listings, there's nothing to match against.
> 
> **What's needed before this phase can proceed:**
> 1. A `koop_properties` table (or adding `asking_price` + `listing_type` to `apartments`)
> 2. An admin UI or Salesforce sync to populate sale properties
> 3. A "List your property" flow for sellers (or manual CRM entry)
> 
> **When revisiting:** Update the matching algorithm to query `koop_properties` instead of 
> `apartments`, filter by `asking_price` instead of `rental_price`, and show results on 
> the BuyLead thank-you page.

### Original matching algorithm (for reference when revisiting)

```
For each property:
  1. Must-have filter:    property.tags overlaps with lead.must_haves (OR logic)
  2. Budget filter:      property.asking_price within BUDGET_RANGES[lead.budget]
  3. Bedrooms filter:     parseInt(property.bedrooms) >= parseInt(lead.minBedrooms)
  4. Min sqm filter:     property.square_meters >= parseInt(lead.minSqm) || 0
  5. Neighborhood filter: property.area IN lead.neighborhoods
  6. Property type:       property.property_type matches lead.propertyType

Sort by: asking_price ascending
Limit: 6 results
```

### Budget ranges (for reference)

```js
const BUDGET_RANGES = {
    'Tot € 500.000': [0, 500000],
    '€ 500.000 tot 750.000': [500000, 750000],
    '€ 750.000 tot 1.000.000': [750000, 1000000],
    '€ 1.000.000 tot 1.500.000': [1000000, 1500000],
    '€ 1.500.000+': [1500000, 99999999],
};
```

---

## Phase 3: Automation — DEFERRED

> **Status:** ⏳ Deferred — will implement when apartment matching is ready.
> 
> **n8n workflow plan (for reference):**
> 
> 1. Supabase database webhook on `koop_leads` INSERT
> 2. Send confirmation email via Resend
> 3. Send WhatsApp to agent via Zoko (`+31641439378` for koop)
> 4. Send WhatsApp to lead via Zoko
> 
> **When revisiting:** Configure Supabase Dashboard → Database → Webhooks → 
> Table: `koop_leads`, Events: INSERT, URL: n8n webhook endpoint.

---

## Phase 4: Apartment Data — Current State

The `apartments` table has these columns:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | TEXT | e.g. "Prinsengracht 123" |
| `street` | TEXT | |
| `area` | TEXT | Neighborhood, e.g. "Centrum" |
| `full_address` | TEXT | |
| `zip_code` | TEXT | |
| `rental_price` | NUMERIC | **Monthly rent** — NOT purchase price |
| `bedrooms` | TEXT | String like "2", "3" |
| `square_meters` | NUMERIC | |
| `tags` | TEXT[] | e.g. `{"Balkon", "Tuin", "Lift"}` |
| `status` | TEXT | Null, CreateLink, Active, Closed |
| `event_link` | TEXT | Cal.com viewing link |
| `qualified_users` | JSONB | Auto-calculated matching accounts |

**Key issue:** `rental_price` is monthly rent, not a purchase/asking price. The Buy lead is for **purchasing**, not renting.

### What's missing for the Buy flow:

- No `koop_properties` / sale listings table
- No `asking_price` or `purchase_price` column
- No admin UI to add properties for sale
- No "List your property" seller flow for koop
- No `property_type` column (apartment, house, penthouse, etc.)

---

## Phase 5: Current File Changes

| Action | File | What changes |
|--------|------|---------------|
| **CREATE** | `supabase/migrations/20260620000000_create_koop_leads.sql` | koop_leads table |
| **CREATE** | `supabase/migrations/20260620000001_create_waardebepaling_leads.sql` | waardebepaling_leads table |
| **MODIFY** | `src/_pages/BuyLead.jsx` | Fix `submit()` to properly insert into `koop_leads` |
| **MODIFY** | `src/_pages/Valuation.jsx` | Fix `onSubmit()` to properly insert into `waardebepaling_leads` |

### Deferred changes (not yet implemented)

| Action | File | What changes | Why deferred |
|--------|------|---------------|---------------|
| MODIFY | `src/_pages/BuyLead.jsx` | Add `matchedApartments` state, matching query, results UI | No sale properties in DB |
| MODIFY | `src/_pages/BuyLead.module.css` | Add apartment card styles | Depends on matching |
| MODIFY | `src/data/translations.js` | Add results/matching keys | Depends on matching |
| CREATE | `supabase/migrations/...create_koop_properties.sql` | Sale properties table | Needs design decisions |
| CONFIG | Supabase Dashboard | Database webhook on koop_leads INSERT | Needs n8n setup |
| CONFIG | n8n Cloud | Workflow for email + WhatsApp | Needs Zoko API details |

---

## Open Questions (for when this plan is revisited)

1. **Sale properties table** — Do we need a separate `koop_properties` table or add sale-related columns to `apartments` with a `listing_type` column (`rental`/`sale`)?

2. **Property for sale data source** — How will sale properties be added to the database? Options:
   - a) Admin dashboard UI
   - b) Salesforce sync (like rentals)
   - c) Seller self-service flow (from the Sell/Verkoop page)
   - d) Manual CRM entry

3. **`rental_price` vs `asking_price`** — The current `apartments.rental_price` is monthly rent. For sale listings we need `asking_price` (total purchase price). Should these coexist in the same table or be separate?

4. **Zoko API** — Need the webhook URL format and authentication for WhatsApp messages.

5. **Resend** — Should we create a new email template or reuse the `send-lead-confirmation` edge function pattern?

6. **Agent assignment** — Should new koop leads auto-assign to Kaj or stay unassigned?

7. **`property_type` filter** — No `property_type` column in `apartments`. Options:
   - a) Add `property_type` column
   - b) Match against tags
   - c) Skip filter

8. **Apartment detail pages** — No `/nl/appartementen/[id]` route exists. Need to create one or use an alternative CTA.