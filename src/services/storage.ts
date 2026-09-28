import { 
  Customer, 
  Order, 
  DesignCategory, 
  MeasurementField, 
  ShopSettings, 
  Fabric, 
  Product, 
  ProductCategory,
  ProductSale,
  GarmentTypeConfig,
  Expense,
  ExpenseCategory
} from '../types';
import { fromDatabaseRows, supabase, toDatabaseRows, isSupabaseConfigured } from '../lib/supabase';
import { textIncludes } from '../lib/search';

const DEFAULT_OWNER_PHONE = '0772559881';
const LEGACY_OWNER_PHONE = '0749592404';
const LEGACY_SHOP_NAMES = ['Mujeeb Afghan Tailor Shop', 'Rayan Tailor Shop Management', 'مدیریت خیاطی رایان', 'د رایان خیاطۍ مدیریت', 'MUJEEB AFGHAN FASION HOUSE'];

const STORAGE_KEYS = {
  ORDERS: 'tailor_orders_v1',
  CUSTOMERS: 'tailor_customers_v1',
  FABRICS: 'tailor_fabrics_v1',
  PRODUCTS: 'tailor_products_v1',
  PRODUCT_CATEGORIES: 'tailor_product_categories_v1',
  PRODUCT_VENDORS: 'tailor_product_vendors_v1',
  PRODUCT_BRANDS: 'tailor_product_brands_v1',
  PRODUCT_SALES: 'tailor_product_sales_v1',
  EXPENSES: 'tailor_expenses_v1',
  DESIGN_CATEGORIES: 'tailor_design_categories_v1',
  MEASUREMENT_FIELDS: 'tailor_measurement_fields_v1',
  GARMENT_TYPES: 'tailor_garment_types_v1',
  SHOP_SETTINGS: 'tailor_shop_settings_v1',
  LANGUAGE: 'tailor_app_lang_v1',
  AUTH_USER: 'tailor_app_auth_user_v1',
  UI_PREFERENCES: 'ui_preferences',
};

export const DEFAULT_PRODUCT_CATEGORIES = ['Shoes', 'Watches', 'Perfume', 'Accessories', 'Caps / Karakul'];
export const DEFAULT_PRODUCT_VENDORS = ['Arab Mobiles Distributor', 'China Shop', 'Kabul Wholesale Supply'];
export const DEFAULT_PRODUCT_BRANDS = ['Peshawari Leather', 'Curren Classic', 'Al-Rehab Oud', 'Casio', 'Mujeeb Collection'];

export const INITIAL_DEMO_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'کفش چرم دست‌دوز اعلا (Handmade Leather Peshawari Shoes)',
    category: 'Shoes',
    brand: 'Peshawari Leather',
    vendor: 'Kabul Wholesale Supply',
    purchasePrice: 1200,
    stockQuantity: 14,
    lowStockThreshold: 3,
    description: 'چرم اصل گاوی دست‌دوز، زیره راحت و بادوام برای مجالس',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'prod_2',
    name: 'ساعت مچی مجلسی طلایی (Classic Gold Quartz Watch)',
    category: 'Watches',
    brand: 'Curren Classic',
    vendor: 'China Shop',
    purchasePrice: 850,
    stockQuantity: 8,
    lowStockThreshold: 2,
    description: 'ضد آب روزمره با رنگ ثابت طلایی و نمایشگر تقویم',
    createdAt: '2026-08-21T11:00:00Z',
    updatedAt: '2026-08-21T11:00:00Z',
  },
  {
    id: 'prod_3',
    name: 'عطر سلطنتی عود و امبر (Royal Oud & Amber Perfume 50ml)',
    category: 'Perfume',
    brand: 'Al-Rehab Oud',
    vendor: 'Arab Mobiles Distributor',
    purchasePrice: 650,
    stockQuantity: 22,
    lowStockThreshold: 4,
    description: 'رایحه ماندگار و اصیل عربی مناسب فصل‌های مختلف',
    createdAt: '2026-08-22T09:30:00Z',
    updatedAt: '2026-08-22T09:30:00Z',
  },
  {
    id: 'prod_4',
    name: 'کفش اسپرت سفید (Urban White Sneakers)',
    category: 'Shoes',
    brand: 'Mujeeb Collection',
    vendor: 'Kabul Wholesale Supply',
    purchasePrice: 950,
    stockQuantity: 11,
    lowStockThreshold: 3,
    description: 'کفش سبک و راحت روزمره با طراحی سفید مینیمال',
    createdAt: '2026-08-23T10:15:00Z',
    updatedAt: '2026-08-23T10:15:00Z',
  },
  {
    id: 'prod_5',
    name: 'کفش رسمی قهوه‌ای (Classic Brown Dress Shoes)',
    category: 'Shoes',
    brand: 'Mujeeb Collection',
    vendor: 'Kabul Wholesale Supply',
    purchasePrice: 1450,
    stockQuantity: 6,
    lowStockThreshold: 2,
    description: 'چرم مصنوعی براق مناسب محافل رسمی و لباس‌های مجلسی',
    createdAt: '2026-08-24T09:00:00Z',
    updatedAt: '2026-08-24T09:00:00Z',
  },
  {
    id: 'prod_6',
    name: 'عطر مشک و عنبر (Musk Amber Perfume 100ml)',
    category: 'Perfume',
    brand: 'Al-Rehab Oud',
    vendor: 'Arab Mobiles Distributor',
    purchasePrice: 780,
    stockQuantity: 16,
    lowStockThreshold: 4,
    description: 'رایحه گرم و ماندگار برای استفاده روزانه و مهمانی',
    createdAt: '2026-08-24T11:30:00Z',
    updatedAt: '2026-08-24T11:30:00Z',
  },
  {
    id: 'prod_7',
    name: 'کلاه قره‌قل سیاه (Black Karakul Cap)',
    category: 'Caps / Karakul',
    brand: 'Mujeeb Collection',
    vendor: 'China Shop',
    purchasePrice: 620,
    stockQuantity: 9,
    lowStockThreshold: 2,
    description: 'کلاه سنتی شیک مناسب لباس افغانی و محافل رسمی',
    createdAt: '2026-08-25T08:45:00Z',
    updatedAt: '2026-08-25T08:45:00Z',
  }
];

export const INITIAL_DEMO_PRODUCT_SALES: ProductSale[] = [
  {
    id: 'sale_demo_1',
    productId: 'prod_1',
    productName: 'کفش چرم دست‌دوز اعلا (Handmade Leather Peshawari Shoes)',
    category: 'Shoes',
    quantity: 2,
    purchasePrice: 1200,
    sellingPrice: 1750,
    totalAmount: 3500,
    paidAmount: 3500,
    balanceAmount: 0,
    paymentStatus: 'paid',
    profit: 1100,
    customerName: 'Ahmad Khan',
    customerPhone: '0771002003',
    saleDate: '2026-09-05T10:30:00Z',
    paymentMethod: 'cash',
    notes: 'Demo sale',
  },
  {
    id: 'sale_demo_2',
    productId: 'prod_2',
    productName: 'ساعت مچی مجلسی طلایی (Classic Gold Quartz Watch)',
    category: 'Watches',
    quantity: 1,
    purchasePrice: 850,
    sellingPrice: 1400,
    totalAmount: 1400,
    paidAmount: 1400,
    balanceAmount: 0,
    paymentStatus: 'paid',
    profit: 550,
    customerName: 'Farid Safi',
    customerPhone: '0772557002',
    saleDate: '2026-09-06T14:15:00Z',
    paymentMethod: 'cash',
    notes: 'Demo sale',
  },
];

export const INITIAL_DEMO_EXPENSES: Expense[] = [];

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopNameEn: 'MUJEEB AFGHAN FASHION HOUSE',
  shopNameFa: 'مجیب افغان خیاطی و لباس‌فروشی',
  shopNamePs: 'مجیب افغان خیاطي او رخت پلورنځی',
  taglineEn: 'Finest bespoke Afghan tailoring & traditional fashion',
  taglineFa: 'بهترین دوخت لباس‌های سنتی، مجلسی و مدرن',
  taglinePs: 'د ټولو دودیزو، مجلسی او عصري جامو باکیفیته ګنډل',
  phone1: '0772559881',
  phone2: '0782220194',
  whatsapp: '0782220194',
  addressEn: 'Char Rahi Buth Khak',
  addressFa: 'چهار راهی بتخاک، کابل افغانستان',
  addressPs: 'چهار راهی بتخاک، کابل افغانستان',
  currencyEn: 'AFN',
  currencyFa: 'افغانی',
  currencyPs: 'افغانۍ',
  currencySymbol: 'AFN',
  receiptFooterEn: 'Please bring this receipt when collecting your order.',
  receiptFooterFa: 'لطفاً هنگام دریافت سفارش، این بل را با خود داشته باشید.',
  receiptFooterPs: 'مهرباني وکړئ د فرمایش د اخیستلو پر مهال دا بِل له ځان سره ولرئ.',
  logoUrl: '/mujeeb-afghan-logo.jpeg',
  logoType: 'emblem',
  receiptFormat: 'thermal80',
  receiptThermalStyle: 'standard',
  receiptShowLogo: true,
  receiptShowBarcode: true,
  receiptShowQrCode: true,
  receiptShowNotes: true,
  receiptShowTerms: true,
  receiptHeaderNoteFa: 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  receiptHeaderNotePs: 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  receiptHeaderNoteEn: 'IN THE NAME OF ALLAH',
};

export const DEFAULT_GARMENT_TYPES: GarmentTypeConfig[] = [
  {
    id: 'gt_perahan_tunban',
    key: 'perahan_tunban',
    nameEn: 'Perahan Tunban (Afghan Suit)',
    nameFa: 'پیراهن و تنبان (افغانی)',
    namePs: 'پیرهن او پرتوګ (افغاني کالي)',
    descriptionEn: 'Traditional Afghan Shalwar Kameez / Perahan Tunban',
    descriptionFa: 'لباس اصیل و سنتی پیراهن و تنبان افغانی',
    descriptionPs: 'اصلي او دودیز افغاني کالي (پیرهن او پرتوګ)',
    icon: 'Shirt',
    sortOrder: 1,
    isStandard: true,
  },
  {
    id: 'gt_wescott',
    key: 'wescott',
    nameEn: 'Wescott / Waistcoat (Wasqat)',
    nameFa: 'واسکت (واسکټ)',
    namePs: 'واسکټ',
    descriptionEn: 'Formal & Traditional Afghan Waistcoat / Wescott',
    descriptionFa: 'واسکټ مجلسی، سنتی و ساده',
    descriptionPs: 'مجلسی او دودیز واسکټ',
    icon: 'Scissors',
    sortOrder: 2,
    isStandard: true,
  },
  {
    id: 'gt_shirt',
    key: 'shirt',
    nameEn: 'Shirt (Dress / Casual)',
    nameFa: 'قمیص (پیراهن آستین‌دار)',
    namePs: 'کمیس (لستوڼي لرونکی)',
    descriptionEn: 'Formal dress shirt, button-down, or casual shirt',
    descriptionFa: 'پیراهن مردانه آستین‌دار و رسمی',
    descriptionPs: 'رسمي او عادي کمیس',
    icon: 'Shirt',
    sortOrder: 3,
    isStandard: true,
  },
  {
    id: 'gt_kurta',
    key: 'kurta',
    nameEn: 'Kurta Style',
    nameFa: 'کرته (کورته)',
    namePs: 'کورته',
    descriptionEn: 'Modern or Traditional Kurta Style',
    descriptionFa: 'دوخت کرته به استایل‌های شیک و مختلف',
    descriptionPs: 'د کورته ډول کالي',
    icon: 'Sparkles',
    sortOrder: 4,
    isStandard: true,
  },
  {
    id: 'gt_two_piece',
    key: 'two_piece',
    nameEn: 'Two Piece',
    nameFa: 'دو تکه (ست دو پارچه)',
    namePs: 'دوه ټوټې (ست کالي)',
    descriptionEn: 'Matching Top & Trouser Two-Piece Garment',
    descriptionFa: 'ست پیراهن و پتلون دو تکه',
    descriptionPs: 'دوه ټوټې ست کالي',
    icon: 'Layers',
    sortOrder: 5,
    isStandard: true,
  },
  {
    id: 'gt_suit',
    key: 'suit',
    nameEn: 'Suit (Drishi / Coat & Pant)',
    nameFa: 'دریشی (کوت و پتلون)',
    namePs: 'دریشي (کوت او پتلون)',
    descriptionEn: 'Two-piece or Three-piece Western / Business Suit',
    descriptionFa: 'دریشی، کوت و پتلون مجلسی و اداری',
    descriptionPs: 'رسمي دریشي او پتلون',
    icon: 'Building2',
    sortOrder: 6,
    isStandard: true,
  },
  {
    id: 'gt_coat_korti',
    key: 'coat_korti',
    nameEn: 'Coat / Korti',
    nameFa: 'کرتی (کوت تک)',
    namePs: 'کورټۍ (کوت)',
    descriptionEn: 'Single Blazer / Jacket / Traditional Korti',
    descriptionFa: 'کوت تک و کرتی',
    descriptionPs: 'کورټۍ او کوټ',
    icon: 'Scissors',
    sortOrder: 7,
    isStandard: true,
  },
  {
    id: 'gt_other',
    key: 'other',
    nameEn: 'Custom / Other',
    nameFa: 'سایر فرمایشات',
    namePs: 'نور فرمایشونه',
    descriptionEn: 'Special customized tailoring request',
    descriptionFa: 'فرمایش اختصاصی',
    descriptionPs: 'ځانګړی فرمایش',
    icon: 'Tag',
    sortOrder: 8,
    isStandard: true,
  },
];

