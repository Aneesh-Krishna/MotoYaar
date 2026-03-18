---
name: sharetribe-filter-management
description: |
  Guides adding, modifying, and configuring search filters in Sharetribe Flex marketplaces.
  Use this skill when implementing custom listing field filters, configuring built-in filters
  (price, dates, keywords, categories, listing types), modifying filter UI components,
  or troubleshooting filter validation and query parameter handling.
  Covers both server-side API filtering and client-side filter configuration.
---

# Sharetribe Filter Management Skill

This skill defines behavioral constraints and implementation guidance for
managing search filters in Sharetribe Flex marketplace applications.

---

## 1. Purpose

Claude must treat filter management as requiring:

- **Configuration-driven approach** - Filters are defined through config, not code changes
- **Validation awareness** - All filter values must pass validation before API calls
- **Schema alignment** - Backend search schemas must match frontend configurations
- **UI component mapping** - SchemaType determines which filter control renders

---

## 2. Activation Conditions

Apply this skill automatically when the user asks to:

- Add a new filter to the search page
- Modify existing filter behavior or options
- Configure price, date, keyword, category, or listing type filters
- Create custom listing field filters
- Debug filter validation or query parameter issues
- Understand filter data flow (URL → Redux → API)
- Implement client-side vs server-side filtering

---

## 3. Filter Architecture Understanding

Claude must understand and apply these architectural principles:

### 3.1 Two Filter Categories

**Built-in Filters** (Sharetribe-provided):
- `price` - Range slider with min/max/step
- `dates` - Date range picker for availability
- `keywords` - Text search in listings
- `seats` - Numeric availability count
- `categoryLevel` - Nested hierarchical categories (pub_categoryLevel1, pub_categoryLevel2, pub_categoryLevel3)
- `listingType` - Filter by listing type (pub_listingType)

**Custom Filters** (Listing field filters):
- Defined in `config.listing.listingFields` array
- Use `pub_` prefix for public scope, `meta_` for private
- Schema types: `enum`, `multi-enum`, `text`, `long`, `boolean`

### 3.2 Data Flow

Claude must understand this flow when implementing filters:

```
URL Query Params (?pub_amenities=wifi)
    ↓
validUrlQueryParamsFromProps() - Parse location.search
    ↓
validFilterParams() - Validate against config
    ↓
FilterComponent - Render appropriate UI control
    ↓
getHandleChangedValueFn() - Handle user selection
    ↓
URL updated / searchListings() dispatched
    ↓
SDK query with validated params
```

### 3.3 Key Function Logic (from code-analysis-optimizer)

Claude must understand these critical functions:

| Function | Location | Input | Output | Purpose |
|----------|----------|-------|--------|---------|
| `validUrlQueryParamsFromProps()` | SearchPage.shared.js:239 | props with location | Validated params object | Extract and validate URL params |
| `validFilterParams()` | SearchPage.shared.js:171 | Raw params + config | Clean params | Core validation against listingFieldsConfig |
| `validURLParamForExtendedData()` | SearchPage.shared.js:95 | Single param + value | Validated value or empty | Validate enum options, ranges, dates |
| `groupListingFieldConfigs()` | SearchPage.shared.js:440 | All configs + types | [primary[], secondary[]] | Separate filters by group |
| `constructQueryParamName()` | util/search.js:24 | key + scope | `pub_key` or `meta_key` | Build URL parameter name |
| `initialValues()` | SearchPage.shared.js:272 | props + currentParams | Form values object | Get filter form initial state |

**Critical Implementation Detail (SearchPage.duck.js:504-508):**
```javascript
// Most pub_* params are STRIPPED before API call
params = Object.fromEntries(
  Object.entries(params).filter(
    ([key]) => !key.startsWith("pub_") || key === "pub_listingType"
  )
);
```
This means custom filters currently do NOT filter server-side except `pub_listingType`.

---

## 4. Configuration Requirements

### 4.1 Custom Filter Configuration Structure

