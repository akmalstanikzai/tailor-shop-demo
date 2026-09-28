import React, { useState, useEffect, useMemo } from 'react';
import { 
  Order, 
  Customer, 
  MeasurementField, 
  DesignCategory, 
  ShopSettings, 
  Language, 
  OrderStatus,
  PaymentStatus,
  Fabric,
  GarmentTypeConfig
} from '../types';
import { translations } from '../translations/i18n';
import { storageService } from '../services/storage';
import { getErrorMessage } from '../lib/errors';
import { 
  Scissors, 
  User, 
  Phone, 
  Sparkles, 
  Save, 
  Printer, 
  Check, 
  Calendar, 
  Clock, 
  Tag, 
  DollarSign, 
  Layers, 
  RotateCcw,
  Search,
  CheckCircle2,
  FileText,
  Plus,
  Minus,
  AlertCircle,
  PackageCheck,
  Filter,
  Shirt
} from 'lucide-react';

interface OrderFormProps {
  initialOrder?: Order | null;
  prefilledCustomer?: Customer | null;
  prefilledFabric?: Fabric | null;
  measurementFields: MeasurementField[];
  designCategories: DesignCategory[];
  shopSettings: ShopSettings;
  language: Language;
  onSave: (order: Order, shouldPrint: boolean) => Promise<void>;
  onCancel: () => void;
}

const normalizedSearchText = (value: unknown): string =>
  typeof value === 'string' ? value.toLowerCase() : '';