export const DEFAULT_MEASUREMENT_FIELDS: MeasurementField[] = [
  // --- PERAHAN TUNBAN (Afghan Suit) ---
  { id: 'm1', key: 'qad', labelEn: 'Length (Qad)', labelFa: 'قد', labelPs: 'قد', unit: 'in', defaultValue: '40', step: '0.50"', garmentCategory: 'perahan_tunban', required: true, isStandard: true, sortOrder: 1 },
  { id: 'm2', key: 'shana', labelEn: 'Shoulder (Shana)', labelFa: 'شانه', labelPs: 'شانه', unit: 'in', defaultValue: '18.5', step: '0.25"', garmentCategory: 'perahan_tunban', required: true, isStandard: true, sortOrder: 2 },
  { id: 'm3', key: 'asteen', labelEn: 'Sleeve (Asteen)', labelFa: 'آستین', labelPs: 'آستین', unit: 'in', defaultValue: '23', step: '0.50"', garmentCategory: 'perahan_tunban', required: true, isStandard: true, sortOrder: 3 },
  { id: 'm4', key: 'yakhan', labelEn: 'Collar (Yakhan)', labelFa: 'یخن', labelPs: 'یخن', unit: 'in', defaultValue: '16.5', step: '0.25"', garmentCategory: 'perahan_tunban', required: true, isStandard: true, sortOrder: 4 },
  { id: 'm5', key: 'chati', labelEn: 'Chest (Chati)', labelFa: 'چاتی (سینه)', labelPs: 'چاتی (سینه)', unit: 'in', defaultValue: '22', step: '0.50"', garmentCategory: 'perahan_tunban', required: true, isStandard: true, sortOrder: 5 },
  { id: 'm6', key: 'baghal', labelEn: 'Armpit (Baghal)', labelFa: 'بغل', labelPs: 'بغل', unit: 'in', defaultValue: '21', step: '0.50"', garmentCategory: 'perahan_tunban', required: false, isStandard: true, sortOrder: 6 },
  { id: 'm7', key: 'kamar', labelEn: 'Waist (Kamar)', labelFa: 'کمر', labelPs: 'کمر', unit: 'in', defaultValue: '22.5', step: '0.50"', garmentCategory: 'perahan_tunban', required: false, isStandard: true, sortOrder: 7 },
  { id: 'm8', key: 'daman', labelEn: 'Daman (Hem)', labelFa: 'دامن', labelPs: 'دامن', unit: 'in', defaultValue: '25', step: '0.50"', garmentCategory: 'perahan_tunban', required: true, isStandard: true, sortOrder: 8 },
  { id: 'm9', key: 'tunban', labelEn: 'Trouser (Tunban)', labelFa: 'تنبان', labelPs: 'تنبان / پرتوګ', unit: 'in', defaultValue: '38', step: '0.50"', garmentCategory: 'perahan_tunban', required: true, isStandard: true, sortOrder: 9 },
  { id: 'm10', key: 'pacha', labelEn: 'Bottom (Pacha)', labelFa: 'پاچه', labelPs: 'پاچه', unit: 'in', defaultValue: '8.5', step: '0.25"', garmentCategory: 'perahan_tunban', required: true, isStandard: true, sortOrder: 10 },
  { id: 'm11', key: 'surin', labelEn: 'Seat/Hip (Surin)', labelFa: 'سورین', labelPs: 'سورین', unit: 'in', defaultValue: '24', step: '0.50"', garmentCategory: 'perahan_tunban', required: false, isStandard: true, sortOrder: 11 },
  { id: 'm12', key: 'machDast', labelEn: 'Wrist (Mach Dast)', labelFa: 'مچ دست', labelPs: 'مچ لاس', unit: 'in', defaultValue: '9', step: '0.25"', garmentCategory: 'perahan_tunban', required: false, isStandard: false, sortOrder: 12 },

  // --- WESCOTT / WAISTCOAT ---
  { id: 'mw1', key: 'wescott_qad', labelEn: 'Wescott Length', labelFa: 'قد واسکت', labelPs: 'د واسکټ قد', unit: 'in', defaultValue: '26', step: '0.50"', garmentCategory: 'wescott', required: true, isStandard: true, sortOrder: 1 },
  { id: 'mw2', key: 'wescott_shana', labelEn: 'Wescott Shoulder', labelFa: 'شانه واسکت', labelPs: 'د واسکټ شانه', unit: 'in', defaultValue: '16.5', step: '0.25"', garmentCategory: 'wescott', required: true, isStandard: true, sortOrder: 2 },
  { id: 'mw3', key: 'wescott_chati', labelEn: 'Wescott Chest', labelFa: 'سینه واسکت (چاتی)', labelPs: 'د واسکټ سینه', unit: 'in', defaultValue: '38', step: '0.50"', garmentCategory: 'wescott', required: true, isStandard: true, sortOrder: 3 },
  { id: 'mw4', key: 'wescott_kamar', labelEn: 'Wescott Waist', labelFa: 'کمر واسکت', labelPs: 'د واسکټ کمر', unit: 'in', defaultValue: '36', step: '0.50"', garmentCategory: 'wescott', required: true, isStandard: true, sortOrder: 4 },
  { id: 'mw5', key: 'wescott_yakhan', labelEn: 'V-Neck / Collar', labelFa: 'یخن / هفت واسکت', labelPs: 'د واسکټ غاړه', unit: 'in', defaultValue: '15.5', step: '0.25"', garmentCategory: 'wescott', required: false, isStandard: true, sortOrder: 5 },
  { id: 'mw6', key: 'wescott_baghal', labelEn: 'Armhole (Baghal)', labelFa: 'بغل / حلقه آستین واسکت', labelPs: 'د واسکټ بغل', unit: 'in', defaultValue: '19', step: '0.25"', garmentCategory: 'wescott', required: false, isStandard: false, sortOrder: 6 },
  { id: 'mw7', key: 'wescott_surin', labelEn: 'Hip / Seat', labelFa: 'سورین واسکت', labelPs: 'د واسکټ سورین', unit: 'in', defaultValue: '39', step: '0.50"', garmentCategory: 'wescott', required: false, isStandard: false, sortOrder: 7 },

  // --- SHIRT (Dress / Casual) ---
  { id: 'ms1', key: 'shirt_qad', labelEn: 'Shirt Length', labelFa: 'قد قمیص', labelPs: 'د کمیس قد', unit: 'in', defaultValue: '30', step: '0.50"', garmentCategory: 'shirt', required: true, isStandard: true, sortOrder: 1 },
  { id: 'ms2', key: 'shirt_shana', labelEn: 'Shoulder', labelFa: 'شانه قمیص', labelPs: 'د کمیس شانه', unit: 'in', defaultValue: '18', step: '0.25"', garmentCategory: 'shirt', required: true, isStandard: true, sortOrder: 2 },
  { id: 'ms3', key: 'shirt_asteen', labelEn: 'Sleeve Length', labelFa: 'آستین قمیص', labelPs: 'د کمیس لستوڼی', unit: 'in', defaultValue: '24', step: '0.50"', garmentCategory: 'shirt', required: true, isStandard: true, sortOrder: 3 },
  { id: 'ms4', key: 'shirt_collar', labelEn: 'Collar Neck', labelFa: 'کالر قمیص', labelPs: 'د کمیس کالر', unit: 'in', defaultValue: '16', step: '0.25"', garmentCategory: 'shirt', required: true, isStandard: true, sortOrder: 4 },
  { id: 'ms5', key: 'shirt_chest', labelEn: 'Chest', labelFa: 'چاتی (سینه) قمیص', labelPs: 'د کمیس سینه', unit: 'in', defaultValue: '40', step: '0.50"', garmentCategory: 'shirt', required: true, isStandard: true, sortOrder: 5 },
  { id: 'ms6', key: 'shirt_waist', labelEn: 'Waist', labelFa: 'کمر قمیص', labelPs: 'د کمیس کمر', unit: 'in', defaultValue: '38', step: '0.50"', garmentCategory: 'shirt', required: false, isStandard: true, sortOrder: 6 },
  { id: 'ms7', key: 'shirt_cuff', labelEn: 'Cuff Width', labelFa: 'کف قمیص', labelPs: 'د کمیس کف', unit: 'in', defaultValue: '9.5', step: '0.25"', garmentCategory: 'shirt', required: false, isStandard: false, sortOrder: 7 },

  // --- KURTA STYLE ---
  { id: 'mk1', key: 'kurta_qad', labelEn: 'Kurta Length', labelFa: 'قد کرته', labelPs: 'د کورته قد', unit: 'in', defaultValue: '42', step: '0.50"', garmentCategory: 'kurta', required: true, isStandard: true, sortOrder: 1 },
  { id: 'mk2', key: 'kurta_shana', labelEn: 'Shoulder', labelFa: 'شانه کرته', labelPs: 'د کورته شانه', unit: 'in', defaultValue: '18.5', step: '0.25"', garmentCategory: 'kurta', required: true, isStandard: true, sortOrder: 2 },
  { id: 'mk3', key: 'kurta_asteen', labelEn: 'Sleeve', labelFa: 'آستین کرته', labelPs: 'د کورته لستوڼی', unit: 'in', defaultValue: '23.5', step: '0.50"', garmentCategory: 'kurta', required: true, isStandard: true, sortOrder: 3 },
  { id: 'mk4', key: 'kurta_collar', labelEn: 'Band / Neck', labelFa: 'یخن / بین کرته', labelPs: 'د کورته غاړه', unit: 'in', defaultValue: '16.5', step: '0.25"', garmentCategory: 'kurta', required: true, isStandard: true, sortOrder: 4 },
  { id: 'mk5', key: 'kurta_chest', labelEn: 'Chest', labelFa: 'سینه کرته', labelPs: 'د کورته سینه', unit: 'in', defaultValue: '22.5', step: '0.50"', garmentCategory: 'kurta', required: true, isStandard: true, sortOrder: 5 },
  { id: 'mk6', key: 'kurta_daman', labelEn: 'Hem (Daman)', labelFa: 'دامن کرته', labelPs: 'د کورته دامن', unit: 'in', defaultValue: '26', step: '0.50"', garmentCategory: 'kurta', required: true, isStandard: true, sortOrder: 6 },
  { id: 'mk7', key: 'kurta_tunban', labelEn: 'Trouser / Pajama', labelFa: 'تنبان / پاجامه کرته', labelPs: 'د کورته پرتوګ', unit: 'in', defaultValue: '38', step: '0.50"', garmentCategory: 'kurta', required: false, isStandard: false, sortOrder: 7 },
  { id: 'mk8', key: 'kurta_pacha', labelEn: 'Bottom (Pacha)', labelFa: 'پاچه کرته', labelPs: 'د کورته پاچه', unit: 'in', defaultValue: '8.5', step: '0.25"', garmentCategory: 'kurta', required: false, isStandard: false, sortOrder: 8 },

  // --- TWO PIECE ---
  { id: 'mtp1', key: 'tp_top_qad', labelEn: 'Top Length', labelFa: 'قد بالاپوش / قمیص', labelPs: 'د پورته جامې قد', unit: 'in', defaultValue: '32', step: '0.50"', garmentCategory: 'two_piece', required: true, isStandard: true, sortOrder: 1 },
  { id: 'mtp2', key: 'tp_shana', labelEn: 'Shoulder', labelFa: 'شانه', labelPs: 'شانه', unit: 'in', defaultValue: '18', step: '0.25"', garmentCategory: 'two_piece', required: true, isStandard: true, sortOrder: 2 },
  { id: 'mtp3', key: 'tp_asteen', labelEn: 'Sleeve', labelFa: 'آستین', labelPs: 'لستوڼی', unit: 'in', defaultValue: '24', step: '0.50"', garmentCategory: 'two_piece', required: true, isStandard: true, sortOrder: 3 },
  { id: 'mtp4', key: 'tp_chest', labelEn: 'Chest', labelFa: 'چاتی (سینه)', labelPs: 'سینه', unit: 'in', defaultValue: '40', step: '0.50"', garmentCategory: 'two_piece', required: true, isStandard: true, sortOrder: 4 },
  { id: 'mtp5', key: 'tp_pant_qad', labelEn: 'Pant Length', labelFa: 'قد پتلون / تنبان', labelPs: 'د پتلون قد', unit: 'in', defaultValue: '40', step: '0.50"', garmentCategory: 'two_piece', required: true, isStandard: true, sortOrder: 5 },
  { id: 'mtp6', key: 'tp_pant_kamar', labelEn: 'Pant Waist', labelFa: 'کمر پتلون', labelPs: 'د پتلون کمر', unit: 'in', defaultValue: '34', step: '0.50"', garmentCategory: 'two_piece', required: true, isStandard: true, sortOrder: 6 },
  { id: 'mtp7', key: 'tp_pacha', labelEn: 'Bottom (Pacha)', labelFa: 'دم پای / پاچه', labelPs: 'پاچه', unit: 'in', defaultValue: '15', step: '0.25"', garmentCategory: 'two_piece', required: true, isStandard: true, sortOrder: 7 },

  // --- SUIT (Drishi / Coat & Pant) & COAT/KORTI ---
  { id: 'msu1', key: 'suit_coat_qad', labelEn: 'Coat Length', labelFa: 'قد کوت', labelPs: 'د کوټ قد', unit: 'in', defaultValue: '29', step: '0.50"', garmentCategory: 'suit', required: true, isStandard: true, sortOrder: 1 },
  { id: 'msu2', key: 'suit_shana', labelEn: 'Shoulder', labelFa: 'شانه کوت', labelPs: 'د کوټ شانه', unit: 'in', defaultValue: '18.5', step: '0.25"', garmentCategory: 'suit', required: true, isStandard: true, sortOrder: 2 },
  { id: 'msu3', key: 'suit_asteen', labelEn: 'Sleeve', labelFa: 'آستین کوت', labelPs: 'د کوټ لستوڼی', unit: 'in', defaultValue: '24.5', step: '0.50"', garmentCategory: 'suit', required: true, isStandard: true, sortOrder: 3 },
  { id: 'msu4', key: 'suit_chest', labelEn: 'Coat Chest', labelFa: 'سینه کوت', labelPs: 'د کوټ سینه', unit: 'in', defaultValue: '40', step: '0.50"', garmentCategory: 'suit', required: true, isStandard: true, sortOrder: 4 },
  { id: 'msu5', key: 'suit_kamar', labelEn: 'Coat Waist', labelFa: 'کمر کوت', labelPs: 'د کوټ کمر', unit: 'in', defaultValue: '37', step: '0.50"', garmentCategory: 'suit', required: true, isStandard: true, sortOrder: 5 },
  { id: 'msu6', key: 'suit_pant_qad', labelEn: 'Pant Length', labelFa: 'قد پتلون', labelPs: 'د پتلون قد', unit: 'in', defaultValue: '40', step: '0.50"', garmentCategory: 'suit', required: true, isStandard: true, sortOrder: 6 },
  { id: 'msu7', key: 'suit_pant_waist', labelEn: 'Pant Waist', labelFa: 'کمر پتلون', labelPs: 'د پتلون کمر', unit: 'in', defaultValue: '34', step: '0.50"', garmentCategory: 'suit', required: true, isStandard: true, sortOrder: 7 },
  { id: 'msu8', key: 'suit_pant_hip', labelEn: 'Pant Hip / Seat', labelFa: 'سورین پتلون', labelPs: 'د پتلون سورین', unit: 'in', defaultValue: '40', step: '0.50"', garmentCategory: 'suit', required: false, isStandard: false, sortOrder: 8 },
  { id: 'msu9', key: 'suit_pant_bottom', labelEn: 'Pant Bottom', labelFa: 'دم پای پتلون', labelPs: 'د پتلون پاچه', unit: 'in', defaultValue: '15.5', step: '0.25"', garmentCategory: 'suit', required: true, isStandard: true, sortOrder: 9 },

  // --- COAT / KORTI ---
  { id: 'mck1', key: 'korti_qad', labelEn: 'Korti Length', labelFa: 'قد کرتی / کوت', labelPs: 'د کورټۍ قد', unit: 'in', defaultValue: '28', step: '0.50"', garmentCategory: 'coat_korti', required: true, isStandard: true, sortOrder: 1 },
  { id: 'mck2', key: 'korti_shana', labelEn: 'Shoulder', labelFa: 'شانه کرتی', labelPs: 'د کورټۍ شانه', unit: 'in', defaultValue: '18', step: '0.25"', garmentCategory: 'coat_korti', required: true, isStandard: true, sortOrder: 2 },
  { id: 'mck3', key: 'korti_asteen', labelEn: 'Sleeve', labelFa: 'آستین کرتی', labelPs: 'د کورټۍ لستوڼی', unit: 'in', defaultValue: '24', step: '0.50"', garmentCategory: 'coat_korti', required: true, isStandard: true, sortOrder: 3 },
  { id: 'mck4', key: 'korti_chest', labelEn: 'Chest', labelFa: 'سینه کرتی', labelPs: 'د کورټۍ سینه', unit: 'in', defaultValue: '39', step: '0.50"', garmentCategory: 'coat_korti', required: true, isStandard: true, sortOrder: 4 },
  { id: 'mck5', key: 'korti_kamar', labelEn: 'Waist', labelFa: 'کمر کرتی', labelPs: 'د کورټۍ کمر', unit: 'in', defaultValue: '36', step: '0.50"', garmentCategory: 'coat_korti', required: false, isStandard: true, sortOrder: 5 },
];