Claude must ensure custom filters include all required properties:

```javascript
{
  key: 'fieldName',                     // Unique identifier
  scope: 'public',                       // 'public' (searchable) or 'private'
  schemaType: 'enum',                   // enum | multi-enum | long | text | boolean

  // Required for enum/multi-enum
  enumOptions: [
    { option: 'value1', label: 'Label 1' },
    { option: 'value2', label: 'Label 2' }
  ],

  // Required for long (numeric range)
  minimum: 0,
  maximum: 100,
  step: 1,

  // CRITICAL: Makes field searchable
  filterConfig: {
    indexForSearch: true,               // MUST be true for filtering
    filterType: 'SelectSingleFilter',   // or 'SelectMultipleFilter'
    label: 'Display Label',
    searchMode: 'has_any',              // 'has_all' or 'has_any' for multi-enum
    group: 'primary'                    // 'primary' or 'secondary'
  },

  // Optional: Restrict to listing types
  listingTypeConfig: {
    limitToListingTypeIds: true,
    listingTypeIds: ['type1', 'type2']
  },

  // Optional: Restrict to categories
  categoryConfig: {
    limitToCategoryIds: true,
    categoryIds: ['category1']
  }
}
```

### 4.2 Built-in Filter Configuration

Claude must configure built-in filters in `configSearch.js`:

```javascript
// Price filter
export const priceFilter = {
  schemaType: 'price',
  min: 0,
  max: 100000,
  step: 100
};

// Date range filter
export const dateRangeFilter = {
  schemaType: 'dates',
  availability: 'time-full',    // or 'time-partial'
  dateRangeMode: 'day'          // or 'night'
};

// Category filter
export const categoryFilter = {
  enabled: true,
  schemaType: 'category'
};

// Listing type filter
export const listingTypeFilter = {
  enabled: true,
  schemaType: 'listingType'
};
```

---

## 5. Backend Search Schema Requirement

Claude must always remind users that custom filters require backend search schema:

**CRITICAL**: Before a custom filter works, the search schema must be added via Sharetribe CLI:

```bash
# For enum/multi-enum fields
flex-cli search set --key=publicData.fieldName --type=enum -m your-marketplace-id

# For numeric (long) fields
flex-cli search set --key=publicData.fieldName --type=long -m your-marketplace-id

# For text fields
flex-cli search set --key=publicData.fieldName --type=text -m your-marketplace-id
```

Without this step, filters will appear in UI but return no results.

---

## 6. SchemaType to UI Component Mapping

Claude must apply this mapping when determining filter UI:

| schemaType | filterType | UI Component |
|---|---|---|
| `enum` | `SelectSingleFilter` | Dropdown single select |
| `enum` | `SelectMultipleFilter` | Checkbox multi-select |
| `multi-enum` | (automatic) | Checkbox multi-select |
| `long` | (automatic) | IntegerRangeFilter slider |
| `price` | (automatic) | PriceFilter range slider |
| `dates` | (automatic) | BookingDateRangeFilter calendar |
| `keywords` | (automatic) | KeywordFilter text input |
| `seats` | (automatic) | SeatsFilter numeric input |
| `category` | (automatic) | SelectSingleFilter tree |
| `listingType` | (automatic) | SelectSingleFilter dropdown |

---

## 7. Query Parameter Format

Claude must use correct query parameter formats:

| Filter Type | Format | Example |
|---|---|---|
| Single enum | Direct value | `pub_amenity=wifi` |
| Multi-enum (has_any) | Comma-separated | `pub_amenities=wifi,parking` |
| Multi-enum (has_all) | Prefixed | `pub_amenities=has_all:wifi,parking` |
| Price range | min,max | `price=100,5000` |
| Date range | ISO8601 | `dates=2025-01-01,2025-01-15` |
| Long range | min,max | `pub_bedrooms=2,5` |
| Keywords | Text | `keywords=apartment` |
| Category nested | Separate params | `pub_categoryLevel1=dogs&pub_categoryLevel2=poodle` |

