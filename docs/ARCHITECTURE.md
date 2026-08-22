# Architecture Documentation - RepairConnect

This document describes the technical architecture and design decisions for RepairConnect.

---

## 1. System Design Overview

RepairConnect is built using a modern full-stack JavaScript/TypeScript architecture. It is designed to run locally or in cloud environments using a unified monorepo structure:

```
┌────────────────────────────────────────────────────────┐
│                      User Browser                      │
│  - React, Tailwind CSS                                 │
│  - Leaflet Map & Geolocation                           │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON REST
                           ▼
┌────────────────────────────────────────────────────────┐
│                     Express server                     │
│  - JWT/bcrypt authentication                           │
│  - API Router & Controller logic                      │
│  - Service logic (Estimation, AI wrapper)              │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│     MongoDB Database    │ │   Gemini AI Service     │
│  - User/Repairer schemas│ │  - Multimodal analysis  │
│  - Repair tracking logs │ │  - Deterministic fallback│
└─────────────────────────┘ └─────────────────────────┘
```

---

## 2. Directory Structure

```
RepairConnect/
├── package.json              # Workspace root runner
├── docs/                     # Product & technical specifications
│   ├── ARCHITECTURE.md
│   ├── FEATURES.md
│   ├── API.md
│   └── TESTING.md
├── server/                   # Express backend (TypeScript)
│   ├── src/
│   │   ├── config/           # Database, variables, and AI client
│   │   ├── controllers/      # Route request controllers
│   │   ├── middleware/       # Auth validation, error handler, limits
│   │   ├── models/           # Mongoose DB schemas
│   │   ├── routes/           # Express API route declarations
│   │   ├── services/         # AI Service, estimation formulas, map calculation
│   │   └── seed/             # Seeding routines for hackathon demo
│   ├── package.json
│   └── tsconfig.json
├── client/                   # Vite React + TypeScript frontend
│   ├── src/
│   │   ├── components/       # UI elements, custom cards, maps
│   │   ├── context/          # Global application state (Auth, alerts)
│   │   ├── pages/            # Page layouts and workflows
│   │   ├── services/         # Axios/Fetch API client hooks
│   │   ├── types/            # Shared TypeScript schemas
│   │   ├── utils/            # Geolocation, formatting helpers
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
└── tests/                    # Backend & E2E integration suites
    ├── unit/                 # Unit tests (Vitest)
    ├── integration/          # API endpoint tests (Supertest)
    └── e2e/                  # End-to-end user journeys (Playwright)
```

---

## 3. Database Model Definitions

The system uses MongoDB with Mongoose. The database is structured to avoid orphaned data while maintaining a clean, query-indexed scheme.

### User
Tracks credential information, location coordinates, and roles (`CUSTOMER`, `REPAIRER`, `ADMIN`).
- **Indexes**: `email` (unique, sparse), `role`.

### RepairerProfile
Stores business-specific info, service capabilities, geocoordinates, radius of operations, and aggregated ratings.
- **Indexes**: `location` (2dsphere), `categories`.

### RepairCase
Captures the item details, uploaded images, AI diagnosis reports, and current analysis state.
- **Indexes**: `userId`, `status`.

### AIDiagnosis
Saves structured JSON data returned from the Gemini AI analysis, including troubleshooting instructions and safety warnings.

### RepairEstimate
Holds calculations from the worthiness engine, linking min/max repair ranges and replacement valuations.

### RepairRequest
Connects a customer's `RepairCase` to a specific `RepairerProfile`. Manages status workflow transitions and price quotes.
- **Indexes**: `userId`, `repairerId`, `status`.

### RepairStatusHistory
Audit log recording every change in a `RepairRequest`'s timeline. Ensures status tracking transparency.

### Review
Customer reviews assessing repairer profiles.
- **Indexes**: `repairerId`.

---

## 4. AI Abstraction Model (`AIService`)

The AI module is decoupled using an adapter pattern to prevent provider lock-in and enable smooth offline testing:

- **Interface**: Exports `analyzeDamage(imageUrl: string, description: string): Promise<AIDiagnosis>`
- **Mock AI Mode**: If `DEMO_MODE=true` or `AI_API_KEY` is undefined, the service intercepts request descriptions. It returns predefined, valid analysis JSON objects for tested seed categories (e.g. Laptops with black displays, smartphones with cracked screens).
- **Gemini API Mode**: Calls Google's Gemini multimodal endpoint, prompting for structural JSON replies fitting the schema exactly.

---

## 5. Map & Geolocation System

Geographical discovery is built around Leaflet and OpenStreetMap:
1. **User Location**: Derived using browser geolocation or manual address entry fallback.
2. **Provider Range Calculation**: Simple spherical trigonometry (Haversine formula) in the database query layer to filter repairers within their active service radius.
3. **Map Pins**: Markers display the repairer's profile details, active rating, and price tier on click.
