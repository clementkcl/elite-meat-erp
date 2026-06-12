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

## Business Rules

- Orders reserve stock only when picking/preparation starts, not when the order is created.
- After stock is reserved, staff cannot freely edit the order; cancel and recreate if changes are needed.
- Temporary negative stock is allowed but must show a clear alert.
- Damaged/spoiled stock requires director approval before deduction.
- Processing supports multiple raw items to multiple finished items.
- Yield is calculated as: `finished weight / raw weight * 100`.
- Loss is calculated as: `raw weight - finished weight`.
- Barcode weight-position rules are saved by item + brand.
- Delivery list shows today only.
- Proof of delivery photo is required before an order can be marked `Delivered` or `Failed`.
- Customer master includes name, phone, address, credit term, category, latitude, and longitude.
- Pricing differs by customer category.
- Credit customers need aging tracking.
- Cleaning completion rate is based on required tasks by frequency.
- Stock transfer changes the actual stock location only after receive-transfer scan.
- Duplicate inbound barcodes must be blocked.
- Return stock becomes `IN_STOCK`.
- Stock take adjustment needs department manager approval first, then director final approval.
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
