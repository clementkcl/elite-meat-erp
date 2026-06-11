# Known Limitations

These are the remaining constraints for internal testing.

## Supabase Auth Users

Seed data can create business records and lookup data, but it cannot safely create real Supabase Auth users in a normal SQL seed. Create Auth users in Supabase, then assign matching rows in `profiles`, `profile_roles`, `outlet_id`, `department_id`, and `stock_location_id`.

## File Uploads

Invoice, proof, claim, payslip, and report file fields currently store file path/metadata. Verify Storage bucket policies before using real documents.

## Browser Camera Testing

The barcode scanner uses `@zxing/browser`, rear-camera preference, permission handling, stream cleanup, and manual fallback. Real camera testing still needs to be done on HTTPS or localhost with an actual phone/laptop camera.

## Dev Server Background Start

In the current Windows sandbox, background `Start-Process` can fail because duplicate `Path`/`PATH` environment variables trigger a PowerShell error. Run `npm run dev` manually in a terminal for browser testing.

## RLS Verification

RLS has been audited and hardened in migrations, but production readiness still requires testing with real Supabase Auth users for every role and scope combination.

## Reporting

Director reports have print, WhatsApp summary, and CSV export. Other module reports should be expanded after internal testers confirm the core data model and workflow outputs.
