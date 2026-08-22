# Product Features - RepairConnect

This document describes the core feature set of the RepairConnect MVP, detailing workflows and domain logic.

---

## 1. Core Workflows by Role

### Customer / User Role
1. **Onboarding & Auth**: Secure registration, login, profile management (including coordinates setup).
2. **Analysis Wizard**:
   - Upload media (image/video validation: max 5MB, format check).
   - Enter details: Category, brand, model, description of symptoms.
   - Professional loading state representing active server-side processing phases.
   - Display structured AI diagnostic breakdown.
3. **Estimation Engine**:
   - View visual indicator of Repairability Score (0 to 100).
   - View recommended decision ("Repair Recommended", "Replacement Recommended", etc.) with explainable reasons.
4. **Discover & Compare**:
   - Interactive leaflet map showing nearby registered service professionals.
   - Filters: Distance radius, item category, rating, verification.
   - Side-by-side comparison panel highlighting distances, ratings, and price indicators (with best-value or closest recommendations).
5. **Request & Track**:
   - Create a service request linked to a diagnosis case.
   - Real-time status update timeline.
   - Rate and review repairer profiles upon request completion.

### Repair Professional Role
1. **Onboarding & Business Setup**:
   - Setup business profile with name, service categories (Smartphones, Laptops, Bicycles, Appliances, etc.), operating radius, and baseline pricing index.
2. **Request Inbox**:
   - View incoming requests with customer details, description, and AI diagnostic insights.
   - Accept or Reject incoming bids.
3. **Workspace Management**:
   - Update request status along the predefined state transition pipeline (REQUESTED -> ACCEPTED -> DIAGNOSIS -> ESTIMATE_PROVIDED -> APPROVED -> REPAIR_IN_PROGRESS -> READY_FOR_PICKUP -> COMPLETED).
   - Add status notes and final invoice details.

### Administrator Role
1. **Global Dashboard**: View overview counts for users, repairers, cases, and request completion metrics.
2. **Knowledge Base Editor**: Create, update, and manage baseline repair categories, diagnostic guidelines, and replacement costs.
3. **Account Review**: Verify or suspend repairer profiles.

---

## 2. Repair Worthiness & Sustainability Engine

The worthiness algorithm processes inputs to suggest whether to repair or replace:

- **Inputs**:
  - `repairCostRange` (Min, Max)
  - `replacementCostRange` (Min, Max)
  - `itemAge` (years)
  - `repairabilityScore` (0 - 100)
  
- **Logic**:
  - Calculate `costRatio = Average(repairCost) / Average(replacementCost)`.
  - Calculate recommendation:
    - If `costRatio <= 0.4` and `repairabilityScore >= 50`: **Repair recommended** (highly cost-effective).
    - If `costRatio > 0.4` and `costRatio < 0.7` and `repairabilityScore >= 60`: **Repair may be worthwhile** (depends on item age/sentimental value).
    - If `costRatio >= 0.7` or `repairabilityScore < 40`: **Replacement may be more practical**.
    - If data is incomplete: **Professional assessment recommended**.
  - **Sustainability impact**:
    - Avoided electronic/material waste: Est. weight based on category (e.g. Laptop ~ 2kg, Smartphone ~ 0.2kg).
    - Avoided CO2 emissions: Rough estimate of manufacturing footprint (e.g., Laptop ~ 200kg CO2, Smartphone ~ 60kg CO2).

---

## 3. AI Safety Policies

To prevent risk, the system implements standard warning alerts:
- **High-Risk Categories**: If the category is related to mains electricity, high-voltage battery banks (EVs, power walls), gas lines, or hazardous chemicals, the system enforces a prominent red banner warning against opening the unit:
  > [!WARNING]
  > **High Voltage/Gas Hazard**: This item uses mains electricity or high energy cells. Do NOT open the casing or touch internal circuits. A professional inspection is highly recommended.
- **Disclaimer**: Every AI-generated layout displays the disclaimer: *"AI-assisted assessment. This is not a certified professional diagnosis."*
