import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  makeInternalBarcode,
  makeUniqueInternalBarcode,
} from "../lib/stock/barcode-label.ts"
import {
  decodeBarcodeWeight,
  inferBarcodeWeightRule,
  inferBarcodeWeightRuleWithStatus,
} from "../lib/stock/barcode-weight.ts"
import {
  generatedItemCode,
  isNumericItemCode,
  nextItemCode,
  normalizeItemCode,
} from "../lib/stock/item-code.ts"
import {
  assertDamageCanBeManagerReviewed,
  assertReturnSupplierCanBeRejected,
  damageRejectionSignatureLabel,
} from "../lib/stock/approval-rules.ts"
import {
  buildCsv,
  buildStockWhatsappSummary,
} from "../lib/stock/report-export.ts"
import {
  activeStockStatus,
  movementTypeForOutboundType,
  stockableStatuses,
} from "../lib/stock/unit-status-rules.ts"
import {
  assertCustomerOrderReadyForOutbound,
  duplicateOutboundBarcode,
  outboundUnitBlockReason,
  parseOutboundBarcodes,
  requireSubstitutionConfirmation,
} from "../lib/stock/outbound-rules.ts"
import {
  requireSignature,
  requireStockTakeScopeMatch,
  sameNullableId,
} from "../lib/stock/stock-take-rules.ts"

function assertDecode(input, expected) {
  const actual = decodeBarcodeWeight(input)

  assert.equal(actual.status, expected.status, expected.message)
  assert.equal(actual.weightKg, expected.weightKg, expected.message)
  assert.equal(actual.source, expected.source, expected.message)
}

assertDecode(
  {
    barcode: "5363704999000267800078252512525227068224013687",
    startText: "13",
    lengthText: "5",
    decimalsText: "2",
  },
  {
    status: "decoded",
    weightKg: "26.78",
    source: "POSITION_RULE",
    message: "Imported position-rule barcode should decode 26.78 kg.",
  }
)

assertDecode(
  {
    barcode: "910293079163102001446",
    startText: "1",
    lengthText: "1",
    decimalsText: "1",
  },
  {
    status: "decoded",
    weightKg: "14.46",
    source: "GS1_3102",
    message: "GS1 3102 barcode should decode 14.46 kg.",
  }
)

assertDecode(
  {
    barcode: "011843560100965431030176701527080810310066026",
    startText: "1",
    lengthText: "1",
    decimalsText: "1",
  },
  {
    status: "decoded",
    weightKg: "17.670",
    source: "GS1_3103",
    message: "GS1 3103 barcode should decode 17.670 kg.",
  }
)

assertDecode(
  {
    barcode: "000844512473539709000",
    startText: "1",
    lengthText: "30",
    decimalsText: "2",
    fixedWeightKgText: "10",
  },
  {
    status: "manual_confirmation_required",
    weightKg: "10.000",
    source: "FIXED_WEIGHT",
    message: "Fixed-weight fallback should require manual confirmation.",
  }
)

assert.deepEqual(
  inferBarcodeWeightRule({
    barcode: "5363704999000267800078252512525227068224013687",
    weightKgText: "26.78",
  }),
  { start: 13, length: 5, decimals: 2 },
  "Inbound should infer a unique position rule after one manual supplier-barcode weight."
)
assertDecode(
  {
    barcode: "5363704999000144600078252512525227068224013687",
    startText: "13",
    lengthText: "5",
    decimalsText: "2",
  },
  {
    status: "decoded",
    weightKg: "14.46",
    source: "POSITION_RULE",
    message: "Future supplier barcodes should auto-extract weight from the saved position rule.",
  }
)
assert.equal(
  inferBarcodeWeightRule({
    barcode: "11126782222678",
    weightKgText: "26.78",
  }),
  null,
  "Inbound should not learn an ambiguous barcode weight position."
)

