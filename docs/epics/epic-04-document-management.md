# Epic 04 — Document Management

**Status:** Not Started
**Priority:** P0 — Core value proposition: expiry tracking
**Depends On:** Epic 03 (Vehicles), Epic 01 (Claude API, R2)

## Goal
Users can upload vehicle documents (RC, Insurance, PUC) and a Driver's License. The AI extracts expiry dates, which are then tracked and surfaced as expiry status indicators. This epic delivers the primary utility of MotoYaar.

---

## Stories

### STORY-04-01: Upload Document with AI Parsing
**As a** vehicle owner,
**I want** to upload a document and have the expiry date extracted automatically,
**so that** I don't have to read and manually enter dates from my documents.

**Acceptance Criteria:**
- [ ] Document upload accessible from: Vehicle Detail → Documents tab → "Add document" CTA; and during vehicle add flow (Step 5)
- [ ] Supported types: RC, Insurance, PUC, Other (user-labeled)
- [ ] File types accepted: JPG, PNG, PDF; max file size: 10MB
- [ ] On upload: file sent to server; Claude Vision API called to extract expiry date
- [ ] Loading state shown during AI processing ("Reading your document...")
- [ ] **Confirmation screen:** extracted expiry date displayed; user can approve or edit the date before saving
- [ ] If AI returns no date: skip confirmation screen; show manual date entry form directly
- [ ] On confirm/save: document record created in DB with `expiry_date`, `parse_status` (success / manual / incomplete)
- [ ] Storage behavior follows user's storage preference (parse-only by default; see STORY-04-04)

---

### STORY-04-02: Manual Expiry Entry Fallback
**As a** user whose document couldn't be parsed,
**I want** to manually enter the expiry date,
**so that** the document is still tracked even when AI extraction fails.

**Acceptance Criteria:**
- [ ] Manual entry shown when: AI returns no date, or user taps "Enter manually" on confirmation screen
- [ ] Date picker for expiry date input
- [ ] "Skip" option available — saves document with `parse_status = incomplete`, `expiry_date = null`
- [ ] Documents with `incomplete` status shown with a warning indicator in the Documents tab
- [ ] User can return later and add the expiry date via edit

---

### STORY-04-03: Document List with Expiry Status
**As a** vehicle owner,
**I want** to see all my vehicle's documents with clear expiry status indicators,
**so that** I can tell at a glance which documents need attention.

**Acceptance Criteria:**
- [ ] Documents tab on vehicle detail page lists all uploaded documents
- [ ] Each document shows: type label, expiry date, status badge
- [ ] Status badge colors: Green (valid, > 30 days), Amber (within notification window, default 30 days), Red (expired or today), Grey (incomplete — no expiry date)
- [ ] Documents sorted by: soonest expiry first
- [ ] Each document has edit (update expiry date / re-upload) and delete actions
- [ ] "Add document" CTA always visible
- [ ] Empty state: "No documents yet. Add your RC, Insurance, and PUC to get expiry alerts."

---

### STORY-04-04: Document Storage Preference (Parse-Only vs. Full Storage)
**As a** privacy-conscious user,
**I want** control over whether my documents are stored after parsing,
**so that** I can trust MotoYaar with sensitive legal documents.

**Acceptance Criteria:**
- [ ] Default behavior: **parse-only** — document sent to AI, expiry date extracted, original file deleted immediately after
- [ ] Opt-in full storage: document stored in Cloudflare R2 after parsing
- [ ] Storage preference configurable in Settings (default: parse-only)
- [ ] Stored documents: accessible via signed URL (not public); auto-deleted 10 days after expiry date (R2 lifecycle rule)
- [ ] Privacy page explains storage policy, access policy, and encryption
- [ ] Documents tab shows storage indicator per document: "Stored" / "Parsed only"

---

### STORY-04-05: Edit and Delete Document
**As a** vehicle owner,
**I want** to edit or delete a document I've uploaded,
**so that** I can correct wrong expiry dates or remove outdated documents.

**Acceptance Criteria:**
- [ ] Edit: opens form pre-filled with document type and expiry date; allows re-upload (triggers AI parse again) or manual date change
- [ ] Delete: confirmation dialog ("Remove this document?"); on confirm, document record deleted; stored file deleted from R2 if applicable
- [ ] No cascade effects — deleting a document only removes that document record

---

### STORY-04-06: Driver's License Management
**As a** user,
**I want** to upload and track my Driver's License expiry,
**so that** I get alerted before my DL expires just like vehicle documents.

**Acceptance Criteria:**
- [ ] DL upload accessible from Profile / Settings page (not onboarding)
- [ ] Same AI parsing flow as vehicle documents (STORY-04-01)
- [ ] DL record stored with `vehicle_id = null`, `user_id = current user`, `type = DL`
- [ ] Expiry tracked and shown in Profile page with same status indicators (green / amber / red)
- [ ] DL included in the document expiry notification pipeline (Epic 08)
- [ ] Edit and delete available from Profile page