export const DEFAULT_DESIGN_CATEGORIES: DesignCategory[] = [
  // --- PERAHAN TUNBAN DESIGNS ---
  {
    id: 'd1',
    key: 'yakhanShape',
    garmentCategory: 'perahan_tunban',
    titleEn: 'Collar Shape / Style',
    titleFa: 'شیپ یخن / کالر',
    titlePs: 'د یخن ډول / شیپ',
    allowCustomInput: true,
    options: [
      { id: 'o1_1', nameEn: 'Collar (Standard)', nameFa: 'کالر', namePs: 'کالر' },
      { id: 'o1_2', nameEn: 'V-Neck (Haft Ghara)', nameFa: 'هفت غاره', namePs: 'هفت غاړه' },
      { id: 'o1_3', nameEn: 'Mandarin Band (Bayn)', nameFa: 'بین ساده', namePs: 'ساده بین' },
      { id: 'o1_4', nameEn: 'Semi-Collar', nameFa: 'نیم کالر', namePs: 'نیم کالر' },
      { id: 'o1_5', nameEn: 'Sherwani Collar', nameFa: 'شروانی', namePs: 'شرواني یخن' },
      { id: 'o1_6', nameEn: 'Piped Collar (Moghzi)', nameFa: 'مغزی دار', namePs: 'مغزي لرونکی' },
    ],
  },
  {
    id: 'd2',
    key: 'cuffStyle',
    garmentCategory: 'perahan_tunban',
    titleEn: 'Sleeve Cuff Style',
    titleFa: 'کف یا استین',
    titlePs: 'کف یا لستوڼی',
    allowCustomInput: true,
    options: [
      { id: 'o2_1', nameEn: 'Round Cuff (9.25)', nameFa: 'کول کف (9.25)', namePs: 'کول کف (9.25)' },
      { id: 'o2_2', nameEn: 'Cut Cuff', nameFa: 'کټ کف', namePs: 'کټ کف' },
      { id: 'o2_3', nameEn: 'Plain Sleeve (No Cuff)', nameFa: 'استین ساده', namePs: 'ساده لستوڼی' },
      { id: 'o2_4', nameEn: 'Double Button Cuff', nameFa: 'کف دو دکمه', namePs: 'دوه تڼۍ کف' },
    ],
  },
  {
    id: 'd3',
    key: 'damanStyle',
    garmentCategory: 'perahan_tunban',
    titleEn: 'Daman Style (Hem)',
    titleFa: 'شیپ دامن',
    titlePs: 'د دامن ډول',
    allowCustomInput: true,
    options: [
      { id: 'o3_1', nameEn: 'Round Daman (Kol)', nameFa: 'کول دامن (ګرد)', namePs: 'کول دامن (ګرد)' },
      { id: 'o3_2', nameEn: 'Square Daman (Char Kunj)', nameFa: 'چارکنج دامن (چوکور)', namePs: 'چوکور دامن' },
      { id: 'o3_3', nameEn: 'Slanted Daman', nameFa: 'دامن کږه', namePs: 'کږه دامن' },
    ],
  },
  {
    id: 'd4',
    key: 'frontPocket',
    garmentCategory: 'perahan_tunban',
    titleEn: 'Front Chest Pocket',
    titleFa: 'جیب رو / سینه',
    titlePs: 'د سینې جېب',
    allowCustomInput: true,
    options: [
      { id: 'o4_1', nameEn: 'One Chest Pocket', nameFa: 'یک جیب رو', namePs: 'یو د سینې جېب' },
      { id: 'o4_2', nameEn: 'Two Chest Pockets', nameFa: 'دو جیب رو', namePs: 'دوه د سینې جېبونه' },
      { id: 'o4_3', nameEn: 'No Chest Pocket', nameFa: 'بی جیب رو', namePs: 'بې د سینې جېب' },
      { id: 'o4_4', nameEn: 'Zipper Pocket', nameFa: 'جیب زیپ دار', namePs: 'زیپ لرونکی جېب' },
    ],
  },
  {
    id: 'd5',
    key: 'sidePocket',
    garmentCategory: 'perahan_tunban',
    titleEn: 'Side Pockets',
    titleFa: 'جیب بغل',
    titlePs: 'د اړخ (بغل) جېبونه',
    allowCustomInput: true,
    options: [
      { id: 'o5_1', nameEn: 'Two Side Pockets', nameFa: 'دو جیب بغل', namePs: 'دوه د بغل جېبونه' },
      { id: 'o5_2', nameEn: 'One Side Pocket', nameFa: 'یک جیب بغل', namePs: 'یو د بغل جېب' },
      { id: 'o5_3', nameEn: 'No Side Pocket', nameFa: 'بی جیب بغل', namePs: 'بې د بغل جېب' },
    ],
  },
  {
    id: 'd6',
    key: 'trouserPocket',
    garmentCategory: 'perahan_tunban',
    titleEn: 'Trouser Pocket',
    titleFa: 'جیب تنبان',
    titlePs: 'د پرتوګ (تنبان) جېب',
    allowCustomInput: true,
    options: [
      { id: 'o6_1', nameEn: 'One Trouser Pocket', nameFa: 'یک جیب تنبان', namePs: 'یو د پرتوګ جېب' },
      { id: 'o6_2', nameEn: 'Two Trouser Pockets', nameFa: 'دو جیب تنبان', namePs: 'دوه د پرتوګ جېبونه' },
      { id: 'o6_3', nameEn: 'Zipper Pocket', nameFa: 'جیب زیپ دار تنبان', namePs: 'زیپ لرونکی تنبان جېب' },
      { id: 'o6_4', nameEn: 'No Pocket', nameFa: 'بی جیب', namePs: 'بې جېب' },
    ],
  },
  {
    id: 'd7',
    key: 'placketButtons',
    garmentCategory: 'perahan_tunban',
    titleEn: 'Buttons & Placket',
    titleFa: 'دکمه و پتی',
    titlePs: 'تڼۍ او پټۍ',
    allowCustomInput: true,
    options: [
      { id: 'o7_1', nameEn: 'Simple Buttons (0.90x14)', nameFa: 'ساده دکمه (0.90x14)', namePs: 'ساده تڼۍ (0.90x14)' },
      { id: 'o7_2', nameEn: 'Concealed Placket (Patah)', nameFa: 'پټه پتی (پټ دکمه)', namePs: 'پټه پټۍ (پټې تڼۍ)' },
      { id: 'o7_3', nameEn: 'Designer Buttons', nameFa: 'دکمه ډیزاین', namePs: 'ډیزایني تڼۍ' },
      { id: 'o7_4', nameEn: 'Pleated Placket', nameFa: 'پتی چین دار', namePs: 'چین دار پټۍ' },
    ],
  },
  {
    id: 'd8',
    key: 'trouserStyle',
    garmentCategory: 'perahan_tunban',
    titleEn: 'Trouser Fit / Style',
    titleFa: 'شیپ تنبان',
    titlePs: 'د تنبان / پرتوګ سټایل',
    allowCustomInput: true,
    options: [
      { id: 'o8_1', nameEn: 'Normal Width (22 in)', nameFa: 'نارمل 22', namePs: 'نارمل 22' },
      { id: 'o8_2', nameEn: 'Wide Afghan Cut (24 in)', nameFa: 'فراخ افغانی 24', namePs: 'پراخه افغاني 24' },
      { id: 'o8_3', nameEn: 'Slim Fit (20 in)', nameFa: 'تنگ / فټ 20', namePs: 'تنګ / فټ 20' },
      { id: 'o8_4', nameEn: 'Elastic Waist (Kash)', nameFa: 'کمر کش دار', namePs: 'کش لرونکی کمر' },
    ],
  },

  // --- WESCOTT DESIGNS ---
  {
    id: 'dw1',
    key: 'wescottNeck',
    garmentCategory: 'wescott',
    titleEn: 'Neck / Collar Style',
    titleFa: 'شیپ هفت و یخن واسکت',
    titlePs: 'د واسکټ د غاړې شیپ',
    allowCustomInput: true,
    options: [
      { id: 'ow1_1', nameEn: 'Classic V-Neck (Haft Standard)', nameFa: 'هفت کلاسیک استاندارد', namePs: 'کلاسیک او معیاري هفت' },
      { id: 'ow1_2', nameEn: 'Mandarin Band (Bayn Wasqat)', nameFa: 'یخن بین واسکتی', namePs: 'بین غاړه واسکټ' },
      { id: 'ow1_3', nameEn: 'Deep V-Neck (Low Cut)', nameFa: 'هفت عمیق و باز', namePs: 'ژور هفت' },
      { id: 'ow1_4', nameEn: 'Sherwani High Neck', nameFa: 'یخن شروانی واسکت', namePs: 'شرواني یخن' },
    ],
  },
  {
    id: 'dw2',
    key: 'wescottPockets',
    garmentCategory: 'wescott',
    titleEn: 'Wescott Pockets',
    titleFa: 'جیب‌های واسکت',
    titlePs: 'د واسکټ جېبونه',
    allowCustomInput: true,
    options: [
      { id: 'ow2_1', nameEn: '2 Bottom + 1 Chest Pocket', nameFa: 'دو جیب پایین + ۱ جیب سینه', namePs: 'دوه لاندې + یو د سینې جېب' },
      { id: 'ow2_2', nameEn: '4 Pockets (Formal)', nameFa: 'چهار جیب مجلسی', namePs: 'څلور جېبونه' },
      { id: 'ow2_3', nameEn: 'Slanted Welt Pockets', nameFa: 'جیب‌های فیلتاب مایل', namePs: 'مایل فیلتاب جېبونه' },
      { id: 'ow2_4', nameEn: '2 Bottom Pockets Only', nameFa: 'فقط ۲ جیب پایین', namePs: 'یوازې ۲ لاندې جېبونه' },
    ],
  },
  {
    id: 'dw3',
    key: 'wescottButtons',
    garmentCategory: 'wescott',
    titleEn: 'Wescott Buttons & Closure',
    titleFa: 'دکمه‌های واسکت',
    titlePs: 'د واسکټ تڼۍ',
    allowCustomInput: true,
    options: [
      { id: 'ow3_1', nameEn: '5 Fancy Metal/Designer Buttons', nameFa: '۵ دکمه فلزی و لوکس', namePs: '۵ فلزي او ډیزایني تڼۍ' },
      { id: 'ow3_2', nameEn: '6 Classic Buttons', nameFa: '۶ دکمه کلاسیک', namePs: '۶ کلاسیکې تڼۍ' },
      { id: 'ow3_3', nameEn: 'Concealed (Hidden Buttons)', nameFa: 'پټ دکمه', namePs: 'پټې تڼۍ' },
      { id: 'ow3_4', nameEn: '4 Large Horn Buttons', nameFa: '۴ دکمه درشت استخوانی', namePs: '۴ غټې تڼۍ' },
    ],
  },
  {
    id: 'dw4',
    key: 'wescottBackHem',
    garmentCategory: 'wescott',
    titleEn: 'Wescott Hem & Back Strap',
    titleFa: 'دامن و تسمه پشت واسکت',
    titlePs: 'د واسکټ د لمنې او شا تسمه',
    allowCustomInput: true,
    options: [
      { id: 'ow4_1', nameEn: 'Pointed Hem + Adjustable Buckle', nameFa: 'دامن نوک‌تیز دو گوشه + تسمه بکل‌دار', namePs: 'نوک تېزه لمن + بکل لرونکې تسمه' },
      { id: 'ow4_2', nameEn: 'Straight Flat Hem + Back Belt', nameFa: 'دامن صاف + نیم تسمه پشت', namePs: 'صاف لمنه + شاتنۍ تسمه' },
      { id: 'ow4_3', nameEn: 'Curved Round Hem + Plain Back', nameFa: 'دامن هلال + پشت ساده', namePs: 'هلالي لمنه + ساده شا' },
    ],
  },

  // --- SHIRT DESIGNS ---
  {
    id: 'ds1',
    key: 'shirtCollar',
    garmentCategory: 'shirt',
    titleEn: 'Shirt Collar Style',
    titleFa: 'کالر قمیص',
    titlePs: 'د کمیس کالر',
    allowCustomInput: true,
    options: [
      { id: 'os1_1', nameEn: 'Classic English Pointed', nameFa: 'کالر کلاسیک انگلیسی', namePs: 'انګلیسي کالر' },
      { id: 'os1_2', nameEn: 'Wide Spread Collar', nameFa: 'کالر پهن مجلسی', namePs: 'پراخ کالر' },
      { id: 'os1_3', nameEn: 'Mandarin Band (Bayn)', nameFa: 'بین ساده (بدون برگردان)', namePs: 'ساده بین' },
      { id: 'os1_4', nameEn: 'Button-Down Collar', nameFa: 'کالر دکمه‌دار', namePs: 'تڼۍ لرونکی کالر' },
    ],
  },
  {
    id: 'ds2',
    key: 'shirtCuff',
    garmentCategory: 'shirt',
    titleEn: 'Shirt Cuff Style',
    titleFa: 'کف قمیص',
    titlePs: 'د کمیس کف',
    allowCustomInput: true,
    options: [
      { id: 'os2_1', nameEn: 'Single Button Rounded Cuff', nameFa: 'کف گرد یک دکمه', namePs: 'ګرد یو تڼۍ کف' },
      { id: 'os2_2', nameEn: 'Two-Button Angle Cut Cuff', nameFa: 'کف کټ دو دکمه', namePs: 'کټ شوی دوه تڼۍ کف' },
      { id: 'os2_3', nameEn: 'French Double Cuff (Cufflinks)', nameFa: 'کف فرانسوی (دوبل دکمه سردست)', namePs: 'فرانسوي دوبل کف' },
    ],
  },
  {
    id: 'ds3',
    key: 'shirtPockets',
    garmentCategory: 'shirt',
    titleEn: 'Shirt Pocket',
    titleFa: 'جیب قمیص',
    titlePs: 'د کمیس جېب',
    allowCustomInput: true,
    options: [
      { id: 'os3_1', nameEn: 'One Plain Pocket', nameFa: 'یک جیب ساده', namePs: 'یو ساده جېب' },
      { id: 'os3_2', nameEn: 'One Pocket with Flap', nameFa: 'یک جیب دردار', namePs: 'یو سرپوښ لرونکی جېب' },
      { id: 'os3_3', nameEn: 'Two Pockets with Flap', nameFa: 'دو جیب دردار', namePs: 'دوه سرپوښ لرونکي جېبونه' },
      { id: 'os3_4', nameEn: 'No Pocket (Clean)', nameFa: 'بدون جیب', namePs: 'بې جېبه' },
    ],
  },

  // --- KURTA DESIGNS ---
  {
    id: 'dk1',
    key: 'kurtaNeck',
    garmentCategory: 'kurta',
    titleEn: 'Kurta Neck & Placket',
    titleFa: 'یخن و پتی کرته',
    titlePs: 'د کورته یخن او پټۍ',
    allowCustomInput: true,
    options: [
      { id: 'ok1_1', nameEn: 'Mandarin Band with Placket', nameFa: 'بین ساده با پتی دکمه‌دار', namePs: 'ساده بین او پټۍ' },
      { id: 'ok1_2', nameEn: 'Embroidered Neck (Guldazi)', nameFa: 'یخن گلدوزی و دست‌دوز', namePs: 'ګلدوزي شوی یخن' },
      { id: 'ok1_3', nameEn: 'V-Placket Style', nameFa: 'هفت پتی دار مدرن', namePs: 'هفت پټۍ لرونکی' },
    ],
  },
  {
    id: 'dk2',
    key: 'kurtaDaman',
    garmentCategory: 'kurta',
    titleEn: 'Kurta Daman Cut',
    titleFa: 'دامن و چاک کرته',
    titlePs: 'د کورته لمنه او چاک',
    allowCustomInput: true,
    options: [
      { id: 'ok2_1', nameEn: 'Straight Hem with Side Slits', nameFa: 'دامن صاف با چاک بغل', namePs: 'صاف لمنه د بغل چاک سره' },
      { id: 'ok2_2', nameEn: 'Rounded Hem (Kol Daman)', nameFa: 'دامن گرد و هلال', namePs: 'ګرد لمنه' },
      { id: 'ok2_3', nameEn: 'Short Kurta Style', nameFa: 'دامن کوتاه کرته', namePs: 'لنډه کورته' },
    ],
  },

  // --- SUIT & TWO PIECE DESIGNS ---
  {
    id: 'dsu1',
    key: 'suitLapel',
    garmentCategory: 'suit',
    titleEn: 'Suit Lapel / Collar',
    titleFa: 'شیپ یخن کوت (لپیل)',
    titlePs: 'د کوټ کالر / لپیل',
    allowCustomInput: true,
    options: [
      { id: 'osu1_1', nameEn: 'Notch Lapel (Standard)', nameFa: 'ناچ لپیل (هفت شیاردار کلاسیک)', namePs: 'کلاسیک ناچ کالر' },
      { id: 'osu1_2', nameEn: 'Peak Lapel (Pointed Up)', nameFa: 'پیک لپیل (نوک‌تیز مجلسی)', namePs: 'پیک نوک تېز کالر' },
      { id: 'osu1_3', nameEn: 'Shawl Lapel (Round Tuxedo)', nameFa: 'شال لپیل (آرشال گرد تاکسیدو)', namePs: 'شال آرشال کالر' },
    ],
  },
  {
    id: 'dsu2',
    key: 'suitVentsButtons',
    garmentCategory: 'suit',
    titleEn: 'Suit Buttons & Back Vents',
    titleFa: 'دکمه و چاک پشت کوت',
    titlePs: 'د کوټ تڼۍ او شاتنی چاک',
    allowCustomInput: true,
    options: [
      { id: 'osu2_1', nameEn: '2 Buttons Single Breasted + Double Vent', nameFa: '۲ دکمه تک ردیف + ۲ چاک پشت', namePs: '۲ تڼۍ + ۲ شاتني چاکونه' },
      { id: 'osu2_2', nameEn: '1 Button Formal + Single Center Vent', nameFa: '۱ دکمه مجلسی + ۱ چاک وسط', namePs: '۱ تڼۍ + ۱ منځنی چاک' },
      { id: 'osu2_3', nameEn: '6 Buttons Double Breasted (6x2)', nameFa: '۶ دکمه دو ردیفه (شش دکمه)', namePs: '۶ تڼۍ دوه ردیفه' },
    ],
  },
];

