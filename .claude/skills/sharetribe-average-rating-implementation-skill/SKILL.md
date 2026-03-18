---
name: sharetribe-average-rating-implementation-skill
description: |
  Implements average rating calculation and storage for Sharetribe listings.
  Use this skill when you need to add rating/review aggregation functionality,
  update listing metadata with calculated averages, or integrate customer reviews
  with listing public data in a Sharetribe marketplace.
---

# Sharetribe Average Rating Implementation Skill

This skill provides step-by-step instructions for implementing average rating
calculation and storage for listings in a Sharetribe Flex marketplace.

---

## 1. Purpose

This skill enables:

- **Rating aggregation** - Calculate average ratings from individual reviews
- **Listing metadata** - Store rating data in listing publicData
- **Customer-only ratings** - Ensure only customers (not providers) can rate listings
- **Real-time updates** - Update averages immediately after review submission

---

## 2. Architecture Overview

The implementation consists of three components:

1. **Server API Endpoint** - Calculates and persists rating data using Integration SDK
2. **Client API Function** - Makes HTTP calls to the server endpoint
3. **Redux Integration** - Triggers rating update during review submission flow

### Data Flow

```
Customer submits review
        |
        v
sendReview() thunk checks if user is customer
        |
        v
updateAverageRatings() API call
        |
        v
Server fetches current listing data
        |
        v
Server calculates new average
        |
        v
Server updates listing publicData
```

---

## 3. Required Environment Variables

Add these to your `.env` file:

```env
FLEX_INTEGRATION_CLIENT_ID=your-client-id
FLEX_INTEGRATION_CLIENT_SECRET=your-client-secret
FLEX_INTEGRATION_BASE_URL=https://flex-integ-api.sharetribe.com
```

**Note**: The Integration SDK requires admin-level credentials, not the regular marketplace SDK credentials.

---

## 4. Implementation Steps

### Step 1: Create Server API Endpoint

**File**: `server/api/updateAverageRatings.js`

**Purpose**: Handle rating calculation and listing update via Integration SDK

```javascript
const flexIntegrationSdk = require('sharetribe-flex-integration-sdk');

const integrationSdk = flexIntegrationSdk.createInstance({
  clientId: process.env.FLEX_INTEGRATION_CLIENT_ID,
  clientSecret: process.env.FLEX_INTEGRATION_CLIENT_SECRET,
  baseUrl: process.env.FLEX_INTEGRATION_BASE_URL || 'https://flex-integ-api.sharetribe.com',
});

module.exports = async (req, res) => {
  try {
    const { listingId, currentRating } = req.body;

    // Validate inputs
    if (!listingId || currentRating === undefined) {
      return res.status(400).json({ error: 'Missing listingId or currentRating' });
    }

    // Fetch current listing data
    const response = await integrationSdk.listings.show({ id: listingId });
    const publicData = response.data?.data?.attributes?.publicData || {};

    // Get existing values with defaults for first review
    let averageRating = publicData.averageRating || 0;
    let reviewsCount = publicData.reviewsCount || 0;
    let totalRating = publicData.totalRating || 0;

    // Calculate new values
    reviewsCount = reviewsCount + 1;
    totalRating = totalRating + currentRating;
    averageRating = Math.round(totalRating / reviewsCount);

    // Update listing
    await integrationSdk.listings.update({
      id: listingId,
      publicData: {
        averageRating,
        reviewsCount,
        totalRating,
      },
    }, {
      expand: true,
    });

    return res.status(200).json({
      success: true,
      averageRating,
      reviewsCount
    });

  } catch (error) {
    console.error('Error updating average ratings:', error);
    return res.status(500).json({ error: 'Failed to update ratings' });
  }
};
```

**Key Logic**:
- Initialize Integration SDK with environment credentials
- Extract `listingId` and `currentRating` from request body
- Fetch current listing to get existing rating data
- Handle first review case with default values (0)
- Calculate: `newCount = oldCount + 1`, `newTotal = oldTotal + rating`, `newAverage = round(total/count)`
- Update listing publicData with new values

---

### Step 2: Register API Route

**File**: `server/apiRouter.js` (or equivalent routing file)

**Purpose**: Expose the endpoint to the client

```javascript
const updateAverageRatings = require('./api/updateAverageRatings');

// Add this route
router.post('/api/update-average-ratings', updateAverageRatings);
```

---

### Step 3: Create Client API Function

**File**: `src/util/api.js`

**Purpose**: Provide client-side function to call the server endpoint

```javascript
export const updateAverageRatings = body => {
  return post('/api/update-average-ratings', body);
};
```

**Note**: This assumes a `post` helper function exists for making HTTP requests. Adjust based on your existing API utility patterns.

---

### Step 4: Import API Function in Redux Duck

**File**: `src/containers/TransactionPage/TransactionPage.duck.js`

**Purpose**: Make the API function available in the thunk

```javascript
import {
  // ... other imports
  updateAverageRatings,
} from '../../util/api';
```

---

### Step 5: Integrate into Review Submission

**File**: `src/containers/TransactionPage/TransactionPage.duck.js`

