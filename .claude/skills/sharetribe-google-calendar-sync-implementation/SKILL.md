---
name: sharetribe-google-calendar-sync-implementation
description: |
  Guides implementation of bi-directional Google Calendar synchronization for Sharetribe marketplaces.
  Covers OAuth 2.0 authentication, webhook-based real-time sync, availability blocking,
  booking-to-calendar event creation, timezone handling, and token management.
---

# Google Calendar Bi-Directional Sync Implementation Skill

This skill instructs Claude to behave as a **calendar integration architect**
specialized in implementing bi-directional synchronization between
marketplace/booking applications and Google Calendar.

---

## 1. Purpose

Claude must treat Google Calendar integration as a **bi-directional sync system** where:

- **App → Calendar**: Bookings create/delete events in user's Google Calendar
- **Calendar → App**: Calendar events block/unblock availability slots in the marketplace
- **Real-time**: Changes propagate immediately via webhooks
- **Secure**: Tokens and credentials are handled with security best practices

---

## 2. Core Architectural Principles

When implementing Google Calendar sync, Claude must ensure:

### Authentication Architecture
- Use **Google Calendar API v3** with OAuth 2.0
- Request scopes: `openid email profile` + `https://www.googleapis.com/auth/calendar`
- Store OAuth tokens in **privateData or metadata**, never in publicData (security risk)
- Always implement token refresh logic using `refresh_token` before API calls
- Decode JWT `id_token` to extract user email for association

### Webhook Architecture
- Use `calendar.events.watch()` for push notifications
- Set webhook TTL to maximum (5 years: `5 * 365 * 24 * 60 * 60` seconds)
- Store `channelId` and `resourceId` in user metadata for channel management
- Use userId as channelId for unique identification
- Validate incoming webhooks by matching `x-goog-channel-id` header

### Sync Token Strategy
- Store `nextSyncToken` after each successful sync
- Use syncToken for incremental updates (only changed events)
- Fall back to full sync if syncToken is invalid/expired
- Never skip storing syncToken after webhook processing

---

## 3. Data Flow Constraints

### App → Calendar (Booking Creates Event)

Claude must ensure implementations:

- Create calendar event on booking acceptance with:
  - `summary`: Descriptive title with customer/service info
  - `location`: Booking location if available
  - `start/end`: Booking datetime in ISO format
  - `description`: Link back to booking details in app
  - `reminders`: Email 1 day before, popup 1 day + 2 hours before
  - `extendedProperties.private.createdBy`: App identifier to distinguish app-created events

- Delete calendar event on booking cancellation/decline by:
  - Querying events matching exact start/end times
  - Deleting only the matching event

- Store returned `eventId` in transaction/booking metadata

### Calendar → App (Event Blocks Availability)

Claude must ensure implementations:

- Process webhook notifications by:
  - Validating channel ownership
  - Refreshing tokens if expired
  - Using syncToken for incremental fetch
  - Categorizing events: new, deleted, modified (compare etags)

- Block availability by:
  - Creating availability exceptions with `seats: 0`
  - Applying to ALL listings owned by the user
  - Respecting each listing's timezone

- Handle event modifications by:
  - Deleting old availability exception
  - Creating new exception at updated time

- Handle event deletions by:
  - Removing corresponding availability exceptions

---

## 4. Timezone Handling Requirements

Claude must enforce proper timezone handling:

### DateTime Events (Specific Times)
- Use datetime directly from `event.start.dateTime`
- Store in ISO 8601 format with timezone offset

### All-Day Events (Date Only)
- Convert using listing's timezone: `moment.tz(event.start.date, listing.timeZone)`
- Start: Beginning of day (00:00)
- End: Subtract 1 day from Google's end date, set to 23:30
- Google adds an extra day to all-day event end dates

### Listing Timezone Awareness
- Always fetch listing's `availabilityPlan.timezone`
- Apply timezone conversion before creating exceptions
- Use `moment-timezone` for reliable conversions

---

## 5. Overlap Detection Algorithm

When calendar events overlap with existing blocked slots, Claude must implement:

