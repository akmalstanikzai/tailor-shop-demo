import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Product, 
  ProductSale, 
  Customer, 
  ShopSettings, 
  Language, 
  ProductCategory 
} from '../types';
import { translations } from '../translations/i18n';
import { printReceiptElement, downloadReceiptPdf } from '../services/printService';
import { searchText, textIncludes } from '../lib/search';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  ShoppingBag, 
  DollarSign, 
  Calendar, 
  User, 
  Printer, 
  X, 
  Check, 
  CreditCard, 
  Package, 
  Footprints, 
  Watch, 
  Flame, 
  Layers, 
  Filter, 
  ArrowUpRight,
  FileText,
  Phone,
  AlertTriangle,
  Download
} from 'lucide-react';

interface SalesHistoryViewProps {
  sales: ProductSale[];
  products: Product[];
  categories?: ProductCategory[];
  customers?: Customer[];
  shopSettings?: ShopSettings;
  currencySymbol?: string;
  language: Language;
  onRecordSale: (sale: Omit<ProductSale, 'id' | 'createdAt'>) => Promise<ProductSale>;
  onNavigateToProducts?: () => void;
  initialProduct?: Product | null;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales = [],
  products = [],
  categories = [],
  customers = [],
  shopSettings,
  currencySymbol: propCurrencySymbol,
  language,
  onRecordSale,
  onNavigateToProducts,
  initialProduct,
}) => {
  const t = translations[language];

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | 'month'>('all');

  // New Sale Modal State
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [saleError, setSaleError] = useState<string | null>(null);

  // Receipt Modal State
  const [activeReceiptSale, setActiveReceiptSale] = useState<ProductSale | null>(null);
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  // Currency
  const currencySymbol = propCurrencySymbol || (
    language === 'ps' 
      ? (shopSettings?.currencyPs || 'افغانۍ') 
      : language === 'fa' 
      ? (shopSettings?.currencyFa || 'افغانی') 
      : (shopSettings?.currencySymbol || shopSettings?.currencyEn || 'AFN')
  );

  // Date Filtering Helper
  const isDateInFilter = (dateStr: string, filter: 'all' | 'today' | '7days' | 'month') => {
    if (filter === 'all') return true;
    const saleDate = new Date(dateStr);
    const now = new Date();

    if (filter === 'today') {
      return saleDate.toDateString() === now.toDateString();
    }
    if (filter === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return saleDate >= sevenDaysAgo;
    }
    if (filter === 'month') {
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || (
        textIncludes(s.productName, q) ||
        textIncludes(s.category, q) ||
        textIncludes(s.customerName, q) ||
        textIncludes(s.customerPhone, q) ||
        textIncludes(s.notes, q) ||
        textIncludes(s.id, q)
      );

      const matchesCat = categoryFilter === 'all' || searchText(s.category) === searchText(categoryFilter);
      const matchesDate = isDateInFilter(s.saleDate, dateFilter);

      return matchesSearch && matchesCat && matchesDate;
    });
  }, [sales, searchTerm, categoryFilter, dateFilter]);

  // Overall & Filtered Financial Analytics
  const analytics = useMemo(() => {
    const totalTransactions = filteredSales.length;
    const totalUnitsSold = filteredSales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalCost = filteredSales.reduce((sum, s) => sum + ((Number(s.purchasePrice) || 0) * (Number(s.quantity) || 0)), 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    return {
      totalTransactions,
      totalUnitsSold,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin
    };
  }, [filteredSales]);

  // Quick category icon helper
  const getCategoryIcon = (categoryName: string) => {
    const lower = (categoryName || '').toLowerCase();
    if (lower.includes('shoe') || lower.includes('بوت') || lower.includes('کفش') || lower.includes('پڼې')) {
      return <Footprints className="w-4 h-4" />;
    }
    if (lower.includes('watch') || lower.includes('ساعت')) {
      return <Watch className="w-4 h-4" />;
    }
    if (lower.includes('perfume') || lower.includes('عطر') || lower.includes('خوشبویی') || lower.includes('عطرونه')) {
      return <Flame className="w-4 h-4" />;
    }
    return <ShoppingBag className="w-4 h-4" />;
  };

  // Selected product object for new sale modal
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Filtered product options for search inside modal
  const productOptions = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => 
      textIncludes(p.name, q) ||
      textIncludes(p.sku, q) ||
      textIncludes(p.category, q)
    );
  }, [products, productSearchQuery]);

  // Open New Sale Modal
  const handleOpenNewSaleModal = (preselectedProd?: Product) => {
    setSaleError(null);
    if (preselectedProd) {
      setSelectedProductId(preselectedProd.id);
      setQuantity(1);
      const pr = Math.round(preselectedProd.purchasePrice * 1.3);
      setSellingPrice(pr);
      setPaidAmount(pr);
    } else {
      const firstAvailable = products.find(p => (Number(p.stockQuantity) || 0) > 0) || products[0];
      if (firstAvailable) {
        setSelectedProductId(firstAvailable.id);
        setQuantity(1);
        const pr = Math.round(firstAvailable.purchasePrice * 1.3);
        setSellingPrice(pr);
        setPaidAmount(pr);
      } else {
        setSelectedProductId('');
        setQuantity(1);
        setSellingPrice(0);
        setPaidAmount(0);
      }
    }
    setSelectedCustomerId('');
    setCustomCustomerName('');
    setCustomCustomerPhone('');
    setPaymentMethod('cash');
    setSaleNotes('');
    setIsNewSaleModalOpen(true);
  };

  useEffect(() => {
    if (initialProduct) handleOpenNewSaleModal(initialProduct);
  }, [initialProduct]);

  // When product changes in modal
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setQuantity(1);
      const pr = Math.round(prod.purchasePrice * 1.3);
      setSellingPrice(pr);
      setPaidAmount(pr);
    }
  };

  // Submit New Sale
  const handleSubmitNewSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError(null);

    if (!selectedProduct) {
      setSaleError(language === 'fa' ? 'لطفاً یک محصول را انتخاب کنید' : 'Please select a product');
      return;
    }

    const availableStock = Number(selectedProduct.stockQuantity) || 0;
    if (availableStock <= 0) {
      setSaleError(language === 'fa' ? 'موجودی این جنس به پایان رسیده است' : 'This product is out of stock');
      return;
    }

    const qty = Math.max(1, Number(quantity) || 1);
    if (qty > availableStock) {
      setSaleError(
        language === 'fa' 
          ? `تعداد درخواستی (${qty}) بیشتر از موجودی گدام (${availableStock}) است.`
          : `Requested quantity (${qty}) exceeds available stock (${availableStock}).`
      );
      return;
    }

    const unitSellPrice = Number(sellingPrice) || 0;
    if (unitSellPrice <= 0) {
      setSaleError(language === 'fa' ? 'لطفاً قیمت فروش را مشخص کنید' : 'Please enter a valid selling price');
      return;
    }

    const unitBuyPrice = Number(selectedProduct.purchasePrice) || 0;
    const totalAmount = qty * unitSellPrice;
    const finalPaid = paidAmount !== undefined ? Number(paidAmount) : totalAmount;
    const balanceAmount = Math.max(0, totalAmount - finalPaid);
    const paymentStatus = balanceAmount === 0 ? 'paid' : finalPaid > 0 ? 'partial' : 'unpaid';
    const profit = (unitSellPrice - unitBuyPrice) * qty;

    // Determine customer info
    let finalCustName = customCustomerName.trim();
    let finalCustPhone = customCustomerPhone.trim();
    let finalCustId: string | undefined = undefined;

    if (selectedCustomerId) {
      const custObj = customers.find(c => c.id === selectedCustomerId);
      if (custObj) {
        finalCustId = custObj.id;
        finalCustName = custObj.name;
        finalCustPhone = custObj.phone;
      }
    }

    if (!finalCustName || !finalCustPhone) {
      setSaleError(language === 'fa'
        ? 'لطفاً نام و شماره تماس مشتری را وارد کنید'
        : 'Customer name and phone number are required');
      return;
    }

    try {
      const createdSale = await onRecordSale({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        category: selectedProduct.category,
        purchasePrice: unitBuyPrice,
        sellingPrice: unitSellPrice,
        quantity: qty,
        totalAmount,
        paidAmount: finalPaid,
        balanceAmount,
        paymentStatus,
        profit,
        customerId: finalCustId,
        customerName: finalCustName || undefined,
        customerPhone: finalCustPhone || undefined,
        paymentMethod: paymentMethod || 'cash',
        saleDate: new Date().toISOString(),
        notes: saleNotes.trim() || undefined
      });

      setIsNewSaleModalOpen(false);
      // Auto open receipt for printing
      setActiveReceiptSale(createdSale);
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : 'Error recording sale');
    }
  };

  // Direct Print and PDF for Retail Slip
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [quickPrintSale, setQuickPrintSale] = useState<ProductSale | null>(null);
  const quickPrintRef = useRef<HTMLDivElement>(null);

  // Quick print handler directly from list without opening modal
  const handleQuickPrint = async (sale: ProductSale, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setQuickPrintSale(sale);
    
    // Give DOM a microtask to render the quickPrintRef content
    setTimeout(async () => {
      if (!quickPrintRef.current) return;
      const shopName = language === 'fa' 
        ? (shopSettings?.shopNameFa || 'Mujeeb Afghan') 
        : language === 'ps' 
        ? (shopSettings?.shopNamePs || 'Mujeeb Afghan') 
        : (shopSettings?.shopNameEn || 'MUJEEB AFGHAN FASHION HOUSE');
      
      await printReceiptElement(quickPrintRef.current, {
        title: `${shopName} - SL-${sale.id.slice(-6).toUpperCase()}`,
        pageFormat: shopSettings?.receiptFormat || 'thermal80',
        dir: language === 'en' ? 'ltr' : 'rtl',
        onStart: () => setIsPrintingReceipt(true),
        onComplete: () => {
          setIsPrintingReceipt(false);
          setQuickPrintSale(null);
        },
        onError: () => {
          setIsPrintingReceipt(false);
          setQuickPrintSale(null);
        }
      });
    }, 50);
  };

  const handlePrintReceipt = async () => {
    if (!receiptPrintRef.current || !activeReceiptSale) return;
    const shopName = language === 'fa' 
      ? (shopSettings?.shopNameFa || 'Mujeeb Afghan') 
      : language === 'ps' 
      ? (shopSettings?.shopNamePs || 'Mujeeb Afghan') 
      : (shopSettings?.shopNameEn || 'MUJEEB AFGHAN FASHION HOUSE');
    
    await printReceiptElement(receiptPrintRef.current, {
      title: `${shopName} - SL-${activeReceiptSale.id.slice(-6).toUpperCase()}`,
      pageFormat: shopSettings?.receiptFormat || 'thermal80',
      dir: language === 'en' ? 'ltr' : 'rtl',
      onStart: () => setIsPrintingReceipt(true),
      onComplete: () => setIsPrintingReceipt(false),
      onError: () => setIsPrintingReceipt(false)
    });
  };

  const handleDownloadReceiptPdf = async () => {
    if (!receiptPrintRef.current || !activeReceiptSale) return;
    const safeCustomerName = activeReceiptSale.customerName ? activeReceiptSale.customerName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_') : 'Customer';
    const filename = `Retail_Receipt_SL_${activeReceiptSale.id.slice(-6).toUpperCase()}_${safeCustomerName}`;
    await downloadReceiptPdf(receiptPrintRef.current, {
      filename,
      pageFormat: 'thermal80',
      onStart: () => setIsGeneratingPdf(true),
      onComplete: () => setIsGeneratingPdf(false),
      onError: (err) => {
        console.error('Retail PDF error:', err);
        setIsGeneratingPdf(false);
        handlePrintReceipt();
      }
    });
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span>{t.salesHistory || (language === 'fa' ? 'تاریخچه فروشات' : 'Sales History')}</span>
          </h1>
          <p className="text-xs text-stone-600 font-medium mt-1">
            {language === 'fa' 
              ? 'گزارش کامل فروشات محصولات (بوت، ساعت، عطر)، محاسبه مفاد خالص و ثبت فروش جدید'
              : language === 'ps'
              ? 'د هټۍ د پلورنو بشپړ راپور (بوټان، ساعتونه، عطرونه)، د خالصې ګټې حساب او نوی پلور ثبتول'
              : 'Complete sales log for retail products with cost-to-sale profit tracking and quick new sale generation'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onNavigateToProducts && (
            <button
              onClick={onNavigateToProducts}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition cursor-pointer border border-stone-200"
            >
              <ShoppingBag className="w-4 h-4 text-stone-600" />
              <span>{t.productsInventory || (language === 'fa' ? 'موجودی اجناس' : 'Products Inventory')}</span>
            </button>
          )}

          <button
            onClick={() => handleOpenNewSaleModal()}
            id="btn-make-new-sale"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t.newSale || (language === 'fa' ? 'ثبت فروش جدید' : 'Make a New Sale')}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Analytics Metrics Cards */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Sales Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              {t.totalSalesRevenue || (language === 'fa' ? 'مجموع عواید فروش' : 'Sales Revenue')}
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#1A1A1A] font-mono mt-1 block">
              {analytics.totalRevenue.toLocaleString()}{' '}
              <span className="text-xs font-normal text-stone-500">{currencySymbol}</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Net Profit */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              {t.totalSalesProfit || (language === 'fa' ? 'مجموع مفاد خالص' : 'Net Sales Profit')}
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1 block">
              +{analytics.totalProfit.toLocaleString()}{' '}
              <span className="text-xs font-normal text-emerald-700">{currencySymbol}</span>
            </span>
            <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
              {analytics.profitMargin}% {language === 'fa' ? 'حاشیه مفاد' : 'Profit Margin'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Units Sold */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              {language === 'fa' ? 'اجناس فروخته شده' : language === 'ps' ? 'پلورل شوي توکي' : 'Items Sold'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#1A1A1A] font-mono mt-1 block">
              {analytics.totalUnitsSold}{' '}
              <span className="text-xs font-normal text-stone-500">{t.units || 'units'}</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#B39025]">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              {language === 'fa' ? 'تعداد معاملات' : language === 'ps' ? 'د راکړو ورکړو شمیر' : 'Transactions'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#1A1A1A] font-mono mt-1 block">
              {analytics.totalTransactions}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filters, Search & Time Presets */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t.searchSalesPlaceholder || (language === 'fa' ? 'جستجوی فروش (نام جنس، کتگوری، مشتری یا کد)...' : 'Search sales by product, category, customer, or SKU...')}
              className="w-full ps-10 pe-9 py-2 bg-stone-50 border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Time Presets */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-bold shrink-0 overflow-x-auto">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                dateFilter === 'all' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {language === 'fa' ? 'همه اوقات' : 'All Time'}
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                dateFilter === 'today' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {language === 'fa' ? 'امروز' : 'Today'}
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                dateFilter === '7days' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {language === 'fa' ? '۷ روز اخیر' : 'Last 7 Days'}
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                dateFilter === 'month' ? 'bg-white text-[#1A1A1A] shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {language === 'fa' ? 'این ماه' : 'This Month'}
            </button>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-[#1A1A1A] text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.allCategories || 'All Categories'} ({sales.length})</span>
          </button>

          {categories.map(cat => {
            const count = sales.filter(s => searchText(s.category) === searchText(cat.name)).length;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  searchText(categoryFilter) === searchText(cat.name)
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {getCategoryIcon(cat.name)}
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Sales History Table */}
      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center shadow-xs">
          <TrendingUp className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-stone-800 text-sm">
            {t.noSalesRecorded || (language === 'fa' ? 'هیچ فروش ثبت نشده است' : 'No sales recorded yet')}
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            {language === 'fa' 
              ? 'هنوز معامله یا فروشی در این فیلتر ثبت نشده است. با دکمه بالا اولین فروش را ثبت نمایید.' 
              : 'No sales found matching your filter criteria. Click "Make a New Sale" to record a transaction.'}
          </p>
          <button
            onClick={() => handleOpenNewSaleModal()}
            className="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t.newSale || (language === 'fa' ? 'ثبت فروش جدید' : 'Make a New Sale')}</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xs overflow-hidden">
          {/* Header for large screens */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
            <div className="col-span-3">{language === 'fa' ? 'جنس و کتگوری' : 'Product & Category'}</div>
            <div className="col-span-2">{language === 'fa' ? 'تاریخ و زمان' : 'Date & Time'}</div>
            <div className="col-span-2">{t.customer || 'Customer'}</div>
            <div className="col-span-1 text-center">{t.quantity || 'Qty'}</div>
            <div className="col-span-2 text-start">{t.sellingPrice || 'Sell Price'} / {t.totalAmount || 'Total'}</div>
            <div className="col-span-2 text-end">{t.profit || 'Profit'} / {t.actions || 'Actions'}</div>
          </div>

          <div className="divide-y divide-stone-150">
            {filteredSales.map(sale => {
              const saleDateObj = new Date(sale.saleDate);
              const formattedDate = !isNaN(saleDateObj.getTime())
                ? saleDateObj.toLocaleDateString(language === 'fa' ? 'fa-AF' : language === 'ps' ? 'ps-AF' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : sale.saleDate;

              const formattedTime = !isNaN(saleDateObj.getTime())
                ? saleDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              const isProfitable = (Number(sale.profit) || 0) >= 0;

              return (
                <div
                  key={sale.id}
                  id={`sale-row-${sale.id}`}
                  className="p-4 lg:px-5 lg:py-3.5 hover:bg-stone-50/80 transition-colors flex flex-col lg:grid lg:grid-cols-12 gap-3 items-start lg:items-center"
                >
                  {/* 1. Product Info */}
                  <div className="w-full lg:col-span-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      {getCategoryIcon(sale.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700">
                          {sale.category}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-[#1A1A1A] leading-tight truncate">
                        {sale.productName}
                      </h4>
                      {sale.notes && (
                        <p className="text-[11px] text-stone-500 italic truncate max-w-[200px]" title={sale.notes}>
                          {sale.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 2. Date & Time */}
                  <div className="w-full lg:col-span-2 text-xs">
                    <span className="text-[10px] text-stone-400 block lg:hidden">{t.date || 'Date'}:</span>
                    <div className="font-medium text-stone-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>{formattedDate}</span>
                    </div>
                    {formattedTime && (
                      <span className="text-[10px] text-stone-500 font-mono block ms-5">
                        {formattedTime}
                      </span>
                    )}
                  </div>

                  {/* 3. Customer */}
                  <div className="w-full lg:col-span-2 text-xs">
                    <span className="text-[10px] text-stone-400 block lg:hidden">{t.customer || 'Customer'}:</span>
                    {sale.customerName ? (
                      <div>
                        <span className="font-bold text-[#1A1A1A] block">{sale.customerName}</span>
                        {sale.customerPhone && (
                          <span className="text-[11px] text-stone-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-stone-400" />
                            <span>{sale.customerPhone}</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-stone-400 italic text-[11px]">
                        {language === 'fa' ? 'مشتری ناشناس / نقدی' : 'Walk-in Cash Customer'}
                      </span>
                    )}
                  </div>

                  {/* 4. Quantity */}
                  <div className="w-full lg:col-span-1 text-xs lg:text-center">
                    <span className="text-[10px] text-stone-400 inline-block lg:hidden me-2">{t.quantity || 'Qty'}:</span>
                    <span className="font-mono font-black text-sm text-[#1A1A1A] bg-stone-100 px-2 py-0.5 rounded-md">
                      {sale.quantity}
                    </span>
                  </div>

                  {/* 5. Pricing & Total */}
                  <div className="w-full lg:col-span-2 text-xs">
                    <div className="flex items-center justify-between lg:block">
                      <span className="text-[10px] text-stone-400 block lg:hidden">{t.totalAmount || 'Total'}:</span>
                      <div>
                        <span className="font-mono font-black text-sm text-[#1A1A1A]">
                          {Number(sale.totalAmount).toLocaleString()} <span className="text-[10px] font-normal text-stone-500">{currencySymbol}</span>
                        </span>
                        <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                          @ {Number(sale.sellingPrice).toLocaleString()} {currencySymbol}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. Net Profit & Print Receipt Action */}
                  <div className="w-full lg:col-span-2 flex items-center justify-between lg:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                    <div className="text-start lg:text-end">
                      <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                        isProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isProfitable ? '+' : ''}{Number(sale.profit).toLocaleString()} {currencySymbol}
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {language === 'fa' ? 'مفاد خالص' : 'Net Profit'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleQuickPrint(sale, e)}
                        disabled={isPrintingReceipt && quickPrintSale?.id === sale.id}
                        title={language === 'fa' ? 'چاپ سریع رسید (مستقیم)' : language === 'ps' ? 'د بِل سملاسي چاپ' : 'Quick Print Receipt'}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-[#D4AF37] hover:bg-[#B39025] text-[#1A1A1A] text-[11px] font-black rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {isPrintingReceipt && quickPrintSale?.id === sale.id 
                            ? '...' 
                            : (language === 'fa' ? 'چاپ رسید' : language === 'ps' ? 'چاپ' : 'Print')}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveReceiptSale(sale)}
                        title={language === 'fa' ? 'مشاهده و چاپ کامل رسید' : 'View Receipt Modal'}
                        className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. MODAL: Make a New Sale */}
      {isNewSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-100 bg-emerald-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h2 className="font-black text-base text-[#1A1A1A]">
                    {t.newSale || (language === 'fa' ? 'ثبت فروش جدید' : 'Make a New Sale')}
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    {language === 'fa' 
                      ? 'انتخاب جنس، تعیین قیمت فروش برای این معامله و ثبت فروش' 
                      : 'Select product, set selling price for this deal, and log sale'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewSaleModalOpen(false)}
                className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitNewSale} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {saleError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{saleError}</span>
                </div>
              )}

              {/* Product Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t.selectProduct || (language === 'fa' ? 'انتخاب جنس از گدام' : 'Select Product from Inventory')} *
                </label>

                {/* Search / Filter product in dropdown */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={e => setProductSearchQuery(e.target.value)}
                    placeholder={language === 'fa' ? 'جستجوی نام جنس یا کد...' : 'Filter products list...'}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium focus:bg-white outline-hidden"
                  />

                  <select
                    value={selectedProductId}
                    onChange={e => handleSelectProduct(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-[#1A1A1A] outline-hidden cursor-pointer focus:bg-white focus:border-emerald-600"
                  >
                    <option value="" disabled>
                      {language === 'fa' ? '-- انتخاب محصول --' : '-- Choose a Product --'}
                    </option>
                    {productOptions.map(p => {
                      const stock = Number(p.stockQuantity) || 0;
                      return (
                        <option key={p.id} value={p.id} disabled={stock <= 0}>
                          {p.name} [{p.category}] - {language === 'fa' ? 'موجودی' : 'Stock'}: {stock} {t.units || 'units'} {stock <= 0 ? '❌ (تمام شده)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Selected Product Information Card */}
              {selectedProduct && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-stone-500 block">{t.purchasePrice || 'Purchase Cost'} (قیمت خرید):</span>
                    <span className="font-mono font-bold text-stone-900 text-sm">
                      {Number(selectedProduct.purchasePrice).toLocaleString()} {currencySymbol}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="text-stone-500 block">{t.inStock || 'Stock Available'}:</span>
                    <span className={`font-mono font-black text-sm ${
                      (Number(selectedProduct.stockQuantity) || 0) <= 2 ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                      {selectedProduct.stockQuantity} {t.units || 'units'}
                    </span>
                  </div>
                </div>
              )}

              {/* Quantity & Selling Price Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.quantityToSell || (language === 'fa' ? 'تعداد فروش' : 'Quantity')} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct ? selectedProduct.stockQuantity : 999}
                    required
                    value={quantity}
                    onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-[#1A1A1A] focus:bg-white focus:border-emerald-600 outline-hidden"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-xs font-extrabold text-emerald-800 mb-1">
                    💰 {t.sellingPrice || 'Selling Price'} ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={sellingPrice === 0 ? '' : sellingPrice}
                    onChange={e => {
                      const val = e.target.value;
                      setSellingPrice(val === '' ? 0 : parseFloat(val) || 0);
                    }}
                    placeholder="قیمت فروش دلخواه..."
                    className="w-full px-3.5 py-2.5 bg-emerald-50/40 border-2 border-emerald-500 rounded-xl text-sm font-mono font-black text-[#1A1A1A] focus:bg-white focus:border-emerald-600 outline-hidden"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    {language === 'fa' 
                      ? 'قیمت فروش توافقی و دلخواه شما برای این معامله' 
                      : language === 'ps' 
                      ? 'د دې معاملې لپاره ستاسو د خوښې د پلور بیه' 
                      : 'Enter your custom agreed selling price for this transaction'}
                  </span>
                </div>
              </div>

              {/* Live Profit Preview Box */}
              {selectedProduct && sellingPrice > 0 && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">{t.totalAmount || 'Total Amount'}:</span>
                    <span className="font-mono font-black text-sm text-[#1A1A1A]">
                      {((Number(quantity) || 1) * (Number(sellingPrice) || 0)).toLocaleString()} {currencySymbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60">
                    <span className="font-bold text-emerald-800">{t.profit || 'Net Profit'} (مفاد خالص):</span>
                    <span className={`font-mono font-black text-sm ${
                      (Number(sellingPrice) - selectedProduct.purchasePrice) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {(((Number(sellingPrice) || 0) - (Number(selectedProduct.purchasePrice) || 0)) * (Number(quantity) || 1)).toLocaleString()} {currencySymbol}
                    </span>
                  </div>
                </div>
              )}

              {/* Paid Amount & Remaining Balance Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    💵 {language === 'fa' ? 'مبلغ پرداخت شده (رسید)' : 'Paid Amount (نقدی/رسیده)'} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={paidAmount === 0 ? '' : paidAmount}
                    onChange={e => setPaidAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    placeholder="مبلغ پرداختی..."
                    className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-[#1A1A1A] outline-hidden focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ⏳ {language === 'fa' ? 'باقی‌مانده (قرض مشتری)' : 'Remaining Balance (باقی‌مانده)'}
                  </label>
                  <div className="px-3.5 py-2 bg-white border border-stone-200 rounded-lg text-xs font-mono font-bold text-rose-600 flex items-center justify-between">
                    <span>
                      {Math.max(0, ((Number(quantity) || 1) * (Number(sellingPrice) || 0)) - (Number(paidAmount) || 0)).toLocaleString()} {currencySymbol}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      ((Number(quantity) || 1) * (Number(sellingPrice) || 0)) - (Number(paidAmount) || 0) === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : Number(paidAmount) > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {((Number(quantity) || 1) * (Number(sellingPrice) || 0)) - (Number(paidAmount) || 0) === 0
                        ? (language === 'fa' ? 'تصفیه (Paid)' : 'Paid')
                        : Number(paidAmount) > 0
                        ? (language === 'fa' ? 'قسمی (Partial)' : 'Partial')
                        : (language === 'fa' ? 'قرض (Unpaid)' : 'Unpaid')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Selector / Creator */}
              <div className="space-y-2 pt-1 border-t border-stone-100">
                  <label className="block text-xs font-bold text-stone-700">
                  {t.customer || 'Customer'} *
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={e => {
                      setSelectedCustomerId(e.target.value);
                      if (e.target.value) {
                        setCustomCustomerName('');
                        setCustomCustomerPhone('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-[#1A1A1A] outline-hidden cursor-pointer"
                  >
                    <option value="">{language === 'fa' ? '-- مشتری ثبت شده --' : '-- Registered Customer --'}</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={customCustomerName}
                    disabled={!!selectedCustomerId}
                    onChange={e => setCustomCustomerName(e.target.value)}
                    placeholder={language === 'fa' ? 'یا نام مشتری جدید...' : 'Or enter new customer name...'}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white outline-hidden disabled:opacity-50"
                  />
                </div>

                {!selectedCustomerId && (
                  <input
                    type="text"
                    value={customCustomerPhone}
                    onChange={e => setCustomCustomerPhone(e.target.value)}
                    required
                    placeholder={language === 'fa' ? 'شماره تماس مشتری...' : 'Customer phone...'}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white outline-hidden"
                  />
                )}
              </div>

              {/* Payment Method & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.paymentMethod || 'Payment Method'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-[#1A1A1A] outline-hidden cursor-pointer"
                  >
                    <option value="cash">{t.cashPayment || 'Cash (نقدی)'}</option>
                    <option value="card">{t.bankTransfer || 'Card / Bank (حساب بانکی)'}</option>
                    <option value="credit">{t.creditPayment || 'Credit / Hawala (حواله / نسیه)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.notes || 'Notes'}
                  </label>
                  <input
                    type="text"
                    value={saleNotes}
                    onChange={e => setSaleNotes(e.target.value)}
                    placeholder="e.g. رنگ، سایز، یا تخفیف ویژه..."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsNewSaleModalOpen(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{t.confirmSale || (language === 'fa' ? 'تایید و ثبت فروش' : 'Confirm Sale')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Printable Receipt Slip for Sale */}
      {activeReceiptSale && (
        <div id="retail-receipt-modal" className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="retail-receipt-container bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50 no-print">
              <h3 className="font-extrabold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#B39025]" />
                <span>{t.receipt || (language === 'fa' ? 'بل فروش جنس' : 'Sales Receipt')}</span>
              </h3>
              <button
                onClick={() => setActiveReceiptSale(null)}
                className="p-1 text-stone-500 hover:text-stone-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Paper */}
            <div 
              id="printable-retail-slip" 
              ref={receiptPrintRef} 
              dir={language === 'en' ? 'ltr' : 'rtl'}
              className="p-3 bg-white font-mono text-xs text-stone-950 border-2 border-stone-950"
              style={{ width: '340px', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }}
            >
              {/* Top Header */}
              <div className="text-center pb-2 border-b-2 border-stone-950">
                {shopSettings?.receiptShowLogo !== false && (
                  <img
                    src="/receipt-logo.svg"
                    alt="Shop Logo"
                    className="mx-auto h-12 w-12 object-contain mb-1"
                  />
                )}
                <h2 className="font-black text-sm text-stone-950 font-serif leading-tight">
                  {language === 'fa' 
                    ? (shopSettings?.shopNameFa || 'مجیب افغان خیاطي او رخت پلورنځی')
                    : language === 'ps' 
                    ? (shopSettings?.shopNamePs || 'مجیب افغان خیاطي او رخت پلورنځی')
                    : (shopSettings?.shopNameEn || 'MUJEEB AFGHAN FASHION HOUSE')}
                </h2>
                <p className="text-[10px] text-stone-600 mt-0.5">
                  {language === 'fa' 
                    ? (shopSettings?.addressFa || '') 
                    : language === 'ps' 
                    ? (shopSettings?.addressPs || '') 
                    : (shopSettings?.addressEn || '')}
                </p>
                <div className="flex justify-center gap-2 text-[10px] text-stone-700 font-mono mt-0.5 font-bold">
                  <span>📞 {shopSettings?.phone1 || '0782220194'}</span>
                  {shopSettings?.whatsapp && <span>💬 {shopSettings?.whatsapp}</span>}
                </div>
                <div className="text-[10px] uppercase bg-stone-100 border border-stone-950 py-0.5 mt-1.5 font-black tracking-widest text-stone-900">
                  {language === 'fa' ? 'رسید فروش پرچون' : language === 'ps' ? 'د پرچون پلور بِل' : 'RETAIL SALES RECEIPT'}
                </div>
              </div>

              {/* Order Info Table */}
              <div className="border-2 border-stone-950 my-1.5 bg-white text-xs">
                <div className="flex border-b border-stone-950">
                  <div className="w-1/2 p-1.5 border-r border-stone-950 flex items-center justify-between">
                    <span className="text-stone-600 text-[10px]">{language === 'fa' ? 'شماره بِل:' : 'Receipt #:'}</span>
                    <span className="font-black font-mono text-stone-950 text-xs">SL-{activeReceiptSale.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <div className="w-1/2 p-1.5 flex items-center justify-between">
                    <span className="text-stone-600 text-[10px]">{language === 'fa' ? 'تاریخ:' : 'Date:'}</span>
                    <span className="font-mono text-stone-950 text-[10px]">{new Date(activeReceiptSale.saleDate).toLocaleDateString()}</span>
                  </div>
                </div>
                {activeReceiptSale.customerName && (
                  <div className="p-1.5 flex items-center justify-between bg-stone-50">
                    <span className="text-stone-600 text-[10px]">{language === 'fa' ? 'مشتری:' : 'Customer:'}</span>
                    <span className="font-black text-stone-950 text-xs">{activeReceiptSale.customerName}</span>
                  </div>
                )}
              </div>

              {/* Items Table with Complete 4-Sided Borders */}
              <div className="border-2 border-stone-950 my-1.5 bg-white">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-100 border-b-2 border-stone-950 text-[10px] font-black text-stone-950">
                      <th className="p-1.5 text-start border-r border-stone-950 w-6/12">{language === 'fa' ? 'شرح جنس' : 'Item'}</th>
                      <th className="p-1.5 text-center border-r border-stone-950 w-2/12">{language === 'fa' ? 'تعداد' : 'Qty'}</th>
                      <th className="p-1.5 text-end w-4/12">{language === 'fa' ? 'مجموع' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-stone-950">
                      <td className="p-1.5 text-start font-bold text-stone-950 border-r border-stone-950 align-top">
                        <div className="leading-tight">{activeReceiptSale.productName}</div>
                        <div className="text-[9px] text-stone-500 font-normal mt-0.5 font-mono">
                          @{Number(activeReceiptSale.sellingPrice).toLocaleString()} {currencySymbol}
                        </div>
                      </td>
                      <td className="p-1.5 text-center font-mono font-black text-stone-950 border-r border-stone-950 align-top">
                        {activeReceiptSale.quantity}
                      </td>
                      <td className="p-1.5 text-end font-mono font-black text-stone-950 align-top text-xs whitespace-nowrap">
                        {Number(activeReceiptSale.totalAmount).toLocaleString()} {currencySymbol}
                      </td>
                    </tr>
                    {activeReceiptSale.notes && (
                      <tr>
                        <td colSpan={3} className="p-1.5 bg-stone-50 text-[10px] text-stone-800 italic">
                          <span className="font-bold text-stone-900 not-italic">Note:</span> {activeReceiptSale.notes}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Summary Table */}
              <div className="border-2 border-stone-950 my-1.5 bg-white">
                <div className="flex bg-stone-50">
                  <div className="w-1/2 p-1.5 border-r border-stone-950 flex items-center justify-between">
                    <span className="text-[10px] text-stone-600 font-bold uppercase">{language === 'fa' ? 'روش پرداخت:' : 'Payment:'}</span>
                    <span className="font-black text-stone-950 text-xs uppercase">{activeReceiptSale.paymentMethod || 'CASH'}</span>
                  </div>
                  <div className="w-1/2 p-1.5 flex items-center justify-between bg-stone-100">
                    <span className="text-[10px] text-stone-950 font-black uppercase">{language === 'fa' ? 'مجموع کل:' : 'TOTAL:'}</span>
                    <span className="font-mono font-black text-sm text-stone-950 whitespace-nowrap">{Number(activeReceiptSale.totalAmount).toLocaleString()} {currencySymbol}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[10px] text-stone-600 pt-2 border-t border-dashed border-stone-400">
                <p>{shopSettings?.receiptFooterFa || 'تشکر از انتخاب و خرید شما! اجناس تا ۳ روز قابل تعویض می‌باشد.'}</p>
                <a href="https://rayan-tech-solution.tech" target="_blank" rel="noreferrer" className="mt-1 inline-block text-[8px] text-stone-400 underline">
                  Developed by: Rayan Tech solution
                </a>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-stone-50 flex items-center justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => setActiveReceiptSale(null)}
                className="px-3.5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {t.close || 'Close'}
              </button>
              <button
                type="button"
                onClick={handleDownloadReceiptPdf}
                disabled={isGeneratingPdf}
                className="px-3.5 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingPdf ? '...' : 'PDF'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrintReceipt}
                disabled={isPrintingReceipt}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>{isPrintingReceipt ? t.loading : (t.print || 'Print Receipt')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Hidden Quick Print Container (For 1-click Direct Print from List) */}
      {quickPrintSale && (
        <div style={{ position: 'fixed', left: '-9999px', top: '0', opacity: 0, pointerEvents: 'none' }}>
          <div
            ref={quickPrintRef}
            id="printable-quick-retail-slip"
            dir={language === 'en' ? 'ltr' : 'rtl'}
            className="p-3 bg-white font-mono text-xs text-stone-950 border-2 border-stone-950"
            style={{ width: '340px', maxWidth: '100%', boxSizing: 'border-box' }}
          >
            <div className="text-center pb-2 border-b-2 border-stone-950">
              {shopSettings?.receiptShowLogo !== false && (
                <img
                  src="/receipt-logo.svg"
                  alt="Shop Logo"
                  className="mx-auto h-12 w-12 object-contain mb-1"
                />
              )}
              <h2 className="font-black text-sm text-stone-950 font-serif leading-tight">
                {language === 'fa' 
                  ? (shopSettings?.shopNameFa || 'مجیب افغان خیاطي او رخت پلورنځی')
                  : language === 'ps' 
                  ? (shopSettings?.shopNamePs || 'مجیب افغان خیاطي او رخت پلورنځی')
                  : (shopSettings?.shopNameEn || 'MUJEEB AFGHAN FASHION HOUSE')}
              </h2>
              <p className="text-[10px] text-stone-600 mt-0.5">
                {language === 'fa' 
                  ? (shopSettings?.addressFa || '') 
                  : language === 'ps' 
                  ? (shopSettings?.addressPs || '') 
                  : (shopSettings?.addressEn || '')}
              </p>
              <div className="flex justify-center gap-2 text-[10px] text-stone-700 font-mono mt-0.5 font-bold">
                <span>📞 {shopSettings?.phone1 || '0782220194'}</span>
                {shopSettings?.whatsapp && <span>💬 {shopSettings?.whatsapp}</span>}
              </div>
              <div className="text-[10px] uppercase bg-stone-100 border border-stone-950 py-0.5 mt-1.5 font-black tracking-widest text-stone-900">
                {language === 'fa' ? 'رسید فروش پرچون' : language === 'ps' ? 'د پرچون پلور بِل' : 'RETAIL SALES RECEIPT'}
              </div>
            </div>

            {/* Order Info Table */}
            <div className="border-2 border-stone-950 my-1.5 bg-white text-xs">
              <div className="flex border-b border-stone-950">
                <div className="w-1/2 p-1.5 border-r border-stone-950 flex items-center justify-between">
                  <span className="text-stone-600 text-[10px]">{language === 'fa' ? 'شماره بِل:' : 'Receipt #:'}</span>
                  <span className="font-black font-mono text-stone-950 text-xs">SL-{quickPrintSale.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="w-1/2 p-1.5 flex items-center justify-between">
                  <span className="text-stone-600 text-[10px]">{language === 'fa' ? 'تاریخ:' : 'Date:'}</span>
                  <span className="font-mono text-stone-950 text-[10px]">{new Date(quickPrintSale.saleDate).toLocaleDateString()}</span>
                </div>
              </div>
              {quickPrintSale.customerName && (
                <div className="p-1.5 flex items-center justify-between bg-stone-50">
                  <span className="text-stone-600 text-[10px]">{language === 'fa' ? 'مشتری:' : 'Customer:'}</span>
                  <span className="font-black text-stone-950 text-xs">{quickPrintSale.customerName}</span>
                </div>
              )}
            </div>

            {/* Items Table with Complete 4-Sided Borders */}
            <div className="border-2 border-stone-950 my-1.5 bg-white">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 border-b-2 border-stone-950 text-[10px] font-black text-stone-950">
                    <th className="p-1.5 text-start border-r border-stone-950 w-6/12">{language === 'fa' ? 'شرح جنس' : 'Item'}</th>
                    <th className="p-1.5 text-center border-r border-stone-950 w-2/12">{language === 'fa' ? 'تعداد' : 'Qty'}</th>
                    <th className="p-1.5 text-end w-4/12">{language === 'fa' ? 'مجموع' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-stone-950">
                    <td className="p-1.5 text-start font-bold text-stone-950 border-r border-stone-950 align-top">
                      <div className="leading-tight">{quickPrintSale.productName}</div>
                      <div className="text-[9px] text-stone-500 font-normal mt-0.5 font-mono">
                        @{Number(quickPrintSale.sellingPrice).toLocaleString()} {currencySymbol}
                      </div>
                    </td>
                    <td className="p-1.5 text-center font-mono font-black text-stone-950 border-r border-stone-950 align-top">
                      {quickPrintSale.quantity}
                    </td>
                    <td className="p-1.5 text-end font-mono font-black text-stone-950 align-top text-xs whitespace-nowrap">
                      {Number(quickPrintSale.totalAmount).toLocaleString()} {currencySymbol}
                    </td>
                  </tr>
                  {quickPrintSale.notes && (
                    <tr>
                      <td colSpan={3} className="p-1.5 bg-stone-50 text-[10px] text-stone-800 italic">
                        <span className="font-bold text-stone-900 not-italic">Note:</span> {quickPrintSale.notes}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Summary Table */}
            <div className="border-2 border-stone-950 my-1.5 bg-white">
              <div className="flex bg-stone-50">
                <div className="w-1/2 p-1.5 border-r border-stone-950 flex items-center justify-between">
                  <span className="text-[10px] text-stone-600 font-bold uppercase">{language === 'fa' ? 'روش پرداخت:' : 'Payment:'}</span>
                  <span className="font-black text-stone-950 text-xs uppercase">{quickPrintSale.paymentMethod || 'CASH'}</span>
                </div>
                <div className="w-1/2 p-1.5 flex items-center justify-between bg-stone-100">
                  <span className="text-[10px] text-stone-950 font-black uppercase">{language === 'fa' ? 'مجموع کل:' : 'TOTAL:'}</span>
                  <span className="font-mono font-black text-sm text-stone-950 whitespace-nowrap">{Number(quickPrintSale.totalAmount).toLocaleString()} {currencySymbol}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-stone-600 pt-2 border-t border-dashed border-stone-400">
              <p>{shopSettings?.receiptFooterFa || 'تشکر از انتخاب و خرید شما! اجناس تا ۳ روز قابل تعویض می‌باشد.'}</p>
              <a href="https://rayan-tech-solution.tech" target="_blank" rel="noreferrer" className="mt-1 inline-block text-[8px] text-stone-400 underline">
                Developed by: Rayan Tech solution
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