assert.deepEqual(
  inferBarcodeWeightRuleWithStatus({
    barcode: "11126782222678",
    weightKgText: "26.78",
  }),
  { status: "ambiguous", suggestion: null },
  "Inbound should ask for another sample when the same weight appears more than once."
)

assert.equal(
  normalizeItemCode(" 0007 "),
  "0007",
  "Item code normalization should trim worker input."
)
assert.equal(
  isNumericItemCode("0007"),
  true,
  "Numeric item codes should be accepted."
)
assert.equal(
  isNumericItemCode("AB-7"),
  false,
  "Non-numeric item codes should be rejected."
)
assert.equal(
  nextItemCode("0007"),
  "0008",
  "Next item code should preserve four-digit padding."
)
assert.equal(
  nextItemCode("AB-7"),
  "0001",
  "Invalid current item code should reset the next-code suggestion."
)
assert.equal(
  generatedItemCode([
    { itemCode: "0001" },
    { itemCode: "0099" },
    { itemCode: "AB-7" },
    { itemCode: null },
  ]),
  "0100",
  "Generated item code should ignore old non-numeric codes and use the next numeric value."
)

const generated = makeInternalBarcode(
  "INB-20260612-083000",
  "10.250",
  42
)

assert.equal(
  generated,
  "202606120830000042010250",
  "Generated barcode should be session code digits + running number + grams."
)
assert.match(generated, /^\d+$/, "Generated barcode must be numeric only.")
assert.equal(
  makeInternalBarcode("INB-20260612-083000", "0", 1),
  "",
  "Generated barcode should be blank when weight is invalid."
)
assert.equal(
  makeInternalBarcode("INB-", "10.250", 1),
  "",
  "Generated barcode should be blank when session code has no digits."
)
assert.equal(
  makeInternalBarcode("INB-20260612-083000", "10.250", 10000),
  "",
  "Generated barcode should not wrap serial numbers after 9999."
)

const uniqueGenerated = makeUniqueInternalBarcode(
  "INB-20260612-083000",
  "10.250",
  ["202606120830000042010250"],
  42
)

assert.deepEqual(
  uniqueGenerated,
  { barcode: "202606120830000043010250", serial: 43 },
  "Generated barcode should skip existing labels and use the next serial."
)

assert.deepEqual(
  parseOutboundBarcodes('[" EM-001 ", "", null, "EM-002"]'),
  ["EM-001", "EM-002"],
  "Outbound parsing should trim values and drop blanks."
)
assert.equal(
  duplicateOutboundBarcode(["EM-001", "EM-002", "EM-001"]),
  "EM-001",
  "Outbound batch should detect duplicate scanned barcodes."
)
assert.equal(
  duplicateOutboundBarcode(["EM-001", "EM-002"]),
  null,
  "Outbound batch should allow unique scanned barcodes."
)
assert.equal(
  outboundUnitBlockReason({ barcode: "EM-001", status: "IN_STOCK" }),
  null,
  "In-stock barcode units should not show an outbound block reason."
)
assert.equal(
  outboundUnitBlockReason({ barcode: "EM-002", status: "TRANSFER_PENDING" }),
  "Barcode EM-002 is TRANSFER_PENDING and cannot be outbounded.",
  "Transfer-pending barcode units should show a clear outbound block reason."
)
assert.equal(
  outboundUnitBlockReason({ barcode: "EM-003", status: "DAMAGED" }),
  "Barcode EM-003 is DAMAGED and cannot be outbounded.",
  "Damaged barcode units should show a clear outbound block reason."
)
assert(
  readFileSync("components/stock/workflow-forms.tsx", "utf8").includes(
    "sameDestinationTransferUnits"
  ),
  "Outbound UI should pre-block same-destination transfer scans."
)
for (const status of [
  "IN_STOCK",
  "TRANSFERRED",
  "RETURNED",
  "INSPECTION",
  "HOLD",
  "TRANSFER_PENDING",
  "DAMAGED",
  "SOLD",
]) {
  assert.equal(
    outboundUnitBlockReason({ barcode: "EM-STATUS", status }) === null,
    status === "IN_STOCK",
    `Outbound block helper should only allow available stock for ${status}.`
  )
}
assert.throws(
  () => parseOutboundBarcodes("not-json"),
  /Scanned barcode list is not valid/,
  "Outbound parsing should reject invalid JSON."
)
assert.throws(
  () => parseOutboundBarcodes("[]"),
  /Scan at least one barcode/,
  "Outbound parsing should require at least one barcode."
)
assert.doesNotThrow(
  () => assertCustomerOrderReadyForOutbound({ status: "READY_FOR_PICKUP" }),
  "Pickup-ready orders should be allowed for outbound."
)
assert.doesNotThrow(
  () => assertCustomerOrderReadyForOutbound({ status: "READY_FOR_DELIVERY" }),
  "Delivery-ready orders should be allowed for outbound."
)
assert.throws(
  () => assertCustomerOrderReadyForOutbound({ status: "PREPARING" }),
  /Customer order must be marked ready/,
  "Non-ready orders should be blocked from outbound confirmation."
)
assert.throws(
  () =>
    requireSubstitutionConfirmation({
      hasSubstitution: true,
      confirmed: false,
    }),
  /Confirm substitution/,
  "Order outbound substitutions should require explicit confirmation."
)
assert.doesNotThrow(
  () =>
    requireSubstitutionConfirmation({
      hasSubstitution: true,
      confirmed: true,
    }),
  "Confirmed substitutions should be allowed."
)
assert.equal(
  activeStockStatus("HOLD_RETURN_SUPPLIER"),
  false,
  "Return-supplier hold stock should be unavailable for normal outbound."
)
assert.equal(
  movementTypeForOutboundType("SAMPLE_TESTING"),
  "OUTBOUND_SAMPLE_TESTING",
  "Sample/testing direct outbound should create sample/testing movement rows."
)