**Purpose**: Trigger rating update when customer submits a review

**Location**: Inside the `sendReview` thunk function

```javascript
export const sendReview = (tx, transitionOptionsInfo, params, config) => (
  dispatch,
  getState,
  sdk
) => {
  const { reviewAsFirst, reviewAsSecond, hasOtherPartyReviewedFirst } = transitionOptionsInfo;
  dispatch(sendReviewRequest());

  // Get current user to check if they are the customer
  const { currentUser } = getState().user;
  const currentUserId = currentUser?.id?.uuid;
  const customerId = tx?.customer?.id?.uuid;

  // Only customers can rate listings (not providers)
  if (currentUserId === customerId) {
    const listingId = tx?.listing?.id?.uuid;
    const currentRating = params.reviewRating;

    // Fire and forget - don't block review submission
    updateAverageRatings({ listingId, currentRating })
      .catch(err => console.error('Failed to update average ratings:', err));
  }

  // Continue with review submission
  return hasOtherPartyReviewedFirst
    ? sendReviewAsSecond(tx?.id, reviewAsSecond, params, dispatch, sdk, config)
    : sendReviewAsFirst(tx?.id, reviewAsFirst, params, dispatch, sdk, config);
};
```

**Key Condition**: `currentUserId === customerId`
- Only customers rate listings
- Providers receive ratings, they don't give them to listings
- This prevents providers from artificially inflating their own listing ratings

---

### Step 6: Initialize Listing Rating Fields

**Purpose**: Ensure new listings have rating fields initialized

**Location**: Listing creation flow (EditListingWizard or similar)

When creating a listing, include in `publicData`:

```javascript
publicData: {
  // ... other fields
  averageRating: 0,
  reviewsCount: 0,
  totalRating: 0,
}
```

**Alternative**: The server-side code handles undefined values with defaults, so this step is optional but recommended for consistency.

---

## 5. Data Structures

### Listing publicData Shape

```javascript
{
  averageRating: number,  // Integer 0-5, rounded to nearest whole number
  reviewsCount: number,   // Total number of customer reviews
  totalRating: number     // Sum of all ratings (enables accurate recalculation)
}
```

### API Request Body

```javascript
{
  listingId: string,      // UUID of the listing being rated
  currentRating: number   // Rating value from the review (typically 1-5)
}
```

### API Response

```javascript
// Success
{
  success: true,
  averageRating: number,
  reviewsCount: number
}

// Error
{
  error: string
}
```

---

## 6. Rating Calculation Formula

```
newReviewsCount = existingReviewsCount + 1
newTotalRating = existingTotalRating + currentRating
newAverageRating = round(newTotalRating / newReviewsCount)
```

**Why store totalRating?**
- Enables accurate average recalculation
- Avoids floating-point precision issues
- Supports potential future features like removing/updating reviews

---

## 7. Condition Logic

### When Rating Update Triggers

The rating update ONLY occurs when ALL conditions are met:

1. User is submitting a review (in `sendReview` function)
2. Current user's ID matches the transaction's customer ID
3. Both `listingId` and `reviewRating` are available

### Why Customer-Only?

- In marketplace transactions, customers rate the service/listing they purchased
- Providers should not be able to rate their own listings
- This maintains rating integrity

---

## 8. Error Handling

### Server-Side

- Validate required fields (`listingId`, `currentRating`)
- Wrap Integration SDK calls in try-catch
- Return appropriate HTTP status codes
- Log errors for debugging

### Client-Side

- Use `.catch()` on the API call to prevent unhandled rejections
- Don't block review submission on rating update failure
- Log errors but allow review to complete

---

## 9. Dependencies

### Server

- `sharetribe-flex-integration-sdk` - Admin-level API access
- Express.js or similar for routing

### Client

- Redux with thunk middleware
- Existing API utility functions

---

## 10. Common Pitfalls

### First Review Handling

Without defaults, `undefined + 1` equals `NaN`. Always handle:

```javascript
reviewsCount = (reviewsCount || 0) + 1;
totalRating = (totalRating || 0) + currentRating;
```

### Typo in Environment Variable

Original code used `FLEX_INTEGRATION_CLIENT_SECRETE` (typo). Ensure consistency:

```javascript
clientSecret: process.env.FLEX_INTEGRATION_CLIENT_SECRET,
```

### Race Conditions

If two reviews submit simultaneously, totals may be incorrect. Consider:
- Using database transactions if available
- Implementing optimistic locking
- Accepting minor inconsistency for simplicity

---

## 11. Testing Checklist

- [ ] First review on a listing (no existing rating data)
- [ ] Subsequent reviews (existing rating data)
- [ ] Customer submitting review (should update)
- [ ] Provider submitting review (should NOT update listing)
- [ ] Invalid listingId (should return error)
- [ ] Missing rating value (should return error)
- [ ] Server error handling (should not crash)

---

## 12. Displaying Ratings

To display the average rating on listing cards or detail pages:

```javascript
const { averageRating, reviewsCount } = listing.attributes.publicData;

// Render stars based on averageRating (0-5)
// Show review count: "4.2 (23 reviews)"
```

---

## End of Skill
