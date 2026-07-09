import type {
  RetailBrand,
  RetailCashSession,
  RetailCleaningTask,
  RetailDailyClosing,
  RetailDailySale,
  RetailDepartment,
  RetailExpense,
  RetailExpenseCategory,
  RetailItem,
  RetailAuditLog,
  RetailNoBarcodeStock,
  RetailOrigin,
  RetailOutlet,
  RetailPayment,
  RetailProcessingBom,
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

export const demoRetailDailySales: RetailDailySale[] = [
  {
    id: "daily-sale-demo",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    salesDate: new Date().toISOString().slice(0, 10),
    status: "CONFIRMED",
    cashSales: 1155,
    bankTransferSales: 320,
    ewalletSales: 620,
    creditSales: 180,
    totalSales: 2275,
    attachmentUrl: null,
    attachmentStatus: "MISSING",
    createdByName: "Demo Retail",
    updatedByName: "Demo Retail",
    remarks: "AutoCount daily summary",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const demoRetailDailyClosings: RetailDailyClosing[] = [
  {
    id: "daily-closing-demo",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    closingDate: new Date().toISOString().slice(0, 10),
    openingCash: 200,
    cashSales: 1155,
    bankTransferSales: 320,
    ewalletSales: 620,
    creditSales: 180,
    cashExpenses: 68.9,
    expectedCash: 1286.1,
    actualCashCounted: 1286.1,
    totalSales: 2275,
    cashReceived: 1155,
    expensesAmount: 68.9,
    closingCash: 1286.1,
    varianceAmount: 0,
    status: "SUBMITTED",
    submittedByName: "Demo Retail",
    submittedAt: new Date().toISOString(),
    reviewedByName: "-",
    reviewedAt: null,
    remarks: "Demo closing waiting for review",
    notes: "Demo closing waiting for manager check",
    createdAt: new Date().toISOString(),
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

export const demoRetailProcessingBoms: RetailProcessingBom[] = [
  {
    id: "bom-belly-debone",
    outletId: null,
    outletName: "All outlets",
    name: "Belly debone",
    rawMaterialItemNames: ["MEAT / BELLY / BONE IN"],
    finishedProductItemNames: ["MEAT / BELLY / BONELESS"],
    active: true,
    remarks: "Standard retail belly debone processing type.",
    expectedYieldMinPercent: null,
    expectedYieldMaxPercent: null,
    expectedWastagePercent: null,
    createdByName: "Demo Retail",
    createdAt: new Date().toISOString(),
    updatedByName: "Demo Retail",
    updatedAt: new Date().toISOString(),
  },
]

export const demoRetailProcessingBatches: RetailProcessingBatch[] = [
  {
    id: "processing-demo",
    batchNo: "RP-DEMO-001",
    processingBomId: "bom-belly-debone",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    departmentId: "department-retail",
    departmentName: "Retail",
    stockLocationId: "location-jalan-channel",
    stockLocationName: "JALAN CHANNEL",
    processingDate: new Date().toISOString().slice(0, 10),
    processingType: "Belly debone",
    rawLines: [
      {
        id: "processing-demo-raw-1",
        itemId: "item-belly",
        itemName: "MEAT / BELLY / BONE IN",
        quantity: 10,
        weightKg: 100,
        remarks: "",
      },
    ],
    rawItemLabel: "MEAT / BELLY / BONE IN",
    rawBrandName: "TICAN",
    rawOriginName: "DENMARK",
    rawQuantity: 10,
    rawWeightKg: 100,
    finishedLines: [
      {
        id: "processing-demo-finished-1",
        itemId: "item-belly",
        itemName: "MEAT / BELLY / BONELESS",
        quantity: 8,
        weightKg: 86.5,
        remarks: "",
      },
    ],
    finishedItemLabel: "MEAT / BELLY / BONELESS",
    finishedBrandName: "TICAN",
    finishedOriginName: "DENMARK",
    finishedQuantity: 8,
    finishedWeightKg: 86.5,
    wastageWeightKg: 10,
    wastagePercent: 10,
    wastageReason: "Trim loss",
    wastagePhotoUrl: null,
    wastageRemarks: "",
    accountedWeightKg: 96.5,
    unaccountedDifferenceKg: 3.5,
    unaccountedDifferencePercent: 3.5,
    yieldPercent: 86.5,
    lossWeightKg: 13.5,
    processingMinYieldPercent: 85,
    processingMaxLossPercent: 15,
    yieldAlert: "OK",
    warningMessage: "OK",
    status: "SUBMITTED",
    createdByName: "Demo Retail",
    createdAt: new Date().toISOString(),
    submittedByName: "Demo Retail",
    submittedAt: new Date().toISOString(),
    reviewedByName: "-",
    reviewedAt: null,
    rejectionReason: "",
    processedByName: "Demo Retail",
    processedAt: new Date().toISOString(),
    remarks: "Demo processing batch",
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
    active: true,
    status: "PENDING",
    assignedToName: "-",
    completedByName: "-",
    completedAt: null,
    completionPhotoUrl: null,
    remarks: "Demo cleaning task",
    createdByName: "Demo Retail Manager",
    createdAt: new Date().toISOString(),
    updatedByName: "Demo Retail Manager",
    updatedAt: new Date().toISOString(),
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
    active: true,
    status: "MISSED",
    assignedToName: "-",
    completedByName: "-",
    completedAt: null,
    completionPhotoUrl: null,
    remarks: "Demo missed cleaning alert",
    createdByName: "Demo Retail Manager",
    createdAt: new Date().toISOString(),
    updatedByName: "Demo Retail Manager",
    updatedAt: new Date().toISOString(),
  },
]

export const demoRetailExpenseCategories: RetailExpenseCategory[] = [
  {
    id: "expense-category-cleaning-demo",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    name: "Cleaning Supplies",
    active: true,
  },
  {
    id: "expense-category-utilities-demo",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    name: "Utilities",
    active: true,
  },
]

export const demoRetailAuditLogs: RetailAuditLog[] = [
  {
    id: "audit-daily-sale-demo",
    tableName: "retail_daily_sales",
    recordId: "daily-sale-demo",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    fieldChanged: "cash_sales",
    oldValue: "1120.00",
    newValue: "1155.00",
    editedByName: "Demo Retail",
    editedAt: new Date().toISOString(),
    reason: "AutoCount summary corrected",
  },
  {
    id: "audit-closing-demo",
    tableName: "retail_daily_closings",
    recordId: "daily-closing-demo",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    fieldChanged: "actual_cash_counted",
    oldValue: "1280.00",
    newValue: "1286.10",
    editedByName: "Demo Retail",
    editedAt: new Date().toISOString(),
    reason: "Cash recount",
  },
]

export const demoRetailExpenses: RetailExpense[] = [
  {
    id: "expense-demo",
    outletId: "outlet-jalan-channel",
    outletName: "JALAN CHANNEL",
    expenseDate: new Date().toISOString().slice(0, 10),
    category: "Cleaning Supplies",
    supplierPayee: "Local Supplier",
    amount: 68.9,
    paymentMethod: "CASH",
    status: "SUBMITTED",
    receiptUrl: "/demo/receipts/cleaning-supplies.jpg",
    submittedById: "demo-retail",
    submittedByName: "Demo Retail",
    submittedAt: new Date().toISOString(),
    reviewedByName: "-",
    reviewedAt: null,
    rejectionReason: "",
    remarks: "Demo retail expense",
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
