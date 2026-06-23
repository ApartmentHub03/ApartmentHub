# ApartmentHub — CRM Overview

_How the CRM is organised, what each section does, and how applicants flow from a first WhatsApp message to a booked viewing and a signed deal. Updated 23 June 2026._

---

## The big picture

From the first message to a signed deal — everything in one place.

```mermaid
flowchart LR
    MSG[Sends a<br/>WhatsApp message] --> ACC[Account created<br/>automatically]
    ACC --> SEG[Apartment sent<br/>to their segment]
    SEG --> BOOK[Books a<br/>viewing]
    BOOK --> VIEW[Attends the<br/>viewing]
    VIEW --> OFFER[Applies, uploads docs<br/>& makes an offer]
    OFFER --> DEC{Decision}
    DEC -->|Accepted| WON[Deal won]
    DEC -->|Declined| KEEP[Kept for the<br/>next home]
    KEEP -.-> SEG
    style MSG fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style ACC fill:#009B8A,stroke:#00665b,color:#fff
    style WON fill:#dcfce7,stroke:#16a34a,color:#15803D
    style DEC fill:#fff1e8,stroke:#F36B19,color:#b4490f
```

---

## Logging in

The CRM is private. Team members log in with a **password** before they can see any accounts, apartments, or bookings.

---

## The four sections

The CRM is organised into four simple sections.

```mermaid
flowchart LR
    CRM[(ApartmentHub CRM)] --> A[Accounts]
    CRM --> B[Apartments]
    CRM --> C[Bookings]
    CRM --> D[Agents]
    style CRM fill:#009B8A,stroke:#00665b,color:#fff
    style A fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style B fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style C fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style D fill:#e0f3f0,stroke:#009B8A,color:#00665b
```

---

## 1. Accounts

Every person who contacts us gets one account — created automatically the moment they send a WhatsApp message.

**How an account is created and kept up to date**

```mermaid
flowchart LR
    M1[First message] --> NEW[New account created<br/>Name · Phone · Tags]
    M2[Messages again] --> UPD[Tags updated<br/>with a new set]
    NEW --> REC[(One account)]
    UPD --> REC
    style REC fill:#009B8A,stroke:#00665b,color:#fff
    style NEW fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style UPD fill:#e0f3f0,stroke:#009B8A,color:#00665b
```

- **On the first message** — a new account is created with **name, phone number, and tags**.
- **On every later message** — the account picks up a **new set of tags**, so it always reflects their latest interests.
- The phone number is the key that ties everything together — it's how we match the account to bookings later.

The account also holds the applicant's documents, motivation, offer details, and any co-tenants (partner, housemate, or guarantor).

---

## 2. Apartments

Where listings are managed — much like an admin panel.

- **Create or delete** apartments at any time.
- Each apartment has a **Segment API ID** — a saved audience of interested people.
- Pressing **Send** broadcasts that specific apartment to its segment, so the right people hear about it.

```mermaid
flowchart LR
    NEW[Create apartment] --> APT[Apartment listing]
    APT --> DEL[Delete]
    APT --> SEG[Segment API ID]
    SEG --> SEND[Press Send] --> CAST[Apartment sent to<br/>everyone in that segment]
    style APT fill:#009B8A,stroke:#00665b,color:#fff
    style CAST fill:#dcfce7,stroke:#16a34a,color:#15803D
    style NEW fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style SEG fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style SEND fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style DEL fill:#fbeae8,stroke:#B42318,color:#B42318
```

Each listing holds the property details — address, area, rental price, bedrooms, size, viewing slot length, notes, and listing media (PDF / video).

---

## 3. Bookings

All viewing bookings, pulled in from **Cal.com**, shown in one table.

**How a booking is matched to an account**

```mermaid
flowchart LR
    CAL[Cal.com booking] --> PH[Phone number]
    PH --> ACC[Matched to the<br/>right account]
    ACC --> APT[Matched to the<br/>right apartment]
    style CAL fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style ACC fill:#009B8A,stroke:#00665b,color:#fff
    style APT fill:#dcfce7,stroke:#16a34a,color:#15803D
```

When a booking comes in from Cal.com, the CRM uses the **phone number** to find the matching account, then links it to the right apartment. All booking information from Cal.com is visible here.

This section has four sub-sections:

```mermaid
flowchart TD
    BK[Bookings] --> CUR[Current bookings]
    BK --> CAN[Cancellations]
    BK --> RES[Rescheduled]
    BK --> REM[Reminders]
    style BK fill:#009B8A,stroke:#00665b,color:#fff
    style CUR fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style CAN fill:#fbeae8,stroke:#B42318,color:#B42318
    style RES fill:#fff1e8,stroke:#F36B19,color:#b4490f
    style REM fill:#e0f3f0,stroke:#009B8A,color:#00665b
```

- **Current bookings** — upcoming viewings, matched to their account and apartment.
- **Cancellations** — bookings that were canceled, kept visible in the same table.
- **Rescheduled** — bookings moved to a new time.
- **Reminders** — automatic reminder messages sent **a few hours before each viewing**.

**Reminder timing**

```mermaid
flowchart LR
    BOOK[Viewing booked] --> WAIT[Wait until a few hours<br/>before the viewing]
    WAIT --> SEND[Reminder sent<br/>to the applicant]
    SEND --> VIEW[Viewing takes place]
    style BOOK fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style SEND fill:#009B8A,stroke:#00665b,color:#fff
    style VIEW fill:#dcfce7,stroke:#16a34a,color:#15803D
```

Cancellations and reschedules are picked up from Cal.com automatically and shown in the same place, so the team always sees the current state of every viewing.

---

## 4. Agents

Where the team manages its agents. For each agent you can add:

- **Name**
- **Contact**
- **Phone number**

Agents can then be assigned to apartments and shown on offers as the point of contact.

---

## In short

Everything starts from a single WhatsApp message, which creates an **account**. **Apartments** are sent out to the right segments; the people who respond book viewings, which appear under **Bookings** — matched by phone number and tracked through reminders, cancellations, and reschedules. **Agents** handle the listings and close the deals. All four sections live behind one password-protected login.
