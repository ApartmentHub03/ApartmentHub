# ApartmentHub — CRM Overview

_How applicants move from a viewing booking to a signed deal, what we keep on each tenant, and the messages that go out automatically along the way. Updated 23 June 2026._

---

## The big picture

From the first viewing booking to a signed deal — everything in one flow.

```mermaid
flowchart LR
    AD[Ad / website] --> BOOK[Books a<br/>viewing]
    BOOK --> VIEW[Attends the<br/>viewing]
    VIEW --> APPLY[Applies &<br/>uploads documents]
    APPLY --> OFFER[Makes an offer<br/>& signs LOI]
    OFFER --> SENT[Offer sent]
    SENT --> DEC{Decision}
    DEC -->|Accepted| WON[Deal won]
    DEC -->|Declined| KEEP[Kept for the<br/>next home]
    KEEP -.-> BOOK
    style AD fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style WON fill:#dcfce7,stroke:#16a34a,color:#15803D
    style DEC fill:#fff1e8,stroke:#F36B19,color:#b4490f
    style SENT fill:#009B8A,stroke:#00665b,color:#fff
```

---

## 1. The pipeline — one board per apartment

Every apartment has its own board that tracks each applicant through five stages. People move forward automatically as they book viewings and fill things in on the website — nobody has to be moved by hand.

```mermaid
flowchart LR
    A["People Joining<br/>Viewing"] --> C["People Canceled<br/>Viewing"]
    A --> B["People Making<br/>an Offer"]
    B --> D["Offers In"]
    D --> E["Offer Sent"]
    C -.->|drag back to<br/>restart| A
    style A fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style B fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style C fill:#fbeae8,stroke:#B42318,color:#B42318
    style D fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style E fill:#dcfce7,stroke:#16a34a,color:#15803D
```

| Stage | When someone lands here | What it means |
|-------|--------------------------|---------------|
| **1. People Joining Viewing** | They book a viewing | They're matched to the right apartment automatically. |
| **2. People Canceled Viewing** | They cancel their viewing | Messages to them pause. Drag them back to stage 1 to start again. |
| **3. People Making an Offer** | They log in after the viewing | An offer is in progress — some documents may still be missing. |
| **4. Offers In** | They've uploaded everything and signed the Letter of Intent | The offer is complete and ready for you to review. |
| **5. Offer Sent** | You click **Generate Offer** | Shows how long ago the offer went out and the agent's contact details, with **Accepted / Declined** buttons. |

---

## 2. The apartment

Each listing holds everything about the property and is the home for its board.

| | |
|--|--|
| Apartment name | van Baerlestraat 62-2 |
| Full address | van Baerlestraat 62-2, 1071BA |
| Area | Amsterdam |
| Rental price | €2,800 |
| Bedrooms | 2 |
| Size | 126 m² |
| Viewing length | 5 min slots |
| Notes | e.g. "No students" |
| Listing media | PDF / video link |

On each apartment you can also:

- See the **owner** (the real estate agent for the listing).
- Assign an **ApartmentHub agent** to handle it.
- **Cancel** or **reschedule** a viewing with one click.

```mermaid
flowchart TD
    APT[Apartment listing] --> OWN[Owner —<br/>real estate agent]
    APT --> AGT[Assigned<br/>ApartmentHub agent]
    APT --> CANCEL[Cancel viewing]
    APT --> RESCH[Reschedule viewing]
    APT --> BOARD[(Applicant board —<br/>5 stages)]
    style APT fill:#009B8A,stroke:#00665b,color:#fff
    style BOARD fill:#dcfce7,stroke:#16a34a,color:#15803D
    style OWN fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style AGT fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style CANCEL fill:#fbeae8,stroke:#B42318,color:#B42318
    style RESCH fill:#fbeae8,stroke:#B42318,color:#B42318
```

---

## 3. The tenant record

For every applicant we keep one tidy record — their details, documents, what they're looking for, and every apartment they've viewed. It fills itself in from two places: their **WhatsApp** contact details and what they **submit on the website**.

```mermaid
flowchart LR
    ZOKO[WhatsApp] --> ACC[(One tenant record)]
    WEB[Website forms] --> ACC
    style ACC fill:#009B8A,stroke:#00665b,color:#fff
    style ZOKO fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style WEB fill:#e0f3f0,stroke:#009B8A,color:#00665b
```

**What the record holds**

- **Who they are** — name, phone, WhatsApp, language (Dutch/English).
- **Documents** — status shown at a glance: *not uploaded → partly done → finished*.
- **Their motivation** — taken from the applicant's motivational letter.
- **The offer** — rent offered, deposit, service costs, bid amount, contract start date.
- **Current address** and email.
- **Apartments** — every one they've viewed, and which viewings are still coming up.
- **Co-tenants** — add a partner, housemate, or guarantor and manage their documents too.

