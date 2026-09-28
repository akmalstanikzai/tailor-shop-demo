import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  Order, 
  OrderStatus, 
  ShopSettings, 
  Language, 
  ProductSale
} from '../types';
import { translations } from '../translations/i18n';
import { storageService } from '../services/storage';
import { textIncludes } from '../lib/search';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { 
  Search, 
  Plus, 
  Printer, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  DollarSign, 
  Layers, 
  CheckCircle2, 
  Scissors, 
  ChevronDown, 
  CreditCard, 
  X, 
  MessageCircle, 
  PackageCheck, 
  TrendingUp, 
  BarChart3, 
  ShoppingBag, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink,
  Sparkles,
  Tag,
  Download,
  Database,
  RefreshCw
} from 'lucide-react';
import { printReceiptElement, downloadReceiptPdf } from '../services/printService';

export type SortOption = 'newest' | 'oldest' | 'delivery_asc' | 'delivery_desc';
export type DashboardViewStream = 'orders' | 'retail' | 'all';

interface DashboardProps {
  orders: Order[];
  productSales?: ProductSale[];
  globalSearchTerm?: string;
  shopSettings: ShopSettings;
  language: Language;
  onNewOrder: () => void;
  onEditOrder: (order: Order) => void;
  onViewReceipt: (order: Order) => void;
  onSelectCustomer: (customerId: string) => void;
  onOrderUpdated: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  productSales = [],
  globalSearchTerm = '',
  shopSettings,
  language,
  onNewOrder,
  onEditOrder,
  onViewReceipt,
  onSelectCustomer,
  onOrderUpdated,
}) => {
  const t = translations[language];

  // Active Stream Tab: 'orders' | 'retail' | 'all'
  const [activeStream, setActiveStream] = useState<DashboardViewStream>('orders');

  // Search, Filters & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [visibleOrderCount, setVisibleOrderCount] = useState(20);
  const [visibleSaleCount, setVisibleSaleCount] = useState(20);

  // Quick Payment Modal State
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [newPaidInput, setNewPaidInput] = useState<number>(0);

  // Retail Receipt Print State in Dashboard
  const [activeRetailReceipt, setActiveRetailReceipt] = useState<ProductSale | null>(null);
  const retailReceiptPrintRef = useRef<HTMLDivElement>(null);

  // Global search sync
  useEffect(() => {
    setSearchTerm(globalSearchTerm);
  }, [globalSearchTerm]);

  // Currency Symbol
  const currencySymbol = language === 'ps' 
    ? (shopSettings?.currencyPs || 'افغانۍ') 
    : language === 'fa' 
    ? (shopSettings?.currencyFa || 'افغانی') 
    : (shopSettings?.currencySymbol || shopSettings?.currencyEn || 'AFN');

  // Filtered & Sorted Tailoring Orders
  const filteredOrders = useMemo(() => {
    const list = orders.filter(order => {
      const q = searchTerm.trim().toLowerCase();
      
      const matchesSearch = !q || (
        textIncludes(order.orderNumber, q) ||
        textIncludes(order.customerName, q) ||
        textIncludes(order.customerPhone, q) ||
        textIncludes(order.customerWhatsApp, q) ||
        textIncludes(order.orderDate, q) ||
        textIncludes(order.deliveryDate, q) ||
        textIncludes(order.fabricName, q) ||
        textIncludes(order.garmentType, q)
      );

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPayment = 
        paymentFilter === 'all' ||
        (paymentFilter === 'paid' && order.balanceAmount === 0) ||
        (paymentFilter === 'balance' && order.balanceAmount > 0);

      return matchesSearch && matchesStatus && matchesPayment;
    });

    return list.sort((a, b) => {
      if (sortBy === 'newest') {
        const dateA = new Date(a.orderDate || a.createdAt || '').getTime() || 0;
        const dateB = new Date(b.orderDate || b.createdAt || '').getTime() || 0;
        return dateB - dateA;
      }
      if (sortBy === 'oldest') {
        const dateA = new Date(a.orderDate || a.createdAt || '').getTime() || 0;
        const dateB = new Date(b.orderDate || b.createdAt || '').getTime() || 0;
        return dateA - dateB;
      }
      if (sortBy === 'delivery_asc') {
        const dateA = new Date(a.deliveryDate || '9999-12-31').getTime() || 0;
        const dateB = new Date(b.deliveryDate || '9999-12-31').getTime() || 0;
        return dateA - dateB;
      }
      if (sortBy === 'delivery_desc') {
        const dateA = new Date(a.deliveryDate || '0000-01-01').getTime() || 0;
        const dateB = new Date(b.deliveryDate || '0000-01-01').getTime() || 0;
        return dateB - dateA;
      }
      return 0;
    });
  }, [orders, searchTerm, statusFilter, paymentFilter, sortBy]);

  // Filtered & Sorted Retail Sales
  const filteredSales = useMemo(() => {
    const list = (productSales || []).filter(sale => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        textIncludes(sale.productName, q) ||
        textIncludes(sale.customerName, q) ||
        textIncludes(sale.customerPhone, q) ||
        textIncludes(sale.category, q) ||
        textIncludes(sale.brand, q) ||
        textIncludes(sale.saleDate, q) ||
        textIncludes(`sl-${sale.id ?? ''}`.slice(-6), q)
      );
    });

    return list.sort((a, b) => {
      const dateA = new Date(a.saleDate || a.createdAt || '').getTime() || 0;
      const dateB = new Date(b.saleDate || b.createdAt || '').getTime() || 0;
      return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  }, [productSales, searchTerm, sortBy]);

  const visibleOrders = filteredOrders.slice(0, visibleOrderCount);
  const visibleSales = filteredSales.slice(0, visibleSaleCount);

  useEffect(() => {
    setVisibleOrderCount(20);
    setVisibleSaleCount(20);
  }, [searchTerm, statusFilter, paymentFilter, sortBy, activeStream]);

  // Comprehensive Metrics (Tailor + Retail)
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    const ready = orders.filter(o => o.status === 'ready').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const totalBalance = orders.reduce((sum, o) => sum + (Number(o.balanceAmount) || 0), 0);
    const orderRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const orderPaid = orders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);

    const totalSales = (productSales || []).length;
    const retailRevenue = (productSales || []).reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const retailProfit = (productSales || []).reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const retailCollected = retailRevenue;

    const totalShopCollected = orderPaid + retailCollected;
    const totalShopRevenue = orderRevenue + retailRevenue;

    return { 
      total: totalOrders, 
      pending, 
      inProgress, 
      ready, 
      delivered, 
      totalBalance, 
      orderRevenue,
      orderPaid,
      totalSales,
      retailRevenue,
      retailProfit,
      totalShopCollected,
      totalShopRevenue
    };
  }, [orders, productSales]);

  // Daily & Monthly Summary
  const summary = useMemo(() => {
    const today = new Date();
    const todayDateKey = today.toISOString().slice(0, 10);
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // 1. Today's Tailoring Orders
    const todayOrders = orders.filter(order => {
      const dStr = order.orderDate || order.createdAt || '';
      return dStr.startsWith(todayDateKey);
    });
    const todayOrdersCount = todayOrders.length;
    const todayOrdersTotalAmount = todayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    // 2. Today's Retail Sales
    const todaySales = (productSales || []).filter(sale => {
      const sStr = sale.saleDate || sale.createdAt || '';
      return sStr.startsWith(todayDateKey);
    });
    const todaySalesCount = todaySales.length;
    const todaySalesRevenue = todaySales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const todaySalesProfit = todaySales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);

    // 3. Pending Deliveries
    const pendingDeliveriesCount = orders.filter(order => order.status !== 'delivered').length;
    const readyForPickupCount = orders.filter(order => order.status === 'ready').length;
    const inTailoringCount = orders.filter(order => order.status === 'in_progress' || order.status === 'pending').length;

    // 4. Monthly Revenues
    const orderMonthlyRevenue = orders
      .filter(order => (order.orderDate || order.createdAt || '').startsWith(monthKey))
      .reduce((total, order) => total + (Number(order.paidAmount) || 0), 0);
    const productMonthlyRevenue = (productSales || [])
      .filter(sale => (sale.saleDate || sale.createdAt || '').startsWith(monthKey))
      .reduce((total, sale) => total + (Number(sale.totalAmount) || 0), 0);
    const totalMonthlyRevenue = orderMonthlyRevenue + productMonthlyRevenue;

    return {
      todayOrdersCount,
      todayOrdersTotalAmount,
      todaySalesCount,
      todaySalesRevenue,
      todaySalesProfit,
      pendingDeliveriesCount,
      readyForPickupCount,
      inTailoringCount,
      totalMonthlyRevenue,
      orderMonthlyRevenue,
      productMonthlyRevenue,
    };
  }, [orders, productSales]);

  // 7-Day Revenue Visualization Data
  const last7DaysRevenueData = useMemo(() => {
    const days: Array<{
      dateKey: string;
      displayLabel: string;
      orderRevenue: number;
      productRevenue: number;
      totalRevenue: number;
    }> = [];

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];

      const dayName = d.toLocaleDateString(language === 'fa' || language === 'ps' ? 'fa-AF' : 'en-US', { weekday: 'short' });
      const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;
      const displayLabel = `${dayName} ${monthDay}`;

      const dayOrders = orders.filter(o => {
        const dStr = o.orderDate || o.createdAt;
        return dStr && dStr.startsWith(dateKey);
      });
      const orderRevenue = dayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

      const daySales = (productSales || []).filter(s => {
        const sStr = s.saleDate || s.createdAt;
        return sStr && sStr.startsWith(dateKey);
      });
      const productRevenue = daySales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

      days.push({
        dateKey,
        displayLabel,
        orderRevenue,
        productRevenue,
        totalRevenue: orderRevenue + productRevenue
      });
    }

    const total7DayRevenue = days.reduce((sum, d) => sum + d.totalRevenue, 0);
    const total7DayOrdersRevenue = days.reduce((sum, d) => sum + d.orderRevenue, 0);
    const total7DayProductsRevenue = days.reduce((sum, d) => sum + d.productRevenue, 0);

    return {
      days,
      total7DayRevenue,
      total7DayOrdersRevenue,
      total7DayProductsRevenue
    };
  }, [orders, productSales, language]);

  // Status Updater
  const handleUpdateStatus = async (order: Order, newStatus: OrderStatus) => {
    const updated: Order = {
      ...order,
      status: newStatus,
      completedDate: newStatus === 'ready' ? new Date().toISOString() : order.completedDate,
      deliveredDate: newStatus === 'delivered' ? new Date().toISOString() : order.deliveredDate,
    };
    await storageService.saveOrderAsync(updated);
    onOrderUpdated();
  };

  // Payment update
  const handleSavePaymentUpdate = async () => {
    if (!paymentModalOrder) return;
    const paid = Number(newPaidInput) || 0;
    const total = Number(paymentModalOrder.totalAmount) || 0;
    const balance = Math.max(0, total - paid);

    const updated: Order = {
      ...paymentModalOrder,
      paidAmount: paid,
      balanceAmount: balance,
      paymentStatus: balance === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
    };

    await storageService.saveOrderAsync(updated);
    setPaymentModalOrder(null);
    onOrderUpdated();
  };

  const openPaymentModal = (order: Order) => {
    setPaymentModalOrder(order);
    setNewPaidInput(order.paidAmount);
  };

  const handleDeleteOrder = async (order: Order) => {
    if (window.confirm(`${t.confirmDelete} (${t.orderNumber}: ${order.orderNumber})`)) {
      storageService.deleteOrder(order.id);
      onOrderUpdated();
    }
  };

  const handleDeleteSale = (sale: ProductSale) => {
    if (window.confirm(`${t.confirmDelete} (${sale.productName})`)) {
      storageService.deleteProductSale(sale.id);
      onOrderUpdated();
    }
  };

  // Direct Print and PDF for Retail Slip
  const [isPrintingRetail, setIsPrintingRetail] = useState(false);
  const [isGeneratingRetailPdf, setIsGeneratingRetailPdf] = useState(false);

  const handlePrintRetailReceipt = async () => {
    if (!retailReceiptPrintRef.current || !activeRetailReceipt) return;
    const shopName = language === 'fa' 
      ? (shopSettings?.shopNameFa || 'Mujeeb Afghan') 
      : language === 'ps' 
      ? (shopSettings?.shopNamePs || 'Mujeeb Afghan') 
      : (shopSettings?.shopNameEn || 'MUJEEB AFGHAN FASHION HOUSE');
    
    await printReceiptElement(retailReceiptPrintRef.current, {
      title: `${shopName} - SL-${activeRetailReceipt.id.slice(-6).toUpperCase()}`,
      pageFormat: 'thermal80',
      dir: language === 'en' ? 'ltr' : 'rtl',
      onStart: () => setIsPrintingRetail(true),
      onComplete: () => setIsPrintingRetail(false),
      onError: () => setIsPrintingRetail(false)
    });
  };

  const handleDownloadRetailPdf = async () => {
    if (!retailReceiptPrintRef.current || !activeRetailReceipt) return;
    const safeCustomerName = activeRetailReceipt.customerName ? activeRetailReceipt.customerName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_') : 'Customer';
    const filename = `Retail_Receipt_SL_${activeRetailReceipt.id.slice(-6).toUpperCase()}_${safeCustomerName}`;
    await downloadReceiptPdf(retailReceiptPrintRef.current, {
      filename,
      pageFormat: 'thermal80',
      onStart: () => setIsGeneratingRetailPdf(true),
      onComplete: () => setIsGeneratingRetailPdf(false),
      onError: (err) => {
        console.error('Retail PDF error:', err);
        setIsGeneratingRetailPdf(false);
        handlePrintRetailReceipt();
      }
    });
  };

  // Status badge config
  const getStatusBadgeConfig = (status: OrderStatus) => {
    switch (status) {
      case 'in_progress':
        return {
          label: t.statusInProgress,
          badgeClass: 'bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-500/20 hover:bg-blue-100',
          dotClass: 'bg-blue-600',
          pulse: true,
          icon: Scissors,
          iconClass: 'text-blue-700',
        };
      case 'ready':
        return {
          label: t.statusReady,
          badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-100',
          dotClass: 'bg-emerald-600',
          pulse: false,
          icon: CheckCircle2,
          iconClass: 'text-emerald-700',
        };
      case 'delivered':
        return {
          label: t.statusDelivered,
          badgeClass: 'bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-500/20 hover:bg-purple-100',
          dotClass: 'bg-purple-600',
          pulse: false,
          icon: PackageCheck,
          iconClass: 'text-purple-700',
        };
      case 'pending':
      default:
        return {
          label: t.statusPending,
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-500/20 hover:bg-amber-100',
          dotClass: 'bg-amber-500',
          pulse: true,
          icon: Clock,
          iconClass: 'text-amber-700',
        };
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-16 animate-in fade-in duration-200 min-w-0">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E5E5] shadow-xs">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-7 bg-[#D4AF37] rounded-full inline-block shrink-0" />
          <div>
            <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">
              {t.dashboard}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {orders.length} {t.totalOrders} • {(productSales || []).length} {t.totalRetailSales} • {language === 'fa' ? 'مدیریت و تفکیک سفارشات خیاطی و فروشات پرچون' : language === 'ps' ? 'د خیاطۍ او پرچون پلور مدیریت' : 'Orders & Retail records management'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onNewOrder}
            id="dashboard-new-order-btn"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#C29E2E] active:scale-98 text-[#1A1A1A] font-black rounded-xl text-sm transition cursor-pointer shadow-xs"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>{t.newOrder}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards: Tailor + Retail Revenue & Records */}
      <div className="grid grid-cols-1 min-[430px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="dashboard-summary-cards">
        {/* Card 1: Today's Total Activity (Orders + Retail) */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-xs hover:border-[#D4AF37] transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                {t.todaysOrders} & {language === 'fa' ? 'پرچون' : 'Retail'}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-[#1A1A1A] font-mono">
                  {summary.todayOrdersCount + summary.todaySalesCount}
                </span>
                <span className="text-xs text-stone-500 font-bold">
                  {summary.todayOrdersCount} ✂️ + {summary.todaySalesCount} 🛍️
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#B39025] flex items-center justify-center shrink-0 border border-amber-200/60 group-hover:scale-105 transition">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span className="text-[11px] font-medium text-stone-500">
              {language === 'fa' ? 'عواید امروز:' : "Today's Total:"}
            </span>
            <span className="font-mono font-bold text-[#1A1A1A]">
              {(summary.todayOrdersTotalAmount + summary.todaySalesRevenue).toLocaleString()} {currencySymbol}
            </span>
          </div>
        </div>

        {/* Card 2: Pending Deliveries */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-xs hover:border-blue-300 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                {t.pendingDeliveries}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-blue-700 font-mono">
                  {summary.pendingDeliveriesCount}
                </span>
                <span className="text-xs text-stone-500 font-bold">
                  {language === 'fa' ? 'در نوبت تحویل' : 'awaiting delivery'}
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60 group-hover:scale-105 transition">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {summary.readyForPickupCount} {t.statusReady}
            </span>
            <span className="text-blue-700 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {summary.inTailoringCount} {t.statusInProgress}
            </span>
          </div>
        </div>

        {/* Card 3: Total Monthly Revenue */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                {t.totalMonthlyRevenue}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
                  {summary.totalMonthlyRevenue.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-800 font-sans">{currencySymbol}</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60 group-hover:scale-105 transition">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="text-[11px]">
              ✂️ {summary.orderMonthlyRevenue.toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-emerald-800">
              🛍️ +{summary.productMonthlyRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 4: Retail Boutique Sales & Profit */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-xs hover:border-amber-300 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-stone-500 font-bold block">
                {t.retailRevenue} ({t.profit})
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">
                  {metrics.retailRevenue.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-900 font-sans">{currencySymbol}</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60 group-hover:scale-105 transition">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-emerald-800 font-bold">
            <span>{metrics.totalSales} {language === 'fa' ? 'معامله پرچون' : 'retail sales'}</span>
            <span className="font-mono font-black">+{metrics.retailProfit.toLocaleString()} {currencySymbol} {t.profit}</span>
          </div>
        </div>
      </div>

      {/* 7-Day Daily Revenue Visualization */}
      <div className="order-last min-w-0 bg-white p-3 sm:p-5 rounded-2xl border border-[#E5E5E5] shadow-xs space-y-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#B39025] flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1A1A1A]">
                {language === 'fa' ? 'نمودار عواید ۷ روز گذشته' : language === 'ps' ? 'د تېرو ۷ ورځو عواید ګراف' : 'Last 7 Days Daily Revenue'}
              </h2>
              <p className="text-[11px] text-stone-500">
                {language === 'fa' 
                  ? 'مقایسه عواید روزانه حاصل از سفارشات خیاطی و فروشات محصولات' 
                  : 'Daily earnings breakdown from tailoring orders & retail product sales'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 flex items-center gap-2 font-mono">
              <span className="text-stone-500 font-sans text-[11px] font-bold">
                {language === 'fa' ? 'مجموع ۷ روز:' : '7-Day Total:'}
              </span>
              <span className="font-black text-[#1A1A1A]">
                {last7DaysRevenueData.total7DayRevenue.toLocaleString()} {currencySymbol}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#D4AF37]" />
                <span className="text-stone-700">{t.tailoringStream} ({last7DaysRevenueData.total7DayOrdersRevenue.toLocaleString()})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#059669]" />
                <span className="text-stone-700">{t.retailStream} ({last7DaysRevenueData.total7DayProductsRevenue.toLocaleString()})</span>
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full h-56 sm:h-64 pt-2 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={last7DaysRevenueData.days}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EFEA" />
              <XAxis 
                dataKey="displayLabel" 
                tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }}
                axisLine={{ stroke: '#E5E5E5' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'monospace' }}
                axisLine={{ stroke: '#E5E5E5' }}
                tickLine={false}
                tickFormatter={(val) => Number(val).toLocaleString()}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const ordRev = Number(payload.find(p => p.dataKey === 'orderRevenue')?.value) || 0;
                    const prodRev = Number(payload.find(p => p.dataKey === 'productRevenue')?.value) || 0;
                    const totRev = ordRev + prodRev;
                    return (
                      <div className="bg-[#181818] text-white p-3 rounded-xl shadow-xl border border-stone-700 text-xs space-y-1.5 min-w-44">
                        <div className="font-bold text-stone-300 border-b border-stone-800 pb-1">
                          {label}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#D4AF37] flex items-center gap-1">
                            <span className="w-2 h-2 rounded-xs bg-[#D4AF37]" />
                            {t.tailorRevenue}:
                          </span>
                          <span className="font-mono font-bold">{ordRev.toLocaleString()} {currencySymbol}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-xs bg-[#059669]" />
                            {t.retailRevenue}:
                          </span>
                          <span className="font-mono font-bold">{prodRev.toLocaleString()} {currencySymbol}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-stone-800 font-bold">
                          <span className="text-white">{t.totalAmount}:</span>
                          <span className="font-mono text-[#D4AF37]">{totRev.toLocaleString()} {currencySymbol}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="orderRevenue" 
                name={t.tailorRevenue} 
                fill="#D4AF37" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={32}
              />
              <Bar 
                dataKey="productRevenue" 
                name={t.retailRevenue} 
                fill="#059669" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stream Selector Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveStream('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeStream === 'orders'
                ? 'bg-[#1A1A1A] text-white shadow-xs'
                : 'text-stone-700 hover:bg-white hover:text-stone-900'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{t.tailorRecords}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeStream === 'orders' ? 'bg-[#D4AF37] text-[#1A1A1A]' : 'bg-stone-200'
            }`}>
              {filteredOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveStream('retail')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeStream === 'retail'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-stone-700 hover:bg-white hover:text-stone-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
            <span>{t.retailRecords}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeStream === 'retail' ? 'bg-white text-emerald-900 font-bold' : 'bg-stone-200'
            }`}>
              {filteredSales.length}
            </span>
          </button>

          <button
            onClick={() => setActiveStream('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeStream === 'all'
                ? 'bg-[#173b3b] text-white shadow-xs'
                : 'text-stone-700 hover:bg-white hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#e4bd63]" />
            <span>{t.allRecords}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeStream === 'all' ? 'bg-white text-stone-900 font-bold' : 'bg-stone-200'
            }`}>
              {filteredOrders.length + filteredSales.length}
            </span>
          </button>
        </div>

        <div className="text-xs font-bold text-stone-500 px-3 hidden sm:block">
          {activeStream === 'orders' 
            ? `${filteredOrders.length} ${t.totalOrders}`
            : activeStream === 'retail'
            ? `${filteredSales.length} ${t.totalRetailSales}`
            : `${filteredOrders.length + filteredSales.length} ${t.allRecords}`}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main Real-Time Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={language === 'fa' 
                ? 'جستجوی لحظه‌ای بر اساس نام مشتری، شماره تماس، شماره فرمایش یا جنس...' 
                : language === 'ps' 
                ? 'د پېرودونکي نوم، ټلیفون شمېرې، بِل یا جنس له مخې لټون...' 
                : 'Real-time search across orders, retail products, customers...'}
              className="w-full ps-10 pe-9 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-hidden"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                title="Clear search"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter for Orders */}
          {activeStream !== 'retail' && (
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl overflow-x-auto pb-1 md:pb-1">
              {[
                { id: 'all', label: t.all, count: metrics.total },
                { id: 'pending', label: t.statusPending, count: metrics.pending },
                { id: 'in_progress', label: t.statusInProgress, count: metrics.inProgress },
                { id: 'ready', label: t.statusReady, count: metrics.ready },
                { id: 'delivered', label: t.statusDelivered, count: metrics.delivered },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? 'bg-[#1A1A1A] text-white shadow-xs font-black'
                      : 'text-stone-600 hover:text-[#1A1A1A] hover:bg-stone-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === tab.id ? 'bg-[#D4AF37] text-[#1A1A1A] font-bold' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Payment Filter */}
          {activeStream === 'orders' && (
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-hidden focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="all">{t.paymentStatus}: {t.all}</option>
              <option value="paid">{t.paid}</option>
              <option value="balance">{t.balanceRemaining} ({t.partial})</option>
            </select>
          )}

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl px-2 py-1 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs font-bold text-stone-700 outline-hidden cursor-pointer pe-1"
              title={t.sortBy}
            >
              <option value="newest">📅 {t.sortNewest}</option>
              <option value="oldest">📅 {t.sortOldest}</option>
              <option value="delivery_asc">⏰ {t.sortDeliveryNearest}</option>
              <option value="delivery_desc">⏰ {t.sortDeliveryFurthest}</option>
            </select>

            <button
              type="button"
              onClick={() => {
                if (sortBy === 'newest') setSortBy('oldest');
                else if (sortBy === 'oldest') setSortBy('newest');
                else if (sortBy === 'delivery_asc') setSortBy('delivery_desc');
                else setSortBy('delivery_asc');
              }}
              className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-200 rounded-md transition cursor-pointer"
              title="Reverse sort"
            >
              {sortBy === 'newest' || sortBy === 'delivery_desc' ? (
                <ArrowDown className="w-3.5 h-3.5 text-[#B39025]" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5 text-[#B39025]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RETAIL SALES TABLE (When activeStream === 'retail' or 'all') */}
      {(activeStream === 'retail' || activeStream === 'all') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#1A1A1A] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>{t.retailRecords} ({filteredSales.length})</span>
            </h3>
          </div>

          {filteredSales.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-stone-200">
              <p className="text-xs text-stone-500">{t.noDataFound}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-50/60 border-b border-emerald-100 text-emerald-950 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 text-start">ID / {t.date}</th>
                      <th className="py-3 px-4 text-start">{t.product}</th>
                      <th className="py-3 px-4 text-start">{t.customer}</th>
                      <th className="py-3 px-4 text-start">{t.qty} & {t.sellingPrice}</th>
                      <th className="py-3 px-4 text-start">{t.totalAmount} ({t.profit})</th>
                      <th className="py-3 px-4 text-end">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {visibleSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-emerald-50/30 transition">
                        <td className="py-3 px-4 align-middle">
                          <span className="font-mono font-bold text-xs text-stone-900 block">
                            SL-{sale.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            {new Date(sale.saleDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <span className="font-bold text-stone-900 block">{sale.productName}</span>
                          <span className="text-[10px] text-stone-500">{sale.category} {sale.brand ? `• ${sale.brand}` : ''}</span>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          {sale.customerId ? (
                            <button
                              type="button"
                              onClick={() => onSelectCustomer(sale.customerId!)}
                              className="font-bold text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>{sale.customerName || 'Customer'}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          ) : (
                            <span className="font-medium text-stone-700">{sale.customerName || 'Cash Customer'}</span>
                          )}
                          {sale.customerPhone && <span className="text-[10px] text-stone-500 block font-mono">{sale.customerPhone}</span>}
                        </td>
                        <td className="py-3 px-4 align-middle font-mono">
                          <span className="font-bold">{sale.quantity}x</span> @ {Number(sale.sellingPrice).toLocaleString()} {currencySymbol}
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <span className="font-mono font-black text-sm text-emerald-900 block">
                            {Number(sale.totalAmount).toLocaleString()} {currencySymbol}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700">
                            +{Number(sale.profit).toLocaleString()} {currencySymbol} {t.profit}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-middle text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveRetailReceipt(sale)}
                              title={t.quickPrintSlip}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{t.quickPrintSlip}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSale(sale)}
                              title={t.delete}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {visibleSaleCount < filteredSales.length && (
                <div className="border-t border-stone-100 p-3 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleSaleCount(count => count + 20)}
                    className="px-5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black transition cursor-pointer"
                  >
                    {language === 'fa' ? 'نمایش ۲۰ مورد بیشتر' : language === 'ps' ? '۲۰ نور ریکارډونه وښایاست' : 'See 20 more records'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAILORING ORDERS TABLE (When activeStream === 'orders' or 'all') */}
      {(activeStream === 'orders' || activeStream === 'all') && (
        <div className="space-y-3">
          {activeStream === 'all' && (
            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <h3 className="text-sm font-black text-[#1A1A1A] flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#D4AF37]" />
                <span>{t.tailorRecords} ({filteredOrders.length})</span>
              </h3>
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-[#E5E5E5] shadow-xs">
              <div className="w-16 h-16 rounded-full bg-stone-100 border border-stone-200 mx-auto flex items-center justify-center text-[#D4AF37] mb-3">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-stone-800">{t.noDataFound}</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                {searchTerm 
                  ? (language === 'fa' ? `هیچ فرمایشی مطابق با "${searchTerm}" یافت نشد.` : `No orders matched "${searchTerm}".`) 
                  : (language === 'fa' ? 'هنوز فرمایشی ثبت نشده است.' : 'No orders registered yet.')}
              </p>
              {searchTerm ? (
                <button
                  onClick={() => { setSearchTerm(''); setStatusFilter('all'); setPaymentFilter('all'); }}
                  className="mt-4 px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {language === 'fa' ? 'پاک کردن جستجو' : 'Clear Search'}
                </button>
              ) : (
                <button
                  onClick={onNewOrder}
                  className="mt-4 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#C29E2E] text-[#1A1A1A] rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
                >
                  + {t.newOrder}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop Table Layout */}
              <div className="hidden lg:block bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden shadow-xs">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-start text-xs border-collapse min-w-[760px]">
                    <thead>
                      <tr className="bg-stone-50 border-b border-[#E5E5E5] text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3 text-start whitespace-nowrap">{t.orderNumber}</th>
                        <th className="py-3 px-3 text-start">{t.customerDetails}</th>
                        <th className="py-3 px-3 text-start">{t.garmentType} & {t.fabric}</th>
                        <th className="py-3 px-3 text-start whitespace-nowrap">{t.dates}</th>
                        <th className="py-3 px-3 text-start whitespace-nowrap">{t.orderStatus}</th>
                        <th className="py-3 px-3 text-start whitespace-nowrap">{t.paymentStatus}</th>
                        <th className="py-3 px-3 text-end whitespace-nowrap">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {visibleOrders.map(order => {
                        const statusConfig = getStatusBadgeConfig(order.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                          <tr 
                            key={order.id} 
                            className="hover:bg-amber-50/40 transition group"
                          >
                            <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                              <span className="font-mono font-black text-xs text-[#1A1A1A] tracking-wider block">
                                {order.orderNumber}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 align-middle">
                              <div className="space-y-0.5 min-w-[130px] max-w-[180px]">
                                <button
                                  type="button"
                                  onClick={() => onSelectCustomer(order.customerId)}
                                  title={t.viewCustomerHistory}
                                  className="font-extrabold text-[#1A1A1A] hover:text-[#B39025] hover:underline transition text-start inline-flex items-center gap-1 group/cust cursor-pointer truncate max-w-full"
                                >
                                  <span className="truncate">{order.customerName}</span>
                                  <ExternalLink className="w-3 h-3 text-stone-400 group-hover/cust:text-[#B39025] opacity-0 group-hover/cust:opacity-100 transition shrink-0" />
                                </button>
                                <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[11px]">
                                  <span>{order.customerPhone}</span>
                                  {order.customerWhatsApp && (
                                    <a
                                      href={`https://wa.me/${order.customerWhatsApp.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-emerald-600 hover:text-emerald-700 shrink-0"
                                      title="WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 align-middle">
                              <div className="space-y-0.5 min-w-[110px] max-w-[160px]">
                                <span className="font-bold text-[#1A1A1A] block truncate">{order.garmentType}</span>
                                <span className="text-[11px] text-stone-500 block truncate" title={order.fabricName || ''}>
                                  {order.fabricName ? `🧵 ${order.fabricName}` : '—'}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 align-middle font-mono text-[11px] whitespace-nowrap">
                              <div className="space-y-0.5">
                                <div className="text-stone-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                                  <span>{order.orderDate.slice(0, 10)}</span>
                                </div>
                                <div className="text-[#1A1A1A] font-bold flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-[#D4AF37] shrink-0" />
                                  <span>{order.deliveryDate}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                              <div className="relative inline-flex items-center group/badge">
                                <div 
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border shadow-2xs transition-all cursor-pointer ${statusConfig.badgeClass}`}
                                >
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    {statusConfig.pulse && (
                                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.dotClass}`} />
                                    )}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dotClass}`} />
                                  </span>
                                  <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${statusConfig.iconClass}`} />
                                  <span className="whitespace-nowrap">{statusConfig.label}</span>
                                  <ChevronDown className="w-3 h-3 opacity-60 ml-0.5 group-hover/badge:opacity-100 transition" />
                                </div>
                                <select
                                  value={order.status}
                                  onChange={e => handleUpdateStatus(order, e.target.value as OrderStatus)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
                                  title="Change status"
                                >
                                  <option value="pending">⏳ {t.statusPending}</option>
                                  <option value="in_progress">✂️ {t.statusInProgress}</option>
                                  <option value="ready">✅ {t.statusReady}</option>
                                  <option value="delivered">📦 {t.statusDelivered}</option>
                                </select>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openPaymentModal(order)}
                                className="text-start hover:opacity-80 transition cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    order.balanceAmount === 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : order.paidAmount > 0
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {order.balanceAmount === 0 ? t.paid : order.paidAmount > 0 ? t.partial : t.unpaid}
                                  </span>
                                </div>
                                <div className="font-mono text-xs">
                                  <span className="font-bold text-[#1A1A1A]">{order.totalAmount} {currencySymbol}</span>
                                  {order.balanceAmount > 0 && (
                                    <span className="text-rose-600 font-bold block text-[11px]">
                                      ({t.balanceRemaining}: {order.balanceAmount})
                                    </span>
                                  )}
                                </div>
                              </button>
                            </td>

                            <td className="py-2.5 px-3 align-middle text-end whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onViewReceipt(order)}
                                  title={t.print}
                                  className="p-1.5 bg-[#D4AF37] hover:bg-[#C29E2E] text-[#1A1A1A] rounded-lg transition cursor-pointer shadow-2xs"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditOrder(order)}
                                  title={t.edit}
                                  className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition cursor-pointer"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrder(order)}
                                  title={t.delete}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile / Tablet Friendly Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-3.5">
                {visibleOrders.map(order => {
                  const statusConfig = getStatusBadgeConfig(order.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={order.id}
                      className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                        <span className="font-mono font-black text-sm text-[#1A1A1A]">
                          {order.orderNumber}
                        </span>

                        <div className="relative inline-flex items-center">
                          <div 
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border shadow-2xs ${statusConfig.badgeClass}`}
                          >
                            <span className="relative flex h-2 w-2 shrink-0">
                              {statusConfig.pulse && (
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.dotClass}`} />
                              )}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dotClass}`} />
                            </span>
                            <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${statusConfig.iconClass}`} />
                            <span className="whitespace-nowrap">{statusConfig.label}</span>
                            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                          </div>
                          <select
                            value={order.status}
                            onChange={e => handleUpdateStatus(order, e.target.value as OrderStatus)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
                          >
                            <option value="pending">⏳ {t.statusPending}</option>
                            <option value="in_progress">✂️ {t.statusInProgress}</option>
                            <option value="ready">✅ {t.statusReady}</option>
                            <option value="delivered">📦 {t.statusDelivered}</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-start justify-between">
                        <div>
                          <button
                            type="button"
                            onClick={() => onSelectCustomer(order.customerId)}
                            className="font-extrabold text-sm text-[#1A1A1A] hover:text-[#B39025] hover:underline text-start inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{order.customerName}</span>
                            <ExternalLink className="w-3 h-3 text-stone-400 shrink-0" />
                          </button>
                          <p className="text-xs text-stone-500 font-mono mt-0.5">{order.customerPhone}</p>
                        </div>
                        <div className="text-end">
                          <span className="text-xs font-bold text-stone-800 block">{order.garmentType}</span>
                          {order.fabricName && (
                            <span className="text-[11px] text-stone-500 block truncate max-w-[140px]">
                              🧵 {order.fabricName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-stone-500 text-[11px] block">{t.totalAmount}</span>
                          <span className="font-mono font-bold text-[#1A1A1A]">{order.totalAmount} {currencySymbol}</span>
                        </div>
                        <div>
                          <span className="text-emerald-700 text-[11px] block">{t.paidAmount}</span>
                          <span className="font-mono font-bold text-emerald-800">{order.paidAmount} {currencySymbol}</span>
                        </div>
                        <div>
                          <span className="text-rose-600 text-[11px] block">{t.balanceRemaining}</span>
                          <span className="font-mono font-bold text-rose-600">{order.balanceAmount} {currencySymbol}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100">
                        <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>{order.deliveryDate}</span>
                        </div>

                        <div className="flex items-center gap-1.5 ms-auto">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(order)}
                            className="px-2.5 py-1 bg-[#D4AF37] hover:bg-[#C29E2E] text-[#1A1A1A] rounded-lg text-xs font-black flex items-center gap-1 shadow-2xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{t.receipt}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditOrder(order)}
                            className="p-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order)}
                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {visibleOrderCount < filteredOrders.length && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setVisibleOrderCount(count => count + 20)}
                    className="px-5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-black transition cursor-pointer"
                  >
                    {language === 'fa' ? 'نمایش ۲۰ مورد بیشتر' : language === 'ps' ? '۲۰ نور ریکارډونه وښایاست' : 'See 20 more records'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Payment Modal for Orders */}
      {paymentModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-sm text-[#1A1A1A] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#D4AF37]" />
                <span>{t.paymentStatus} ({paymentModalOrder.orderNumber})</span>
              </h3>
              <button
                onClick={() => setPaymentModalOrder(null)}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">{t.totalAmount}:</span>
                <span className="font-mono font-bold">{paymentModalOrder.totalAmount} {currencySymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">{t.balanceRemaining}:</span>
                <span className="font-mono font-bold text-rose-600">{paymentModalOrder.balanceAmount} {currencySymbol}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">
                {t.paidAmount} ({currencySymbol})
              </label>
              <input
                type="number"
                value={newPaidInput}
                onChange={e => setNewPaidInput(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono font-bold focus:outline-hidden focus:border-[#D4AF37]"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setNewPaidInput(paymentModalOrder.totalAmount)}
                  className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  {language === 'fa' ? 'تسویه کامل (پرداخت شد)' : 'Full Paid'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-700 cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSavePaymentUpdate}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-[#C29E2E] rounded-xl text-xs font-black text-[#1A1A1A] cursor-pointer"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Retail Receipt Modal in Dashboard */}
      {activeRetailReceipt && (
        <div id="retail-receipt-modal" className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="retail-receipt-container bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50 no-print">
              <h3 className="font-extrabold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#B39025]" />
                <span>{language === 'fa' ? 'بل فروش جنس' : 'Retail Sales Receipt'}</span>
              </h3>
              <button
                onClick={() => setActiveRetailReceipt(null)}
                className="p-1 text-stone-500 hover:text-stone-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div 
              id="printable-retail-slip" 
              ref={retailReceiptPrintRef} 
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
                    <span className="font-black font-mono text-stone-950 text-xs">SL-{activeRetailReceipt.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <div className="w-1/2 p-1.5 flex items-center justify-between">
                    <span className="text-stone-600 text-[10px]">{language === 'fa' ? 'تاریخ:' : 'Date:'}</span>
                    <span className="font-mono text-stone-950 text-[10px]">{new Date(activeRetailReceipt.saleDate).toLocaleDateString()}</span>
                  </div>
                </div>
                {activeRetailReceipt.customerName && (
                  <div className="p-1.5 flex items-center justify-between bg-stone-50">
                    <span className="text-stone-600 text-[10px]">{language === 'fa' ? 'مشتری:' : 'Customer:'}</span>
                    <span className="font-black text-stone-950 text-xs">{activeRetailReceipt.customerName}</span>
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
                        <div className="leading-tight">{activeRetailReceipt.productName}</div>
                        <div className="text-[9px] text-stone-500 font-normal mt-0.5 font-mono">
                          @{Number(activeRetailReceipt.sellingPrice).toLocaleString()} {currencySymbol}
                        </div>
                      </td>
                      <td className="p-1.5 text-center font-mono font-black text-stone-950 border-r border-stone-950 align-top">
                        {activeRetailReceipt.quantity}
                      </td>
                      <td className="p-1.5 text-end font-mono font-black text-stone-950 align-top text-xs whitespace-nowrap">
                        {Number(activeRetailReceipt.totalAmount).toLocaleString()} {currencySymbol}
                      </td>
                    </tr>
                    {activeRetailReceipt.notes && (
                      <tr>
                        <td colSpan={3} className="p-1.5 bg-stone-50 text-[10px] text-stone-800 italic">
                          <span className="font-bold text-stone-900 not-italic">Note:</span> {activeRetailReceipt.notes}
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
                    <span className="font-black text-stone-950 text-xs uppercase">{activeRetailReceipt.paymentMethod || 'CASH'}</span>
                  </div>
                  <div className="w-1/2 p-1.5 flex items-center justify-between bg-stone-100">
                    <span className="text-[10px] text-stone-950 font-black uppercase">{language === 'fa' ? 'مجموع کل:' : 'TOTAL:'}</span>
                    <span className="font-mono font-black text-sm text-stone-950 whitespace-nowrap">{Number(activeRetailReceipt.totalAmount).toLocaleString()} {currencySymbol}</span>
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

            <div className="p-4 bg-stone-50 flex items-center justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => setActiveRetailReceipt(null)}
                className="px-3.5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {t.close}
              </button>
              <button
                type="button"
                onClick={handleDownloadRetailPdf}
                disabled={isGeneratingRetailPdf}
                className="px-3.5 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingRetailPdf ? '...' : 'PDF'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrintRetailReceipt}
                disabled={isPrintingRetail}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>{isPrintingRetail ? t.loading : (language === 'fa' ? 'چاپ رسید' : 'Print Slip')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
