import type {
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  Address as PrismaAddress,
  Payment as PrismaPayment,
  PaymentEvent as PrismaPaymentEvent,
  StockReservation as PrismaStockReservation,
  Shipment as PrismaShipment,
  OrderStatus,
  PaymentStatus,
  StockReservationStatus,
  ShipmentStatus,
  FulfillmentStatus,
  ReturnStatus,
  RefundStatus,
  TicketStatus,
  TicketPriority,
  NotificationType,
  DeliveryStatus,
} from "@prisma/client";

export type {
  OrderStatus,
  PaymentStatus,
  StockReservationStatus,
  ShipmentStatus,
  FulfillmentStatus,
  ReturnStatus,
  RefundStatus,
  TicketStatus,
  TicketPriority,
  NotificationType,
  DeliveryStatus,
};

export interface ShippingAddressInput {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateOrProvince?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export type ShippingMethodCode = "STANDARD" | "EXPRESS" | "WHITE_GLOVE";

export interface ShippingMethodOption {
  code: ShippingMethodCode;
  title: string;
  description: string;
  priceInCents: number;
  estimatedDays: string;
}

export interface TaxCalculationResult {
  taxRate: number; // e.g. 0.05 for 5%
  taxInCents: number;
  region: string;
}

export interface OrderItemInput {
  variantId: string;
  quantity: number;
}

export interface CheckoutSubmissionInput {
  businessId?: string;
  items: OrderItemInput[];
  shippingAddress: ShippingAddressInput;
  billingAddress?: ShippingAddressInput;
  shippingMethod: ShippingMethodCode;
  paymentProvider: "MOCK" | "PAYHERE" | "STRIPE";
  guestEmail?: string;
  guestName?: string;
  notes?: string;
}

export interface AuthoritativeOrderTotals {
  subtotalInCents: number;
  shippingInCents: number;
  taxInCents: number;
  discountInCents: number;
  totalInCents: number;
  currency: string;
}

export interface OrderWithDetails extends PrismaOrder {
  items: PrismaOrderItem[];
  shippingAddress: PrismaAddress | null;
  billingAddress: PrismaAddress | null;
  payments: Array<PrismaPayment & { events?: PrismaPaymentEvent[] }>;
  shipments: PrismaShipment[];
  stockReservations: Array<PrismaStockReservation & { variant?: { sku: string } }>;
  user?: { id: string; name: string; email: string } | null;
}
