import type {
  Brand,
  BarcodeWeightRule,
  Item,
  NoBarcodeStock,
  Origin,
  StockLocation,
  StockMovement,
  StockTakeLine,
  StockTakeSession,
  StockUnit,
} from "@/lib/stock/types"

export const demoLocations: StockLocation[] = [
  { id: "loc-jalan-channel", name: "JALAN CHANNEL", active: true },
  { id: "loc-sungai-merah", name: "SUNGAI MERAH", active: true },
  { id: "loc-director", name: "DIRECTOR", active: true },
]

export const demoBrands: Brand[] = [
  "TICAN",
  "RIVASAM",
  "SEABOARD",
  "VAN ROOI",
  "ABC",
  "ICP",
  "LOCKS",
].map((name) => ({
  id: `brand-${name.toLowerCase().replaceAll(" ", "-")}`,
  name,
  active: true,
}))

export const demoOrigins: Origin[] = [
  "DENMARK",
  "SPAIN",
  "USA",
  "NETHERLAND",
  "BELGIUM",
  "CHINA",
].map((name) => ({
  id: `origin-${name.toLowerCase().replaceAll(" ", "-")}`,
  name,
  active: true,
}))

export const demoItems: Item[] = [
  {
    id: "item-meat-belly-boneless",
    itemCode: "MEAT-BELLY-BONELESS",
    category: "MEAT",
    section: "BELLY",
    name: "BONELESS",
    barcodeRequired: true,
    active: true,
  },
  {
    id: "item-meat-belly-bone-in",
    itemCode: "MEAT-BELLY-BONE-IN",
    category: "MEAT",
    section: "BELLY",
    name: "BONE IN",
    barcodeRequired: true,
    active: true,
  },
  {
    id: "item-meat-loin-boneless",
    itemCode: "MEAT-LOIN-BONELESS",
    category: "MEAT",
    section: "LOIN",
    name: "BONELESS",
    barcodeRequired: true,
    active: true,
  },
  {
    id: "item-organs-cooked-stomach",
    itemCode: "ORGANS-COOKED-STOMACH",
    category: "ORGANS",
    section: "COOKED",
    name: "STOMACH",
    barcodeRequired: true,
    active: true,
  },
  {
    id: "item-organs-tongue",
    itemCode: "ORGANS-TONGUE",
    category: "ORGANS",
    section: "TONGUE",
    name: "TONGUE",
    barcodeRequired: true,
    active: true,
  },
  {
    id: "item-processed-meatball",
    itemCode: "PROCESSED-MEATBALL",
    category: "PROCESSED",
    section: "MEATBALL",
    name: "MEATBALL",
    barcodeRequired: false,
    active: true,
  },
]

export const demoUnits: StockUnit[] = [
  {
    id: "unit-001",
    barcode: "EM-BC-000001",
    itemId: "item-meat-belly-boneless",
    brandId: "brand-tican",
    originId: "origin-denmark",
    locationId: "loc-jalan-channel",
    status: "IN_STOCK",
    netWeightKg: 22.4,
    inboundSource: "supplier_import",
    batchNo: "B240610-A",
    receivedAt: "2026-06-01T08:30:00.000Z",
  },
  {
    id: "unit-002",
    barcode: "EM-BC-000002",
    itemId: "item-meat-belly-boneless",
    brandId: "brand-rivasam",
    originId: "origin-spain",
    locationId: "loc-jalan-channel",
    status: "IN_STOCK",
    netWeightKg: 19.8,
    inboundSource: "supplier_import",
    batchNo: "B240610-B",
    receivedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "unit-003",
    barcode: "EM-LN-000003",
    itemId: "item-meat-loin-boneless",
    brandId: "brand-seaboard",
    originId: "origin-usa",
    locationId: "loc-sungai-merah",
    status: "TRANSFER_PENDING",
    netWeightKg: 25.1,
    inboundSource: "transfer",
    batchNo: "L240603",
    receivedAt: "2026-06-03T10:20:00.000Z",
  },
  {
    id: "unit-004",
    barcode: "EM-OR-000004",
    itemId: "item-organs-tongue",
    brandId: "brand-abc",
    originId: "origin-china",
    locationId: "loc-director",
    status: "RETURNED",
    netWeightKg: 8.7,
    inboundSource: "return",
    batchNo: "O240604",
    receivedAt: "2026-06-04T13:10:00.000Z",
  },
]

export const demoBarcodeWeightRules: BarcodeWeightRule[] = [
  {
    id: "rule-belly-tican-jalan-channel",
    itemId: "item-meat-belly-boneless",
    brandId: "brand-tican",
    originId: "origin-denmark",
    locationId: "loc-jalan-channel",
    barcodeWeightStart: 7,
    barcodeWeightLength: 5,
    barcodeWeightDecimals: 2,
  },
]

export const demoNoBarcodeStock: NoBarcodeStock[] = [
  {
    id: "nb-processed-meatball",
    itemId: "item-processed-meatball",
    brandId: null,
    originId: null,
    locationId: "loc-jalan-channel",
    quantity: 80,
    weightKg: 40,
  },
]

export const demoMovements: StockMovement[] = [
  {
    id: "move-001",
    movementType: "INBOUND",
    itemName: "MEAT / BELLY / BONELESS",
    barcode: "EM-BC-000001",
    fromLocation: "-",
    toLocation: "JALAN CHANNEL",
    quantity: 1,
    weightKg: 22.4,
    referenceNo: "GRN-1001",
    notes: "Initial inbound demo record",
    createdAt: "2026-06-01T08:30:00.000Z",
  },
  {
    id: "move-002",
    movementType: "OUTBOUND_TRANSFER",
    itemName: "MEAT / LOIN / BONELESS",
    barcode: "EM-LN-000003",
    fromLocation: "SUNGAI MERAH",
    toLocation: "JALAN CHANNEL",
    quantity: 1,
    weightKg: 25.1,
    referenceNo: "TRF-2031",
    notes: "Pending transfer",
    createdAt: "2026-06-06T11:15:00.000Z",
  },
  {
    id: "move-003",
    movementType: "NO_BARCODE_INBOUND",
    itemName: "PROCESSED / MEATBALL / MEATBALL",
    barcode: "-",
    fromLocation: "-",
    toLocation: "JALAN CHANNEL",
    quantity: 80,
    weightKg: 40,
    referenceNo: "NB-778",
    notes: "No-barcode stock received",
    createdAt: "2026-06-07T14:20:00.000Z",
  },
]

export const demoStockTakeSessions: StockTakeSession[] = [
  {
    id: "take-001",
    sessionNo: "ST-2026-0001",
    locationId: "loc-jalan-channel",
    locationName: "JALAN CHANNEL",
    status: "DRAFT",
    createdAt: "2026-06-09T09:00:00.000Z",
    submittedAt: null,
    approvedAt: null,
  },
]

export const demoStockTakeLines: StockTakeLine[] = [
  {
    id: "take-line-001",
    sessionId: "take-001",
    itemId: "item-meat-belly-boneless",
    barcode: null,
    itemName: "MEAT / BELLY / BONELESS",
    systemCount: 2,
    actualCount: 2,
    varianceCount: 0,
    systemWeightKg: 42.2,
    actualWeightKg: 42.1,
    varianceWeightKg: -0.1,
    notes: "Demo counted line",
  },
]
