export type Language = 'en' | 'fa' | 'ps';

export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface MeasurementValues {
  [key: string]: string | number;
}

export interface GarmentTypeConfig {
  id: string; // e.g. 'perahan_tunban', 'wescott', 'shirt', 'kurta', 'two_piece', 'suit', 'coat_korti', 'other'
  key: string;
  nameEn: string;
  nameFa: string; // Dari / دری
  namePs: string; // Pashto / پښتو
  descriptionEn?: string;
  descriptionFa?: string;
  descriptionPs?: string;
  icon?: string;
  sortOrder?: number;
  isStandard?: boolean;
}

export interface MeasurementField {
  id: string;
  key: string;
  labelEn: string;
  labelFa: string; // Dari / دری
  labelPs: string; // Pashto / پښتو
  garmentCategory: string; // 'all' | 'perahan_tunban' | 'wescott' | 'shirt' | 'kurta' | 'two_piece' | 'suit' | 'coat_korti' | string
  unit: string; // 'in' | 'cm'
  defaultValue?: string | number;
  step?: string; // e.g. '0.25', '0.50', '1.0'
  required?: boolean;
  isStandard?: boolean;
  sortOrder?: number;
}

export interface DesignOption {
  id: string;
  nameEn: string;
  nameFa: string;
  namePs: string;
}

export interface DesignCategory {
  id: string;
  key: string;
  garmentCategory?: string; // 'all' | 'perahan_tunban' | 'wescott' | 'shirt' | 'kurta' | 'two_piece' | 'suit' | string
  titleEn: string;
  titleFa: string;
  titlePs: string;
  options: DesignOption[];
  allowCustomInput?: boolean;
  sortOrder?: number;
}

export interface Fabric {
  id: string;
  name: string;
  code: string; // e.g. "FAB-001"
  color: string;
  type: string; // e.g. "Cotton Latha", "Silk Boski", "Wash & Wear", "Velvet", "Wool Blend"
  pricePerMeter: number;
  stockMeters: number;
  supplier?: string;
  imageUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  category: string; // e.g. "Shoes", "Watches", "Perfume"
  vendor?: string;
  brand?: string;
  sku?: string;
  imageUrl?: string;
  purchasePrice: number; // Purchase price only (selling price decided upon sale)
  stockQuantity: number;
  lowStockThreshold?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSale {
  id: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  purchasePrice: number; // cost
  sellingPrice: number; // decided at time of sale
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  profit: number; // (sellingPrice - purchasePrice) * quantity
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  saleDate: string;
  paymentMethod?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  notes?: string;
  standardMeasurements?: MeasurementValues;
  preferredGarmentType?: string;
  createdAt: string;
  updatedAt: string;
  totalOrdersCount?: number;
  totalSpent?: number;
  totalBalance?: number;
}

export interface OrderItem {
  id: string;
  garmentType: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  measurements: MeasurementValues;
  designSelections: Record<string, string>;
  fabricNotes?: string;
  specialInstructions?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // Sequential tracking number, formatted as MA-0001, MA-0002, ...
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerWhatsApp?: string;
  
  items?: OrderItem[];
  
  // Quick direct access for single-garment orders (most common)
  garmentType: string;
  quantity: number;
  measurements: MeasurementValues;
  designSelections: Record<string, string>;
  
  // Fabric Details
  fabricId?: string;
  fabricName?: string;
  fabricColor?: string;
  fabricMeters?: number;
  isCustomerFabric?: boolean;
  
  specialInstructions?: string;
  cabinetSlot?: string;
  // Financials
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;

  // Status & Dates
  status: OrderStatus;
  orderDate: string; // YYYY-MM-DD HH:mm or YYYY-MM-DD
  deliveryDate: string; // YYYY-MM-DD
  completedDate?: string;
  deliveredDate?: string;

  createdAt: string;
  updatedAt: string;
}

export type ReceiptPaperFormat = 'a6' | 'a5' | 'thermal80' | 'thermal58' | 'a4';
export type ThermalReceiptStyle = 'standard' | 'classic' | 'compact';

export interface ShopSettings {
  shopNameEn: string;
  shopNameFa: string;
  shopNamePs: string;
  taglineEn?: string;
  taglineFa?: string;
  taglinePs?: string;
  phone1: string;
  phone2?: string;
  whatsapp: string;
  addressEn: string;
  addressFa: string;
  addressPs: string;
  currencyEn: string;
  currencyFa: string;
  currencyPs: string;
  currencySymbol?: string;
  receiptFooterEn?: string;
  receiptFooterFa?: string;
  receiptFooterPs?: string;
  logoUrl?: string;
  logoType?: 'emblem' | 'scissors' | 'sewing' | 'custom';
  // Receipt Settings configuration
  receiptFormat?: ReceiptPaperFormat;
  receiptThermalStyle?: ThermalReceiptStyle;
  receiptShowLogo?: boolean;
  receiptShowBarcode?: boolean;
  receiptShowQrCode?: boolean;
  receiptShowNotes?: boolean;
  receiptShowTerms?: boolean;
  receiptHeaderNoteFa?: string;
  receiptHeaderNotePs?: string;
  receiptHeaderNoteEn?: string;
}

export type ExpenseCategory = 
  | 'rent'
  | 'utilities'
  | 'materials'
  | 'maintenance'
  | 'food_hospitality'
  | 'salaries'
  | 'salaries_wages'
  | 'transport'
  | 'marketing'
  | 'other';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory | string;
  amount: number;
  date: string; // YYYY-MM-DD
  spentBy: string; // Name of person who incurred or paid the expense
  paymentMethod?: 'cash' | 'bank' | 'mobile_money' | 'other';
  notes?: string;
  receiptNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

