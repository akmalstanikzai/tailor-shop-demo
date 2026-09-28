import React, { useState, useEffect, useMemo } from 'react';
import { 
  Customer, 
  Order, 
  MeasurementField, 
  ShopSettings, 
  Language,
  ProductSale
} from '../types';
import { translations } from '../translations/i18n';
import { storageService } from '../services/storage';
import { searchText, textIncludes } from '../lib/search';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Scissors, 
  Calendar, 
  Edit3, 
  Trash2, 
  History, 
  FileText, 
  Printer, 
  UserCheck, 
  X, 
  Save, 
  ChevronRight,
  ArrowRight,
  MessageCircle,
  ExternalLink,
  ShoppingBag,
  Tag,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  orders: Order[];
  productSales?: ProductSale[];
  measurementFields: MeasurementField[];
  shopSettings: ShopSettings;
  language: Language;
  selectedCustomerId?: string | null;
  onNewOrderForCustomer: (customer: Customer) => void;
  onViewReceipt: (order: Order) => void;
  onCustomerUpdated: () => void;
}

const normalizeMeasurementText = (value: unknown) => searchText(value).replace(/[\s_-]+/g, '');

const isWaistcoatSpecificMeasurement = (field: MeasurementField) => {
  const fieldText = normalizeMeasurementText(`${field.key} ${field.labelEn} ${field.labelFa} ${field.labelPs}`);
  return fieldText.includes('waistcoat') || fieldText.includes('wescott') || fieldText.includes('westcoat') || fieldText.includes('vest');
};

const isWaistcoatMeasurement = (field: MeasurementField) => {
  const key = normalizeMeasurementText(field.key);
  const sharedWaistcoatKeys = ['qad', 'shana', 'chati', 'baghal', 'kamar', 'daman', 'yakhan'];
  return isWaistcoatSpecificMeasurement(field) || sharedWaistcoatKeys.includes(key);
};

const isLowerBodyMeasurement = (field: MeasurementField) => {
  const fieldText = normalizeMeasurementText(`${field.key} ${field.labelEn} ${field.labelFa} ${field.labelPs}`);
  return fieldText.includes('tunban') || fieldText.includes('trouser') || fieldText.includes('pacha') || fieldText.includes('bottom') || fieldText.includes('surin') || fieldText.includes('seat') || fieldText.includes('hip');
};