---

## 8. Primary vs Secondary Filters

Claude must understand filter placement:

**Primary Filters** (`group: 'primary'`):
- Appear in main filter toolbar
- Always visible on desktop
- Limited space - use for most important filters

**Secondary Filters** (`group: 'secondary'`):
- Appear in "More Filters" modal/panel
- Hidden until user clicks to expand
- Use for less common or numerous filters

---

## 9. Validation Rules

Claude must ensure filters pass validation:

### 9.1 Enum Validation
- Values must exist in `enumOptions` array
- Invalid options are silently dropped

### 9.2 Price Validation
- Must be within configured min/max bounds
- Values outside range are clamped

### 9.3 Date Validation
- Must be valid ISO8601 format
- Start date must be >= 14 hours ago (UTC)
- Start date must be <= end date

### 9.4 Long (Numeric) Validation
- Must be within minimum/maximum bounds
- Must match step increments

---

## 10. Key Files Reference

Claude must know these file locations:

| Purpose | File Path |
|---|---|
| Filter configuration | `src/config/configSearch.js` |
| Listing fields config | `src/config/configListing.js` |
| Config merge logic | `src/util/configHelpers.js` |
| Filter validation | `src/containers/SearchPage/SearchPage.shared.js` |
| Filter UI routing | `src/containers/SearchPage/FilterComponent.js` |
| Redux state/actions | `src/containers/SearchPage/SearchPage.duck.js` |
| Search utilities | `src/util/search.js` |
| Type constants | `src/util/types.js` |

---

## 11. Implementation Constraints

### 11.1 Adding New Custom Filters

Claude must ensure:

- Backend search schema exists before expecting filter results
- `filterConfig.indexForSearch: true` is set in configuration
- `enumOptions` values exactly match data stored in listings
- `scope: 'public'` is used for searchable fields

### 11.2 Modifying Existing Filters

Claude must verify:

- New enum options are added to both config AND backend schema
- Existing listings with old values remain valid or are migrated
- URL parameter format remains consistent with existing bookmarks

### 11.3 Filter Type Changes

Claude must recognize:

- Schema type changes (enum → long) require backend schema updates
- Filter type changes affect URL parameter format
- UI component changes may require different filterConfig properties

---

## 12. Server-Side vs Client-Side Filtering

Claude must understand the current implementation:

**Server-Side (API filtered)**:
- `pub_listingType` - Always sent to API
- `price`, `dates`, `seats` - Processed by API
- `keywords` - Sent to API for title/description search

**Client-Side (filtered after fetch)**:
- Most `pub_*` custom filters are currently stripped before API call
- Filter logic must be added to SearchResultsPanel for true client-side filtering
- Consider progressive loading for large datasets

---

## 13. Troubleshooting Guidance

Claude must check these when filters don't work:

1. **Filter not appearing**: Check `indexForSearch: true` in filterConfig
2. **Filter shows but no results**: Verify backend search schema exists
3. **Invalid values ignored**: Check enumOptions match exactly
4. **Wrong UI component**: Verify schemaType and filterType combination
5. **Filter in wrong location**: Check `group` setting (primary/secondary)
6. **Category filter broken**: Verify nested params structure
7. **Price/date out of range**: Check min/max configuration

---

## 14. Constraints and Prohibitions

Claude must NOT:

- Add filters without `indexForSearch: true` expecting them to work
- Assume custom pub_ filters are sent to API (most are stripped)
- Create filters with enumOptions that don't match listing data
- Use private scope fields expecting them to be searchable
- Skip backend search schema setup for new filterable fields
- Mix up `has_all` vs `has_any` behavior for multi-enum

---

## 15. Priority and Conflict Resolution

When this skill conflicts with other skills:

- **code-review-principles**: Both apply - review filter code for quality
- **performance-review**: Consider filter query performance
- **security-penetration-testing**: Validate filter inputs properly

This skill takes precedence for filter-specific implementation decisions.

---

## End of Skill