export const OrderForm: React.FC<OrderFormProps> = ({
  initialOrder,
  prefilledCustomer,
  prefilledFabric,
  measurementFields,
  designCategories,
  shopSettings,
  language,
  onSave,
  onCancel,
}) => {
  const t = translations[language];

  // Available Fabrics in Inventory
  const [fabricsList] = useState<Fabric[]>(() => storageService.getFabrics());
  const [fabricSearchQuery, setFabricSearchQuery] = useState('');

  // Garment Types from Storage
  const [garmentTypes] = useState<GarmentTypeConfig[]>(() => storageService.getGarmentTypes());

  // Form State
  const [orderNumber] = useState<string>(
    initialOrder?.orderNumber || storageService.generateNextOrderNumber()
  );
  const [customerName, setCustomerName] = useState<string>(
    initialOrder?.customerName || prefilledCustomer?.name || ''
  );
  const [customerPhone, setCustomerPhone] = useState<string>(
    initialOrder?.customerPhone || prefilledCustomer?.phone || ''
  );
  const [customerWhatsApp, setCustomerWhatsApp] = useState<string>(
    initialOrder?.customerWhatsApp || prefilledCustomer?.whatsapp || ''
  );
  const [customerId, setCustomerId] = useState<string>(
    initialOrder?.customerId || prefilledCustomer?.id || ''
  );

  // Selected Garment Type State
  const defaultGarmentName = () => {
    const savedGarmentName = initialOrder?.garmentType || prefilledCustomer?.preferredGarmentType;
    if (savedGarmentName) {
      const savedConfig = garmentTypes.find(g =>
        g.key === savedGarmentName ||
        g.nameEn === savedGarmentName ||
        g.nameFa === savedGarmentName ||
        g.namePs === savedGarmentName
      );
      if (savedConfig) {
        return language === 'ps' ? savedConfig.namePs : language === 'fa' ? savedConfig.nameFa : savedConfig.nameEn;
      }
      return savedGarmentName;
    }
    const first = garmentTypes[0];
    if (first) {
      return language === 'ps' ? first.namePs : language === 'fa' ? first.nameFa : first.nameEn;
    }
    return 'پیراهن و تنبان (Perahan Tunban)';
  };

  const [garmentType, setGarmentType] = useState<string>(defaultGarmentName);
  const [quantity, setQuantity] = useState<number>(initialOrder?.quantity || 1);

  // Toggle to see all fields or only garment-specific fields
  const [showAllFields, setShowAllFields] = useState<boolean>(false);
  
  // Fabric Inventory Selection State
  const [isCustomerFabric, setIsCustomerFabric] = useState<boolean>(
    initialOrder?.isCustomerFabric ?? (!prefilledFabric && !initialOrder?.fabricId)
  );
  const [selectedFabricId, setSelectedFabricId] = useState<string>(
    initialOrder?.fabricId || prefilledFabric?.id || ''
  );
  const selectedFabric = fabricsList.find(f => f.id === selectedFabricId);
  const [fabricName, setFabricName] = useState<string>(
    initialOrder?.fabricName || prefilledFabric?.name || ''
  );
  const [fabricColor, setFabricColor] = useState<string>(
    initialOrder?.fabricColor || prefilledFabric?.color || ''
  );
  const [fabricMeters, setFabricMeters] = useState<number>(
    initialOrder?.fabricMeters || 4
  );

  // Measurements
  const [measurements, setMeasurements] = useState<Record<string, string | number>>(
    initialOrder?.measurements || prefilledCustomer?.standardMeasurements || {}
  );

  // Design Selections
  const [designSelections, setDesignSelections] = useState<Record<string, string>>(
    initialOrder?.designSelections || {}
  );

  // Notes & Storage Location
  const [specialInstructions, setSpecialInstructions] = useState<string>(
    initialOrder?.specialInstructions || ''
  );
  const [cabinetSlot, setCabinetSlot] = useState<string>(
    initialOrder?.cabinetSlot || ''
  );

  // Order Status & Dates
  const [status, setStatus] = useState<OrderStatus>(initialOrder?.status || 'pending');
  const [deliveryDate, setDeliveryDate] = useState<string>(
    initialOrder?.deliveryDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
  );
  const [orderDate] = useState<string>(
    initialOrder?.orderDate || new Date().toISOString().slice(0, 10)
  );

  // Pricing
  const [totalAmount, setTotalAmount] = useState<number>(initialOrder?.totalAmount ?? 0);
  const [paidAmount, setPaidAmount] = useState<number>(initialOrder?.paidAmount ?? 0);

  const balanceAmount = Math.max(0, totalAmount - paidAmount);
  const paymentStatus: PaymentStatus = totalAmount <= 0 ? 'unpaid' : balanceAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

  const currencySymbol = shopSettings.currencySymbol || '؋';

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');

  // Auto-suggest existing customers
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState<boolean>(false);
  const allCustomers = useMemo(() => storageService.getCustomers(), []);
  const matchingCustomers = useMemo(() => {
    if (!customerName.trim() && !customerPhone.trim()) return [];
    const qName = customerName.toLowerCase();
    const qPhone = customerPhone.toLowerCase();
    return allCustomers.filter(c => 
      normalizedSearchText(c.name).includes(qName) || normalizedSearchText(c.phone).includes(qPhone)
    ).slice(0, 5);
  }, [customerName, customerPhone, allCustomers]);

  const matchedExistingCustomer = useMemo(() => {
    return allCustomers.find(c => 
      (customerPhone && c.phone === customerPhone) || 
      (customerName && normalizedSearchText(c.name) === customerName.toLowerCase())
    );
  }, [customerName, customerPhone, allCustomers]);

  // Filtered fabrics based on search query
  const filteredFabricsList = useMemo(() => {
    if (!fabricSearchQuery.trim()) return fabricsList;
    const q = fabricSearchQuery.toLowerCase();
    return fabricsList.filter(f => 
      normalizedSearchText(f.name).includes(q) ||
      normalizedSearchText(f.code).includes(q) ||
      normalizedSearchText(f.color).includes(q) ||
      normalizedSearchText(f.type).includes(q)
    );
  }, [fabricsList, fabricSearchQuery]);

  const selectCustomer = (cust: Customer) => {
    setCustomerId(cust.id);
    setCustomerName(cust.name || '');
    setCustomerPhone(cust.phone || '');
    setCustomerWhatsApp(cust.whatsapp || cust.phone || '');
    if (cust.standardMeasurements && Object.keys(cust.standardMeasurements).length > 0) {
      setMeasurements(cust.standardMeasurements);
    }
    if (cust.preferredGarmentType) {
      setGarmentType(cust.preferredGarmentType);
    }
    setShowCustomerSuggestions(false);
  };

  const handleLoadSavedMeasurements = () => {
    if (matchedExistingCustomer?.standardMeasurements) {
      setMeasurements(matchedExistingCustomer.standardMeasurements);
      alert(language === 'fa' ? 'اندازه‌های ذخیره شده مشتری بارگذاری شد' : 'Loaded customer saved measurements!');
    } else {
      alert(language === 'fa' ? 'اندازه ذخیره شده‌ای برای این مشتری یافت نشد' : 'No saved measurements found for this customer');
    }
  };

  // Find active garment config to filter fields & designs
  const activeGarmentConfig = useMemo(() => {
    return garmentTypes.find(g => 
      g.nameEn === garmentType || g.nameFa === garmentType || g.namePs === garmentType || g.key === garmentType
    ) || garmentTypes[0];
  }, [garmentType, garmentTypes]);

  const activeGarmentKey = activeGarmentConfig?.key || 'perahan_tunban';
  const localizedActiveGarmentName = activeGarmentConfig
    ? (language === 'ps' ? activeGarmentConfig.namePs : language === 'fa' ? activeGarmentConfig.nameFa : activeGarmentConfig.nameEn)
    : garmentType;

  useEffect(() => {
    if (activeGarmentConfig && garmentType !== localizedActiveGarmentName) {
      setGarmentType(localizedActiveGarmentName);
    }
  }, [language, activeGarmentConfig, garmentType, localizedActiveGarmentName]);

  // Filtered measurement fields
  const filteredMeasurementFields = useMemo(() => {
    if (showAllFields) return measurementFields;
    return measurementFields.filter(f => f.garmentCategory === activeGarmentKey || !f.garmentCategory);
  }, [measurementFields, activeGarmentKey, showAllFields]);

  // Filtered design categories
  const filteredDesignCategories = useMemo(() => {
    if (showAllFields) return designCategories;
    return designCategories.filter(c => c.garmentCategory === activeGarmentKey || !c.garmentCategory);
  }, [designCategories, activeGarmentKey, showAllFields]);

  const handleSelectShopFabric = (fab: Fabric) => {
    setSelectedFabricId(fab.id);
    setFabricName(fab.name);
    setFabricColor(fab.color);
    if (fab.pricePerMeter) {
      // e.g. estimate total based on 4 meters
      setTotalAmount(Math.round(fab.pricePerMeter * fabricMeters));
    }
  };

  const adjustMeasurement = (fieldKey: string, delta: number) => {
    setMeasurements(prev => {
      const currentVal = parseFloat(String(prev[fieldKey] || '0')) || 0;
      const newVal = Math.max(0, Number((currentVal + delta).toFixed(2)));
      return { ...prev, [fieldKey]: newVal };
    });
  };

  const setQuickDeliveryDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDeliveryDate(d.toISOString().slice(0, 10));
  };

  // Save handler
  const handleSave = async () => {
    if (!customerName.trim()) {
      alert(language === 'fa' ? 'لطفاً نام مشتری را وارد نمایید' : language === 'ps' ? 'مهرباني وکړئ د مشتري نوم ولیکئ' : 'Please enter customer name');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    try {
      const orderData: Order = {
        id: initialOrder?.id || 'ord_' + Date.now(),
        orderNumber: orderNumber || storageService.generateNextOrderNumber(),
        customerId: customerId || 'cust_' + Date.now(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerWhatsApp: customerWhatsApp.trim() || customerPhone.trim(),
        garmentType,
        quantity: Number(quantity) || 1,
        fabricId: isCustomerFabric ? undefined : selectedFabricId,
        fabricName: isCustomerFabric ? (fabricName || 'رخت از خود مشتری') : fabricName,
        fabricColor: fabricColor,
        fabricMeters: isCustomerFabric ? undefined : Number(fabricMeters) || 0,
        isCustomerFabric: isCustomerFabric,
        measurements,
        designSelections,
        specialInstructions,
        cabinetSlot: cabinetSlot.trim() || undefined,
        items: initialOrder?.items || [],
        totalAmount: Number(totalAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        balanceAmount,
        paymentStatus,
        status,
        orderDate,
        deliveryDate,
        createdAt: initialOrder?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(orderData, false);
    } catch (error) {
      const detail = getErrorMessage(error);
      setSaveError(language === 'fa' ? `سفارش در دیتابیس ذخیره نشد: ${detail}` : language === 'ps' ? `فرمایش په ډیټابیس کې خوندي نه شو: ${detail}` : `Order was not saved: ${detail}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl min-w-0 mx-auto pb-20 animate-in fade-in duration-200">
      {saveError && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-800"><AlertCircle className="h-5 w-5 shrink-0" /><span>{saveError}</span></div>}
      
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[#D4AF37] shadow-xs">
            <Scissors className="w-6 h-6 transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">
                {initialOrder ? t.editOrder : t.newOrder}
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#D4AF37]/20 text-[#1A1A1A] rounded-md border border-[#D4AF37]/30">
                {orderNumber}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {language === 'fa' 
                ? 'ثبت دقیق اندازه‌ها، انتخاب رخت، دیزاین و مشخصات سفارش به صورت پیوسته' 
                : language === 'ps' 
                ? 'د کالي د ډول پر بنسټ د فرمایش، رخت، ډیزاین او اندازو ثبت' 
                : 'Complete Afghan tailoring order form in a single continuous flow'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-6 py-2.5 text-xs font-black text-[#1A1A1A] bg-[#D4AF37] hover:bg-[#C29E2E] active:scale-98 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-60"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? (language === 'fa' ? 'در حال ثبت...' : 'Saving...') : t.saveOrder}</span>
          </button>
        </div>
      </div>

      {/* Single Vertical Unified Flow Container */}
      <div className="space-y-6">

        {/* 1. Customer Information Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-900 font-extrabold text-sm">
              <span className="w-1.5 h-5 bg-amber-600 rounded-full inline-block" />
              <User className="w-4 h-4 text-amber-600" />
              <span>{t.customerDetails}</span>
            </div>

            {matchedExistingCustomer && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.existingCustomer} ({matchedExistingCustomer.name})</span>
                </span>
                <button
                  type="button"
                  onClick={handleLoadSavedMeasurements}
                  className="text-[11px] text-amber-700 hover:underline font-bold"
                >
                  {language === 'fa' ? 'بارگذاری اندازه‌های قبلی' : 'Load Saved Measurements'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            {/* Customer Name */}
            <div className="relative">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t.customerName} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => {
                    setCustomerName(e.target.value);
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  placeholder="e.g. احمد، فرهاد، شکیل خان..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
                />
                <User className="w-4 h-4 text-stone-400 absolute end-3 top-2.5" />
              </div>

              {/* Suggestions Dropdown */}
              {showCustomerSuggestions && matchingCustomers.length > 0 && (
                <div className="absolute top-full start-0 end-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-30 p-1.5 space-y-1">
                  <div className="text-[10px] font-bold text-stone-400 px-2 py-0.5">
                    {language === 'fa' ? 'مشتریان موجود (کلیک برای انتخاب):' : 'Matching Customers:'}
                  </div>
                  {matchingCustomers.map(cust => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => selectCustomer(cust)}
                      className="w-full text-start p-2 rounded-lg hover:bg-amber-50 text-xs flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="font-bold text-stone-900">{cust.name}</span>
                      <span className="font-mono text-stone-500 text-[11px]">{cust.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t.customerPhone} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={customerPhone}
                  onChange={e => {
                    setCustomerPhone(e.target.value);
                    setShowCustomerSuggestions(true);
                  }}
                  placeholder="0772559881"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
                />
                <Phone className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Garment Selection Bar */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-amber-600" />
                <span>{t.garmentType} (انتخاب نوع لباس برای اندازه و دیزاین)</span>
              </label>
              <span className="text-[10px] text-stone-500 font-bold">
                {garmentTypes.length} {language === 'fa' ? 'نوع لباس فعال' : 'Active types'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {garmentTypes.map(g => {
                const localizedName = language === 'ps' ? g.namePs : language === 'fa' ? g.nameFa : g.nameEn;
                const isSelected = garmentType === localizedName || garmentType === g.nameEn || garmentType === g.nameFa || garmentType === g.namePs;

                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGarmentType(localizedName)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center shadow-2xs ${
                      isSelected
                        ? 'bg-amber-600 text-white font-black ring-2 ring-amber-400'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    <span>{localizedName}</span>
                  </button>
                );
              })}
            </div>

            {/* Quantity */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">
                {t.quantity} (تعداد دست لباس):
              </span>
              <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1 hover:bg-stone-200 text-stone-700 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center bg-transparent text-xs font-mono font-bold text-stone-900 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-1 hover:bg-stone-200 text-stone-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Fabric Inventory Selection Card (Prominent Switcher + Search + Dropdown) */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-900 font-extrabold text-sm">
              <span className="w-1.5 h-5 bg-amber-600 rounded-full inline-block" />
              <Layers className="w-4 h-4 text-amber-600" />
              <span>{t.selectFabric}</span>
            </div>

            {/* Highly Prominent Switcher: Shop Fabric vs Customer Fabric */}
            <div className="flex items-center bg-stone-100 p-1.5 rounded-xl border border-stone-200 gap-1">
              <button
                type="button"
                onClick={() => setIsCustomerFabric(false)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  !isCustomerFabric
                    ? 'bg-amber-600 text-white shadow-sm font-black'
                    : 'text-stone-600 hover:text-stone-900 bg-white'
                }`}
              >
                <span>🏬</span>
                <span>{t.shopFabric}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomerFabric(true);
                  setSelectedFabricId('');
                  setFabricName('رخت از خود مشتری');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isCustomerFabric
                    ? 'bg-amber-600 text-white shadow-sm font-black'
                    : 'text-stone-600 hover:text-stone-900 bg-white'
                }`}
              >
                <span>👤</span>
                <span>{t.customerFabric}</span>
              </button>
            </div>
          </div>

          {/* Mode A: Select from Inventory with BOTH Search & Dropdown */}
          {!isCustomerFabric ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Search Fabric Box */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {language === 'fa' ? 'جستجوی سریع رخت در گدام (کد، نام، رنگ):' : 'Search Fabric in Inventory:'}
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute start-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fabricSearchQuery}
                      onChange={e => setFabricSearchQuery(e.target.value)}
                      placeholder={language === 'fa' ? 'مثال: F-01 یا سفید...' : 'e.g. F-01 or white...'}
                      className="w-full ps-9 pe-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
                    />
                  </div>
                </div>

                {/* 2. Dropdown Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {language === 'fa' ? 'انتخاب رخت از منوی کشویی (Dropdown):' : 'Select Fabric from Dropdown:'}
                  </label>
                  <select
                    value={selectedFabricId}
                    onChange={e => {
                      const fab = fabricsList.find(f => f.id === e.target.value);
                      if (fab) {
                        handleSelectShopFabric(fab);
                      } else {
                        setSelectedFabricId('');
                        setFabricName('');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden cursor-pointer"
                  >
                    <option value="">
                      {language === 'fa' 
                        ? '-- لطفاً رخت مورد نظر را از گدام انتخاب نمایید --' 
                        : '-- Select fabric from inventory --'}
                    </option>
                    {filteredFabricsList.map(fab => {
                      const stock = Number(fab.stockMeters) || 0;
                      return (
                        <option key={fab.id} value={fab.id}>
                          [{fab.code}] {fab.name} — {fab.color} ({stock} {t.meters} موجود) — {fab.pricePerMeter} {currencySymbol}/{t.meters}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Selected Fabric Banner / Detail */}
              {selectedFabricId && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-extrabold text-stone-900 flex items-center gap-2">
                      <span className="font-mono text-[11px] px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-black">
                        {selectedFabric?.code}
                      </span>
                      <span>{selectedFabric?.name}</span>
                    </div>
                    <div className="text-[11px] text-stone-600 mt-1">
                      {selectedFabric?.color} • {selectedFabric?.type} • 
                      <span className="font-bold text-stone-900 ms-1">
                        {selectedFabric?.pricePerMeter} {currencySymbol}/{t.meters}
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="text-[10px] text-stone-500 block">{t.stockMeters}:</span>
                    <span className={`font-mono font-black text-sm ${(selectedFabric?.stockMeters || 0) < 15 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {selectedFabric?.stockMeters} {t.meters}
                    </span>
                  </div>
                </div>
              )}

              {/* Fabric Meters Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.fabricName}
                  </label>
                  <input
                    type="text"
                    value={fabricName}
                    onChange={e => setFabricName(e.target.value)}
                    placeholder="e.g. تکه نخی اعلا"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-600 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.fabricMeters} ({t.meters}):
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.5"
                    value={fabricMeters}
                    onChange={e => setFabricMeters(Math.max(0.5, parseFloat(e.target.value) || 4))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-600 outline-hidden"
                  />
                  {/* Quick Meters chips */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[3.5, 4.0, 4.25, 4.5, 5.0].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFabricMeters(m)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition cursor-pointer ${
                          fabricMeters === m
                            ? 'bg-stone-900 text-white border-stone-900 font-bold'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-200'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Mode B: Customer Provided Their Own Fabric */
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 text-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <Scissors className="w-4 h-4 text-amber-700" />
                <span>
                  {language === 'fa' 
                    ? 'رخت توسط خود مشتری آورده شده است (تکه شخصی مشتری)' 
                    : 'Customer Provided Their Own Fabric'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    {language === 'fa' ? 'مشخصات / نوعیت یا رنگ رخت مشتری:' : 'Customer Fabric Details & Color:'}
                  </label>
                  <input
                    type="text"
                    value={fabricName}
                    onChange={e => setFabricName(e.target.value)}
                    placeholder="مثال: تکه نخی کرمی آورده شد..."
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    {t.fabricMeters} ({t.meters}):
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.5"
                    value={fabricMeters}
                    onChange={e => setFabricMeters(Math.max(0.5, parseFloat(e.target.value) || 4))}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Measurement Fields Grid */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-stone-100 pb-3 gap-2">
            <div className="flex items-center gap-2 text-stone-900 font-extrabold text-sm">
              <span className="w-1.5 h-5 bg-amber-600 rounded-full inline-block" />
              <Scissors className="w-4 h-4 text-amber-600" />
              <span>{t.bodyMeasurements}</span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-900 rounded-md text-xs font-bold border border-amber-200">
                {localizedActiveGarmentName}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAllFields(!showAllFields)}
                className="text-[11px] font-bold text-stone-700 hover:text-amber-700 flex items-center gap-1 cursor-pointer transition"
              >
                <Filter className="w-3 h-3 text-amber-600" />
                <span>
                  {showAllFields 
                    ? (language === 'fa' ? 'فقط اندازه‌های این لباس' : 'Show Only Garment Fields')
                    : (language === 'fa' ? 'نمایش همه اندازه‌ها' : 'Show All Fields')}
                </span>
              </button>
              <span className="text-[11px] font-mono text-stone-500 font-semibold">
                {t.unitInch} (in)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredMeasurementFields.map(field => {
              const label = language === 'ps' 
                ? field.labelPs 
                : language === 'fa' 
                ? field.labelFa 
                : field.labelEn;

              const val = measurements[field.key] !== undefined ? String(measurements[field.key]) : '';

              return (
                <div 
                  key={field.id}
                  className="p-3 bg-stone-50 rounded-xl border border-stone-200 hover:border-amber-400 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                    <span>{label}</span>
                    <span className="text-[10px] font-mono text-stone-400">{field.unit || 'in'}</span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={val}
                      onChange={e => {
                        const v = e.target.value;
                        setMeasurements(prev => ({ ...prev, [field.key]: v }));
                      }}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm font-mono font-black text-center text-stone-900 focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                    />
                  </div>

                  {/* Step +/- Adjustment Pills */}
                  <div className="flex items-center justify-center gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => adjustMeasurement(field.key, -0.5)}
                      className="px-1.5 py-0.5 bg-stone-200 hover:bg-stone-300 rounded text-[10px] font-mono font-bold text-stone-700 cursor-pointer"
                    >
                      -0.5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustMeasurement(field.key, -0.25)}
                      className="px-1.5 py-0.5 bg-stone-200 hover:bg-stone-300 rounded text-[10px] font-mono font-bold text-stone-700 cursor-pointer"
                    >
                      -0.25
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustMeasurement(field.key, 0.25)}
                      className="px-1.5 py-0.5 bg-stone-200 hover:bg-stone-300 rounded text-[10px] font-mono font-bold text-stone-700 cursor-pointer"
                    >
                      +0.25
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustMeasurement(field.key, 0.5)}
                      className="px-1.5 py-0.5 bg-stone-200 hover:bg-stone-300 rounded text-[10px] font-mono font-bold text-stone-700 cursor-pointer"
                    >
                      +0.5
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Garment Design Options Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-900 font-extrabold text-sm">
              <span className="w-1.5 h-5 bg-amber-600 rounded-full inline-block" />
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{t.garmentDesign}</span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-900 rounded-md text-xs font-bold border border-amber-200">
                {localizedActiveGarmentName}
              </span>
            </div>
            <span className="text-xs text-stone-500 font-bold">
              {filteredDesignCategories.length} {language === 'fa' ? 'گزینه دیزاین' : 'options'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredDesignCategories.map(cat => {
              const title = language === 'ps' 
                ? cat.titlePs 
                : language === 'fa' 
                ? cat.titleFa 
                : cat.titleEn;

              const currentVal = designSelections[cat.key] || '';

              return (
                <div key={cat.id} className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <label className="block text-xs font-bold text-stone-800">
                    {title}
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {cat.options.map(opt => {
                      const optName = language === 'ps' 
                        ? opt.namePs 
                        : language === 'fa' 
                        ? opt.nameFa 
                        : opt.nameEn;

                      const isSelected = currentVal === optName;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDesignSelections(prev => ({
                            ...prev,
                            [cat.key]: optName
                          }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-600 text-white font-bold shadow-2xs'
                              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {optName}
                        </button>
                      );
                    })}
                  </div>

                  {cat.allowCustomInput && (
                    <input
                      type="text"
                      value={currentVal}
                      onChange={e => setDesignSelections(prev => ({
                        ...prev,
                        [cat.key]: e.target.value
                      }))}
                      placeholder={language === 'fa' ? 'یا تایپ دیزاین خاص...' : 'Or type custom style...'}
                      className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-hidden focus:border-amber-600"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Order Status, Expected Date & Special Notes Card (Following downward in one flow) */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-stone-900 font-extrabold text-sm border-b border-stone-100 pb-3">
            <span className="w-1.5 h-5 bg-amber-600 rounded-full inline-block" />
            <PackageCheck className="w-4 h-4 text-amber-600" />
            <span>{language === 'fa' ? 'وضعیت، تاریخ وعده و توضیحات' : 'Status, Expected Date & Notes'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Order Status */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">
                {t.orderStatus}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                    status === 'pending'
                      ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-500 font-extrabold'
                      : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span>⏳</span>
                  <span>{t.statusPending}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('in_progress')}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                    status === 'in_progress'
                      ? 'bg-blue-100 text-blue-900 ring-2 ring-blue-500 font-extrabold'
                      : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span>✂️</span>
                  <span>{t.statusInProgress}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('ready')}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                    status === 'ready'
                      ? 'bg-emerald-100 text-emerald-900 ring-2 ring-emerald-500 font-extrabold'
                      : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span>✅</span>
                  <span>{t.statusReady}</span>
                </button>
              </div>
            </div>

            {/* Delivery Date */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t.deliveryDate} (تاریخ وعده)
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-600 outline-hidden"
              />

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setQuickDeliveryDays(3)}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-[11px] font-bold text-stone-700 cursor-pointer"
                >
                  +3 {language === 'fa' ? 'روز' : 'Days'}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeliveryDays(5)}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-[11px] font-bold text-stone-700 cursor-pointer"
                >
                  +5 {language === 'fa' ? 'روز' : 'Days'}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeliveryDays(7)}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-[11px] font-bold text-stone-700 cursor-pointer"
                >
                  +7 {language === 'fa' ? 'روز' : 'Days'}
                </button>
              </div>
            </div>
          </div>

          {/* Special Notes & Cabinet Slot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t.specialNotes} (توضیحات و نکات خاص)
              </label>
              <textarea
                rows={2}
                value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                placeholder={language === 'fa' ? 'مثال: کالر یی نرم باشد، دوخت زنجیری...' : 'e.g. Soft collar, special stitching...'}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:border-amber-600 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {language === 'fa' ? 'شماره الماری / رف نگهداری (اختیاری)' : 'Cabinet / Shelf Storage Slot'}
              </label>
              <input
                type="text"
                value={cabinetSlot}
                onChange={e => setCabinetSlot(e.target.value)}
                placeholder={language === 'fa' ? 'مثال: A-05 یا الماری ۲' : 'e.g. A-05, Shelf 2'}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-600 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* 6. Pricing, Advance & Payment Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-stone-900 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-900 font-black text-sm">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <span>{t.paymentStatus}</span>
            </div>
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
              paymentStatus === 'paid' 
                ? 'bg-emerald-100 text-emerald-800' 
                : paymentStatus === 'partial' 
                ? 'bg-amber-100 text-amber-900' 
                : 'bg-rose-100 text-rose-800'
            }`}>
              {t[paymentStatus]}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Amount */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                {t.totalAmount} (جمله)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={totalAmount}
                  onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base font-mono font-black text-stone-900 focus:bg-white focus:border-amber-600 outline-hidden"
                />
                <span className="absolute end-3 top-3 text-xs text-stone-500 font-bold">
                  {currencySymbol}
                </span>
              </div>
            </div>

            {/* Paid / Advance */}
            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                {t.paidAmount} (رسید)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={paidAmount}
                  onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-base font-mono font-black text-emerald-900 focus:bg-white focus:border-emerald-600 outline-hidden"
                />
                <span className="absolute end-3 top-3 text-xs text-emerald-600 font-bold">
                  {currencySymbol}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setPaidAmount(totalAmount)}
                  className="text-[11px] text-emerald-700 hover:underline font-bold"
                >
                  {language === 'fa' ? 'تسویه کامل' : 'Mark full paid'}
                </button>
                <span className="text-stone-300">•</span>
                <button
                  type="button"
                  onClick={() => setPaidAmount(0)}
                  className="text-[11px] text-stone-500 hover:underline font-medium"
                >
                  {language === 'fa' ? 'بدون پیش‌پرداخت' : 'Zero advance'}
                </button>
              </div>
            </div>

            {/* Balance Remaining Display */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-center">
              <span className="text-xs font-bold text-stone-700">
                {t.balanceRemaining} (باقیات):
              </span>
              <span className={`font-mono text-xl font-black mt-0.5 ${balanceAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {balanceAmount} <span className="text-xs font-normal text-stone-500">{currencySymbol}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Save Action Button */}
        <div className="pt-4">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="w-full py-4 px-6 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-black rounded-2xl text-base transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>{isSaving ? (language === 'fa' ? 'در حال ثبت در دیتابیس...' : 'Saving to Database...') : t.saveOrder}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
