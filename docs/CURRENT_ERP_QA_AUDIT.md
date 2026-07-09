# Current ERP QA Audit

Date: 2026-06-24

Scope: Current worktree audit for logic, stability, role/outlet access, user friendliness, and readiness. This pass did not change runtime code, database schema, RLS policies, routing architecture, module architecture, or core business logic.

## Executive Summary

Overall readiness: Partially Ready.

The current build is source/build stable: lint, typecheck, production build, and the full smoke suite all pass. The app has broad module coverage across Stock, Orders, Delivery, Retail, OA Actions, Attendance, Accounting/Finance, Director Reports, Settings, and WhatsApp CRM. Source-level smoke guards are strongest for Stock, Retail, Orders, Delivery, and WhatsApp CRM.

Follow-up Task 1 fixed the two auth/profile fail-open behaviors identified as High severity:

- Authenticated users without a matching `profiles` row now fail closed instead of receiving the privileged demo profile.
- `outlet_module_access` query errors now fail closed with no module access instead of granting all module keys.

Those fixes do not change Supabase auth foundation, schema, RLS policies, routing architecture, module architecture, or business workflow rules. They only prevent bad profile/setup states from becoming too permissive in app-level profile/module decisions.

There is also a business-rule conflict in Orders: the agent guide says stock should be reserved only when picking/preparation starts, while the current Order create flow and smoke coverage reserve stock when a confirmed Manual ERP order is created. This needs a product decision before Order readiness is signed off.

## Follow-up Task 1 - Critical/High Stability Fixes

| Issue | Severity | Status | Fix |
| --- | --- | --- | --- |
| Authenticated user missing `profiles` row received demo admin/director profile. | High | Fixed | `getCurrentProfile()` now logs the setup problem and returns `null`, so existing login/route/action paths fail closed. |
| `outlet_module_access` lookup error granted all modules. | High | Fixed | Module access load errors now log server-side and leave `moduleAccess` empty. |

Remaining Critical/High issues after this fix:

- No remaining Critical stability bug was confirmed in this source-level pass.
- The Orders reservation timing conflict remains High product/business-risk, but it was not changed because this follow-up was limited to critical/high stability bugs and the reservation decision affects core business logic.
- Live Supabase role/RLS, Storage, browser, and device evidence remains required before production readiness.

