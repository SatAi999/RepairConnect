# API Specification - RepairConnect

This document details the REST API endpoints, request/response models, and status codes.

---

## 1. Authentication Endpoints

### POST `/api/auth/register`
Creates a new user.
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123",
    "role": "CUSTOMER",
    "phone": "9876543210"
  }
  ```
- **Response (201)**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "CUSTOMER" },
      "token": "JWT_TOKEN_HERE"
    },
    "message": "User registered successfully"
  }
  ```

### POST `/api/auth/login`
Authenticates a user.
- **Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "CUSTOMER" },
      "token": "JWT_TOKEN_HERE"
    }
  }
  ```

### GET `/api/auth/me`
Retrieves current user details using Authorization header token.
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "CUSTOMER"
    }
  }
  ```

---

## 2. Repair Cases & AI

### POST `/api/repair-cases`
Creates a repair case profile.
- **Body**:
  ```json
  {
    "itemName": "MacBook Pro",
    "category": "Laptop",
    "brand": "Apple",
    "model": "M1 2020",
    "problemDescription": "The screen turns on but stays completely black, keyboard backlight lights up.",
    "mediaUrl": "/uploads/laptop.jpg"
  }
  ```
- **Response (201)**: Returns the created RepairCase JSON representation.

### POST `/api/repair-cases/:id/analyze`
Triggers Gemini (or Mock) AI diagnosis execution.
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "diagnosis": {
        "itemCategory": "Laptop",
        "identifiedItem": "MacBook Pro M1 2020",
        "visibleDamage": ["None visible"],
        "possibleCauses": [
          { "cause": "Backlight coil failure on logic board", "confidence": 0.75 },
          { "cause": "Damaged eDP display flex cable", "confidence": 0.2 }
        ],
        "troubleshootingSteps": [
          "Perform a hard reset by holding the power button for 10 seconds.",
          "Connect to an external monitor to isolate display vs logic board issue."
        ],
        "safetyWarnings": [
          "Do not attempt to open the device or probe internal components without disconnecting the battery."
        ]
      },
      "estimate": {
        "estimatedMin": 1500,
        "estimatedMax": 4000,
        "replacementMin": 80000,
        "replacementMax": 100000,
        "repairabilityScore": 65,
        "recommendation": "repair_recommended",
        "reasoning": "Estimated repair costs are highly favorable compared to replacing the device."
      }
    }
  }
  ```

---

## 3. Repairers Directory

### GET `/api/repairers`
Search and discover local repairers.
- **Query Params**: `lat`, `lng`, `radius` (km), `category`, `search`, `page`, `limit`.
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "docs": [
        {
          "id": "...",
          "businessName": "Express Tech Solutions",
          "categories": ["Laptop", "Smartphone"],
          "rating": 4.8,
          "distance": 1.2
        }
      ],
      "totalPages": 1,
      "page": 1
    }
  }
  ```

---

## 4. Service Requests

### POST `/api/repair-requests`
Creates a service request.
- **Body**:
  ```json
  {
    "repairCaseId": "CASE_ID",
    "repairerId": "REPAIRER_ID",
    "customerDescription": "Prefer morning appointment if possible.",
    "scheduledDate": "2026-08-25T10:00:00.000Z"
  }
  ```
- **Response (210)**: Success confirmation and Request ID.

### PATCH `/api/repair-requests/:id/status`
Updates request state. Checks for role permissions.
- **Body**:
  ```json
  {
    "status": "ACCEPTED",
    "note": "Availability confirmed for Tuesday morning."
  }
  ```

---

## 5. Review & Ratings

### POST `/api/repairers/:id/reviews`
Submits feedback for a completed service.
- **Body**:
  ```json
  {
    "repairRequestId": "REQUEST_ID",
    "rating": 5,
    "comment": "Fast and affordable screen fix!"
  }
  ```
- **Response (201)**: Confirmation message.
