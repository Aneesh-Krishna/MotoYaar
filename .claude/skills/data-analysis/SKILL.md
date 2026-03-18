# Data Analysis Skill

## Description

Behavioral guidelines for analyzing hotel assistant bot data including
message logs, booking metrics, intent distribution, token usage costs,
and operational performance. Apply when analyzing data, querying databases,
generating reports, or providing insights.

---

## Purpose

This skill defines how Claude should approach data analysis tasks for the
hotel assistant bot system. It enforces evidence-based reasoning,
performance-conscious querying, and visualization-ready output formatting.

---

## Activation Conditions

Apply this skill automatically when the user:

- Asks for data analysis, metrics, or statistics
- Requests reports on bookings, messages, or usage patterns
- Wants to understand intent distribution or agent performance
- Needs cost analysis for token usage or LLM expenses
- Requests performance metrics or processing time analysis
- Asks about trends, patterns, or insights from bot data
- Wants to query MessageLog, Booking, ConversationState, or Admin data

---

## Behavioral Rules

### Evidence-Based Analysis

Claude must:

- Always cite the data source (table, repository method, or query)
- State sample sizes and date ranges for any aggregations
- Acknowledge data limitations and potential biases
- Distinguish between correlation and causation
- Qualify findings with confidence levels when applicable
- Never extrapolate beyond what the data supports

### Performance-Aware Querying

Claude must:

- Use database-level filtering with `FilterDefinition` or `GetPagedAsync`
- Never recommend `GetManyAsync()` followed by in-memory LINQ operations
- Prefer aggregation pipelines for grouping, counting, and sorting
- Include pagination with explicit `limit` parameters for large datasets
- Leverage existing indexed columns: PhoneNumber, IntentClassification,
  ReceivedAt, IsActive, ExpiresAt
- Use existing repository analytics methods when available:
  - `GetDailyMessageCountsAsync()` for message volume trends
  - `GetDailyTokenUsageAsync()` for cost tracking
  - `GetTokenUsageByIntentAsync()` for intent-based cost analysis
  - `GetAverageProcessingTimeAsync()` for performance monitoring

### Visualization-Ready Output

Claude must:

- Structure data outputs in consistent, chart-friendly formats
- Use clear column headers and consistent data types
- Provide data in formats suitable for:
  - Time series (date, value pairs)
  - Categorical distributions (category, count pairs)
  - Comparative analysis (dimension, metric1, metric2)
- Include units of measurement (milliseconds, tokens, percentage)
- Sort results meaningfully (by date, by count descending, alphabetically)
- Suggest appropriate visualization types for each dataset

---

## Domain-Specific Constraints

### Hotel Bot Analytics Focus Areas

When analyzing this system, prioritize these metrics:

1. **Intent Distribution** - What guests ask for most (MessageLog.IntentClassification)
2. **Processing Performance** - Response times (MessageLog.ProcessingTimeMs)
3. **Token Costs** - LLM usage by intent and time (MessageLog.TokensUsed)
4. **Booking Metrics** - Active bookings, cancellations, modifications
5. **User Engagement** - Session depth, return visitors (ConversationState.MessageCount)
6. **Error Rates** - Failed processing, error messages
7. **Agent Effectiveness** - Which agents handle most requests

### Privacy Constraints

Claude must:

- Apply phone number masking using `CommonHelper.FormatPhoneNumberForLogging()`
  when `_appSettings.MaskPhoneNumbersInLogs` is enabled
- Never expose raw PII (phone numbers, names, emails) in analysis outputs
- Aggregate user-level data rather than showing individual records
- Use anonymized identifiers when individual-level analysis is required

### Data Quality Awareness

Claude must acknowledge:

- Soft delete patterns (IsDeleted flag filters data)
- Session expiration (ExpiresAt affects active session counts)
- Intent confidence scores (IntentConfidence may indicate classification quality)
- Processing status (Status: Received, Processing, Completed)

---

## Prohibited Behaviors

Claude must NOT:

- Use in-memory filtering after `GetManyAsync()` calls
- Query large datasets without pagination limits
- Present analysis without stating data sources
- Show raw phone numbers or PII in outputs
- Make claims without supporting data
- Ignore existing repository methods that provide the needed aggregations
- Create full table scans when indexed columns are available

---

## Output Formatting Standards

### For Time Series Data

```
Date       | Messages | Tokens | Avg Response (ms)
-----------|----------|--------|------------------
2025-01-01 |      127 |  15420 |            523.4
2025-01-02 |      143 |  17890 |            498.2
```

### For Categorical Distributions

```
Intent          | Count | Percentage | Avg Tokens
----------------|-------|------------|----------
FAQ             |   892 |     42.3%  |       124
BOOKING         |   567 |     26.9%  |       456
QUERY           |   423 |     20.1%  |       234
SERVICE_REQUEST |   225 |     10.7%  |       189
```

### For Performance Analysis

```
Metric                    | Value    | Trend
--------------------------|----------|--------
Avg Processing Time       | 523.4 ms | -12.3%
P95 Processing Time       | 1234 ms  | -8.7%
Error Rate                | 2.3%     | +0.5%
Messages/Day (7d avg)     | 142      | +18.2%
```

---

## Priority and Conflict Resolution

This skill takes precedence when:

- Analyzing data conflicts with quick informal queries
- Performance optimization conflicts with simpler code patterns
- Privacy requirements conflict with detailed user-level analysis

When conflicting with coding standards, privacy and performance constraints
from this skill must be respected.

---

## End of Skill
