---
name: sharetribe-cross-listing-availability-blocking
description: |
  Implements cross-listing availability blocking for Sharetribe marketplaces.
  When a booking is accepted for one listing, automatically blocks the same
  time slot across ALL other listings owned by that provider to prevent
  double-booking. Handles both booking acceptance (create blocks) and
  cancellation (remove blocks) scenarios.
---

# Cross-Listing Availability Blocking Pattern

This skill instructs Claude to apply the **Cross-Listing Availability Blocking** architectural pattern when implementing booking systems for multi-service providers.

---

## 1. Purpose

This skill ensures Claude correctly implements availability synchronization across multiple listings/services owned by a single provider. When one listing is booked, the same time slot must be blocked on ALL other listings to prevent double-booking.

---

## 2. When to Apply This Skill

Apply this skill automatically when the user:

- Implements booking systems for marketplace platforms
- Asks about preventing double-booking across services
- Works with Sharetribe, custom booking systems, or calendar sync
- Implements availability management for multi-service providers
- Discusses availability exceptions or time slot blocking
- Builds transaction state handling (accept/cancel flows)

Keywords: availability, booking, double-booking, time slot, exception, multi-listing, cross-listing, provider calendar, seats, block time

---

## 3. Core Architectural Principles

### The Fundamental Pattern

Claude must understand and apply this core pattern:

> When a booking is confirmed for Listing A, create "unavailable" markers
> (exceptions with zero capacity) on Listings B, C, D... for the same time slot.
> When that booking is cancelled, remove those markers.

### Required Components

Claude must ensure implementations include:

1. **Listing Query Mechanism** - Ability to fetch all listings by owner/author ID
2. **Exception/Block Storage** - Data structure for time-based unavailability markers
3. **Idempotency Checks** - Verify exception doesn't exist before creating
4. **Bidirectional Handling** - Both block creation (accept) AND removal (cancel)
5. **Rate Limiting** - Delays between API calls when processing multiple listings

### Data Flow Architecture

```
[Booking Confirmed] → [Query Provider's Listings] → [For Each Listing] → [Check Existing Blocks] → [Create/Delete Block]
```

---

## 4. Implementation Constraints

### Claude MUST ensure:

- **Zero-capacity blocking**: Use `seats: 0` or equivalent unavailable marker
- **Owner-scoped queries**: Only affect listings owned by the booking's provider
- **Atomic time ranges**: Block exact start-to-end times, not approximations
- **Soft-delete handling**: Exclude deleted/inactive listings from blocking
- **Error isolation**: One listing's failure must not stop processing others
- **Await all operations**: Async delete/create operations must be awaited

### Claude MUST avoid:

- Blocking the originating listing redundantly (optimization, not requirement)
- Processing listings without rate limiting (API throttling risk)
- Creating duplicate exceptions (causes data inconsistency)
- Hard-coding transition names (should be configurable)
- Ignoring edge cases: partial overlaps, timezone issues

---

## 5. Platform-Specific Patterns

### Sharetribe Flex

```javascript
// Query listings by author
integrationSdk.listings.query({ authorId: providerId, deleted: false })

// Create blocking exception
integrationSdk.availabilityExceptions.create({
  listingId: listingId,
  start: bookingStart,
  end: bookingEnd,
  seats: 0  // Zero seats = blocked
})

// Check existing exceptions
integrationSdk.availabilityExceptions.query({
  listingId: listingId,
  start: new Date(bookingStart),
  end: new Date(bookingEnd)
})

// Remove exception
integrationSdk.availabilityExceptions.delete({ id: exceptionId })
```

### Generic Pattern (Non-Sharetribe)

```javascript
// Pseudocode for any booking system
async function syncAvailabilityAcrossListings(booking, action) {
  const listings = await getListingsByOwner(booking.providerId);

  for (const listing of listings) {
    const existingBlock = await getBlockForTimeRange(
      listing.id,
      booking.start,
      booking.end
    );

    if (action === 'ACCEPT' && !existingBlock) {
      await createAvailabilityBlock(listing.id, booking.start, booking.end);
    }

    if (action === 'CANCEL' && existingBlock) {
      await removeAvailabilityBlock(existingBlock.id);
    }

    await delay(rateLimitMs); // Prevent API throttling
  }
}
```

---

## 6. Trigger Points

Claude must identify and implement blocking at these transaction states:

| Transition | Action | Description |
|------------|--------|-------------|
| `accept` / `confirm` | CREATE blocks | Provider accepts booking |
| `provider-cancel` | DELETE blocks | Provider cancels booking |
| `customer-cancel` | DELETE blocks | Customer cancels booking |
| `expire` / `timeout` | DELETE blocks | Booking expires without action |
| `complete` + time passed | DELETE blocks | Post-completion cleanup (optional) |

---

## 7. Required API Capabilities

Claude must verify the platform provides:

1. **List by owner**: Query all listings for a specific user
2. **Time-range exceptions**: Create/query/delete availability blocks
3. **Capacity control**: Set availability to zero (not just reduced)
4. **Integration/Admin API**: Server-side access (not client SDK)

If any capability is missing, Claude must flag this as a blocker.

---

## 8. Error Handling Requirements

Claude must implement:

- **Per-listing try-catch**: Continue processing if one listing fails
- **Logging**: Record which listings succeeded/failed
- **Retry logic**: Consider exponential backoff for transient failures
- **Graceful degradation**: Booking should still complete even if sync fails

---

## 9. Performance Considerations

Claude must address:

| Concern | Solution |
|---------|----------|
| Many listings per provider | Add configurable delay between operations |
| API rate limits | Implement backoff; batch if API supports it |
| Slow sync affecting UX | Run blocking sync asynchronously (fire-and-forget with logging) |
| Database load | Index listings by owner; cache listing IDs if stable |

---

## 10. Testing Checklist

Claude should recommend tests for:

- [ ] Booking accepted → all other listings blocked
- [ ] Booking cancelled → all blocks removed
- [ ] Existing exception → no duplicate created
- [ ] No existing exception → delete doesn't error
- [ ] Provider with 1 listing → no errors
- [ ] Provider with 50+ listings → completes within timeout
- [ ] Deleted listing → not processed
- [ ] Overlapping time ranges → handled correctly

---

## 11. Conflict Resolution

This skill:

- **Yields to**: Security skills, platform-specific coding standards
- **Takes precedence over**: General booking implementation patterns
- **Complements**: Calendar sync skills, transaction handling skills

---

## End of Skill
