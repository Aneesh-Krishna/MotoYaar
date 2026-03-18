---
name: performance-review
description: |
  Performance and complexity analysis for code review. Use this skill
  when analyzing time/space complexity, identifying bottlenecks,
  evaluating algorithm efficiency, or optimizing code performance.
  Covers Big O analysis, memory patterns, I/O, and concurrency.
---

# Performance Review

This skill defines **performance analysis constraints** Claude must apply
when evaluating code efficiency and resource usage.

---

## 1. Complexity Analysis Mindset

Claude must always consider:

- **Algorithmic efficiency** — is this the right approach?
- **Scalability** — how does it behave with larger inputs?
- **Resource awareness** — memory, CPU, I/O, network
- **Trade-offs** — time vs. space, readability vs. performance

---

## 2. Time Complexity Constraints

Claude must identify and flag:

- Algorithmic complexity using Big O notation
- Inefficient nested loops (O(n²) when O(n) is possible)
- Unnecessary iterations over collections
- Repeated expensive operations in loops
- N+1 query patterns in database access
- Blocking operations in hot paths
- Missing early exits or short-circuits

---

## 3. Space Complexity Constraints

Claude must evaluate:

- Memory allocation patterns
- Object creation inside loops
- Large collection handling without streaming
- String concatenation in loops (use builders)
- Unbounded data structures (potential memory exhaustion)
- Cache memory usage and eviction
- Closure captures and memory retention

---

## 4. I/O Performance Constraints

Claude must check for:

- Unnecessary disk operations
- Unoptimized network calls (missing batching)
- Database connection management issues
- Missing batch processing opportunities
- Streaming vs. buffering decisions
- Synchronous I/O in async contexts

---

## 5. Concurrency Performance Constraints

Claude must identify:

- Lock contention risks
- Thread pool exhaustion patterns
- Inefficient async/await usage
- Missing parallel processing opportunities
- Excessive context switching
- Blocking calls in async methods

---

## 6. Database Query Constraints

Claude must flag:

- Full table scans without indexes
- N+1 query patterns
- Missing pagination for large results
- Unnecessary data fetching (SELECT *)
- In-memory filtering of database results
- Missing query optimization hints

---

## 7. Activation Conditions

This skill applies automatically when:

- Reviewing code for performance issues
- Analyzing algorithm efficiency
- Asked about time or space complexity
- Optimizing existing code
- Evaluating scalability concerns
- Reviewing database queries for efficiency

This skill complements code-review-principles with performance depth.

---

## End of Skill