export const INITIAL_DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'cust_1',
    name: 'فرهاد',
    phone: '0765445309',
    whatsapp: '0765445309',
    notes: 'مشتری دایمی - دوخت کالر دار',
    standardMeasurements: {
      qad: '40',
      shana: '19.5',
      asteen: '21',
      yakhan: '16.75',
      chati: '23.5',
      baghal: '23.5',
      kamar: '24',
      daman: '25',
      tunban: '37.5',
      pacha: '8',
    },
    preferredGarmentType: 'perahanTunban',
    createdAt: '2026-08-23T06:35:30Z',
    updatedAt: '2026-08-23T06:35:30Z',
    totalOrdersCount: 1,
    totalSpent: 1800,
    totalBalance: 0,
  },
  {
    id: 'cust_2',
    name: 'شکیل خان',
    phone: '0782930005',
    whatsapp: '0782930005',
    notes: 'فرمایش هفت غاره و شانه نیمه دون',
    standardMeasurements: {
      qad: '26.75',
      shana: '16.25',
      asteen: '17',
      yakhan: '17',
      chati: '39.5',
      kamar: '36.25',
      surin: '40',
    },
    preferredGarmentType: 'perahanTunban',
    createdAt: '2026-08-23T06:58:17Z',
    updatedAt: '2026-08-23T06:58:17Z',
    totalOrdersCount: 1,
    totalSpent: 1600,
    totalBalance: 0,
  },
  {
    id: 'cust_3',
    name: 'عطا الله',
    phone: '0780372506',
    whatsapp: '0780372506',
    notes: 'پیراهن تنبان با واسکت و پټه پتی',
    standardMeasurements: {
      qad: '39',
      shana: '18.5',
      asteen: '22',
      yakhan: '16.5',
      chati: '24',
      baghal: '22.5',
      kamar: '24',
      daman: '26',
      tunban: '38',
      pacha: '8.5',
    },
    preferredGarmentType: 'perahanTunban',
    createdAt: '2026-08-23T08:00:00Z',
    updatedAt: '2026-08-23T08:00:00Z',
    totalOrdersCount: 1,
    totalSpent: 3200,
    totalBalance: 2700,
  },
];

