# Testing Specification - RepairConnect

This document details the automated testing structure, manual QA checklist, and run instructions.

---

## 1. Automated Testing Strategy

The test suite is organized into three levels to guarantee correctness and security boundaries:

1. **Unit Tests (Vitest)**:
   - Location: `tests/unit/`
   - Validates password hashing, recommendation formulas, AI JSON output sanitization, and distance calculation helpers.
2. **Integration Tests (Supertest)**:
   - Location: `tests/integration/`
   - Targets Express route controllers, JWT verification, and ownership checks (e.g. User B cannot read User A's case file).
3. **E2E Tests (Playwright)**:
   - Location: `tests/e2e/`
   - Tests the complete customer & repairer workflow end-to-end.

---

## 2. Command Reference

### Setup Dependencies
Before running tests, ensure local node packages are installed:
```bash
npm install
```

### Run Unit & Integration Tests
```bash
npm run test
# or specifically for the server integration suite
npm run test:api
```

### Run E2E Flow (Playwright)
```bash
npm run test:e2e
```

---

## 3. Manual QA Checklist

| Area | Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| **Authentication** | Registration with duplicate email | Error: `EMAIL_EXISTS` (409 Conflict) | | Pending |
| **Authentication** | Login with wrong password | Error: `INVALID_CREDENTIALS` (401) | | Pending |
| **Auth Guards** | Access `/api/repair-cases` without Bearer Token | Error: `UNAUTHORIZED` (401) | | Pending |
| **Permissions** | Read another user's repair case ID | Error: `FORBIDDEN` (403) | | Pending |
| **Permissions** | Update another repairer's profile as customer | Error: `FORBIDDEN` (403) | | Pending |
| **AI Diagnosis** | Upload non-image file (e.g. text file) | UI blocks selection or API returns 400 | | Pending |
| **AI Diagnosis** | Trigger analysis while server is offline | UI shows fallback and offers a retry option | | Pending |
| **Discovery** | Deny location permissions | Prompt defaults to manual search box; map remains usable | | Pending |
| **Comparison** | Compare 3 repairers | Displays details side-by-side with recommended tag | | Pending |
| **Request Workflow**| Double click Accept Request | Request is processed once; UI disables button | | Pending |
| **Workflow State** | Transition ACCEPTED -> COMPLETED directly | Server returns validation error (invalid transition) | | Pending |
| **Responsive UI** | Scale screen to 375px (mobile) | Navigation collapses to burger menu, comparison flows vertically | | Pending |
