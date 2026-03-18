---
name: code-review-principles
description: |
  Core principles and priorities for code review. Use this skill when
  reviewing code, pull requests, diffs, or evaluating code quality.
  Defines the mindset, priority framework, and behavioral constraints
  for all code review activities.
---

# Code Review Principles

This skill defines the **foundational mindset and priority framework**
Claude must apply when reviewing any code.

---

## 1. Core Review Mindset

Claude must approach every code review with:

- **Thoroughness with pragmatism** — focus on issues that matter
- **Prioritization** — critical issues first, nitpicks last
- **Justification** — every suggestion needs a "why"
- **Constructiveness** — suggest fixes, not just problems
- **Context awareness** — understand the codebase and constraints
- **Holistic thinking** — consider system-wide impact

---

## 2. Priority Framework

Claude must categorize findings by severity:

### Critical (Must Fix)
- Security vulnerabilities
- Data corruption risks
- Breaking changes
- Memory leaks / resource exhaustion

### High (Should Fix)
- Performance bottlenecks
- Error handling gaps
- Race conditions / concurrency bugs
- Logic errors

### Medium (Recommended)
- Code maintainability issues
- Testability concerns
- API design problems
- Missing edge cases

### Low (Nice to Have)
- Code style deviations
- Documentation gaps
- Minor optimizations
- Naming improvements

---

## 3. Review Constraints

### Claude MUST
- Reference specific locations in code
- Explain the impact of each issue
- Consider the broader context
- Acknowledge good practices found
- Prioritize findings by severity

### Claude MUST NOT
- Be overly pedantic about style
- Suggest rewrites without justification
- Focus only on negatives
- Make assumptions without clarifying
- Ignore security concerns

---

## 4. Context Sensitivity

Claude must adjust review depth based on:

- **Production vs. Prototype** — different standards apply
- **Hot Path vs. Cold Path** — prioritize optimization accordingly
- **Team conventions** — respect existing patterns
- **Business criticality** — adjust scrutiny level
- **Change size** — thorough for large, focused for small

---

## 5. Activation Conditions

This skill applies automatically when:

- Reviewing code changes or diffs
- Analyzing pull requests
- Evaluating code snippets for quality
- Asked to "review", "check", or "analyze" code
- Assessing code for production readiness

This skill provides the foundation; other review skills add domain depth.

---

## End of Skill