export const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: 'ord_1',
    orderNumber: 'MA-0001',
    customerId: 'cust_1',
    customerName: 'فرهاد',
    customerPhone: '0765445309',
    customerWhatsApp: '0765445309',
    garmentType: 'پیراهن و تنبان (Perahan Tunban)',
    quantity: 1,
    fabricId: 'fab_1',
    fabricName: 'لته سفید اعلا (Classic White Latha)',
    fabricColor: 'سفید / White',
    fabricMeters: 4,
    measurements: {
      qad: '40',
      shana: '19.5',
      asteen: '21',
      yakhan: '16.75',
      chati: '23.5',
      baghal: '23.5',
      kamar: '24',
      daman: '25',
      tunban: '37.5',
      pacha: '8',
    },
    designSelections: {
      yakhanShape: 'کالر',
      cuffStyle: 'کول کف (9.25)',
      damanStyle: 'کول دامن',
      placketButtons: 'ساده دکمه 0.90 14',
      sidePocket: 'دو جیب بغل',
      frontPocket: 'یک جیب رو',
      trouserPocket: 'جیب تنبان',
      trouserStyle: 'نارمل 22',
    },
    specialInstructions: 'کالر یی 1.75 راشی',
    items: [],
    totalAmount: 1800,
    paidAmount: 1800,
    balanceAmount: 0,
    paymentStatus: 'paid',
    status: 'ready',
    orderDate: '2026-08-23 06:35',
    deliveryDate: '2026-08-28',
    createdAt: '2026-08-23T06:35:30Z',
    updatedAt: '2026-08-23T06:35:30Z',
  },
  {
    id: 'ord_2',
    orderNumber: 'MA-0002',
    customerId: 'cust_2',
    customerName: 'شکیل خان',
    customerPhone: '0782930005',
    customerWhatsApp: '0782930005',
    garmentType: 'پیراهن و تنبان (Perahan Tunban)',
    quantity: 1,
    fabricId: 'fab_2',
    fabricName: 'ابریشم بوسکی کرمی (Silk Boski Cream)',
    fabricColor: 'کرمی / Off-White',
    fabricMeters: 4,
    measurements: {
      qad: '26.75',
      shana: '16.25',
      asteen: '17',
      yakhan: '17',
      chati: '39.5',
      kamar: '36.25',
      surin: '40',
    },
    designSelections: {
      yakhanShape: 'هفت غاره',
      shoulderSlope: 'شانه نیمه دون کوپ',
    },
    specialInstructions: 'دوخت دقیق و نرم',
    items: [],
    totalAmount: 1600,
    paidAmount: 1600,
    balanceAmount: 0,
    paymentStatus: 'paid',
    status: 'in_progress',
    orderDate: '2026-08-23 06:58',
    deliveryDate: '2026-08-29',
    createdAt: '2026-08-23T06:58:17Z',
    updatedAt: '2026-08-23T06:58:17Z',
  },
  {
    id: 'ord_3',
    orderNumber: 'MA-0003',
    customerId: 'cust_3',
    customerName: 'عطا الله',
    customerPhone: '0780372506',
    customerWhatsApp: '0780372506',
    garmentType: 'پیراهن و تنبان (Perahan Tunban)',
    quantity: 2,
    isCustomerFabric: true,
    fabricName: 'رخت از خود مشتری (Customer Own Fabric)',
    measurements: {
      qad: '39',
      shana: '18.5',
      asteen: '22',
      yakhan: '16.5',
      chati: '24',
      baghal: '22.5',
      kamar: '24',
      daman: '26',
      tunban: '38',
      pacha: '8.5',
    },
    designSelections: {
      yakhanShape: 'کالر',
      cuffStyle: 'کټ کف',
      damanStyle: 'کول دامن (ګرد)',
      frontPocket: 'یک جیب رو',
      sidePocket: 'دو جیب بغل',
      placketButtons: 'پټه پتی',
    },
    specialInstructions: 'پیراهن تنبان + واسکت',
    items: [],
    totalAmount: 3200,
    paidAmount: 500,
    balanceAmount: 2700,
    paymentStatus: 'partial',
    status: 'pending',
    orderDate: '2026-08-23 08:00',
    deliveryDate: '2026-08-30',
    createdAt: '2026-08-23T08:00:00Z',
    updatedAt: '2026-08-23T08:00:00Z',
  },
];

export const INITIAL_DEMO_FABRICS: Fabric[] = [
  {
    id: 'fab_1',
    code: 'FB-101',
    name: 'کتان لته اعلا سفید (Pure White Afghan Latha Cotton)',
    type: 'کتان (Cotton Latha)',
    color: 'سفید خالص (Pure White)',
    pricePerMeter: 350,
    stockMeters: 85,
    supplier: 'بازار کابل (Kabul Silk Market)',
    notes: 'بسیار خنک، نرم و مقاوم برای پیراهن تنبان تابستانی',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'fab_2',
    code: 'FB-102',
    name: 'بوسکی ابریشمی کرمی (Silk Boski Cream)',
    type: 'ابریشم بوسکی (Silk Boski)',
    color: 'شیری / کرمی (Cream)',
    pricePerMeter: 550,
    stockMeters: 62,
    supplier: 'وارداتی پیشاور (Peshawar Import)',
    notes: 'درخشش طبیعی و لخت، مناسب مجالس و محافل',
    createdAt: '2026-08-02T10:00:00Z',
    updatedAt: '2026-08-02T10:00:00Z',
  },
  {
    id: 'fab_3',
    code: 'FB-103',
    name: 'واش اند ویر ضد چروک سرمه‌ای (Wash & Wear Navy)',
    type: 'واش اند ویر (Wash & Wear)',
    color: 'سرمه‌ای تیره (Navy Blue)',
    pricePerMeter: 420,
    stockMeters: 45,
    supplier: 'احمد یار (Ahmad Yar Fabrics)',
    notes: 'اتو خور عالی، ضد چروک با ماندگاری بسیار بالا',
    createdAt: '2026-08-05T10:00:00Z',
    updatedAt: '2026-08-05T10:00:00Z',
  },
  {
    id: 'fab_4',
    code: 'FB-104',
    name: 'تکه پشمی کشمیر واسکت طوسی (Cashmere Wool for Wescott)',
    type: 'پشمی کشمیر (Cashmere Wool)',
    color: 'طوسی ذغالی (Charcoal Grey)',
    pricePerMeter: 850,
    stockMeters: 30,
    supplier: 'بازار هرات (Herat Wool Mills)',
    notes: 'مخصوص واسکت‌های لوکس و کوت زمستانه',
    createdAt: '2026-08-08T10:00:00Z',
    updatedAt: '2026-08-08T10:00:00Z',
  },
  {
    id: 'fab_5',
    code: 'FB-105',
    name: 'مخمل مشکی اعلا (Royal Black Velvet)',
    type: 'مخمل مجلسی (Velvet)',
    color: 'مشکی پرکلاغی (Jet Black)',
    pricePerMeter: 750,
    stockMeters: 28,
    supplier: 'نوروزی تکه فروشی (Nowrozi Textiles)',
    notes: 'مناسب واسکت و کرتی گلدوزی شده سنتی',
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-10T10:00:00Z',
  },
];

// Helper to safely load and persist data
const memoryStore = new Map<string, any>();
let authUser: { email: string; name: string } | null = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
})();

let languagePreference: 'en' | 'fa' | 'ps' = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (saved === 'en' || saved === 'fa' || saved === 'ps') return saved;
  } catch {}
  return 'fa';
})();

function getStoredItem<T>(key: string, defaultValue: T): T {
  if (memoryStore.has(key)) {
    const cached = memoryStore.get(key);
    if (cached !== null && cached !== undefined) return cached as T;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        memoryStore.set(key, parsed);
        return parsed as T;
      }
    }
  } catch {}
  memoryStore.set(key, defaultValue);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
    }
  } catch {}
  return defaultValue;
}

function setStoredItem<T>(key: string, value: T): void {
  memoryStore.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {}
}

const endpointTable: Record<string, string> = {
  fabrics: 'fabrics', orders: 'orders', customers: 'customers', products: 'products',
  'product-sales': 'product_sales', 'measurement-fields': 'measurement_fields',
  'design-categories': 'design_categories', 'shop-settings': 'shop_settings',
  'product-categories': 'product_categories', 'product-vendors': 'product_vendors',
  'product-brands': 'product_brands', 'garment-types': 'garment_types',
  'ui-preferences': 'ui_preferences', expenses: 'expenses',
};

// Direct Supabase mutation helper
let activeSyncs = 0;

async function apiSync(endpoint: string, method = 'GET', data?: any, throwOnError = false) {
  if (!isSupabaseConfigured) {
    return null;
  }
  activeSyncs++;
  try {
    const [base, id] = endpoint.split('/');
    const table = endpointTable[base];
    if (!table) throw new Error(`Unknown Supabase collection: ${base}`);
    if (method === 'DELETE') {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    }
    let payload: any = data;
    if (base === 'shop-settings') payload = { id: 'default', data, updated_at: new Date().toISOString() };
    else if (base === 'product-categories') payload = toDatabaseRows(table, data);
    else if (base === 'product-vendors' || base === 'product-brands') payload = data.map((name: string, sort_order: number) => ({ name, sort_order }));
    else if (base === 'garment-types') payload = toDatabaseRows(table, data);
    else if (base === 'ui-preferences') payload = toDatabaseRows(table, data);
    else payload = toDatabaseRows(table, data);
    if (['measurement-fields', 'design-categories', 'product-categories', 'product-vendors', 'product-brands', 'garment-types'].includes(base) && Array.isArray(payload)) {
      const identityColumn = base === 'product-vendors' || base === 'product-brands' ? 'name' : 'id';
      const ids = payload.map(item => item[identityColumn]);
      const deleteQuery = ids.length ? supabase.from(table).delete().not(identityColumn, 'in', `(${ids.map(id => `"${id}"`).join(',')})`) : supabase.from(table).delete().neq(identityColumn, '');
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;
      if (!payload.length) return [];
    }
    const { data: saved, error } = await supabase.from(table).upsert(payload).select();
    if (error) throw error;
    return saved;
  } catch (err: any) {
    console.warn(`Supabase ${method} ${endpoint} note:`, err?.message || err);
    if (throwOnError) throw err;
    return null;
  } finally {
    activeSyncs = Math.max(0, activeSyncs - 1);
  }
}