const getMeasurementFieldsForGarment = (fields: MeasurementField[], garmentType: string) => {
  const garmentText = normalizeMeasurementText(garmentType);
  if (garmentText.includes('waistcoat') || garmentText.includes('wescott') || garmentText.includes('westcoat') || garmentText.includes('vest') || garmentText.includes('واسکت')) {
    return fields.filter(isWaistcoatMeasurement);
  }

  if (garmentText.includes('tunban') || garmentText.includes('kameezshalwar') || garmentText.includes('perahan') || garmentText.includes('kurta') || garmentText.includes('پیراهن') || garmentText.includes('کورت')) {
    return fields.filter(field => !isWaistcoatSpecificMeasurement(field));
  }

  return fields.filter(field => !isWaistcoatSpecificMeasurement(field) && !isLowerBodyMeasurement(field));
};

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  orders,
  productSales = [],
  measurementFields,
  shopSettings,
  language,
  selectedCustomerId,
  onNewOrderForCustomer,
  onViewReceipt,
  onCustomerUpdated,
}) => {
  const t = translations[language];

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(
    selectedCustomerId ? (customers || []).find(c => c.id === selectedCustomerId) || null : null
  );

  // Sync selected customer from props (e.g. when clicked from Dashboard order row)
  useEffect(() => {
    if (selectedCustomerId) {
      const match = (customers || []).find(c => c.id === selectedCustomerId);
      if (match) {
        setActiveCustomer(match);
      }
    }
  }, [selectedCustomerId, customers]);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyTab, setHistoryTab] = useState<'all' | 'orders' | 'products'>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'tailoring' | 'products'>('all');
  const [selectedMeasurementGarment, setSelectedMeasurementGarment] = useState('');

  // Currency
  const currencySymbol = language === 'ps' 
    ? (shopSettings?.currencyPs || 'افغانۍ') 
    : language === 'fa' 
    ? (shopSettings?.currencyFa || 'افغانی') 
    : (shopSettings?.currencySymbol || shopSettings?.currencyEn || 'AFN');

  // Include retail-only buyers in the directory. Matching by phone/customer id
  // lets a person who uses both services appear in both dedicated views.
  const allCustomers = useMemo(() => {
    const directory = new Map<string, Customer>();
    customers.forEach(customer => directory.set(customer.id || customer.phone, customer));
    productSales.forEach(sale => {
      if (!sale.customerName && !sale.customerPhone) return;
      const exists = Array.from(directory.values()).some(customer =>
        (sale.customerId && customer.id === sale.customerId) ||
        Boolean(sale.customerPhone && customer.phone === sale.customerPhone)
      );
      if (!exists) {
        const phone = sale.customerPhone || '';
        const id = sale.customerId || `retail_${phone || sale.id}`;
        directory.set(id, {
          id,
          name: sale.customerName || (language === 'fa' ? 'مشتری فروشگاه' : language === 'ps' ? 'د هټۍ پېرودونکی' : 'Retail customer'),
          phone,
          whatsapp: phone,
          address: '',
          notes: '',
          standardMeasurements: {},
          createdAt: sale.saleDate || new Date().toISOString(),
          updatedAt: sale.saleDate || new Date().toISOString(),
        });
      }
    });
    return Array.from(directory.values());
  }, [customers, productSales, language]);

  // Filtered Customers: search by Name, Phone, or Past Order Number!
  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const matchesCustomerType = (cust: Customer) => {
      if (customerTypeFilter === 'all') return true;
      const hasTailoringOrders = orders.some(order => order.customerId === cust.id || order.customerPhone === cust.phone);
      const hasProductSales = productSales.some(sale =>
        sale.customerId === cust.id ||
        (sale.customerPhone && cust.phone && sale.customerPhone === cust.phone) ||
        (sale.customerName && cust.name && searchText(sale.customerName.trim()) === searchText(cust.name.trim()))
      );
      return customerTypeFilter === 'tailoring' ? hasTailoringOrders : hasProductSales;
    };
    if (!q) return allCustomers.filter(matchesCustomerType);

    // Find order numbers matching search term to also find associated customer IDs
    const matchedCustomerIdsFromOrders = new Set(
      orders
        .filter(o => textIncludes(o.orderNumber, q))
        .map(o => o.customerId)
    );

    return allCustomers.filter(cust => {
      const matchName = textIncludes(cust.name, q);
      const matchPhone = textIncludes(cust.phone, q);
      const matchOrder = matchedCustomerIdsFromOrders.has(cust.id);
      const matchNotes = textIncludes(cust.notes, q);
      const matchesType = matchesCustomerType(cust);

      return (matchName || matchPhone || matchOrder || matchNotes) && matchesType;
    });
  }, [allCustomers, orders, productSales, searchTerm, customerTypeFilter]);

  const customerCounts = useMemo(() => ({
    tailoring: allCustomers.filter(customer => orders.some(order => order.customerId === customer.id || order.customerPhone === customer.phone)).length,
    products: allCustomers.filter(customer => productSales.some(sale =>
      sale.customerId === customer.id ||
      (sale.customerPhone && customer.phone && sale.customerPhone === customer.phone) ||
      (sale.customerName && customer.name && searchText(sale.customerName.trim()) === searchText(customer.name.trim()))
    )).length,
  }), [allCustomers, orders, productSales]);

  // Customer orders
  const activeCustomerOrders = useMemo(() => {
    if (!activeCustomer) return [];
    return orders.filter(o => o.customerId === activeCustomer.id || o.customerPhone === activeCustomer.phone);
  }, [orders, activeCustomer]);

  const measurementGarments = useMemo(() => {
    const garmentTypes = activeCustomerOrders.map(order => order.garmentType).filter(Boolean);
    if (garmentTypes.length === 0 && activeCustomer?.preferredGarmentType) {
      garmentTypes.push(activeCustomer.preferredGarmentType);
    }
    return Array.from(new Set(garmentTypes));
  }, [activeCustomerOrders, activeCustomer]);

  useEffect(() => {
    if (!measurementGarments.includes(selectedMeasurementGarment)) {
      setSelectedMeasurementGarment(measurementGarments[0] || '');
    }
  }, [measurementGarments, selectedMeasurementGarment]);

  const visibleMeasurementFields = useMemo(() => {
    if (!selectedMeasurementGarment) return [];
    return getMeasurementFieldsForGarment(measurementFields, selectedMeasurementGarment);
  }, [measurementFields, selectedMeasurementGarment]);

  // Only display measurement fields that have an actual saved value (no extra blank or dash fields)
  const savedMeasurementsToDisplay = useMemo(() => {
    if (!activeCustomer?.standardMeasurements) return [];

    const baseFields = visibleMeasurementFields.length > 0 ? visibleMeasurementFields : measurementFields;
    
    // Only return fields that have a real, non-empty measurement value and valid label
    const validFields = baseFields
      .filter(field => {
        const label = language === 'ps' ? field.labelPs : language === 'fa' ? field.labelFa : field.labelEn;
        const val = activeCustomer.standardMeasurements?.[field.key];
        const hasLabel = Boolean((label || '').trim());
        const hasVal = val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-';
        return hasLabel && hasVal;
      })
      .map(field => {
        const label = (language === 'ps' ? field.labelPs : language === 'fa' ? field.labelFa : field.labelEn) || field.labelEn || field.key;
        const val = activeCustomer.standardMeasurements?.[field.key];
        return {
          id: field.id || field.key,
          key: field.key,
          label: label.trim(),
          val: String(val).trim()
        };
      });

    // Also include any extra non-empty custom measurement keys that have saved values
    const displayedKeys = new Set(validFields.map(f => f.key));
    const extraFields: { id: string; key: string; label: string; val: string }[] = [];

    Object.entries(activeCustomer.standardMeasurements).forEach(([k, rawVal]) => {
      if (displayedKeys.has(k)) return;
      const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
      if (!valStr || valStr === '-') return;

      const matchedField = measurementFields.find(f => f.key === k);
      const label = matchedField 
        ? ((language === 'ps' ? matchedField.labelPs : language === 'fa' ? matchedField.labelFa : matchedField.labelEn) || matchedField.labelEn)
        : k;
      if (label && label.trim()) {
        extraFields.push({
          id: `custom_${k}`,
          key: k,
          label: label.trim(),
          val: valStr
        });
      }
    });

    return [...validFields, ...extraFields];
  }, [activeCustomer, visibleMeasurementFields, measurementFields, language]);

  // Customer product purchases
  const activeCustomerSales = useMemo(() => {
    if (!activeCustomer) return [];
    return (productSales || []).filter(s => 
      s.customerId === activeCustomer.id || 
      (s.customerPhone && activeCustomer.phone && s.customerPhone === activeCustomer.phone) ||
      (s.customerName && activeCustomer.name && searchText(s.customerName.trim()) === searchText(activeCustomer.name.trim()))
    );
  }, [productSales, activeCustomer]);

  // Combined statistics for active customer profile
  const customerStats = useMemo(() => {
    const totalOrderSpend = activeCustomerOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const totalOrderBalance = activeCustomerOrders.reduce((sum, o) => sum + (Number(o.balanceAmount) || 0), 0);
    const totalProductSpend = activeCustomerSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const grandTotalSpend = totalOrderSpend + totalProductSpend;

    return {
      totalOrderSpend,
      totalOrderBalance,
      totalProductSpend,
      grandTotalSpend,
      ordersCount: activeCustomerOrders.length,
      salesCount: activeCustomerSales.length,
      totalCount: activeCustomerOrders.length + activeCustomerSales.length
    };
  }, [activeCustomerOrders, activeCustomerSales]);

  // Open Edit/Add Modal
  const handleOpenEditModal = (cust?: Customer) => {
    if (cust) {
      setEditingCustomer({ ...cust });
    } else {
      setEditingCustomer({
        id: 'cust_' + Date.now(),
        name: '',
        phone: '',
        whatsapp: '',
        address: '',
        notes: '',
        standardMeasurements: {},
        preferredGarmentType: 'perahanTunban',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setIsEditingModalOpen(true);
  };

  // Save Customer (from edit modal)
  const handleSaveCustomer = async () => {
    if (!editingCustomer || !editingCustomer.name.trim()) {
      alert(language === 'fa' ? 'لطفاً نام مشتری را وارد نمایید' : 'Please enter customer name');
      return;
    }

    // Clean up measurement values: remove empty or dash entries
    const cleanedMeasurements: Record<string, string> = {};
    if (editingCustomer.standardMeasurements) {
      Object.entries(editingCustomer.standardMeasurements).forEach(([k, v]) => {
        const trimmed = String(v || '').trim();
        if (trimmed && trimmed !== '-') {
          cleanedMeasurements[k] = trimmed;
        }
      });
    }

    const customerToSave: Customer = {
      ...editingCustomer,
      name: editingCustomer.name.trim(),
      standardMeasurements: cleanedMeasurements
    };

    await storageService.saveCustomerAsync(customerToSave);
    setIsEditingModalOpen(false);
    setActiveCustomer(customerToSave);
    onCustomerUpdated();
  };

  // Delete Customer
  const handleDeleteCustomer = (cust: Customer) => {
    if (window.confirm(`${t.confirmDelete} (${cust.name})`)) {
      storageService.deleteCustomer(cust.id);
      if (activeCustomer?.id === cust.id) {
        setActiveCustomer(null);
      }
      onCustomerUpdated();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 animate-in fade-in duration-200 min-w-0">
      {/* Header Banner - Bento Style */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#D4AF37] rounded-full inline-block" />
            <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">
              {t.customers}
            </h1>
          </div>
          <p className="text-xs text-[#706E6B] mt-0.5">
            {allCustomers.length} {t.customersList} • {t.newCustomerAutoSaved}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 min-[430px]:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><div className="flex items-center gap-2 text-stone-500 text-xs font-bold"><Users className="w-4 h-4" /> {language === 'fa' ? 'همه مشتریان' : language === 'ps' ? 'ټول پېرودونکي' : 'All customers'}</div><p className="mt-2 text-2xl font-black text-stone-900">{allCustomers.length}</p></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"><div className="flex items-center gap-2 text-amber-800 text-xs font-bold"><Scissors className="w-4 h-4" /> {language === 'fa' ? 'مشتریان خیاطی' : language === 'ps' ? 'د خیاطۍ پېرودونکي' : 'Tailoring customers'}</div><p className="mt-2 text-2xl font-black text-amber-900">{customerCounts.tailoring}</p></div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><div className="flex items-center gap-2 text-emerald-800 text-xs font-bold"><ShoppingBag className="w-4 h-4" /> {language === 'fa' ? 'مشتریان محصولات' : language === 'ps' ? 'د محصولاتو پېرودونکي' : 'Product customers'}</div><p className="mt-2 text-2xl font-black text-emerald-900">{customerCounts.products}</p></div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Customer Search & List (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search Box */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t.searchCustomersPlaceholder}
                className="w-full pl-9 pr-4 py-2 bg-[#F9F7F2] border border-[#E5E5E5] rounded-xl text-xs focus:bg-white focus:border-[#D4AF37] outline-hidden font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl mt-3 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setCustomerTypeFilter('all')}
                className={`flex-1 px-2.5 py-1.5 rounded-lg cursor-pointer ${customerTypeFilter === 'all' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-stone-600'}`}
              >
                {language === 'fa' ? 'همه' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setCustomerTypeFilter('tailoring')}
                className={`flex-1 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-center gap-1 ${customerTypeFilter === 'tailoring' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-stone-600'}`}
              >
                <Scissors className="w-3 h-3 text-[#D4AF37]" />
                <span>{language === 'fa' ? 'خیاطی' : 'Tailoring'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomerTypeFilter('products')}
                className={`flex-1 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-center gap-1 ${customerTypeFilter === 'products' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-stone-600'}`}
              >
                <ShoppingBag className="w-3 h-3 text-emerald-600" />
                <span>{language === 'fa' ? 'محصولات' : 'Products'}</span>
              </button>
            </div>
          </div>

          {/* Customers Cards List */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-2xl border border-[#E5E5E5] text-xs text-[#706E6B]">
                {t.noDataFound}
              </div>
            ) : (
              filteredCustomers.map(cust => {
                const isSelected = activeCustomer?.id === cust.id;
                const custOrders = orders.filter(o => o.customerId === cust.id || o.customerPhone === cust.phone);

                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      setActiveCustomer(cust);
                      const customerGarmentTypes = orders
                        .filter(order => order.customerId === cust.id || order.customerPhone === cust.phone)
                        .map(order => order.garmentType)
                        .filter(Boolean);
                      setSelectedMeasurementGarment(customerGarmentTypes[0] || cust.preferredGarmentType || '');
                    }}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#F9F7F2] border-[#D4AF37] shadow-xs ring-1 ring-[#D4AF37]'
                        : 'bg-white border-[#E5E5E5] hover:bg-[#F9F7F2]/60 shadow-2xs'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#1A1A1A] truncate">{cust.name}</h3>
                        {cust.preferredGarmentType && (
                          <span className="text-[9px] bg-[#F9F7F2] text-[#706E6B] px-2 py-0.5 rounded-md font-medium border border-[#E5E5E5]">
                            {cust.preferredGarmentType}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#706E6B] mt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>{cust.phone || '---'}</span>
                        </span>
                        <span>•</span>
                        <span>{custOrders.length} {language === 'fa' ? 'سفارش' : 'Orders'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewOrderForCustomer(cust);
                        }}
                        className="p-1.5 text-[#1A1A1A] bg-[#D4AF37] hover:bg-[#B39025] rounded-lg transition shadow-2xs cursor-pointer"
                        title={t.createNewOrderForCustomer}
                      >
                        <Scissors className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Customer Details & Saved Measurements (7 Cols) */}
        <div className="lg:col-span-7">
          {activeCustomer ? (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xs p-4 sm:p-6 space-y-5 sm:space-y-6">
              {/* Profile Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] border border-[#1A1A1A] flex items-center justify-center text-[#D4AF37] font-black text-lg">
                    {activeCustomer.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-[#1A1A1A] truncate">
                      {activeCustomer.name}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-[#706E6B] font-mono mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{activeCustomer.phone}</span>
                      {activeCustomer.whatsapp && activeCustomer.whatsapp !== activeCustomer.phone && (
                        <span className="text-emerald-700 font-semibold">WA: {activeCustomer.whatsapp}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Quick Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => onNewOrderForCustomer(activeCustomer)}
                    id="new-order-from-profile-btn"
                    className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3.5 py-2 bg-[#D4AF37] hover:bg-[#B39025] active:scale-98 text-[#1A1A1A] font-black rounded-xl text-xs transition cursor-pointer shadow-xs"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>{t.createNewOrderForCustomer}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(activeCustomer)}
                    className="p-1.5 text-[#1A1A1A] hover:text-black bg-[#F9F7F2] hover:bg-stone-200 rounded-lg transition border border-[#E5E5E5] cursor-pointer"
                    title={t.edit}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteCustomer(activeCustomer)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 bg-[#F9F7F2] hover:bg-rose-50 rounded-lg transition border border-[#E5E5E5] cursor-pointer"
                    title={t.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Saved Measurements Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                    <span className="w-1 h-3.5 bg-[#D4AF37] rounded-full inline-block" />
                    <Scissors className="w-4 h-4 text-[#D4AF37]" />
                    <span>{t.savedMeasurements} ({t.unitInches})</span>
                  </h3>
                  <span className="text-xs text-[#706E6B]">
                    {language === 'fa' ? 'اندازه‌های استاندارد این مشتری' : 'Standard measurements profile'}
                  </span>
                </div>

                {measurementGarments.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 rounded-xl bg-stone-100 p-1.5">
                    {measurementGarments.map(garmentType => (
                      <button
                        key={garmentType}
                        type="button"
                        onClick={() => setSelectedMeasurementGarment(garmentType)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          selectedMeasurementGarment === garmentType
                            ? 'bg-white text-[#1A1A1A] shadow-xs'
                            : 'text-stone-600 hover:bg-white/70'
                        }`}
                      >
                        {garmentType}
                      </button>
                    ))}
                  </div>
                )}

                {savedMeasurementsToDisplay.length === 0 ? (
                  <div className="py-6 px-4 bg-[#F9F7F2] rounded-xl border border-dashed border-[#E5E5E5] text-center">
                    <p className="text-xs text-stone-500 font-medium">
                      {language === 'fa' 
                        ? 'هیچ اندازه ثبت شده‌ای برای این مشتری موجود نیست.' 
                        : language === 'ps' 
                        ? 'د دې پېرودونکي لپاره اندازه نه ده ثبت شوې.' 
                        : 'No saved measurements recorded for this customer.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {savedMeasurementsToDisplay.map(item => (
                      <div 
                        key={item.id} 
                        className="p-2.5 bg-[#F9F7F2] rounded-xl border border-[#E5E5E5] text-center hover:border-[#D4AF37]/60 transition"
                      >
                        <span className="text-[11px] font-semibold text-[#706E6B] block truncate" title={item.label}>
                          {item.label}
                        </span>
                        <span className="font-mono font-black text-sm text-[#1A1A1A] mt-0.5 block">
                          {item.val}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes & Address */}
              {(activeCustomer.notes || activeCustomer.address) && (
                <div className="p-3 bg-[#F9F7F2] rounded-xl border border-[#E5E5E5] text-xs space-y-1">
                  {activeCustomer.address && (
                    <p className="text-[#2D2926]">
                      <b className="text-[#1A1A1A]">{t.shopAddress}:</b> {activeCustomer.address}
                    </p>
                  )}
                  {activeCustomer.notes && (
                    <p className="text-[#2D2926]">
                      <b className="text-[#1A1A1A]">{t.notes}:</b> {activeCustomer.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Customer Financial Overview Metric Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block">
                    {language === 'fa' ? 'سفارشات خیاطی' : language === 'ps' ? 'د خیاطۍ فرمایشونه' : 'Tailoring Orders'}
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono font-black text-sm text-[#1A1A1A]">
                      {customerStats.totalOrderSpend.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-stone-500">{currencySymbol}</span>
                    <span className="text-[10px] font-bold text-stone-600 ms-auto">
                      ({customerStats.ordersCount})
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold block">
                    {language === 'fa' ? 'خرید محصولات' : language === 'ps' ? 'د اجناسو پیرود' : 'Product Purchases'}
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono font-black text-sm text-emerald-900">
                      {customerStats.totalProductSpend.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-700">{currencySymbol}</span>
                    <span className="text-[10px] font-bold text-emerald-700 ms-auto">
                      ({customerStats.salesCount})
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80">
                  <span className="text-[10px] uppercase tracking-wider text-rose-800 font-bold block">
                    {t.totalBalanceDue}
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono font-black text-sm text-rose-700">
                      {customerStats.totalOrderBalance.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-rose-600">{currencySymbol}</span>
                  </div>
                </div>
              </div>

              {/* Customer Activity History: Orders & Product Purchases */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                  <h3 className="font-bold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                    <span className="w-1 h-3.5 bg-[#D4AF37] rounded-full inline-block" />
                    <History className="w-4 h-4 text-[#D4AF37]" />
                    <span>{t.customerHistory}</span>
                    <span className="text-xs font-mono font-bold text-stone-500">
                      ({customerStats.totalCount})
                    </span>
                  </h3>

                  {/* Filter Sub-Tabs */}
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setHistoryTab('all')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        historyTab === 'all'
                          ? 'bg-white text-[#1A1A1A] shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {t.all} ({customerStats.totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTab('orders')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                        historyTab === 'orders'
                          ? 'bg-white text-[#1A1A1A] shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Scissors className="w-3 h-3 text-[#D4AF37]" />
                      <span>{language === 'fa' ? 'سفارشات' : language === 'ps' ? 'فرمایشونه' : 'Orders'} ({customerStats.ordersCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTab('products')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                        historyTab === 'products'
                          ? 'bg-white text-[#1A1A1A] shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <ShoppingBag className="w-3 h-3 text-emerald-600" />
                      <span>{language === 'fa' ? 'محصولات' : language === 'ps' ? 'اجناس' : 'Products'} ({customerStats.salesCount})</span>
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                {customerStats.totalCount === 0 ? (
                  <p className="text-xs text-[#706E6B] italic py-3 text-center">
                    {language === 'fa' ? 'هنوز سفارشی یا خریدی برای این مشتری ثبت نشده است.' : 'No orders or product purchases recorded for this customer.'}
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {/* 1. Tailoring Orders List */}
                    {(historyTab === 'all' || historyTab === 'orders') && activeCustomerOrders.map(ord => (
                      <div 
                        key={`order-${ord.id}`}
                        className="p-3 bg-[#F9F7F2] hover:bg-stone-200/50 rounded-xl border border-[#E5E5E5] flex items-center justify-between gap-3 text-xs transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-[#1A1A1A]">#{ord.orderNumber}</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-[#1A1A1A]">
                              <Scissors className="w-3 h-3 text-[#D4AF37]" />
                              <span>{ord.garmentType}</span>
                            </span>
                            {ord.fabricName && (
                              <span className="text-[10px] text-stone-500">({ord.fabricName})</span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ord.status === 'ready' ? 'bg-emerald-100 text-emerald-800' :
                              ord.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              ord.status === 'delivered' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {t[('status' + ord.status.charAt(0).toUpperCase() + ord.status.slice(1).replace('_', '')) as keyof typeof t] || ord.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#706E6B] font-mono flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-stone-400" />
                              <span>{ord.orderDate}</span>
                            </span>
                            <span>•</span>
                            <span className="font-bold text-[#1A1A1A]">
                              {ord.totalAmount} {currencySymbol}
                            </span>
                            {ord.balanceAmount > 0 ? (
                              <span className="text-rose-600 font-bold">
                                ({t.balanceDue}: {ord.balanceAmount} {currencySymbol})
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold">({t.paid})</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onViewReceipt(ord)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-[#E5E5E5] rounded-lg text-[11px] font-bold text-[#1A1A1A] transition cursor-pointer shadow-2xs shrink-0"
                          title={t.print}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{t.print}</span>
                        </button>
                      </div>
                    ))}

                    {/* 2. Product Purchases List */}
                    {(historyTab === 'all' || historyTab === 'products') && activeCustomerSales.map(sale => (
                      <div 
                        key={`sale-${sale.id}`}
                        className="p-3 bg-emerald-50/40 hover:bg-emerald-50/70 rounded-xl border border-emerald-200/70 flex items-center justify-between gap-3 text-xs transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 font-bold text-[#1A1A1A]">
                              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{sale.productName}</span>
                            </span>
                            {sale.category && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-white rounded-md border border-emerald-200 text-emerald-800 font-semibold">
                                {sale.category}
                              </span>
                            )}
                            <span className="text-[10px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono">
                              &times; {sale.quantity}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-stone-600 font-mono flex-wrap">
                            <span className="flex items-center gap-1 font-sans text-stone-500">
                              <Calendar className="w-3 h-3 text-stone-400" />
                              <span>{sale.saleDate ? sale.saleDate.split('T')[0] : '-'}</span>
                            </span>
                            <span>•</span>
                            <span className="font-bold text-[#1A1A1A]">
                              {sale.totalAmount.toLocaleString()} {currencySymbol}
                            </span>
                            <span className="text-stone-400">
                              ({sale.sellingPrice.toLocaleString()} {currencySymbol}/{t.unitPiece || 'unit'})
                            </span>
                            {sale.paymentMethod && (
                              <span className="text-[10px] uppercase font-bold text-stone-500 font-sans">
                                {sale.paymentMethod}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-end shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {language === 'fa' ? 'خرید محصول' : language === 'ps' ? 'د جنس پیرود' : 'Product Purchase'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Tab specific empty states */}
                    {historyTab === 'orders' && activeCustomerOrders.length === 0 && (
                      <p className="text-xs text-stone-500 italic py-2 text-center">
                        {language === 'fa' ? 'هیچ سفارش خیاطی برای این مشتری یافت نشد.' : 'No tailoring orders found for this customer.'}
                      </p>
                    )}
                    {historyTab === 'products' && activeCustomerSales.length === 0 && (
                      <p className="text-xs text-stone-500 italic py-2 text-center">
                        {language === 'fa' ? 'هیچ خرید محصولی برای این مشتری یافت نشد.' : 'No product purchases found for this customer.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xs p-12 text-center text-[#706E6B]">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-40 text-[#D4AF37]" />
              <p className="text-sm font-bold text-[#1A1A1A]">{t.customerProfile}</p>
              <p className="text-xs mt-1">
                {language === 'fa' ? 'لطفاً یک مشتری را از لیست سمت چپ انتخاب کنید' : 'Please select a customer from the left list'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isEditingModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-[#E5E5E5] space-y-4 max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#D4AF37] rounded-full inline-block" />
                <h3 className="font-bold text-base text-[#1A1A1A]">
                  {editingCustomer.id.startsWith('cust_') && !(customers || []).find(c => c.id === editingCustomer.id) 
                    ? t.addNewCustomer 
                    : t.editCustomer}
                </h3>
              </div>
              <button
                onClick={() => setIsEditingModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#706E6B] uppercase tracking-wider mb-1">{t.customerName} *</label>
                  <input
                    type="text"
                    value={editingCustomer.name}
                    onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F9F7F2] border border-[#E5E5E5] rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#706E6B] uppercase tracking-wider mb-1">{t.contactNumber} *</label>
                  <input
                    type="text"
                    value={editingCustomer.phone}
                    onChange={e => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F9F7F2] border border-[#E5E5E5] rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* WhatsApp & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#706E6B] uppercase tracking-wider mb-1">{t.whatsappNumber}</label>
                  <input
                    type="text"
                    value={editingCustomer.whatsapp || ''}
                    onChange={e => setEditingCustomer({ ...editingCustomer, whatsapp: e.target.value })}
                    placeholder="0772559881..."
                    className="w-full px-3 py-2.5 bg-[#F9F7F2] border border-[#E5E5E5] rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#706E6B] uppercase tracking-wider mb-1">{t.shopAddress}</label>
                  <input
                    type="text"
                    value={editingCustomer.address || ''}
                    onChange={e => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                    placeholder="Kabul, Afghanistan..."
                    className="w-full px-3 py-2.5 bg-[#F9F7F2] border border-[#E5E5E5] rounded-xl text-xs focus:outline-hidden focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Standard Measurements Grid */}
              <div className="border-t border-[#E5E5E5] pt-3">
                <label className="block font-bold text-[#1A1A1A] mb-2">
                  {t.savedMeasurements} ({t.unitInches})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {measurementFields
                    .filter(field => {
                      const label = (language === 'ps' ? field.labelPs : language === 'fa' ? field.labelFa : field.labelEn) || field.labelEn;
                      return field.key && label && label.trim() !== '';
                    })
                    .map(field => {
                      const label = language === 'ps' ? field.labelPs : language === 'fa' ? field.labelFa : field.labelEn;
                      const val = editingCustomer.standardMeasurements?.[field.key] || '';

                    return (
                      <div key={field.id} className="p-2 bg-[#F9F7F2] rounded-lg border border-[#E5E5E5]">
                        <span className="text-[10px] font-bold text-[#706E6B] block">{label}</span>
                        <input
                          type="text"
                          value={val}
                          onChange={e => {
                            const newM = { ...(editingCustomer.standardMeasurements || {}), [field.key]: e.target.value };
                            setEditingCustomer({ ...editingCustomer, standardMeasurements: newM });
                          }}
                          placeholder="0.0"
                          className="w-full mt-1 px-1.5 py-1 bg-white border border-[#E5E5E5] rounded text-xs font-mono font-bold text-center focus:outline-hidden focus:border-[#D4AF37]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-[#706E6B] uppercase tracking-wider mb-1">{t.notes}</label>
                <textarea
                  rows={2}
                  value={editingCustomer.notes || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  placeholder="Special instructions or fitting preferences..."
                  className="w-full p-2.5 bg-[#F9F7F2] border border-[#E5E5E5] rounded-xl text-xs focus:outline-hidden focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-[#E5E5E5] pt-3">
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="px-4 py-2 bg-[#F9F7F2] hover:bg-stone-200 text-[#706E6B] text-xs font-bold rounded-xl border border-[#E5E5E5] cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveCustomer}
                className="px-5 py-2 bg-[#D4AF37] hover:bg-[#B39025] text-[#1A1A1A] text-xs font-black rounded-xl shadow-xs cursor-pointer"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