```
Function: getAvailableSlotsStart(newSlot, occupiedSlots)

Input:
  - newSlot: [startTime, endTime] of new event
  - occupiedSlots: Array of [start, end] already blocked

Algorithm:
  1. Sort occupiedSlots by start time
  2. Initialize currentStart = newSlot start
  3. For each occupied slot:
     - If gap exists before occupied start, add to available slots
     - Move currentStart to max(currentStart, occupiedEnd)
  4. If time remains after all occupied slots, add final slot

Output: Array of non-overlapping time ranges to block
```

This prevents duplicate availability exceptions and handles partial overlaps.

---

## 6. Security Requirements

Claude must enforce these security practices:

### Token Storage
- **Never** store tokens in `publicData` (visible to other users)
- Use `privateData` for user-accessible secure storage
- Use `metadata` for server-only storage (preferred)

### Token Refresh
- Check `expiry_date` before every API call
- Use `refresh_token` to obtain new credentials
- Handle refresh failures gracefully (prompt re-authentication)

### Webhook Validation
- Verify `x-goog-channel-id` matches stored channelId
- Reject requests from unknown channels
- Implement proper error responses

### Credential Management
- Store Google Client ID/Secret in environment variables
- Never hardcode credentials
- Use separate credentials for dev/staging/production

---

## 7. Error Handling Requirements

Claude must ensure robust error handling:

### API Failures
- Implement retry logic with exponential backoff
- Log errors with context (userId, eventId, operation)
- Don't update syncToken if sync failed

### Rate Limiting
- Add delays between bulk operations
- Batch availability exception operations where possible
- Handle 429 (Too Many Requests) responses

### Partial Failures
- Continue processing remaining events on single event failure
- Track and report failed operations
- Allow manual retry/resync capability

---

## 8. Initial Sync Requirements

On first Google Calendar connection, Claude must ensure:

### Calendar → App Initial Import
- Fetch 12 months of future events
- Filter to confirmed events only (`status === 'confirmed'`)
- Create availability exceptions for all listings
- Skip events that already have corresponding exceptions

### App → Calendar Initial Export
- Query all accepted/confirmed bookings for the provider
- Create calendar events for bookings not yet synced
- Check for existing events before creating duplicates

### Sync State Management
- Set `syncInProgress: true` during sync
- Set `syncInProgress: false` on completion
- Allow UI to show sync status

---

## 9. Disconnect/Cleanup Requirements

When user disconnects Google Calendar:

- Stop webhook channel: `calendar.channels.stop({ id, resourceId })`
- Clear stored tokens from user profile
- Clear `calendarAssociatedEmail`
- Clear `channelId` and `resourceId` from metadata
- Optionally: Remove app-created calendar events
- Do NOT remove availability exceptions (may be from other sources)

---

## 10. Code Organization Principles

Claude should structure implementations as:

### Server-Side Endpoints
- `google-auth.js`: OAuth2 client configuration (shared module)
- `calendar-authentication.js`: OAuth callback + initial sync
- `getEventFromCalendar.js`: Webhook handler (most complex)
- `insertBookingsToCalendar.js`: Create event on booking
- `deleteBookingsFromCalendar.js`: Remove event on cancel
- `manual-sync-calender.js`: Force resync functionality
- `deleteChannel.js`: Disconnect/cleanup

### Frontend Components
- OAuth redirect handler page
- Redux/state management for token storage
- UI for connect/disconnect actions
- Sync status indicators

### Shared Utilities
- Token refresh helper
- Slot overlap calculator
- Timezone conversion helpers
- Error logging utilities

---

## 11. Testing Considerations

Claude should recommend testing for:

- OAuth flow with valid/invalid codes
- Token refresh with expired tokens
- Webhook validation with valid/invalid channel IDs
- All-day event timezone conversions
- Overlapping slot calculations
- Concurrent sync operations
- Error recovery scenarios

---

## 12. Activation Conditions

Apply this skill automatically when the user asks to:

- Implement Google Calendar integration
- Add calendar sync to a marketplace
- Block availability based on external calendar
- Push bookings to Google Calendar
- Handle Google Calendar webhooks
- Implement bi-directional calendar sync
- Fix or debug calendar synchronization

Keywords: google calendar, calendar sync, calendar integration,
availability blocking, webhook, push notification, oauth calendar,
booking calendar, calendar API, gcal integration

---

## 13. Conflict Resolution

This skill:

- Takes precedence over general API integration guidance
- Yields to security-focused skills for credential handling
- Complements Sharetribe-specific implementation skills
- Works alongside code review and testing skills

---

## End of Skill
