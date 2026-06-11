import type {
  RetailBrand,
  RetailCashSession,
  RetailCleaningTask,
  RetailDepartment,
  RetailExpense,
  RetailItem,
  RetailNoBarcodeStock,
  RetailOrigin,
  RetailOutlet,
  RetailPayment,
  RetailProcessingBatch,
  RetailPerson,
  RetailPriceRule,
  RetailRegister,
  RetailSale,
  RetailSaleLine,
  RetailStockLocation,
  RetailStockUnit,
} from "@/lib/retail/types"

export const demoRetailPeople: RetailPerson[] = [
  {
    id: "demo-retail-user",
    fullName: "Demo Retail",
    email: "retail@elitemeat.local",
  },
]

export const demoRetailOutlets: RetailOutlet[] = [
  { id: "outlet-jalan-channel", name: "JALAN CHANNEL" },
  { id: "outlet-sungai-merah", name: "SUNGAI MERAH" },
]

export const demoRetailDepartments: RetailDepartment[] = [
  { id: "department-retail", name: "Retail" },
  { id: "department-operations", name: "Operations" },
]

export const demoRetailLocations: RetailStockLocation[] = [
  { id: "location-jalan-channel", name: "JALAN CHANNEL" },
  { id: "location-sungai-merah", name: "SUNGAI MERAH" },
]

export const demoRetailItems: RetailItem[] = [
  {
    id: "item-belly",
    itemCode: "MEAT-BELLY-BONELESS",
    category: "MEAT",
    section: "BELLY",
    name: "BONELESS",
    label: "MEAT / BELLY / BONELESS",
    barcodeRequired: true,
    processingMinYieldPercent: 85,
    processingMaxLossPercent: 15,
  },
  {
    id: "item-meatball",
    itemCode: "PROCESSED-MEATBALL",
    category: "PROCESSED",
    section: "MEATBALL",
    name: "MEATBALL",
    label: "PROCESSED / MEATBALL / MEATBALL",
    barcodeRequired: false,
    processingMinYieldPercent: 90,
    processingMaxLossPercent: 10,
  },
]

export const demoRetailBrands: RetailBrand[] = [
  { id: "brand-tican", name: "TICAN" },
  { id: "brand-abc", name: "ABC" },
]

export const demoRetailOrigins: RetailOrigin[] = [
  { id: "origin-denmark", name: "DENMARK" },
  { id: "origin-china", name: "CHINA" },
]

export const demoRetailRegisters: RetailRegister[] = [
  {
    id: "register-jalan-channel",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    stockLocationId: "location-jalan-channel",
    stockLocationName: "JALAN CHANNEL",
    registerName: "Jalan Channel Counter",
    active: true,
  },
]

export const demoRetailCashSessions: RetailCashSession[] = [
  {
    id: "session-open",
    registerId: "register-jalan-channel",
    registerName: "Jalan Channel Counter",
    status: "OPEN",
    openingFloat: 200,
    expectedCash: 520,
    closingCash: 0,
    varianceAmount: 0,
    openedByName: "Demo Retail",
    closedByName: "-",
    openedAt: new Date().toISOString(),
    closedAt: null,
    notes: "Demo open counter",
  },
]

export const demoRetailSales: RetailSale[] = [
  {
    id: "sale-demo",
    saleNo: "RS-DEMO-001",
    registerId: "register-jalan-channel",
    registerName: "Jalan Channel Counter",
    cashSessionId: "session-open",
    customerName: "Walk-in Customer",
    customerPhone: "-",
    status: "COMPLETED",
    paymentStatus: "PAID",
    subtotalAmount: 189,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 189,
    paidAmount: 200,
    changeAmount: 11,
    soldBy: "demo-retail-user",
    soldByName: "Demo Retail",
    completedAt: new Date().toISOString(),
    cancelledAt: null,
    notes: "Demo sale",
    createdAt: new Date().toISOString(),
  },
]

export const demoRetailSaleLines: RetailSaleLine[] = [
  {
    id: "line-demo",
    saleId: "sale-demo",
    saleNo: "RS-DEMO-001",
    itemId: "item-belly",
    itemLabel: "MEAT / BELLY / BONELESS",
    brandName: "TICAN",
    originName: "DENMARK",
    stockLocationName: "JALAN CHANNEL",
    barcode: "DEMO-BARCODE-001",
    quantity: 4.5,
    weightKg: 4.5,
    unitPrice: 42,
    lineDiscount: 0,
    lineTotal: 189,
    notes: "Demo line",
  },
]