**Document status at a glance**

```mermaid
flowchart LR
    N["🔴 Not uploaded"] --> P["🟠 Partly done"] --> F["🟢 Finished"]
    style N fill:#fbeae8,stroke:#B42318,color:#B42318
    style P fill:#fff1e8,stroke:#F36B19,color:#b4490f
    style F fill:#dcfce7,stroke:#16a34a,color:#15803D
```

---

## 4. The viewing, step by step

A booking can be attended, canceled, or rescheduled — each path sends the right message and updates the board.

```mermaid
flowchart TD
    BOOK[Viewing booked] --> CONF[Confirmation +<br/>reminder to bring documents]
    CONF --> Q{What happens?}
    Q -->|Attends| DONE[Viewing done →<br/>can make an offer]
    Q -->|Applicant cancels| AC[Cancel confirmation sent]
    Q -->|We cancel| WC[Cancellation message sent]
    Q -->|We reschedule| RS[Reschedule message sent]
    RS --> BOOK
    style BOOK fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style DONE fill:#dcfce7,stroke:#16a34a,color:#15803D
    style Q fill:#fff1e8,stroke:#F36B19,color:#b4490f
```

---

## 5. Messages that go out automatically

Throughout the journey, the system sends the right WhatsApp message or email at the right moment — confirmations, reminders, cancellations, and offer follow-ups — so the team doesn't have to chase anyone manually.

```mermaid
flowchart TD
    AP[Apartments shared] --> VS[Viewing booked]
    AP -.-> ASK[Can ask questions]
    AP -.-> UNSUB[Can unsubscribe]

    VS --> REM[Reminder to<br/>hand in documents]
    VS --> RP[Booking reminder —<br/>in person]
    VS --> RF[Booking reminder —<br/>video call]

    REM --> HAND[Applicant makes an offer]
    HAND --> CANCEL{Viewing canceled<br/>by ApartmentHub}
    CANCEL -->|Canceled| CM[Cancellation message]
    CANCEL -->|Rescheduled| RM[Reschedule message]

    HAND --> DONE[Viewing done]
    DONE --> F15[Offer reminder +15 min]
    F15 --> F4[+4 hours]
    F4 --> F17[+17 hours]
    F17 --> F40[+40 hours]

    DONE --> GEN[Generate Offer]
    GEN --> DEC{Decision}
    DEC -->|Accepted| OA[Accepted message<br/>+ added to monthly deals]
    DEC -->|Declined| OD[Declined message]

    style CANCEL fill:#fff1e8,stroke:#F36B19,color:#b4490f
    style DEC fill:#fff1e8,stroke:#F36B19,color:#b4490f
    style OA fill:#dcfce7,stroke:#16a34a,color:#15803D
    style GEN fill:#009B8A,stroke:#00665b,color:#fff
```

- **Document status colours:** green = finished, orange = started, red = not started.
- **Generate Offer** drafts a personalised email from the tenant's details. When an offer is accepted, the deal is added to the monthly deals overview and an invoice can be generated.

**Offer follow-up timeline** — gentle reminders after a viewing, which stop the moment documents are uploaded.

```mermaid
flowchart LR
    V[Viewing done] --> T1[+15 min] --> T2[+4 hours] --> T3[+17 hours] --> T4[+40 hours]
    T1 -.->|documents uploaded| STOP[Reminders stop]
    T2 -.-> STOP
    T3 -.-> STOP
    T4 -.-> STOP
    style V fill:#e0f3f0,stroke:#009B8A,color:#00665b
    style STOP fill:#dcfce7,stroke:#16a34a,color:#15803D
```

**What happens when an offer is decided**

```mermaid
flowchart TD
    GEN[Generate Offer] --> SENT[Offer sent to applicant]
    SENT --> DEC{Decision}
    DEC -->|Accepted| OA[Accepted message sent]
    OA --> AGT[Agent who closed<br/>the deal recorded]
    OA --> SHEET[Added to monthly<br/>deals overview]
    AGT --> INV[Invoice generated]
    DEC -->|Declined| OD[Declined message sent]
    OD --> KEEP[Kept in touch for<br/>the next home]
    style GEN fill:#009B8A,stroke:#00665b,color:#fff
    style DEC fill:#fff1e8,stroke:#F36B19,color:#b4490f
    style OA fill:#dcfce7,stroke:#16a34a,color:#15803D
    style INV fill:#dcfce7,stroke:#16a34a,color:#15803D
```

---

## 6. In short

Everything an applicant does — booking, viewing, uploading, offering, signing — flows into one place, moves them along the board, and triggers the right message at the right time. The team always works from a single, up-to-date view of every tenant and every apartment.