assert.equal(
  sameNullableId(null, null),
  true,
  "Stock take nullable brand matching should allow both sides to be empty."
)
assert.equal(
  sameNullableId("brand-a", "brand-a"),
  true,
  "Stock take brand matching should allow matching brand ids."
)
assert.equal(
  sameNullableId("brand-a", null),
  false,
  "Stock take brand matching should reject a barcode brand when the session has no brand."
)
assert.doesNotThrow(
  () =>
    requireStockTakeScopeMatch(
      { item_id: "item-a", brand_id: "brand-a" },
      { itemId: "item-a", brandId: "brand-a" }
    ),
  "Matching item and brand should be accepted for stock take scanning."
)
assert.doesNotThrow(
  () =>
    requireStockTakeScopeMatch(
      { item_id: "item-a", brand_id: null },
      { itemId: "item-a", brandId: null }
    ),
  "Matching item with no brand should be accepted for stock take scanning."
)
assert.throws(
  () =>
    requireStockTakeScopeMatch(
      { item_id: "item-a", brand_id: "brand-a" },
      { itemId: "item-b", brandId: "brand-a" }
    ),
  /Barcode\/item does not match/,
  "Different stock take item should be blocked."
)
assert.throws(
  () =>
    requireStockTakeScopeMatch(
      { item_id: "item-a", brand_id: "brand-a" },
      { itemId: "item-a", brandId: "brand-b" }
    ),
  /Barcode brand does not match/,
  "Different stock take brand should be blocked."
)
assert.equal(
  requireSignature(" Manager Name ", "Manager review"),
  "Manager Name",
  "Stock take signatures should be trimmed before saving."
)
assert.throws(
  () => requireSignature(" ", "Director approval"),
  /Director approval signature is required/,
  "Stock take approval must require a director signature."
)

