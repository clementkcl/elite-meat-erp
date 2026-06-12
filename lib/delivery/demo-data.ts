import type {
  DeliveryOrder,
  DeliveryOrderItem,
  DeliveryPayment,
  DeliveryPerson,
  DeliveryStatusLog,
  DriverLocation,
  Vehicle,
} from "@/lib/delivery/types"

export const demoDrivers: DeliveryPerson[] = [
  {
    id: "driver-demo-1",
    fullName: "Demo Driver",
    email: "driver@elitemeat.local",
  },
]

export const demoVehicles: Vehicle[] = [
  {
    id: "vehicle-lorry-01",
    vehicleNo: "EM-LORRY-01",
    vehicleType: "LORRY",
    capacityKg: 1800,
    active: true,
  },
  {
    id: "vehicle-van-02",
    vehicleNo: "EM-VAN-02",
    vehicleType: "VAN",
    capacityKg: 900,
    active: true,
  },
]

export const demoDeliveryOrders: DeliveryOrder[] = [
  {
    id: "delivery-order-001",
    orderNo: "DO-20260610-001",
    customerName: "Sungai Merah Retail",
    customerPhone: "+60 12-100 2001",
    customerLocation: "Sungai Merah",
    deliveryAddress: "Sungai Merah outlet loading bay",
    vehicleId: "vehicle-lorry-01",
    vehicleNo: "EM-LORRY-01",
    driverId: "driver-demo-1",
    driverName: "Demo Driver",
    status: "PENDING",
    paymentType: "CREDIT",
    paymentStatus: "PENDING",
    sourceType: "whatsapp",
    sourceReference: "WA-SM-20260610-001",
    retailSaleId: null,
    requestedDeliveryDate: "2026-06-10",
    proofFileId: null,
    proofPath: "-",
    failedReturnStatus: "NOT_REQUIRED",
    failedReturnRequiredUnits: 0,
    failedReturnCompletedUnits: 0,
    notes: "Demo delivery order",
    createdAt: "2026-06-10T08:30:00.000Z",
  },
  {
    id: "delivery-order-002",
    orderNo: "DO-20260610-002",
    customerName: "Jalan Channel Counter",
    customerPhone: "+60 12-100 2002",
    customerLocation: "Jalan Channel",
    deliveryAddress: "Jalan Channel retail counter",
    vehicleId: "vehicle-van-02",
    vehicleNo: "EM-VAN-02",
    driverId: "driver-demo-1",
    driverName: "Demo Driver",
    status: "DELIVERED",
    paymentType: "CASH",
    paymentStatus: "PAID",
    sourceType: "retail_sale",
    sourceReference: "RS-20260610-001",
    retailSaleId: "sale-demo",
    requestedDeliveryDate: "2026-06-10",
    proofFileId: null,
    proofPath: "-",
    failedReturnStatus: "NOT_REQUIRED",
    failedReturnRequiredUnits: 0,
    failedReturnCompletedUnits: 0,
    notes: "Delivered demo order",
    createdAt: "2026-06-10T10:15:00.000Z",
  },
]

export const demoDeliveryItems: DeliveryOrderItem[] = [
  {
    id: "delivery-item-001",
    orderId: "delivery-order-001",
    orderNo: "DO-20260610-001",
    itemDescription: "MEAT / BELLY / BONELESS",
    quantity: 8,
    weightKg: 168.5,
    notes: "Cartons",
  },
  {
    id: "delivery-item-002",
    orderId: "delivery-order-002",
    orderNo: "DO-20260610-002",
    itemDescription: "PROCESSED / MEATBALL / MEATBALL",
    quantity: 20,
    weightKg: 40,
    notes: "Retail replenishment",
  },
]

export const demoDeliveryStatusLogs: DeliveryStatusLog[] = [
  {
    id: "delivery-log-001",
    orderId: "delivery-order-001",
    orderNo: "DO-20260610-001",
    status: "PENDING",
    notes: "Pending dispatch",
    createdAt: "2026-06-10T08:45:00.000Z",
  },
  {
    id: "delivery-log-002",
    orderId: "delivery-order-002",
    orderNo: "DO-20260610-002",
    status: "DELIVERED",
    notes: "Delivered and paid",
    createdAt: "2026-06-10T12:20:00.000Z",
  },
]

export const demoDriverLocations: DriverLocation[] = [
  {
    id: "driver-location-001",
    orderId: "delivery-order-001",
    orderNo: "DO-20260610-001",
    driverId: "driver-demo-1",
    driverName: "Demo Driver",
    latitude: 2.2871,
    longitude: 111.832,
    locationNote: "Near Sungai Merah",
    createdAt: "2026-06-10T09:30:00.000Z",
  },
]

export const demoDeliveryPayments: DeliveryPayment[] = [
  {
    id: "delivery-payment-001",
    orderId: "delivery-order-002",
    orderNo: "DO-20260610-002",
    paymentType: "CASH",
    paymentStatus: "PAID",
    amount: 520,
    referenceNo: "DO-20260610-002",
    notes: "Cash received",
    createdAt: "2026-06-10T12:25:00.000Z",
  },
]
