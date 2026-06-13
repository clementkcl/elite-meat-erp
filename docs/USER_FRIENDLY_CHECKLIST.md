# User Friendly Checklist

Use this checklist before handing off any UX-affecting change.

## General

- [ ] The page has one obvious main action.
- [ ] The page works at phone width around 390px.
- [ ] Buttons and controls are large enough for touch.
- [ ] Required fields are clear.
- [ ] Optional fields do not distract from the main task.
- [ ] The page avoids unnecessary typing.
- [ ] Success messages confirm what changed.
- [ ] Error messages explain what happened and what to do next.
- [ ] Empty states explain why there is no data.
- [ ] Blocked actions explain permission or workflow requirements.
- [ ] Role, outlet, department, team, and stock-location restrictions still hold.

## Worker Pages

- [ ] Worker can complete the main task in fewer than 5 steps where practical.
- [ ] Main action button is visible without scrolling on mobile where practical.
- [ ] The screen does not show manager/admin-only details.
- [ ] Daily workflow is fast and repetitive tasks are easy.
- [ ] Form defaults match the worker's assigned scope.

## Barcode Scanner Pages

- [ ] Large Scan Barcode button exists.
- [ ] Manual fallback exists.
- [ ] Camera permission message is clear.
- [ ] Recent scan list is visible.
- [ ] Duplicate barcode warning is clear.
- [ ] Missing barcode warning is clear.
- [ ] Sold/outbounded barcode warning is clear where relevant.
- [ ] Continuous scanning does not lose the current context.
- [ ] Scanner closes and camera stream stops.
- [ ] Layout is usable around 390px wide.

## Manager Dashboards

- [ ] Pending review/action items appear first.
- [ ] Scope badge shows outlet, department, team, or all-scope view.
- [ ] Missing tasks or overdue items are visible.
- [ ] Alerts are visually distinct from normal KPI cards.
- [ ] Today, this week, and this month filters are available where useful.
- [ ] KPI labels are simple and business-readable.

## Driver Workflow

- [ ] Today delivery jobs are shown first.
- [ ] Customer address is easy to see.
- [ ] Map/open-location action is available where possible.
- [ ] Payment type/status is visible without finance clutter.
- [ ] Proof photo upload is obvious.
- [ ] Delivered and Failed actions are clear.
- [ ] Failed delivery explains return/reinbound follow-up.

## Error And Empty States

- [ ] No raw database error is shown to normal workers.
- [ ] Setup errors tell admin what migration/config is missing.
- [ ] Permission errors explain the role/scope requirement.
- [ ] Empty tables say what data would appear there.
- [ ] Upload/scanner failures suggest a next action.

## Accessibility And Language

- [ ] Labels use simple English.
- [ ] Business terms are consistent across pages.
- [ ] Touch targets are not cramped.
- [ ] Tables are not unusable on mobile.
- [ ] Text is ready to extract for future Chinese/Iban translation.

## QA Handoff

- [ ] One happy path was tested or documented.
- [ ] One blocked/invalid path was tested or documented.
- [ ] Commands were run:
  - [ ] `npm.cmd run lint`
  - [ ] `npm.cmd run typecheck`
  - [ ] `npm.cmd run build`
- [ ] Remaining risks were added to `HANDOFF.md`.