assert.doesNotThrow(
  () => assertDamageCanBeManagerReviewed("SUBMITTED"),
  "Submitted damage requests should be manager-reviewable."
)
assert.throws(
  () => assertDamageCanBeManagerReviewed("MANAGER_REVIEWED"),
  /Only submitted damage requests can be manager reviewed/,
  "Manager-reviewed damage requests should not be reviewed again."
)
assert.equal(
  damageRejectionSignatureLabel("SUBMITTED"),
  "Manager damage rejection",
  "Submitted damage rejection should require manager signature."
)
assert.equal(
  damageRejectionSignatureLabel("MANAGER_REVIEWED"),
  "Director damage rejection",
  "Manager-reviewed damage rejection should require director signature."
)
assert.throws(
  () => damageRejectionSignatureLabel("DIRECTOR_APPROVED"),
  /This damage request can no longer be rejected/,
  "Director-approved damage requests should not be rejectable."
)
assert.doesNotThrow(
  () => assertReturnSupplierCanBeRejected("SUBMITTED"),
  "Submitted return-supplier requests should be rejectable by manager."
)
assert.throws(
  () => assertReturnSupplierCanBeRejected("MANAGER_REVIEWED"),
  /This return supplier request can no longer be rejected/,
  "Reviewed return-supplier requests should not be rejected again."
)

assert.equal(buildCsv([]), "", "Empty stock report CSV should be blank.")
assert.equal(
  buildCsv([
    {
      reportName: 'Stock "Balance"',
      locationName: "Jalan Channel",
      count: 2,
      weightKg: 12.345,
    },
  ]),
  '"reportName","locationName","count","weightKg"\n"Stock ""Balance""","Jalan Channel","2","12.345"',
  "Stock report CSV should include headers and escape quotes."
)

const whatsappSummary = buildStockWhatsappSummary(
  [
    {
      reportName: "Stock by location",
      locationName: "Jalan Channel",
      count: 2,
      weightKg: 12.345,
    },
    {
      reportName: "Stock by inbound age",
      locationName: "Sungai Merah",
      count: 3,
      weightKg: 7,
    },
  ],
  1,
  4,
  2
)
assert.match(
  whatsappSummary,
  /Elite Meat Stock Report/,
  "WhatsApp summary should have a clear stock report title."
)
assert.match(
  whatsappSummary,
  /Locations: 2/,
  "WhatsApp summary should count report locations."
)
assert.match(
  whatsappSummary,
  /Total count: 5/,
  "WhatsApp summary should total stock report counts."
)
assert.match(
  whatsappSummary,
  /Total weight: 19\.345 kg/,
  "WhatsApp summary should total stock report weight."
)
assert.match(
  whatsappSummary,
  /Negative stock alerts: 1/,
  "WhatsApp summary should include negative stock alert count."
)
assert.match(
  whatsappSummary,
  /Stock age alerts: 4/,
  "WhatsApp summary should include stock age alert count."
)
assert.match(
  whatsappSummary,
  /Overdue transfer alerts: 2/,
  "WhatsApp summary should include overdue transfer alert count."
)

assert.deepEqual(
  stockableStatuses,
  ["IN_STOCK", "TRANSFERRED", "RETURNED"],
  "Stockable statuses should stay limited to sellable/available stock."
)
for (const status of ["IN_STOCK", "TRANSFERRED", "RETURNED"]) {
  assert.equal(
    activeStockStatus(status),
    true,
    `${status} should be active stock for outbound/return workflows.`
  )
}
for (const status of ["INSPECTION", "HOLD", "TRANSFER_PENDING", "DAMAGED", "SOLD"]) {
  assert.equal(
    activeStockStatus(status),
    false,
    `${status} should not be active stock for normal outbound workflows.`
  )
}
assert.equal(
  movementTypeForOutboundType("SALES"),
  "OUTBOUND_SALES",
  "Sales outbound should create sales movement rows."
)
assert.equal(
  movementTypeForOutboundType("TRANSFER"),
  "OUTBOUND_TRANSFER",
  "Transfer outbound should create transfer movement rows."
)
assert.equal(
  movementTypeForOutboundType("PROCESSING"),
  "OUTBOUND_PROCESSING",
  "Processing outbound should create processing movement rows."
)

console.log("Stock workflow regression checks passed.")