export const demoRetailPayments: RetailPayment[] = [
  {
    id: "payment-demo",
    saleId: "sale-demo",
    saleNo: "RS-DEMO-001",
    paymentMethod: "CASH",
    paymentStatus: "PAID",
    amount: 200,
    referenceNo: "RS-DEMO-001",
    receivedByName: "Demo Retail",
    notes: "Demo payment",
    createdAt: new Date().toISOString(),
  },
]

export const demoRetailPriceRules: RetailPriceRule[] = [
  {
    id: "price-belly",
    itemId: "item-belly",
    itemLabel: "MEAT / BELLY / BONELESS",
    brandId: "brand-tican",
    brandName: "TICAN",
    originId: "origin-denmark",
    originName: "DENMARK",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    unitPrice: 42,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: null,
    active: true,
  },
]

export const demoRetailProcessingBatches: RetailProcessingBatch[] = [
  {
    id: "processing-demo",
    batchNo: "RP-DEMO-001",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    stockLocationId: "location-jalan-channel",
    stockLocationName: "JALAN CHANNEL",
    rawItemLabel: "MEAT / BELLY / BONE IN",
    rawBrandName: "TICAN",
    rawOriginName: "DENMARK",
    rawQuantity: 10,
    rawWeightKg: 100,
    finishedItemLabel: "MEAT / BELLY / BONELESS",
    finishedBrandName: "TICAN",
    finishedOriginName: "DENMARK",
    finishedQuantity: 8,
    finishedWeightKg: 86.5,
    yieldPercent: 86.5,
    lossWeightKg: 13.5,
    processingMinYieldPercent: 85,
    processingMaxLossPercent: 15,
    yieldAlert: "OK",
    status: "COMPLETED",
    processedByName: "Demo Retail",
    processedAt: new Date().toISOString(),
    notes: "Demo processing batch",
  },
]

export const demoRetailCleaningTasks: RetailCleaningTask[] = [
  {
    id: "cleaning-demo-daily",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    departmentId: "department-retail",
    departmentName: "Retail",
    taskName: "Counter deep clean",
    frequency: "DAILY",
    dueDate: new Date().toISOString().slice(0, 10),
    status: "PENDING",
    assignedToName: "-",
    completedByName: "-",
    completedAt: null,
    notes: "Demo cleaning task",
  },
  {
    id: "cleaning-demo-missed",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    departmentId: "department-retail",
    departmentName: "Retail",
    taskName: "Waste bin sanitation",
    frequency: "DAILY",
    dueDate: "2026-06-10",
    status: "MISSED",
    assignedToName: "-",
    completedByName: "-",
    completedAt: null,
    notes: "Demo missed cleaning alert",
  },
]

export const demoRetailExpenses: RetailExpense[] = [
  {
    id: "expense-demo",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    expenseDate: new Date().toISOString().slice(0, 10),
    category: "Cleaning Supplies",
    vendor: "Local Supplier",
    amount: 68.9,
    paymentMethod: "CASH",
    status: "SUBMITTED",
    receiptUrl: "/demo/receipts/cleaning-supplies.jpg",
    submittedByName: "Demo Retail",
    reviewedByName: "-",
    approvedByName: "-",
    paidByName: "-",
    paidAt: null,
    notes: "Demo retail expense",
    createdAt: new Date().toISOString(),
  },
]

export const demoRetailStockUnits: RetailStockUnit[] = [
  {
    id: "stock-unit-demo",
    barcode: "DEMO-BARCODE-002",
    itemId: "item-belly",
    itemLabel: "MEAT / BELLY / BONELESS",
    brandId: "brand-tican",
    brandName: "TICAN",
    originId: "origin-denmark",
    originName: "DENMARK",
    locationId: "location-jalan-channel",
    locationName: "JALAN CHANNEL",
    netWeightKg: 5.2,
    status: "IN_STOCK",
  },
]

export const demoRetailNoBarcodeStock: RetailNoBarcodeStock[] = [
  {
    id: "no-barcode-demo",
    itemId: "item-meatball",
    itemLabel: "PROCESSED / MEATBALL / MEATBALL",
    brandId: "brand-abc",
    brandName: "ABC",
    originId: "origin-china",
    originName: "CHINA",
    locationId: "location-sungai-merah",
    locationName: "SUNGAI MERAH",
    quantity: 20,
    weightKg: 40,
  },
]
