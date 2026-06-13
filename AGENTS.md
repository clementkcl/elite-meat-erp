<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes -- APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Elite Meat ERP Agent Guide

## Project Purpose

Elite Meat ERP is a web-based ERP for frozen pork trading, meat processing, inventory, cleaning task tracking, delivery, import/container tracking, barcode scanning, and operational reports.

The system is intended for internal business workflows across outlets, departments, stock locations, processing teams, delivery teams, accounting, admin, and director-level reporting.

## Coding Rules

- Use TypeScript.
- Keep business logic in `lib/`.
- Keep reusable UI components in `components/`.
- Keep mock data in `data/mock/`.
- Do not duplicate calculation logic inside pages.
- Do not remove existing working features.
- Design mobile-first. Phone-width workflows must remain usable.
- Do not put Supabase service-role keys or other secrets in frontend code.
- Do not create destructive migrations unless explicitly requested.
- Keep route/page files thin; pages should compose data loaders, actions, and reusable components.
- Prefer existing project patterns before adding new abstractions.

## UX Agent Rules

Future Codex tasks should select a UX agent when the requested change affects how staff use a page, form, scanner, dashboard, or workflow.

- Use the Worker UX Agent for shop-floor, retail, stock, cleaning, attendance, and processing worker screens.
- Use the Mobile Scanner UX Agent for barcode scanner screens and scan-heavy stock workflows.
- Use the Manager Dashboard UX Agent for manager dashboards, approval queues, alerts, and KPI pages.
- Use the Driver UX Agent for delivery driver pages and delivery proof workflows.
- Use the Error and Empty State Agent for missing data, blocked actions, errors, setup issues, and empty lists.
- Use the Accessibility and Language Agent for labels, touch targets, mobile readability, and future translation readiness.
- Use the User Journey QA Agent after UX changes to verify the normal-user path.

UX agents must not change database schema unless necessary, must not weaken role/team/outlet restrictions, must not put service-role keys in frontend code, and must keep desktop dashboards usable while making mobile worker screens simple.

Before finishing UX-affecting work, run:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

For detailed workflow, read:

- `docs/AGENT_WORKFLOW.md`
- `docs/UX_AGENT_GUIDE.md`
- `docs/USER_FRIENDLY_CHECKLIST.md`

## Business Rules

- Orders reserve stock only when picking/preparation starts, not when the order is created.
- After stock is reserved, staff cannot freely edit the order; cancel and recreate if changes are needed.
- Temporary negative stock is allowed but must show a clear alert.
- Damaged/spoiled stock requires staff request with photo, manager review, then director approval before deduction.
- Processing supports multiple raw items to multiple finished items.
- Yield is calculated as: `finished weight / raw weight * 100`.
- Loss is calculated as: `raw weight - finished weight`.
- Barcode weight-position rules are saved by item + brand + origin.
- Delivery list shows today only.
- Proof of delivery photo is required before an order can be marked `Delivered` or `Failed`.
- Customer master includes name, phone, address, credit term, category, latitude, and longitude.
- Pricing differs by customer category.
- Credit customers need aging tracking.
- Cleaning completion rate is based on required tasks by frequency.
- Stock transfer changes the actual stock location only after receive-transfer scan.
- Transfer outbound sets stock to `TRANSFER_PENDING`; transfers cannot be cancelled after scanned out.
- Duplicate inbound barcodes must be blocked.
- Return stock becomes `IN_STOCK`.
- Customer return after sale goes to `HOLD` or `INSPECTION` first; failed-delivery barcode returns go back to `IN_STOCK`.
- Stock take adjustment needs department manager approval first, then director final approval.
- Stock take locks only the selected item + brand at the selected location while counting is open.
- Delivery proof requires photo, receiver name, and GPS location.
- Uploading valid delivery proof marks the delivery delivered.
- Failed delivery must flow into a reinbound/return stock workflow before stock is considered resolved.
- Processing abnormal yield below 85% is alert-only, not approval-blocked.
- Customer categories are Retail, Wholesale, and VIP for current business direction.
- Staff price override requires a recorded reason.
- Barcode decoding supports GS1 `3102`/`3103`, position rules, fixed-weight fallback, and manual confirmation when confidence is low.
- Cleaning does not require photos; late cleaning is late, not completed on time.

## Build And Check Commands

Run these before handing off code changes:

```bash
npm run lint
npm run typecheck
npm run build
```

If a command fails, report the exact error and avoid unrelated fixes.

## Agent Workflow

Before coding:

1. Read `AGENTS.md`.
2. Read `HANDOFF.md`.
3. Read `docs/BUSINESS_RULES.md`.
4. Inspect the relevant module files before editing.

While working:

- Work on one module only.
- Make the smallest safe change for the requested task.
- Do not change app behavior outside the requested module.
- Do not merge automatically.
- Do not deploy production automatically.

After changes:

- Update `HANDOFF.md`.
- Summarize changed files.
- Summarize risks and remaining manual tests.
- Run the build/check commands when the task involves code behavior.
