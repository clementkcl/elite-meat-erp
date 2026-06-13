# UX Agent Guide

This guide defines the UX-focused agents for Elite Meat ERP. Use these agents to make future Codex work easier for real staff to use without changing business rules unnecessarily.

## Global UX Principles

- Mobile-first for worker screens.
- Keep desktop dashboards useful for managers and directors.
- Use clear, simple English.
- Prefer large touch targets and obvious primary actions.
- Minimize typing.
- Show clear success and error messages.
- Keep role, team, outlet, department, and stock-location restrictions intact.
- Do not use technical database errors as normal worker-facing text.
- Do not change database schema unless necessary for safe workflow behavior.
- Do not change business logic unless a bug blocks usability.

## 1. Worker UX Agent

Purpose: Make worker pages simple, mobile-first, fast, and easy to understand.

Use for:

- Stock worker screens.
- Retail worker screens.
- Cleaning task pages.
- Attendance clock pages.
- Processing worker entry pages.

Focus:

- Big buttons.
- Minimal typing.
- Clear success and error messages.
- No unnecessary fields.
- One main action per screen.
- Smooth daily workflow.

Acceptance checks:

- The worker can identify the main action immediately.
- The task can usually be completed in fewer than 5 steps.
- Required fields are obvious.
- Optional fields do not block the main task.
- Error messages say what to fix next.

## 2. Mobile Scanner UX Agent

Purpose: Improve all barcode scanning pages.

Use for:

- `/stock/inbound`
- `/stock/outbound`
- `/stock/transfer`
- `/stock/receive-transfer`
- `/stock/return`
- `/stock/stock-take`
- Any future processing barcode scan page.

Focus:

- Large Scan Barcode button.
- Continuous scanning.
- Recent scan list.
- Duplicate barcode warning.
- Missing barcode warning.
- Manual fallback.
- Camera permission message.
- Works on phone width around 390px.

Acceptance checks:

- Scan button is visible without hunting.
- Recent scans remain visible after multiple scans.
- Duplicate and missing barcode states are understandable.
- Manual entry works when camera permission is denied.
- Camera stream stops when the scanner closes.

## 3. Manager Dashboard UX Agent

Purpose: Make manager pages useful for decision-making.

Use for:

- Retail manager dashboard.
- Processing manager dashboard.
- Delivery manager dashboard.
- Cleaning manager views.
- Attendance department view.
- Approval queues.

Focus:

- Pending review first.
- Team, outlet, or department scope badge.
- Missing tasks.
- Alerts.
- Simple KPI cards.
- Today, this week, and this month filters.

Acceptance checks:

- Manager can see what needs action first.
- Scope is visible.
- Alerts are separated from normal information.
- KPI cards are readable on desktop and mobile.
- Filters do not hide urgent work accidentally.

## 4. Driver UX Agent

Purpose: Make delivery workflow easy for drivers.

Use for:

- `/delivery/driver`
- delivery proof upload
- delivery status updates
- delivery payment collection

Focus:

- Today delivery list only.
- Customer address and map button.
- Payment type.
- Proof photo upload.
- Delivered / Failed action.
- No confusing finance details.

Acceptance checks:

- Driver sees today jobs first.
- Address is easy to copy/open in maps.
- Delivered and Failed actions are obvious.
- Proof photo, receiver/contact name, and GPS fields are clear.
- Finance/admin-only details are hidden from driver workflow unless needed.

## 5. Error And Empty State Agent

Purpose: Make all errors and empty pages understandable.

Use for:

- Empty tables.
- Setup missing states.
- Permission blocks.
- Failed form submissions.
- Upload errors.
- Scanner errors.
- RLS or workflow blocked actions.

Focus:

- Explain what happened.
- Tell user what to do next.
- Avoid technical messages for normal workers.
- Add empty states for pages with no data.
- Add blocked-action messages.

Acceptance checks:

- User knows whether the issue is permission, missing setup, invalid input, or no data yet.
- The next action is stated.
- Technical details are kept for admin/debug contexts.
- Page remains usable after an error.

## 6. Accessibility And Language Agent

Purpose: Make ERP readable and ready for multilingual use later.

Use for:

- Labels.
- Forms.
- Tables.
- Buttons.
- Mobile layouts.
- Repeated operational text.

Focus:

- Clear labels.
- Large touch targets.
- Simple English.
- Avoid cramped tables on mobile.
- Prepare labels for future Chinese/Iban translation.

Acceptance checks:

- Buttons and form controls are easy to tap.
- Labels explain the business meaning.
- Long tables have mobile-friendly alternatives or horizontal handling.
- Text avoids slang and dense technical wording.
- Repeated text can later move into translation dictionaries.

## 7. User Journey QA Agent

Purpose: Test workflows from a normal user point of view.

Use after UX changes and before handoff.

Focus:

- Can worker complete task in less than 5 steps?
- Is the main button obvious?
- Is mobile view usable?
- Is wrong data blocked clearly?
- Does the user know what to do next?

Acceptance checks:

- One happy path is documented.
- One blocked or invalid path is documented.
- Mobile 390px width is considered.
- Role/scope restrictions still hold.
- Remaining usability risks are listed in `HANDOFF.md`.

## Recommended First UX Task

Start with the Mobile Scanner UX Agent on `/stock/inbound` and `/stock/outbound`, because scanning is central to stock accuracy and worker speed.

