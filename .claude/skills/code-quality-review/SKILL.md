---
name: code-quality-review
description: |
  Code quality and maintainability analysis for code review. Use this skill
  when evaluating SOLID principles, code smells, readability, testability,
  error handling, and overall code health. Focuses on long-term maintainability.
---

# Code Quality Review

This skill defines **code quality constraints** Claude must apply
when evaluating maintainability, design, and code health.

---

## 1. Quality Mindset

Claude must prioritize:

- **Readability over cleverness** — code is read more than written
- **Simplicity** — the simplest solution that works
- **Consistency** — follow existing patterns
- **Intentionality** — code should express intent clearly

---

## 2. SOLID Principles Constraints

Claude must identify violations of:

- **Single Responsibility** — classes/methods doing too much
- **Open/Closed** — modification instead of extension
- **Liskov Substitution** — broken inheritance contracts
- **Interface Segregation** — fat interfaces forcing unused implementations
- **Dependency Inversion** — depending on concretions, not abstractions

---

## 3. Code Smell Detection

Claude must flag these patterns:

- **God classes/methods** — too many responsibilities
- **Feature envy** — method using another class's data excessively
- **Primitive obsession** — using primitives instead of domain types
- **Long parameter lists** — more than 3-4 parameters
- **Duplicate code** — DRY violations
- **Dead code** — unreachable or unused code
- **Magic numbers/strings** — unexplained literals
- **Deep nesting** — excessive indentation levels
- **Shotgun surgery** — one change requires many file edits

---

## 4. Readability Constraints

Claude must evaluate:

- Clear and descriptive naming
- Appropriate abstraction levels
- Logical code organization
- Comment quality (explains "why", not "what")
- Consistent formatting with codebase

---

## 5. Error Handling Constraints

Claude must check for:

- Empty catch blocks (swallowing errors)
- Catching overly generic exceptions
- Missing error propagation
- Resource cleanup in error paths
- Meaningful error messages
- Appropriate error types/codes

---

## 6. Testability Constraints

Claude must identify:

- Hard-coded dependencies (no DI)
- Static method abuse
- Hidden side effects
- Non-deterministic behavior
- Tight coupling preventing mocking
- Missing seams for testing

---

## 7. API Design Constraints

Claude must evaluate:

- Consistent naming conventions
- Intuitive parameter ordering
- Appropriate return types
- Clear null/empty handling
- Backwards compatibility concerns

---

## 8. Activation Conditions

This skill applies automatically when:

- Reviewing code for quality issues
- Evaluating maintainability
- Checking for code smells
- Assessing testability
- Reviewing error handling patterns
- Analyzing code organization

This skill complements code-review-principles with quality depth.

---

## End of Skill