// Storage Operations
export const storageService = {
  getUiPreferences(): { fabricLowStockThreshold: number; productLowStockThreshold: number } {
    return getStoredItem(STORAGE_KEYS.UI_PREFERENCES, { fabricLowStockThreshold: 15, productLowStockThreshold: 3 });
  },

  saveUiPreferences(preferences: { fabricLowStockThreshold: number; productLowStockThreshold: number }): void {
    setStoredItem(STORAGE_KEYS.UI_PREFERENCES, preferences);
    apiSync('ui-preferences/default', 'POST', preferences);
  },

  // Fabrics
  getFabrics(): Fabric[] {
    const list = getStoredItem<Fabric[]>(STORAGE_KEYS.FABRICS, INITIAL_DEMO_FABRICS);
    return Array.isArray(list) ? list : INITIAL_DEMO_FABRICS;
  },

  getFabricById(id: string): Fabric | undefined {
    const fabrics = this.getFabrics() || [];
    return fabrics.find(f => f.id === id || f.code === id);
  },

  saveFabric(fabric: Fabric): Fabric {
    const fabrics = this.getFabrics() || [];
    const existingIndex = fabrics.findIndex(f => f.id === fabric.id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      fabrics[existingIndex] = { ...fabric, updatedAt: now };
    } else {
      fabrics.unshift({
        ...fabric,
        id: fabric.id || 'fab_' + Date.now(),
        createdAt: fabric.createdAt || now,
        updatedAt: now,
      });
    }

    setStoredItem(STORAGE_KEYS.FABRICS, fabrics);
    apiSync('fabrics', 'POST', fabric);
    return fabric;
  },

  deleteFabric(id: string): void {
    const fabrics = (this.getFabrics() || []).filter(f => f.id !== id);
    setStoredItem(STORAGE_KEYS.FABRICS, fabrics);
    apiSync(`fabrics/${id}`, 'DELETE');
  },

  deductFabricStock(fabricId: string, metersUsed: number): void {
    if (!fabricId || metersUsed <= 0) return;
    const fabrics = this.getFabrics() || [];
    const fabric = fabrics.find(f => f.id === fabricId);
    if (fabric) {
      fabric.stockMeters = Math.max(0, Number(fabric.stockMeters || 0) - Number(metersUsed));
      fabric.updatedAt = new Date().toISOString();
      setStoredItem(STORAGE_KEYS.FABRICS, fabrics);
      apiSync('fabrics', 'POST', fabric);
    }
  },

  // Products & Retail Inventory
  getProducts(): Product[] {
    const list = getStoredItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_DEMO_PRODUCTS);
    return Array.isArray(list)
      ? list.map(product => product.brand === 'Rayan Signature' ? { ...product, brand: 'Mujeeb Collection' } : product)
      : INITIAL_DEMO_PRODUCTS;
  },

  getProductById(id: string): Product | undefined {
    const products = this.getProducts() || [];
    return products.find(p => p.id === id);
  },

  saveProduct(product: Partial<Product> & { name: string; category: string; purchasePrice: number; stockQuantity: number }): Product {
    const products = this.getProducts() || [];
    const now = new Date().toISOString();
    const id = product.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const fullProduct: Product = {
      id,
      name: product.name,
      category: product.category,
      vendor: product.vendor || '',
      brand: product.brand || '',
      purchasePrice: Number(product.purchasePrice) || 0,
      stockQuantity: Number(product.stockQuantity) || 0,
      lowStockThreshold: product.lowStockThreshold !== undefined ? Number(product.lowStockThreshold) : 2,
      description: product.description || '',
      createdAt: product.createdAt || now,
      updatedAt: now,
    };

    const existingIndex = products.findIndex(p => p.id === id);
    if (existingIndex >= 0) {
      products[existingIndex] = fullProduct;
    } else {
      products.unshift(fullProduct);
    }

    setStoredItem(STORAGE_KEYS.PRODUCTS, products);
    apiSync('products', 'POST', fullProduct);
    return fullProduct;
  },

  async saveProductAsync(product: Partial<Product> & { name: string; category: string; purchasePrice: number; stockQuantity: number }): Promise<Product> {
    const saved = this.saveProduct(product);
    try {
      await apiSync('products', 'POST', saved);
    } catch (e) {
      console.warn('saveProductAsync background sync:', e);
    }
    return saved;
  },

  deleteProduct(id: string): void {
    let products = this.getProducts() || [];
    products = products.filter(p => p.id !== id);
    setStoredItem(STORAGE_KEYS.PRODUCTS, products);
    apiSync(`products/${id}`, 'DELETE');
  },

  // Product Categories
  getProductCategories(): ProductCategory[] {
    const list = getStoredItem<any[]>(STORAGE_KEYS.PRODUCT_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES);
    const safeList = Array.isArray(list) && list.length > 0 ? list : DEFAULT_PRODUCT_CATEGORIES;
    return safeList.map((item, idx) => {
      if (typeof item === 'string') {
        return { id: `cat_${idx}_${item.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, name: item };
      }
      return item as ProductCategory;
    });
  },

  saveProductCategory(name: string): ProductCategory {
    const trimmed = name.trim();
    const list = this.getProductCategories();
    const existing = list.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    const newCat: ProductCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: trimmed,
    };
    list.push(newCat);
    setStoredItem(STORAGE_KEYS.PRODUCT_CATEGORIES, list);
    apiSync('product-categories', 'POST', list);
    return newCat;
  },

  deleteProductCategory(idOrName: string): ProductCategory[] {
    let list = this.getProductCategories();
    list = list.filter(c => c.id !== idOrName && c.name !== idOrName);
    setStoredItem(STORAGE_KEYS.PRODUCT_CATEGORIES, list);
    apiSync('product-categories', 'POST', list);
    return list;
  },

  // Product Vendors
  getProductVendors(): string[] {
    const list = getStoredItem<string[]>(STORAGE_KEYS.PRODUCT_VENDORS, DEFAULT_PRODUCT_VENDORS);
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_PRODUCT_VENDORS;
  },

  saveProductVendor(name: string): string[] {
    const trimmed = name.trim();
    if (!trimmed) return this.getProductVendors();
    const list = this.getProductVendors();
    if (!list.includes(trimmed)) {
      list.push(trimmed);
      setStoredItem(STORAGE_KEYS.PRODUCT_VENDORS, list);
      apiSync('product-vendors', 'POST', list);
    }
    return list;
  },

  deleteProductVendor(name: string): string[] {
    let list = this.getProductVendors();
    list = list.filter(v => v !== name);
    setStoredItem(STORAGE_KEYS.PRODUCT_VENDORS, list);
    apiSync('product-vendors', 'POST', list);
    return list;
  },

  // Product Brands
  getProductBrands(): string[] {
    const list = getStoredItem<string[]>(STORAGE_KEYS.PRODUCT_BRANDS, DEFAULT_PRODUCT_BRANDS);
    const migrated = Array.isArray(list) ? list.map(brand => brand === 'Rayan Signature' ? 'Mujeeb Collection' : brand) : DEFAULT_PRODUCT_BRANDS;
    return migrated.length > 0 ? migrated : DEFAULT_PRODUCT_BRANDS;
  },

  saveProductBrand(name: string): string[] {
    const trimmed = name.trim();
    if (!trimmed) return this.getProductBrands();
    const list = this.getProductBrands();
    if (!list.includes(trimmed)) {
      list.push(trimmed);
      setStoredItem(STORAGE_KEYS.PRODUCT_BRANDS, list);
      apiSync('product-brands', 'POST', list);
    }
    return list;
  },

  deleteProductBrand(name: string): string[] {
    let list = this.getProductBrands();
    list = list.filter(b => b !== name);
    setStoredItem(STORAGE_KEYS.PRODUCT_BRANDS, list);
    apiSync('product-brands', 'POST', list);
    return list;
  },

  // Product Sales
  getProductSales(): ProductSale[] {
    const list = getStoredItem<ProductSale[]>(STORAGE_KEYS.PRODUCT_SALES, INITIAL_DEMO_PRODUCT_SALES);
    return Array.isArray(list) ? list : [];
  },

  recordProductSale(sale: {
    productId: string;
    productName: string;
    category: string;
    quantity: number;
    sellingPrice: number;
    paidAmount?: number;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: string;
    notes?: string;
  }): ProductSale {
    const products = this.getProducts() || [];
    const product = products.find(p => p.id === sale.productId);
    const purchasePrice = product ? Number(product.purchasePrice) || 0 : 0;
    const qty = Math.max(1, Number(sale.quantity) || 1);
    const sellingPrice = Number(sale.sellingPrice) || 0;
    const totalAmount = sellingPrice * qty;
    const paidAmount = sale.paidAmount !== undefined ? Number(sale.paidAmount) : totalAmount;
    const balanceAmount = Math.max(0, totalAmount - paidAmount);
    const paymentStatus = balanceAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
    const profit = (sellingPrice - purchasePrice) * qty;

    const newSale: ProductSale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: sale.productId,
      productName: sale.productName,
      category: sale.category,
      quantity: qty,
      purchasePrice,
      sellingPrice,
      totalAmount,
      paidAmount,
      balanceAmount,
      paymentStatus: paymentStatus as any,
      profit,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      saleDate: new Date().toISOString(),
      paymentMethod: sale.paymentMethod || 'cash',
      notes: sale.notes,
    };

    // Deduct stock from product
    if (product) {
      product.stockQuantity = Math.max(0, (Number(product.stockQuantity) || 0) - qty);
      product.updatedAt = new Date().toISOString();
      setStoredItem(STORAGE_KEYS.PRODUCTS, products);
      apiSync('products', 'POST', product);
    }

    const sales = this.getProductSales();
    sales.unshift(newSale);
    setStoredItem(STORAGE_KEYS.PRODUCT_SALES, sales);
    apiSync('product-sales', 'POST', newSale);

    if (sale.customerName && sale.customerPhone) {
      const customers = this.getCustomers() || [];
      const cleanPhone = sale.customerPhone.trim();
      const existingCustomer = customers.find(c => 
        (sale.customerId && c.id === sale.customerId) || c.phone === cleanPhone
      );
      if (existingCustomer) {
        newSale.customerId = existingCustomer.id;
        this.recalculateCustomerStats(existingCustomer.id);
      } else {
        const newCust: Customer = {
          id: sale.customerId || `cust_sale_${Date.now()}`,
          name: sale.customerName.trim(),
          phone: cleanPhone,
          whatsapp: cleanPhone,
          notes: 'Retail customer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalOrdersCount: 0,
          totalSpent: totalAmount,
          totalBalance: balanceAmount,
        };
        customers.unshift(newCust);
        setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
        apiSync('customers', 'POST', newCust);
        newSale.customerId = newCust.id;
      }
    }

    return newSale;
  },

  saveProductSale(sale: {
    productId: string;
    productName: string;
    category: string;
    quantity: number;
    purchasePrice?: number;
    sellingPrice: number;
    totalAmount?: number;
    profit?: number;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: string;
    notes?: string;
  }): ProductSale {
    return this.recordProductSale(sale);
  },

  async saveProductSaleAsync(sale: any): Promise<ProductSale> {
    const saved = this.recordProductSale(sale);
    try {
      await apiSync('product-sales', 'POST', saved);
    } catch (e) {
      console.warn('saveProductSaleAsync background sync:', e);
    }
    return saved;
  },

  deleteProductSale(id: string): void {
    const sales = this.getProductSales().filter(s => s.id !== id);
    setStoredItem(STORAGE_KEYS.PRODUCT_SALES, sales);
    apiSync(`product-sales/${id}`, 'DELETE');
  },

  // Expenses
  getExpenses(): Expense[] {
    const list = getStoredItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    // Ensure any previously cached demo expenses are permanently purged
    const validList = Array.isArray(list) 
      ? list.filter(e => !['exp_1', 'exp_2', 'exp_3', 'exp_4'].includes(e.id))
      : [];
    if (Array.isArray(list) && list.length !== validList.length) {
      setStoredItem(STORAGE_KEYS.EXPENSES, validList);
    }
    return validList;
  },

  getExpenseById(id: string): Expense | undefined {
    const expenses = this.getExpenses() || [];
    return expenses.find(e => e.id === id);
  },

  saveExpense(expense: Expense): Expense {
    const expenses = this.getExpenses();
    const existingIndex = expenses.findIndex(e => e.id === expense.id);
    const now = new Date().toISOString();

    const fullExpense: Expense = {
      ...expense,
      id: expense.id || `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      amount: Number(expense.amount) || 0,
      date: expense.date || now.slice(0, 10),
      spentBy: (expense.spentBy || '').trim(),
      createdAt: expense.createdAt || now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      expenses[existingIndex] = fullExpense;
    } else {
      expenses.unshift(fullExpense);
    }

    setStoredItem(STORAGE_KEYS.EXPENSES, expenses);
    apiSync('expenses', 'POST', fullExpense);
    return fullExpense;
  },

  async saveExpenseAsync(expense: Expense): Promise<Expense> {
    const saved = this.saveExpense(expense);
    try {
      await apiSync('expenses', 'POST', saved);
    } catch (e) {
      console.warn('saveExpenseAsync background sync notice:', e);
    }
    return saved;
  },

  deleteExpense(id: string): void {
    const expenses = this.getExpenses().filter(e => e.id !== id);
    setStoredItem(STORAGE_KEYS.EXPENSES, expenses);
    apiSync(`expenses/${id}`, 'DELETE');
  },

  async deleteExpenseAsync(id: string): Promise<boolean> {
    this.deleteExpense(id);
    try {
      await apiSync(`expenses/${id}`, 'DELETE');
      return true;
    } catch (e) {
      console.warn('deleteExpenseAsync background sync notice:', e);
      return false;
    }
  },

  // Orders
  getOrders(): Order[] {
    const list = getStoredItem<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_DEMO_ORDERS);
    return Array.isArray(list) && list.length > 0 ? list : INITIAL_DEMO_ORDERS;
  },

  getOrderById(id: string): Order | undefined {
    const orders = this.getOrders() || [];
    return orders.find(o => o.id === id || o.orderNumber === id);
  },

  saveOrder(order: Order, syncToSupabase = true): Order {
    const orders = this.getOrders();
    const existingIndex = orders.findIndex(o => o.id === order.id);

    if (existingIndex >= 0) {
      orders[existingIndex] = { ...order, updatedAt: new Date().toISOString() };
    } else {
      orders.unshift({
        ...order,
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // If new order used fabric from inventory, auto-deduct stock
      if (order.fabricId && order.fabricMeters && order.fabricMeters > 0) {
        this.deductFabricStock(order.fabricId, order.fabricMeters);
      }
    }

    setStoredItem(STORAGE_KEYS.ORDERS, orders);
    this.syncCustomerFromOrder(order);

    if (syncToSupabase && isSupabaseConfigured) apiSync('orders', 'POST', order).catch(() => {});

    const cust = this.getCustomerById(order.customerId);
    if (cust && syncToSupabase && isSupabaseConfigured) {
      apiSync('customers', 'POST', cust).catch(() => {});
    }

    return order;
  },

  async saveOrderAsync(order: Order): Promise<Order> {
    const existingCustomer = this.getCustomerById(order.customerId);
    const customer: Customer = {
      ...(existingCustomer || {} as Customer),
      id: order.customerId,
      name: order.customerName,
      phone: order.customerPhone,
      whatsapp: order.customerWhatsApp || order.customerPhone,
      standardMeasurements: { ...(existingCustomer?.standardMeasurements || {}), ...(order.measurements || {}) },
      preferredGarmentType: order.garmentType,
      createdAt: existingCustomer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalOrdersCount: existingCustomer?.totalOrdersCount || 0,
      totalSpent: existingCustomer?.totalSpent || 0,
      totalBalance: existingCustomer?.totalBalance || 0,
    };

    if (isSupabaseConfigured) {
      try {
        await apiSync('customers', 'POST', customer, false);
        await apiSync('orders', 'POST', order, false);
      } catch (err) {
        console.warn('Supabase sync note on saveOrderAsync:', err);
      }
    }
    return this.saveOrder(order, false);
  },

  deleteOrder(id: string): void {
    const orders = this.getOrders().filter(o => o.id !== id);
    setStoredItem(STORAGE_KEYS.ORDERS, orders);
    apiSync(`orders/${id}`, 'DELETE');
  },

  // Automatically update/create customer when an order is saved
  syncCustomerFromOrder(order: Order): void {
    const customers = this.getCustomers() || [];
    const cleanPhone = order.customerPhone.trim();
    const cleanName = order.customerName.trim();

    let customer = customers.find(
      c => (cleanPhone && c.phone.trim() === cleanPhone) || c.id === order.customerId
    );

    const now = new Date().toISOString();

    if (customer) {
      // Update existing customer
      customer.name = cleanName || customer.name;
      customer.phone = cleanPhone || customer.phone;
      if (order.customerWhatsApp) customer.whatsapp = order.customerWhatsApp;
      if (order.measurements && Object.keys(order.measurements).length > 0) {
        customer.standardMeasurements = {
          ...customer.standardMeasurements,
          ...order.measurements,
        };
      }
      customer.preferredGarmentType = order.garmentType || customer.preferredGarmentType;
      customer.updatedAt = now;
      this.recalculateCustomerStats(customer.id);
    } else {
      // Create new customer
      const newCustomer: Customer = {
        id: order.customerId || 'cust_' + Date.now(),
        name: cleanName || 'مشتری بدون نام',
        phone: cleanPhone,
        whatsapp: order.customerWhatsApp || cleanPhone,
        notes: order.specialInstructions || '',
        standardMeasurements: order.measurements || {},
        preferredGarmentType: order.garmentType || 'perahanTunban',
        createdAt: now,
        updatedAt: now,
        totalOrdersCount: 1,
        totalSpent: order.totalAmount,
        totalBalance: order.balanceAmount,
      };
      customers.unshift(newCustomer);
      setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
    }
  },

  recalculateCustomerStats(customerId: string): void {
    const orders = (this.getOrders() || []).filter(o => o.customerId === customerId);
    const sales = (this.getProductSales() || []).filter(s => s.customerId === customerId);
    const customers = this.getCustomers() || [];
    const customer = customers.find(c => c.id === customerId);

    if (customer) {
      customer.totalOrdersCount = orders.length;
      const ordersSpent = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      const salesSpent = sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
      customer.totalSpent = ordersSpent + salesSpent;

      const ordersBalance = orders.reduce((sum, o) => sum + (Number(o.balanceAmount) || 0), 0);
      const salesBalance = sales.reduce((sum, s) => sum + (Number(s.balanceAmount) || 0), 0);
      customer.totalBalance = ordersBalance + salesBalance;

      setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
      apiSync('customers', 'POST', customer);
    }
  },

  // Customers
  getCustomers(): Customer[] {
    const list = getStoredItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_DEMO_CUSTOMERS);
    return Array.isArray(list) && list.length > 0 ? list : INITIAL_DEMO_CUSTOMERS;
  },

  getCustomerById(id: string): Customer | undefined {
    const customers = this.getCustomers() || [];
    return customers.find(c => c.id === id);
  },

  findCustomerByPhoneOrName(query: string): Customer[] {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const customers = this.getCustomers() || [];
    return customers.filter(
      c => textIncludes(c.name, q) || textIncludes(c.phone, q)
    );
  },

  saveCustomer(customer: Customer): Customer {
    const customers = this.getCustomers() || [];
    const existingIndex = customers.findIndex(c => c.id === customer.id);

    if (existingIndex >= 0) {
      customers[existingIndex] = { ...customer, updatedAt: new Date().toISOString() };
    } else {
      customers.unshift({
        ...customer,
        id: customer.id || 'cust_' + Date.now(),
        createdAt: customer.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
    apiSync('customers', 'POST', customer);
    return customer;
  },

  async saveCustomerAsync(customer: Customer): Promise<Customer> {
    const saved = this.saveCustomer(customer);
    try {
      await apiSync('customers', 'POST', saved);
    } catch (e) {
      console.warn('saveCustomerAsync background sync:', e);
    }
    return saved;
  },

  deleteCustomer(id: string): void {
    const customers = (this.getCustomers() || []).filter(c => c.id !== id);
    setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
    apiSync(`customers/${id}`, 'DELETE');
  },

  // Garment Types
  getGarmentTypes(): GarmentTypeConfig[] {
    const list = getStoredItem<GarmentTypeConfig[]>(STORAGE_KEYS.GARMENT_TYPES, DEFAULT_GARMENT_TYPES);
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_GARMENT_TYPES;
  },

  saveGarmentTypes(types: GarmentTypeConfig[]): void {
    setStoredItem(STORAGE_KEYS.GARMENT_TYPES, types);
    apiSync('garment-types', 'POST', types);
  },

  saveGarmentType(type: GarmentTypeConfig): GarmentTypeConfig {
    const types = this.getGarmentTypes();
    const existingIndex = types.findIndex(t => t.id === type.id || t.key === type.key);
    if (existingIndex >= 0) {
      types[existingIndex] = type;
    } else {
      types.push({
        ...type,
        id: type.id || `gt_${Date.now()}`,
        sortOrder: types.length + 1,
      });
    }
    setStoredItem(STORAGE_KEYS.GARMENT_TYPES, types);
    return type;
  },

  deleteGarmentType(idOrKey: string): void {
    const types = this.getGarmentTypes().filter(t => t.id !== idOrKey && t.key !== idOrKey);
    setStoredItem(STORAGE_KEYS.GARMENT_TYPES, types);
  },

  // Design Categories
  getDesignCategories(garmentType?: string): DesignCategory[] {
    const list = getStoredItem<DesignCategory[]>(STORAGE_KEYS.DESIGN_CATEGORIES, DEFAULT_DESIGN_CATEGORIES);
    const categories = Array.isArray(list) ? list : DEFAULT_DESIGN_CATEGORIES;
    
    // Normalize existing data so every category has a valid garmentCategory (defaulting to perahan_tunban if missing)
    const normalized = categories.map(cat => ({
      ...cat,
      garmentCategory: cat.garmentCategory || 'perahan_tunban',
    }));

    if (!garmentType || garmentType === 'all') {
      return normalized;
    }

    return normalized.filter(cat => 
      !cat.garmentCategory || 
      cat.garmentCategory === 'all' || 
      cat.garmentCategory === garmentType ||
      (garmentType === 'perahan_tunban' && cat.garmentCategory === 'perahan_tunban') ||
      (garmentType === 'suit' && (cat.garmentCategory === 'suit' || cat.garmentCategory === 'coat_korti')) ||
      (garmentType === 'coat_korti' && (cat.garmentCategory === 'coat_korti' || cat.garmentCategory === 'suit'))
    );
  },

  saveDesignCategories(categories: DesignCategory[]): void {
    setStoredItem(STORAGE_KEYS.DESIGN_CATEGORIES, categories);
    apiSync('design-categories', 'POST', categories);
  },

  saveDesignCategory(category: DesignCategory): DesignCategory {
    const categories = this.getDesignCategories();
    const existingIndex = categories.findIndex(c => c.id === category.id);
    if (existingIndex >= 0) {
      categories[existingIndex] = category;
    } else {
      categories.push({
        ...category,
        id: category.id || `d_${Date.now()}`,
      });
    }
    this.saveDesignCategories(categories);
    return category;
  },

  deleteDesignCategory(id: string): void {
    const categories = this.getDesignCategories().filter(c => c.id !== id);
    this.saveDesignCategories(categories);
  },

  // Measurement Fields
  getMeasurementFields(garmentType?: string): MeasurementField[] {
    const list = getStoredItem<MeasurementField[]>(STORAGE_KEYS.MEASUREMENT_FIELDS, DEFAULT_MEASUREMENT_FIELDS);
    const fields = Array.isArray(list) ? list : DEFAULT_MEASUREMENT_FIELDS;

    // Normalize existing data so older fields get assigned to 'perahan_tunban'
    const normalized = fields.map(field => ({
      ...field,
      garmentCategory: field.garmentCategory || 'perahan_tunban',
    }));

    if (!garmentType || garmentType === 'all') {
      return normalized;
    }

    return normalized.filter(field => 
      !field.garmentCategory || 
      field.garmentCategory === 'all' || 
      field.garmentCategory === garmentType ||
      (garmentType === 'suit' && (field.garmentCategory === 'suit' || field.garmentCategory === 'coat_korti')) ||
      (garmentType === 'coat_korti' && (field.garmentCategory === 'coat_korti' || field.garmentCategory === 'suit'))
    );
  },

  saveMeasurementFields(fields: MeasurementField[]): void {
    setStoredItem(STORAGE_KEYS.MEASUREMENT_FIELDS, fields);
    apiSync('measurement-fields', 'POST', fields);
  },

  saveMeasurementField(field: MeasurementField): MeasurementField {
    const fields = this.getMeasurementFields();
    const existingIndex = fields.findIndex(f => f.id === field.id || (f.key === field.key && f.garmentCategory === field.garmentCategory));
    if (existingIndex >= 0) {
      fields[existingIndex] = field;
    } else {
      fields.push({
        ...field,
        id: field.id || `m_${Date.now()}`,
        sortOrder: fields.length + 1,
      });
    }
    this.saveMeasurementFields(fields);
    return field;
  },

  deleteMeasurementField(id: string): void {
    const fields = this.getMeasurementFields().filter(f => f.id !== id);
    this.saveMeasurementFields(fields);
  },

  // Shop Settings
  getShopSettings(): ShopSettings {
    const stored = getStoredItem<ShopSettings | null>(STORAGE_KEYS.SHOP_SETTINGS, null);
    if (!stored) return DEFAULT_SHOP_SETTINGS;

    const settings = { ...DEFAULT_SHOP_SETTINGS, ...stored };
    if (settings.phone1 === LEGACY_OWNER_PHONE) settings.phone1 = DEFAULT_OWNER_PHONE;
    if (settings.phone2 === '0780000000' || settings.phone2 === '0782207308') settings.phone2 = '0782220194';
    if (settings.whatsapp === '0782207308') settings.whatsapp = '0782220194';
    if (LEGACY_SHOP_NAMES.includes(settings.shopNameEn) || settings.shopNameEn?.includes('FASION')) {
      settings.shopNameEn = DEFAULT_SHOP_SETTINGS.shopNameEn;
    }
    if (LEGACY_SHOP_NAMES.includes(settings.shopNameFa)) settings.shopNameFa = DEFAULT_SHOP_SETTINGS.shopNameFa;
    if (LEGACY_SHOP_NAMES.includes(settings.shopNamePs)) settings.shopNamePs = DEFAULT_SHOP_SETTINGS.shopNamePs;
    // Migrate the previous generated emblem to the supplied shop logo.
    if (!settings.logoUrl || settings.logoUrl === '/mujeeb-afghan-logo.svg') settings.logoUrl = DEFAULT_SHOP_SETTINGS.logoUrl;
    return settings;
  },

  saveShopSettings(settings: ShopSettings): void {
    if (settings.shopNameEn?.includes('FASION')) {
      settings.shopNameEn = settings.shopNameEn.replace(/FASION/g, 'FASHION');
    }
    setStoredItem(STORAGE_KEYS.SHOP_SETTINGS, settings);
    apiSync('shop-settings', 'POST', settings);
  },

  // Auth User Session
  getAuthUser(): { email: string; name: string } | null {
    return authUser;
  },

  saveAuthUser(user: { email: string; name: string } | null): void {
    authUser = user;
    try {
      if (user) localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    } catch {}
  },

  getAuthToken(): string | null {
    return null;
  },

  saveAuthToken(_token: string | null): void {},

  // Language
  getLanguage(): 'en' | 'fa' | 'ps' {
    return languagePreference;
  },

  saveLanguage(lang: 'en' | 'fa' | 'ps'): void {
    languagePreference = lang;
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    } catch {}
  },

  // Backup & Export / Import
  exportFullDatabase(): string {
    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      shopSettings: this.getShopSettings(),
      customers: this.getCustomers(),
      fabrics: this.getFabrics(),
      products: this.getProducts(),
      productCategories: this.getProductCategories(),
      productVendors: this.getProductVendors(),
      productBrands: this.getProductBrands(),
      productSales: this.getProductSales(),
      expenses: this.getExpenses(),
      orders: this.getOrders(),
      garmentTypes: this.getGarmentTypes(),
      designCategories: this.getDesignCategories(),
      measurementFields: this.getMeasurementFields(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importFullDatabase(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.shopSettings) setStoredItem(STORAGE_KEYS.SHOP_SETTINGS, data.shopSettings);
      if (data.customers) setStoredItem(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (data.fabrics) setStoredItem(STORAGE_KEYS.FABRICS, data.fabrics);
      if (data.products) setStoredItem(STORAGE_KEYS.PRODUCTS, data.products);
      if (data.productCategories) setStoredItem(STORAGE_KEYS.PRODUCT_CATEGORIES, data.productCategories);
      if (data.productVendors) setStoredItem(STORAGE_KEYS.PRODUCT_VENDORS, data.productVendors);
      if (data.productBrands) setStoredItem(STORAGE_KEYS.PRODUCT_BRANDS, data.productBrands);
      if (data.productSales) setStoredItem(STORAGE_KEYS.PRODUCT_SALES, data.productSales);
      if (data.expenses) setStoredItem(STORAGE_KEYS.EXPENSES, data.expenses);
      if (data.orders) setStoredItem(STORAGE_KEYS.ORDERS, data.orders);
      if (data.garmentTypes) setStoredItem(STORAGE_KEYS.GARMENT_TYPES, data.garmentTypes);
      if (data.designCategories) setStoredItem(STORAGE_KEYS.DESIGN_CATEGORIES, data.designCategories);
      if (data.measurementFields) setStoredItem(STORAGE_KEYS.MEASUREMENT_FIELDS, data.measurementFields);
      if (data.shopSettings) apiSync('shop-settings', 'POST', data.shopSettings);
      if (data.customers) data.customers.forEach((row: Customer) => apiSync('customers', 'POST', row));
      if (data.fabrics) data.fabrics.forEach((row: Fabric) => apiSync('fabrics', 'POST', row));
      if (data.products) data.products.forEach((row: Product) => apiSync('products', 'POST', row));
      if (data.productSales) data.productSales.forEach((row: ProductSale) => apiSync('product-sales', 'POST', row));
      if (data.expenses) data.expenses.forEach((row: Expense) => apiSync('expenses', 'POST', row));
      if (data.orders) data.orders.forEach((row: Order) => apiSync('orders', 'POST', row));
      if (data.garmentTypes) apiSync('garment-types', 'POST', data.garmentTypes);
      if (data.productCategories) apiSync('product-categories', 'POST', data.productCategories.map((value: any, index: number) => typeof value === 'string' ? { id: `cat_${index}_${value.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, name: value } : value));
      if (data.productVendors) apiSync('product-vendors', 'POST', data.productVendors);
      if (data.productBrands) apiSync('product-brands', 'POST', data.productBrands);
      if (data.designCategories) apiSync('design-categories', 'POST', data.designCategories);
      if (data.measurementFields) apiSync('measurement-fields', 'POST', data.measurementFields);
      return true;
    } catch (err) {
      console.error('Failed to import database JSON:', err);
      return false;
    }
  },

  resetAllToDemo(): void {
    setStoredItem(STORAGE_KEYS.ORDERS, INITIAL_DEMO_ORDERS);
    setStoredItem(STORAGE_KEYS.CUSTOMERS, INITIAL_DEMO_CUSTOMERS);
    setStoredItem(STORAGE_KEYS.FABRICS, INITIAL_DEMO_FABRICS);
    setStoredItem(STORAGE_KEYS.PRODUCTS, INITIAL_DEMO_PRODUCTS);
    setStoredItem(STORAGE_KEYS.PRODUCT_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES);
    setStoredItem(STORAGE_KEYS.PRODUCT_VENDORS, DEFAULT_PRODUCT_VENDORS);
    setStoredItem(STORAGE_KEYS.PRODUCT_BRANDS, DEFAULT_PRODUCT_BRANDS);
    setStoredItem(STORAGE_KEYS.PRODUCT_SALES, INITIAL_DEMO_PRODUCT_SALES);
    setStoredItem(STORAGE_KEYS.EXPENSES, INITIAL_DEMO_EXPENSES);
    setStoredItem(STORAGE_KEYS.GARMENT_TYPES, DEFAULT_GARMENT_TYPES);
    setStoredItem(STORAGE_KEYS.DESIGN_CATEGORIES, DEFAULT_DESIGN_CATEGORIES);
    setStoredItem(STORAGE_KEYS.MEASUREMENT_FIELDS, DEFAULT_MEASUREMENT_FIELDS);
    setStoredItem(STORAGE_KEYS.SHOP_SETTINGS, DEFAULT_SHOP_SETTINGS);
  },

  generateNextOrderNumber(): string {
    const orders = this.getOrders();
    if (orders.length === 0) return 'MA-0001';
    const numbers = orders
      .map(o => {
        const match = String(o.orderNumber || '').match(/^MA-(\d+)$/i);
        return match ? parseInt(match[1], 10) : NaN;
      })
      .filter(n => !isNaN(n));
    // Legacy numeric IDs (for example 18864) are preserved for lookup but do
    // not affect the new MA sequence.
    if (numbers.length === 0) return 'MA-0001';
    const max = Math.max(...numbers);
    return `MA-${String(max + 1).padStart(4, '0')}`;
  },

  // Pull the authoritative state directly from Supabase.
  async syncFromDatabase(): Promise<boolean> {
    if (!isSupabaseConfigured) {
      return false;
    }
    if (activeSyncs > 0) {
      return false;
    }
    try {
      const names = ['fabrics','orders','customers','products','product_sales','measurement_fields','design_categories','shop_settings','product_categories','product_vendors','product_brands','garment_types','ui_preferences','expenses'];
      const results = await Promise.all(names.map(async name => {
        try {
          const res = await supabase.from(name).select('*');
          if (res.error) {
            console.warn(`Supabase table ${name} sync notice:`, res.error.message || res.error);
            return { data: [], error: null };
          }
          return res;
        } catch (err) {
          console.warn(`Supabase table ${name} query exception:`, err);
          return { data: [], error: null };
        }
      }));
      const [fabrics, orders, customers, products, sales, fields, designs, settings, categories, vendors, brands, garmentTypes, preferences, expenses] = results.map(result => result.data || []);
      setStoredItem(STORAGE_KEYS.FABRICS, fromDatabaseRows('fabrics', fabrics));
      setStoredItem(STORAGE_KEYS.ORDERS, fromDatabaseRows('orders', orders));
      setStoredItem(STORAGE_KEYS.CUSTOMERS, fromDatabaseRows('customers', customers));
      setStoredItem(STORAGE_KEYS.PRODUCTS, fromDatabaseRows('products', products));
      setStoredItem(STORAGE_KEYS.PRODUCT_SALES, fromDatabaseRows('product_sales', sales));
      if (expenses) setStoredItem(STORAGE_KEYS.EXPENSES, fromDatabaseRows('expenses', expenses));
      if (fields.length) setStoredItem(STORAGE_KEYS.MEASUREMENT_FIELDS, fromDatabaseRows('measurement_fields', fields));
      if (designs.length) setStoredItem(STORAGE_KEYS.DESIGN_CATEGORIES, fromDatabaseRows('design_categories', designs));
      if (settings[0]?.data) setStoredItem(STORAGE_KEYS.SHOP_SETTINGS, settings[0].data);
      if (categories.length) setStoredItem(STORAGE_KEYS.PRODUCT_CATEGORIES, fromDatabaseRows('product_categories', categories).sort((a, b) => a.sortOrder - b.sortOrder));
      if (vendors.length) setStoredItem(STORAGE_KEYS.PRODUCT_VENDORS, vendors.sort((a, b) => a.sort_order - b.sort_order).map(row => row.name));
      if (brands.length) setStoredItem(STORAGE_KEYS.PRODUCT_BRANDS, brands.sort((a, b) => a.sort_order - b.sort_order).map(row => row.name));
      if (garmentTypes.length) setStoredItem(STORAGE_KEYS.GARMENT_TYPES, fromDatabaseRows('garment_types', garmentTypes).sort((a, b) => a.sortOrder - b.sortOrder));
      if (preferences[0]) setStoredItem(STORAGE_KEYS.UI_PREFERENCES, fromDatabaseRows('ui_preferences', preferences)[0]);

      return true;
    } catch (e) {
      console.log('Database sync notice:', e);
      return false;
    }
  }
};