## Test Command Results

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run lint` | Passed | ESLint completed with exit code 0. |
| `npm.cmd run typecheck` | Passed | `tsc --noEmit` completed with exit code 0. |
| `npm.cmd run build` | Passed | Next.js 16.2.9 production build completed. Build output listed 110 app page routes and 7 API routes. |
| `npm.cmd run smoke` | Passed | Route smoke plus WhatsApp CRM, Delivery, Retail, Orders, and Stock coverage scripts all passed. |
| Conventional test discovery | None found | `rg --files -g "*.test.*" -g "*.spec.*"` returned no test/spec files. Coverage is script-based. |
| Tracked env check | Passed | `git ls-files .env .env.local .env.example .vercel` returned no tracked env files. |
| Local env ignore check | Passed | `git check-ignore -v .env.local .env .vercel` confirmed local env/deployment directories are ignored. |
| Secret string scan | Reviewed | Service-role references are present in server-only/API helpers, QA scripts, docs, and SQL grants; no frontend component exposure was found in this audit. |
| Follow-up Task 1 smoke guard | Added | `scripts/smoke-routes.mjs` now fails if missing-profile or module-access lookup errors grant elevated/demo access again. |
| Follow-up Task 1 required checks | Passed | `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run smoke` all passed after the stability fixes. |

## Discovery Summary

| Area | Found |
| --- | --- |
| App page routes | 110 `page.tsx` files under `app/`. |
| API routes | 7 `route.ts` files: Retail file signing and WhatsApp CRM AI, broadcast, profile, orders, send, webhook. |
| Loading/error routes | Shared ERP `app/(erp)/loading.tsx` and `app/(erp)/error.tsx`; no module-specific route error/loading/not-found files were found. |
| Important module libraries | `lib/auth`, `lib/stock`, `lib/orders`, `lib/delivery`, `lib/retail`, `lib/attendance`, `lib/oa-actions`, `lib/finance`, `lib/settings`, `lib/whatsapp-crm`. |
| Important UI components | `components/erp`, `components/stock`, `components/orders`, `components/delivery`, `components/retail`, `components/attendance`, `components/finance`, `components/oa-actions`, `components/whatsapp-crm`. |
| Smoke/coverage scripts | 45 script files under `scripts/`. |
| Build scripts | `dev`, `build`, `start`, `lint`, `typecheck`, `smoke` in `package.json`. |

## Module-by-Module QA Table

| Module | Workflow Readiness | Access / Isolation | Loading / Empty / Error States | UX Readiness | QA Verdict |
| --- | --- | --- | --- | --- | --- |
| Auth / App Shell / Dashboard | Login, app shell, dashboard shortcuts build and route correctly. | Follow-up Task 1 fixed missing-profile and module-access query fail-open behavior. AppShell hides routes and most pages add server guards. | Module access block exists with clear empty-state wording. | Mobile nav exists; scope badge and role badge visible. | Partial. Needs live role/profile setup QA. |
| Stock | Strongest coverage. Inbound, outbound, transfer, receive-transfer, return, damage/spoilage, return supplier, stock take, labels, reports, scanner, and role/scope guards are in smoke. | Source guards and RLS policy coverage scripts pass; real Supabase role/device evidence still needed. | Many clear blocked states: duplicate barcode, camera blocked, wrong location, wrong item/brand, connection lost. | Mobile scanner UX is heavily source-guarded; real phone camera and printer still not proven. | Strong partial. Ready for controlled UAT after live role/device proof. |
| Orders | Create/order picking/ready/customer/detail flows build and smoke. Create Order guided flow has validation and review steps. Risk: business-rule conflict between reserve-on-picking guidance and current reserve-on-create behavior. | Route and actions role-gated; order loaders rely on RLS and broad row loads. | Order page catches loader failure; missing scoped order shows not-found wording. | Worker flow improved; total-price-only rule is clear. | Partial. Needs product decision on reservation timing, authenticated browser QA, and live reservation/picking proof. |
| Delivery | Canonical driver V1, manager dashboard, detail, expenses, and legacy compatibility routes build. Coverage script passes. | Delivery actions/queries have role checks; driver finance exposure was previously documented as hardened. Legacy payment surfaces remain manager/admin-scoped. | Driver and manager pages include setup/load failure messages. | Driver mobile page is focused on delivery status/proof/expenses, but real phone camera/GPS proof is still required. | Partial. Production proof upload and GPS require real device/staging QA. |
| Retail | Retail V1 one-task pages, daily sales, cash, expenses, cleaning, processing, reports, settings, redirects, and 40 E2E source scenarios pass. | Retail routes/actions use role/module gates and outlet-scoped data; prior docs show direct storage cross-outlet checks passed. | Permission card and empty states exist. Some actions still pass raw database error text through failure messages. | Worker and manager flows are more focused; final real phone/browser pass still recommended. | Strong partial. Suitable for limited UAT after final manual role walkthrough. |
| WhatsApp CRM | Inbox, chat, profile, order, assignment, notifications, broadcast, AI suggestion, send, webhook, owner dashboard, and Cloud API coverage pass. | API send/orders/profile routes require current profile; webhook uses signature verification and admin client. Risk: admin client APIs inherit profile fail-open behavior if profile is bad. | UI has empty chat/customer states and send/order/profile errors. | Desktop and mobile source coverage exists. | Partial. Live Meta webhook, account mapping, real phones, and masked evidence remain required. |
| Processing | Dashboard/batches route builds; processing page has role/module gate and summary states. | Module gate is present; processing remains limited versus target multi-raw/multi-finished barcode model. | Empty state exists for processing records. | Basic manager/worker UI exists; target workflow is not complete. | Partial. Functional but not final target processing model. |
| Attendance / Cleaning | Routes build; attendance has GPS clock forms and module gate. Cleaning redirects/tasks build. | Attendance actions check roles/module; cleaning route access is role/module gated. | GPS error text and empty/setup states exist. | Worker clock UX is straightforward, but real GPS radius testing not done. | Partial. Needs live GPS/role QA. |
| OA Actions | Advance, claim, leave, payslip, dashboard, my requests build; action state and approval timeline exist. | Role checks exist in actions; route guarded by module and OA roles. | Empty approval activity exists. Raw DB errors can surface. | Forms are serviceable but not deeply mobile-tested in this pass. | Partial. Needs live approval-chain QA. |
| Finance / Accounting / Director | Finance dashboards, invoices, containers, director reports build. | Finance module blocks to account/admin/director; director reports admin/director. | Data loader errors surface; demo fallback when Supabase absent. | Desktop dashboard usable; phone UX not primary. | Partial. Needs live role and sensitive-data verification. |
| Admin / Settings | Settings route is admin-only and builds. | Admin role gate exists; settings reads many tables with RLS dependency. | Settings load errors are visible. | Dense admin UI acceptable for desktop; not audited deeply for mobile. | Partial. Needs admin-only live QA. |

## UX Issues by Role

| Role | Findings |
| --- | --- |
| Worker | Stock and Retail worker screens are much closer to mobile-first, big-button flows. Remaining risk is real device proof: 390px authenticated browser, scanner camera permissions, GPS, file picker, and printer behavior were not verified in this pass. |
| Mobile scanner user | Source guards cover camera permission messages, manual entry, duplicate warnings, and scan context. Real rear-camera behavior, stream shutdown, continuous scan comfort, and Bluetooth/PDF label output still need device evidence. |
| Driver | `/delivery/driver` is driver-focused and avoids price/cost/order finance in the canonical mobile page. Proof photo and GPS states need real phone evidence. Driver expense amount is visible because expense submission requires amount entry. |
| Manager | Retail, Delivery, Stock, and Processing manager views surface queues/KPIs, but source review found many raw database error pass-throughs in actions. Manager QA should include rejection, approval, same-submitter block, and cross-outlet denied cases. |
| Admin | Settings and global views build. Admin pages are dense and mostly desktop-oriented; acceptable for admin work but not fully mobile-reviewed. |
| Finance / Account | Finance/OA amount and aging surfaces are role-scoped to account/admin/director. Needs live role QA to ensure non-finance users cannot reach finance data directly or via legacy routes. |
| Director | Director dashboards/reports build and are gated. Needs final live data review for approval queues and sensitive totals. |

## Stability Bugs / Risks

1. Fixed in Follow-up Task 1: authenticated users with no profile row now fail closed instead of receiving demo admin/director access.
2. Fixed in Follow-up Task 1: module access query errors now fail closed instead of granting every module.
3. Order reservation timing conflicts with the supplied business rule: current code and smoke coverage reserve on confirmed order creation, while the guide says reserve when picking/preparation starts.
4. Many actions rethrow Supabase messages and then return them to users, for example `return failure(error instanceof Error ? error.message : "Action failed.")`. This can expose technical/RLS text to workers.
5. The shared ERP error boundary renders `error.message`, which is useful for debugging but not ideal for normal staff-facing failures.
6. Most data loaders use broad `select("*").limit(1000)` table reads and then map/filter in app code. RLS may protect rows, but this can create scale gaps and accidental field exposure.
7. There are no conventional unit/integration test files. Regression confidence depends on custom smoke scripts and manual QA docs.
8. Authenticated browser/device QA was not completed in this pass. Existing docs also record prior Windows browser automation failures with `CreateProcessAsUserW failed: 5`.
9. Live Supabase role/outlet isolation was not re-run for every module in this pass.
10. WhatsApp CRM live UAT remains not accepted without public webhook, live Meta setup, account mapping, and real phone evidence.
11. Delivery proof, GPS, camera, and failed-delivery reinbound flows require real phone/staging evidence.

## Security / Data Leakage Findings

| Severity | Finding | Evidence | Recommendation |
| --- | --- | --- | --- |
| High | Missing profile row granted demo admin/director profile. | Fixed in Follow-up Task 1: `lib/auth/session.ts` now returns `null` for authenticated users without profile rows. | Run live setup QA with a user missing a profile row to verify the user is blocked cleanly. |
| High | Module access lookup error granted all modules. | Fixed in Follow-up Task 1: `lib/auth/session.ts` now leaves `moduleAccess` empty on lookup error. | Run live module-access failure/disabled-module QA to verify fail-closed behavior. |
| Medium | API routes using `getCurrentProfile()` inherit the profile fail-open risk. | `app/api/whatsapp/send/route.ts`, `app/api/whatsapp/orders/route.ts`, `app/api/whatsapp/customer-profile/route.ts`, `app/api/retail/files/route.ts`. | Fix profile fail-open first, then add targeted API route negative tests. |
| Medium | Broad `select("*").limit(1000)` loaders rely heavily on RLS and may over-fetch sensitive fields. | Loaders in `lib/attendance/data.ts`, `lib/orders/data.ts`, `lib/retail/data.ts`, `lib/delivery/data.ts`, `lib/finance/data.ts`, `lib/settings/data.ts`, `lib/stock/data.ts`, `lib/oa-actions/data.ts`. | Replace with column-specific selects and server-side filters module by module. |
| Medium | Raw Supabase errors can surface to normal users. | Many action files throw `error.message` and return it through form state. | Map database/RLS errors to user-safe text; keep raw detail in server logs only. |
| Medium | Finance-sensitive route protection depends on correct role/profile state. | `/accounting-finance/*`, `/director-reports/*`, `/delivery/payments`, order total price UI. | After auth fail-open fix, run negative role tests for worker/driver/account/admin/director. |
| Low/Medium | Development-only profile debug page is not admin-gated in non-production. | `app/(erp)/debug/profile/page.tsx` returns `notFound()` only when `NODE_ENV === "production"` and otherwise shows current-session profile/module diagnostics. | Keep out of shared staging or add an admin/developer role gate. |

## Top 10 Priority Issues

1. Decide and align Order reservation timing: reserve on picking/preparation per the guide, or update the business rule and affected UX/smoke docs to reserve on create.
2. Add automated negative tests for role missing, module disabled, wrong outlet, wrong department, and wrong stock location.
3. Live-test the fixed missing-profile and module-access fail-closed behavior with real Auth users/setup states.
4. Replace raw database error pass-throughs with user-safe worker/manager messages.
5. Run live Supabase role/outlet isolation tests for every major module, not only source guards.
6. Run authenticated browser QA at desktop and 390px mobile widths for worker, manager, account, admin, director, and driver users.
7. Run real device QA for scanner camera permission, continuous scanning, file picker/photo upload, GPS allowed/denied, and label printing/PDF fallback.
8. Tighten broad table loaders to select only required columns and push filters into Supabase queries.
9. Complete WhatsApp CRM live UAT with public webhook, Meta verification, account mapping, real phones, duplicate/media/send evidence, and masked screenshots.
10. Keep `/debug/profile` out of shared QA environments or add a non-production admin/developer gate.

## What Passed

- TypeScript, lint, production build, and full smoke suite passed.
- Route build output covered the current app route surface.
- Stock smoke coverage is broad across scanner, workflows, RLS policy source checks, labels, reports, seed safety, mobile UX, and state transitions.
- Retail V1 coverage passed, including 40 scripted E2E source scenarios.
- Order UX and environment coverage passed.
- Delivery module coverage passed.
- WhatsApp CRM coverage passed across auth, mobile inbox, chat, webhook, send, profile, orders, assignment, notifications, broadcast, AI suggestion, owner dashboard, desktop layout, and Cloud API hardening.
- No frontend service-role key usage was found in app/components/lib source; service-role usage is server/API/script oriented.
- Runtime code was not changed during this audit.

## What Failed

No executed command failed in this pass.

The audit still identifies readiness blockers:

- Order reservation timing conflict between the supplied rule and current implementation.
- Missing live role/outlet/browser/device evidence across the full ERP.
- WhatsApp CRM live UAT not accepted.
- Real camera/GPS/printer/file-picker flows not proven.

## What Could Not Be Tested and Why

| Item | Reason |
| --- | --- |
| Authenticated browser journeys for every role | This pass did not have trusted role credentials and did not use a browser session. Existing project docs also record local browser automation blocked by Windows `CreateProcessAsUserW failed: 5`. |
| Live Supabase RLS for every module | The pass used current source, build, and smoke scripts. It did not execute a full staging matrix with real Auth users for every module. |
| Real phone scanner/camera/GPS/file upload | Requires device permissions and HTTPS/staging app access. |
| Bluetooth label printer and PDF output inspection | Requires physical printer/browser print flow or rendered PDF evidence. |
| WhatsApp Cloud API live traffic | Requires public deployment, Meta dashboard access, live credentials, mapped phone number IDs, tester phones, and masked evidence. |
| Fresh database migration replay | Not run because the worktree has many pending/untracked migrations and the task guardrail says not to change schema/RLS foundation. |

## Files Changed

- `lib/auth/session.ts` - fixed the two High fail-open profile/module access behaviors.
- `scripts/smoke-routes.mjs` - added regression guards for the fixed fail-closed behavior.
- `docs/CURRENT_ERP_QA_AUDIT.md` - updated with fixed issues, remaining Critical/High issues, files changed, and test results.
- `HANDOFF.md` - updated with this follow-up handoff entry.

Runtime code changed: yes, minimal `lib/auth/session.ts` fail-closed behavior only.

Migrations added: none.

## Recommended Next Codex Tasks

1. Orders business-rule decision task: align reservation timing across docs, UI copy, server actions, migrations, and smoke coverage.
2. Role isolation test task: add a script that verifies worker/manager/account/admin/director/driver negative access against route guards and server actions.
3. Live auth setup QA task: verify missing profile rows, missing roles, disabled modules, and wrong-scope users fail closed with real Auth users.
4. Loader minimization task: replace `select("*").limit(1000)` with column-specific, scope-filtered queries module by module.
5. User-safe error task: map common Supabase/RLS/constraint errors to plain worker-facing messages.
6. Device QA task: run Stock scanner, Delivery proof/GPS, Retail uploads, Attendance GPS, and label printing on real phone/staging.
7. WhatsApp CRM live UAT task: complete webhook verification, account mapping, real message send/receive, duplicate/media replay, and masked evidence.
8. Fresh migration audit task: replay migrations on a clean Supabase project and reconcile pending migration order before broad staging push.
