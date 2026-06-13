# Agent Workflow

Elite Meat ERP agents must protect business rules first, then improve usability in small, testable steps.

## Before Starting

1. Read `AGENTS.md`.
2. Read `HANDOFF.md`.
3. Read `docs/BUSINESS_RULES.md`.
4. Read `docs/UX_AGENT_GUIDE.md` when the task affects UI, forms, workflows, scanners, dashboards, errors, empty states, or mobile use.
5. Inspect the relevant module files before editing.

## Pick The Right Agent

- Logic/Data Agent: database logic, RLS, server actions, state transitions, calculations, and workflow correctness.
- UI Agent: page/component layout and interaction work that does not change business rules.
- QA Agent: audits, regression checks, manual test documents, route checks, and browser/device verification.
- Worker UX Agent: simple worker screens, mobile-first daily tasks, minimal typing.
- Mobile Scanner UX Agent: barcode scanning flows and phone-width scanner usability.
- Manager Dashboard UX Agent: manager review queues, alerts, scope badges, and KPI filters.
- Driver UX Agent: driver delivery list, proof upload, payment collection, delivered/failed actions.
- Error and Empty State Agent: understandable failures, setup guidance, blocked-action messages, and empty pages.
- Accessibility and Language Agent: readable labels, large touch targets, mobile tables, simple English, translation readiness.
- User Journey QA Agent: end-to-end normal-user usability checks.

## Work Rules

- Work on one module or workflow at a time.
- Keep business logic in `lib/`.
- Keep reusable UI in `components/`.
- Do not duplicate calculation logic inside pages.
- Do not remove working features.
- Do not weaken role, team, outlet, department, stock-location, or RLS restrictions.
- Do not use Supabase service-role keys in frontend code.
- Do not create destructive migrations.
- Do not change database schema for UX-only tasks unless the task cannot work safely without it.
- Preserve desktop dashboard usability while simplifying mobile worker screens.

## UX Task Flow

1. Identify the primary user: worker, manager, driver, admin, account, or director.
2. Identify the main job on the screen.
3. Keep one main action obvious.
4. Remove or hide unnecessary fields where business rules allow it.
5. Prefer selectable lists, scanning, buttons, toggles, and defaults over manual typing.
6. Add clear success, error, blocked, loading, and empty states.
7. Check phone width around 390px.
8. Document manual QA steps.

## Required Checks

Run these before handing off UX or code changes:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Run smoke checks when route coverage, workflow guards, or critical strings changed:

```bash
npm.cmd run smoke
```

## Handoff

After changes, update `HANDOFF.md` with:

- task completed
- files changed
- migrations added or not added
- commands run and results
- remaining risks
- next recommended task

