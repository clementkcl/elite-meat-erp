# Stock Mobile UX Requirement Audit

Last updated: 2026-06-24

Purpose: track every confirmed Stock Mobile MVP rule against current source evidence, automated guards, and the remaining owner/device proof needed before the Stock module can be called ready for internal mobile pilot use.

Status meanings:

- `Source guarded`: local source checks and smoke coverage verify the implementation pattern exists.
- `Manual evidence pending`: needs authenticated Vercel/local runtime, real phone, real printer, or live Supabase data proof.
- `Partial`: source exists but live workflow/RLS/device proof is still the main risk.

## Summary

| Area | Current status | Main evidence | Remaining proof |
| --- | --- | --- | --- |
| Stock worker home | Source guarded | `components/stock/stock-page.tsx`, `scripts/stock-mobile-ux-coverage.mjs` | Real 390px screenshot as worker |
| Inbound mobile flow | Source guarded | `components/stock/workflow-forms.tsx`, `scripts/stock-mobile-ux-coverage.mjs` | Real scan session with duplicate/no-weight cases |
| Label generation/reprint | Source guarded | `components/stock/stock-label.tsx`, `components/stock/stock-unit-detail.tsx`, `scripts/stock-label-coverage.mjs` | Bluetooth printer and PDF fallback output |
| Outbound mobile flow | Source guarded | `components/stock/workflow-forms.tsx`, `lib/stock/actions.ts`, `scripts/stock-workflow-regression.mjs`, `scripts/stock-mobile-ux-coverage.mjs` | Real direct outbound scans; order picking is tested from `/orders/picking` |
| Transfer/receive | Source guarded | `components/stock/workflow-forms.tsx`, `lib/stock/actions.ts`, `lib/stock/data.ts`, `scripts/stock-mobile-ux-coverage.mjs` | Real transfer, assigned receiving-location default, wrong-location block, overdue alert proof |
| Stock take | Source guarded | `components/stock/workflow-forms.tsx`, `lib/stock/actions.ts`, `scripts/stock-take-lock-coverage.mjs`, `scripts/stock-mobile-ux-coverage.mjs` | Real worker count, manager review, director approval |
| Online-only scanner safety | Source guarded | `components/stock/barcode-scanner.tsx`, `components/stock/workflow-forms.tsx`, `scripts/stock-scanner-coverage.mjs`, `scripts/stock-mobile-ux-coverage.mjs` | Real phone connection-loss test |
| Role/scope visibility | Partial | `components/stock/stock-page.tsx`, `scripts/stock-role-scope-coverage.mjs` | Live Supabase worker/manager/admin/director accounts |

## Requirement Matrix

