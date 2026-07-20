// Minimal types for data wired in the scaffold.
// Only covers what the API actually returns. Stub views use inline mock data.

export type PipelineStage = 'active' | 'waiting' | 'offers_out' | 'deals' | 'not_active';

export interface Apartment {
    id: string;
    'Full Address': string | null;
    street: string | null;
    area: string | null;
    zip_code: string | null;
    rental_price: number | null;
    bedrooms: number | null;
    square_meters: number | null;
    status: string | null;
    real_estate_agent_id: string | null;
    real_estate_agent_name: string | null;
    assigned_crm_user_id: string | null;
    assigned_crm_user_name: string | null;
    event_link: string | null;
    viewing_moment: string | null;
    joined_count: number;
    offers_in_count: number;
    offers_out_count: number;
    pipeline_stage: PipelineStage;
}

// JSONB array entry shapes (from migrations + Aanvraag.jsx writes)

export interface ViewingEntry {
    name: string | null;
    whatsapp_number: string | null;
    event_url: string | null;
    cancelled_by: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface OfferInEntry {
    account_id: string;
    tenant_name: string;
    bid_amount: number;
    start_date: string | null;
    motivation: string | null;
    status: string;
    submitted_at: string;
}

export interface OfferSentEntry {
    account_id?: string | null;
    whatsapp_number?: string | null;
    phone_number?: string | null;
    tenant_name?: string | null;
    name?: string | null;
    status: string;
    responded_at?: string | null;
    sent_at?: string | null;
    bid_amount?: number | null;
    start_date?: string | null;
    offer_type?: string | null;
    [key: string]: unknown;
}

export interface DealEntry {
    account_id: string | null;
    tenant_name: string | null;
    whatsapp_number: string | null;
    responded_at: string | null;
}

// Full apartment record (from /api/admin/crm/apartment/[id] GET — select('*'))
export interface ApartmentRecord {
    id: string;
    'Full Address': string | null;
    street: string | null;
    area: string | null;
    zip_code: string | null;
    rental_price: number | null;
    bedrooms: string | null;
    square_meters: number | null;
    status: string | null;
    additional_notes: string | null;
    event_link: string | null;
    eventlink_video: string | null;
    real_estate_agent_id: string | null;
    booking_details: Record<string, unknown> | null;
    slot_dates: unknown[] | null;
    viewing_participants: ViewingEntry[];
    viewing_cancellations: ViewingEntry[];
    booking_reschedules: ViewingEntry[];
    people_making_offer: unknown[];
    offers_in: OfferInEntry[];
    offers_sent: OfferSentEntry[];
    accepted_deals: DealEntry[];
    rejected_deals: DealEntry[];
    generate_offer: string | null;
    tags: string[] | null;
    lengthInMins: number | null;
    slotInterval: number | null;
    created_at: string;
    updated_at: string | null;
    [key: string]: unknown;
}

export interface ApartmentRecordResponse {
    success: boolean;
    apartment: ApartmentRecord;
    message?: string;
}

export interface Candidate {
    id: string;
    tenant_name: string | null;
    whatsapp_number: string | null;
    email: string | null;
    status: string | null;
    preferred_location: string | null;
    move_in_date: string | null;
    contract_start_date: string | null;
    contract_end_date: string | null;
    created_at: string | null;
}

export interface CrmAgent {
    id: string;
    name: string | null;
    whatsapp_number: string | null;
    email: string | null;
    salesforce_agent_id: string | null;
}

export interface BookingEntry {
    apartmentId: string;
    apartment: string;
    name: string;
    whatsapp: string | null;
    eventUrl: string | null;
    cancelledBy: string | null;
    when: string | null;
}

export interface Bookings {
    current: BookingEntry[];
    cancelled: BookingEntry[];
    rescheduled: BookingEntry[];
}

export interface WonDeal {
    apartment_id: string;
    apartment_address: string;
    account_id: string | null;
    tenant_name: string;
    rent_price: number | null;
    contract_start_date: string | null;
    responded_at: string | null;
    closer_name: string;
    invoice_id: string | null;
    invoice_status: string | null;
    invoice_amount_inc_vat: number | null;
}

export interface CrmUserOption {
    id: string;
    name: string;
}

export interface RealEstateAgent {
    id: string;
    name: string;
    contact_person_name: string | null;
    phone_number: string | null;
    email: string | null;
    default_offer_type: string | null;
}

export interface Segment {
    id: string;
    name: string;
    min_budget: number;
    max_budget: number;
    min_bedrooms: number;
    count: number;
}

export interface SegmentsResponse {
    success: boolean;
    segments: Segment[];
    message?: string;
}

export interface ListsResponse {
    success: boolean;
    apartments: Apartment[];
    candidates: Candidate[];
    agents: CrmAgent[];
    real_estate_agents: RealEstateAgent[];
    bookings: Bookings;
    won_deals: WonDeal[];
    crm_users: CrmUserOption[];
    message?: string;
}

export interface TeamMember {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    permissions: Record<string, boolean> | null;
    city: string | null;
    start_date: string | null;
    is_active: boolean | null;
    created_at: string | null;
    address: string | null;
}

export interface TeamResponse {
    success: boolean;
    members: TeamMember[];
    message?: string;
}

export interface Me {
    role: string;
    name: string;
    permissions: Record<string, boolean>;
}

export type TabId =
    | 'dashboard'
    | 'apartments'
    | 'deals'
    | 'candidates'
    | 'leads'
    | 'seo'
    | 'agents'
    | 'collab'
    | 'team';

export type ViewState = {
    tab: TabId | 'create';
    apartmentId?: string;
    applicationId?: string;
    applicationName?: string;
    applicationFrom?: 'scheduled' | 'canceled' | 'making' | 'offersin' | 'offersout';
}

export interface DocumentEntry {
    type: string;
    status: string;
    file_name: string | null;
    file_path: string | null;
    uploaded_at: string | null;
    person: string | null;
    person_role: string | null;
    url: string | null;
}

export interface PersoonEntry {
    id: string;
    dossier_id: string;
    rol: string;
    naam?: string | null;
    voornaam?: string | null;
    achternaam?: string | null;
    telefoon?: string | null;
    whatsapp?: string | null;
    type?: string | null;
    email?: string | null;
    work_status?: string | null;
    linked_to_persoon_id?: string | null;
    is_required?: boolean;
    docs_complete?: boolean;
    created_at?: string | null;
}

export interface CoTenantEntry {
    name: string;
    role: string;
    email: string | null;
    phone: string | null;
    accountId?: string;
}

export interface BidEntry {
    amount: number;
    deposit: number;
    motivation: string;
    start_date: string | null;
    status: string;
    created_at: string | null;
}

export interface ApplicationDetail {
    id: string;
    tenant_name: string | null;
    whatsapp_number: string | null;
    email: string | null;
    nationality: string | null;
    work_status: string | null;
    monthly_income: number | null;
    current_address: string | null;
    current_zipcode: string | null;
    preferred_location: string | null;
    move_in_date: string | null;
    negotiation_notes: string | null;
    co_tenants: CoTenantEntry[];
    documents: DocumentEntry[];
    documentation_status: string | null;
    offered_apartments: unknown;
    apartments_applied_for: unknown;
    account_role: string | null;
    status: string | null;
    dossierId: string | null;
    personen: PersoonEntry[];
    bid: BidEntry | null;
    candidate_bio: string | null;
    guarantor_bio: string | null;
}

export interface ApplicationResponse {
    success: boolean;
    account: ApplicationDetail;
    message?: string;
}

export type BusinessLine = 'aanhuur' | 'verhuur' | 'aankoop' | 'verkoop';