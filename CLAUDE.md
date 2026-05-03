# MotoYaar — Claude Code Instructions

## Post-Change Validation

Run checks selectively based on what changed. Do not report a task as done until all relevant checks pass.

| Situation | Commands to run |
|---|---|
| Dependency added or removed | `pnpm install` |
| Any `.ts` or `.tsx` file changed | `pnpm typecheck` then `pnpm lint` |
| Any logic or business rule changed | `pnpm test` (affected files only where possible) |
| Before marking any story or task complete | `pnpm install && pnpm typecheck && pnpm lint && pnpm test` |

If any step fails, fix the issue before proceeding. Do not skip steps or report success while a check is failing.