| Requirement | Status | Current evidence | Remaining manual QA |
| --- | --- | --- | --- |
| Main mobile users are general workers. | Source guarded | Worker stock home and worker route guards are checked in `scripts/stock-mobile-ux-coverage.mjs`. | Sign in as a general worker and confirm worker-only Stock home. |
| English only. | Source guarded | Stock mobile worker copy in `components/stock/*` is English. | Confirm no translated/stale worker strings on Vercel. |
| Avoid typing as much as possible. | Source guarded | Quick product, brand, origin, location, order, destination, return-location, and stock-take buttons exist in `components/stock/workflow-forms.tsx`. | Confirm common phone flows can be completed mostly by tapping/scanning. |
| Workers enter normal ERP home first, then tap Stock. | Source guarded | ERP Home stock shortcut is guarded by `scripts/stock-mobile-ux-coverage.mjs`. | Confirm worker Home shows `Stock`, not advanced Stock dashboard. |
| Stock mobile home shows Inbound, Outbound, Transfer, Receive, Return/Damage, Stock Take. | Source guarded | `StockWorkerHome` renders the six worker buttons and is covered by smoke. | Capture 390px screenshot. |
| Stock mobile shortcut labels remain readable under wrapping/font scaling. | Source guarded | Stock worker home and shared shortcuts use flexible minimum-height buttons with wrapping labels and non-shrinking icons. | Confirm shortcuts stay unclipped at 390px and with larger browser text. |
| Stock mobile shortcuts use smooth in-app navigation. | Source guarded | Stock worker shortcuts now use `next/link`, and mobile barcode-unit `Open / reprint` links are source-guarded. | Tap shortcuts and reprint links on Vercel/phone to confirm navigation feels smooth. |
| Workers see quantity and weight only, not stock value/cost/finance. | Source guarded | Worker home guard rejects cost/value/finance fragments. Mobile balance, barcode-unit, and movement cards show operational quantity/weight/status/location fields only. | Confirm worker cannot see finance fields through Stock pages. |
| Hide advanced reports/settings from workers. | Source guarded | Worker sidebar/home visibility and direct-route guards are covered by Stock role/scope checks. | Sign in as worker and try `/stock/reports` and `/stock/settings`. |
| Stock dashboard recent activity remains readable on mobile. | Source guarded | `/stock/dashboard` now shows mobile movement cards before the latest-movements table while preserving the table for desktop. | Confirm dashboard latest movement cards at 390px as manager/admin/director. |
| Stock dashboard alerts remain readable on mobile. | Source guarded | Negative-stock, stock-age, and overdue-transfer alert cards wrap alert descriptions, item names, locations, reasons, and transfer routes. | Confirm long alert content stays inside red/yellow/orange cards at 390px. |
| Stock scan pages show recent actions without table scrolling. | Source guarded | Shared scan pages now show mobile movement cards before the recent-movements table for inbound, outbound, transfer, receive-transfer, return, and no-barcode redirect flows. | Confirm recent-movement cards on scan pages at 390px after real movements exist. |
| Stock fallback tables remain readable when workers scroll below mobile cards. | Source guarded | Shared Stock data tables now use phone-size sort buttons and wrap long cell values instead of clipping them. | Confirm long barcodes, stock locations, references, and item names remain readable at 390px. |
| Stock item master remains usable on mobile. | Source guarded | `/stock/items` now shows mobile item cards before the full item table, with item code, product name, category/section, brand, barcode requirement, and active status. | Confirm item cards and item edit controls at 390px with real data. |
| Mobile card status badges do not squeeze item text. | Source guarded | Stock item-master, balance, and barcode-unit card headers stack below 390px and status badges wrap; source guard covers the card header and badge classes. | Confirm long item names and long statuses stay readable around 390px. |
| Inbound uses recent item buttons plus search. | Source guarded | `Recent inbound templates`, the 390px two-column template grid, quick products, and product search are in `workflow-forms.tsx`. | Run a real inbound setup using recent template and search fallback. |
| Inbound setup disclosures and quick item creation are phone-friendly. | Source guarded | `New product` and `Weight rule and notes` summaries use phone-size tap targets, and the quick product `Create` action is full-width on phone. | Confirm disclosure taps and quick product creation at 390px. |
| Stock workflow optional/reference sections are phone-friendly. | Source guarded | Stock workflow disclosure summaries use phone-size tap targets across scan flows, and coverage rejects the old small summary class. | Confirm optional/reference sections open comfortably at 390px. |
| Brand and origin required before scanning. | Source guarded | Scanner disabled reason includes `Choose product, brand, origin, and location first.` | Confirm scanner/manual barcode stays blocked until brand/origin are set. |
| Location defaults to worker assigned stock location and remains editable. | Source guarded | `defaultLocationId`, `assignedInboundLocationId`, and `Profile default.` are covered; saved local presets no longer override an active assigned location on page open, and the location picker remains editable until the session is locked. | Confirm live scoped worker default location in Supabase. |
| One inbound session locks item + brand + origin + location. | Source guarded | Session setup lock is checked in Stock mobile source guard, and the inbound scanner shows `Scanning inbound` plus `Session locked. Finish first.` after the first saved scan. | Save first scan, then confirm setup cannot be changed until finish. |
| Continuous scanning is required. | Source guarded | Barcode scanner continuous mode, recent scan UI, rear-camera guidance, and scan-frame prompt are guarded. | Scan multiple barcodes on phone without reopening setup. |
| Scanner success feedback stays readable at 390px. | Source guarded | The shared scanner keeps `Last scan` and `Camera session scans` stacked at worker-phone width, then only splits them on wider screens. | Open scanner, complete two camera/manual scans, and confirm the feedback cards do not create horizontal scrolling. |
| Successful scan shows previous item/weight, saved count, and total weight. | Source guarded | `Previous scan`, `Saved scans`, `Saved weight`, recent scan cards, finished-session details, and the active inbound scan context are covered with 390px layout guards. | Confirm all remain visible around 390px width. |
| Inbound previous/recent scan cards remain readable on mobile. | Source guarded | Previous-scan product names and recent saved-scan card headers wrap long product text and status badges; source guard covers the mobile classes. | Confirm long product names, saved status badges, barcode, scanned-by, and location text stay readable around 390px. |
| Inbound session finish action is phone-size. | Source guarded | `Finish Inbound Session` now uses `min-h-11 w-full sm:w-auto`, matching the shared Stock mobile action pattern. | Confirm the finish button is full-width and easy to tap around 390px. |
| Duplicate barcode blocks immediately with red warning. | Source guarded | `Duplicate barcode. Inbound is blocked.` uses `role="alert"` and is covered. | Scan same barcode twice and confirm no second stock unit. |
| Inbound scan feedback stays readable on phone. | Source guarded | Inbound decode success, warning, error, and duplicate cards wrap worker messages. | Trigger duplicate, low-confidence, and no-weight cases at 390px. |
| No decoded weight blocks save and guides internal label. | Source guarded | No-weight message and label action are covered. | Scan no-weight barcode and confirm save is blocked. |
| Supplier barcode rule can be learned from one manual weight. | Source guarded | `inferBarcodeWeightRule()` finds one clear imported 5-digit weight field from scanned barcode + typed kg, then inbound fills rule fields and enables save-rule. | Scan a supplier barcode with no saved rule, type actual kg once, save, then confirm the next same-format barcode auto-decodes. |
| No-barcode guidance quickly returns worker to barcode inbound. | Source guarded | `/stock/no-barcode-inbound` uses a full-width `Open Barcode Inbound` in-app link. | Open no-barcode guidance on phone and confirm the link is easy to tap and routes to `/stock/inbound`. |
| Generated internal label saves stock only after the printed label is scanned. | Source guarded | Pending-label preview and scan-confirm save flow are covered by Stock label/inbound guards. | Generate one label, print/attach it, scan the printed label, then verify stock unit, movement, and scan log. |
| Bluetooth label printer primary; PDF fallback required. | Source guarded | Label print card says Bluetooth first and PDF fallback. | Test with a real Bluetooth label printer and save PDF fallback. |
| Label is 50mm x 30mm and structure allows more sizes later. | Source guarded | `stockLabelSizes` and `50mm x 30mm` are covered. | Print/save one PDF and measure or inspect page size. |
| Label content includes company, product, weight, barcode. | Source guarded | `components/stock/stock-label.tsx` and label coverage guard label content. | Confirm printed label readability. |
| Label preview remains readable on phone before printing. | Source guarded | Stock label preview wraps company, product, and weight text and coverage rejects product-name clipping. | Confirm long product labels are readable at 390px before Bluetooth/PDF printing. |
| Workers can reprint old labels without reason. | Source guarded | `/stock/units/[id]` reprint surface has no reason field. | Reprint a real stock-unit label from phone. |
| Barcode unit movement history remains readable on phone. | Source guarded | Stock unit detail movement cards stack movement type/date and weight on narrow phones, then switch to side-by-side at 390px. | Confirm movement cards on `/stock/units/[id]` with long movement/location/reference values. |
| Stock outbound is direct-only; order picking stays in Orders. | Source guarded | `/stock/outbound` shows `Direct stock outbound only. Order picking stays in Orders.` and links to `/orders/picking`. | Confirm the Stock page does not show quick ready-order controls, then open Orders picking from the link. |
| Outbound scan context remains readable on mobile. | Source guarded | `Scanning outbound` and `Previous outbound scan` cards wrap long outbound type, destination, barcode, product, and weight text; source guard covers the wrapping classes. | Confirm direct outbound context and previous-scan cards at 390px with long location/product values. |
| General workers can use direct outbound. | Source guarded | Direct mode/options are present in worker forms by default, and the `Scanning outbound` card shows selected direct outbound type before scanning. | Confirm worker direct outbound access in live scope. |
| Direct outbound options include Sales, Processing, Transfer, Sample/Testing, Damage/Spoilage, Return Supplier. | Source guarded | Options are guarded in `scripts/stock-mobile-ux-coverage.mjs`. | Confirm all buttons show on phone. |
| Damage/spoilage requires photo and creates approval request only. | Source guarded | Photo picker, `Add damage photo first.`, `Photo required. Request only; stock is not deducted now.`, and the amber `Requesting damage` card are covered. | Create request and confirm stock is not deducted until approvals. |
| Transfer flow: select destination stock location, scan barcode, done. | Source guarded | Quick destinations, transfer scan helper, and the green `Sending to` card are covered. | Transfer a real barcode and confirm status is `TRANSFER_PENDING`. |
| Receive-transfer at wrong location is blocked. | Source guarded | Wrong-location receive RPC/message, UI reminder, assigned receiving-location default cue, and the green `Receiving at` card are covered. | Confirm assigned receiving location defaults on live worker profile, then attempt wrong receiving location in live Supabase. |
| Return/Damage scan flows show clear target before scanning. | Source guarded | Assigned return-location default cue plus `Returning to`, `Requesting damage`, and `Returning supplier` cards are covered in `components/stock/workflow-forms.tsx` and `scripts/stock-mobile-ux-coverage.mjs`. | Confirm assigned return location defaults and all three cards appear at 390px before scanning. |
| Transfer pending over 3 days alerts sender manager, receiver manager, admin, and director. | Source guarded | `TransferPendingAlertPanel` includes audience text and `Open receive`; data threshold is `overdueTransferDays = 3`. | Seed/create old pending transfer and confirm each allowed role sees the alert. |
| Worker can start stock take. | Source guarded | Worker-created draft session, quick stock-take setup, assigned stock-take location default, and `Default stock take location:` cue are covered. | Start a live session as worker and confirm the assigned location appears first. |
| Stock take is barcode scan only. | Source guarded | Manual count-line blocking and barcode field are covered. | Confirm no manual count shortcut bypasses barcode scan. |
| Wrong item/brand scan is blocked. | Source guarded | `Wrong item/brand blocked.` is covered, and the Stock Take scanner now shows a green `Scanning for` card with active brand, item, and location before scanning. | Scan wrong item/brand in a real session. |
| Unknown barcode is recorded as exception. | Source guarded | `Unknown barcode exception` and exception migration coverage exist. | Scan unknown barcode and confirm pending exception row. |
| Stock take progress shows barcode count and total weight. | Source guarded | `Barcode progress`, `Weight progress`, the active `Scanning for` scope card, the scan-rule cards, and 390px grids are covered. | Confirm progress, active scope card, and scan-rule cards at 390px after scans. |
| Stock take scan/progress cards remain readable on mobile. | Source guarded | Stock Take scan scope, counting scope, session number, and previous-scan item text now wrap long values and are covered by `scripts/stock-mobile-ux-coverage.mjs`. | Use long location, session, brand, and item names at 390px and confirm no horizontal scrolling. |
| Other stock operations during active stock take warn only, not block. | Source guarded | Warning copy is covered and status-announced. | Confirm inbound/outbound/transfer can continue after warning. |
| Missing barcode adjustment needs manager review then director final approval. | Source guarded | Approval gates/signatures are covered by stock-take scripts. | Complete live manager review and director approval. |
| Stock take review cards remain usable on mobile. | Source guarded | Review-session cards wrap session number, scope text, exception barcodes, signatures, and approval buttons; `scripts/stock-mobile-ux-coverage.mjs` guards the mobile classes. | Confirm manager/director review cards at 390px with long session, location, item, brand, and exception barcode values. |
| Stock scanning is online-only for MVP. | Source guarded | Shared `offlineScanMessage`, `useOnlineStatus()` guards, disabled scanner reasons, shared barcode-field online/offline listeners, disabled manual input, stopped camera controls, and assertive camera/offline alerts are covered across scan forms and the shared scanner. | Turn off phone internet on every scan page and confirm no save. |
| Manual barcode fallback is phone-friendly. | Source guarded | Shared Stock barcode fields request the numeric mobile keyboard and disable autocorrect/capitalization on manual fallback input. | Tap manual barcode fallback on a phone and confirm long-barcode entry is comfortable. |
| Use strong colors for success, blocked/error, and warnings. | Source guarded | Green/red/yellow cards are used throughout `workflow-forms.tsx`. | Visual check at 390px. |
| Error messages are short and non-technical. | Source guarded | Friendly action error mapping and worker messages are covered. | Trigger RLS/wrong-location/duplicate errors and confirm no raw DB text. |
| Test at 390px width. | Manual evidence pending | Source guards check 390px classes, phone-size select controls, and owner QA docs. Local in-app browser QA was retried on 2026-06-24 but blocked by `CreateProcessAsUserW failed: 5`. | Capture authenticated 390px screenshots/video. |

## Commands For Latest Local Evidence

Run these after any Stock mobile UX change:

```bash
node scripts\stock-mobile-ux-coverage.mjs
node scripts\stock-scanner-coverage.mjs
npm.cmd run smoke
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

## Remaining Pilot Blockers

- Authenticated 390px visual QA has not been captured in this environment.
- Real phone camera permission, rear-camera selection, scanner stream stop, sound/vibration, and continuous scan comfort need device testing.
- Bluetooth printer output and PDF 50mm x 30mm label output need device/file evidence.
- Live Supabase RLS and stock workflow proof is needed for worker, manager, admin, and director accounts.
