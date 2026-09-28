import React, { useMemo, useState, useRef } from 'react';
import { 
  BarChart3, 
  CalendarDays, 
  CheckCircle2, 
  Clock3, 
  Download, 
  Package, 
  Printer, 
  Scissors, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingBag, 
  Layers, 
  CreditCard, 
  ArrowUpRight, 
  Percent, 
  Eye, 
  FileText,
  Sparkles
} from 'lucide-react';
import { Fabric, Language, Order, Product, ProductSale, ShopSettings, Expense } from '../types';
import { translations } from '../translations/i18n';
import { printReceiptElement } from '../services/printService';

interface ReportsViewProps {
  orders: Order[];
  products: Product[];
  fabrics: Fabric[];
  productSales: ProductSale[];
  expenses?: Expense[];
  shopSettings: ShopSettings;
  language: Language;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'all';
type StreamTab = 'overview' | 'tailor' | 'retail' | 'collections';

const dateKey = (value?: string) => (value || '').slice(0, 10);
const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const ReportsView: React.FC<ReportsViewProps> = ({
  orders,
  products,
  fabrics,
  productSales,
  expenses = [],
  shopSettings,
  language
}) => {
  const t = translations[language];
  const [period, setPeriod] = useState<Period>('daily');
  const [activeTab, setActiveTab] = useState<StreamTab>('overview');

  const currency = language === 'ps' 
    ? shopSettings.currencyPs 
    : language === 'fa' 
    ? shopSettings.currencyFa 
    : shopSettings.currencyEn;

  const money = (value: number) => `${formatNumber(value)} ${currency}`;

  // Date Range Computation
  const range = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);

    if (period === 'daily') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
      start.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'all') {
      start.setFullYear(2000, 0, 1);
      start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }, [period]);

  // Financial & Operational Metrics Computation
  const report = useMemo(() => {
    const inRange = (value?: string) => {
      if (period === 'all') return true;
      const date = new Date(value || '');
      return !Number.isNaN(date.getTime()) && date >= range.start && date <= range.end;
    };

    // Filtered data in date range
    const periodOrders = orders.filter(order => inRange(order.orderDate || order.createdAt));
    const periodSales = productSales.filter(sale => inRange(sale.saleDate || sale.createdAt));

    // 1. Tailoring Stream Figures
    const tailorBilled = periodOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    const tailorCollected = periodOrders.reduce((sum, order) => sum + (Number(order.paidAmount) || 0), 0);
    const tailorBalance = periodOrders.reduce((sum, order) => sum + (Number(order.balanceAmount) || 0), 0);
    const tailorGarmentsCount = periodOrders.reduce((sum, order) => sum + (Number(order.quantity) || 1), 0);
    // Tailoring estimated materials & labor cost ~30% for net estimation
    const tailorEstimatedCost = Math.round(tailorBilled * 0.3);
    const tailorProfit = tailorBilled - tailorEstimatedCost;

    // 2. Retail Stream Figures
    const retailRevenue = periodSales.reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);
    const retailCollected = retailRevenue; // Retail sales are collected immediately upon checkout
    const retailCost = periodSales.reduce((sum, sale) => sum + (Number(sale.purchasePrice) || 0) * (Number(sale.quantity) || 0), 0);
    const retailProfit = periodSales.reduce((sum, sale) => sum + (Number(sale.profit) || 0), 0);
    const retailUnitsSold = periodSales.reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0);

    // 3. Combined Business Totals
    const totalShopBilled = tailorBilled + retailRevenue;
    const totalShopCollected = tailorCollected + retailCollected;
    const totalShopCost = tailorEstimatedCost + retailCost;
    const totalShopProfit = tailorProfit + retailProfit;
    const totalShopBalance = tailorBalance; // Outstanding is only from tailoring orders
    const collectionEfficiency = totalShopBilled > 0 ? Math.round((totalShopCollected / totalShopBilled) * 100) : 100;

    // 4. Shop Operating Expenses & Net Adjustment
    const periodExpenses = (expenses || []).filter(exp => inRange(exp.date || exp.createdAt));
    const totalShopExpenses = periodExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const totalShopNetProfit = totalShopProfit - totalShopExpenses;
    const totalShopNetCash = totalShopCollected - totalShopExpenses;

    // Payment method breakdown for retail
    const retailByPayment: Record<string, { count: number; total: number }> = {};
    for (const s of periodSales) {
      const method = s.paymentMethod || 'cash';
      if (!retailByPayment[method]) {
        retailByPayment[method] = { count: 0, total: 0 };
      }
      retailByPayment[method].count += 1;
      retailByPayment[method].total += Number(s.totalAmount) || 0;
    }

    // Order status counts
    const countByStatus = (status: Order['status']) => periodOrders.filter(order => order.status === status).length;
    const countByPayment = (status: Order['paymentStatus']) => periodOrders.filter(order => order.paymentStatus === status).length;

    // Top performers aggregates
    const aggregate = (values: Array<[string, number]>) => 
      Object.entries(values.reduce<Record<string, number>>((result, [label, value]) => {
        result[label] = (result[label] || 0) + value;
        return result;
      }, {})).sort(([, first], [, second]) => second - first).slice(0, 5);

    const garments = aggregate(periodOrders.map(order => [order.garmentType || 'Custom Order', Number(order.quantity) || 0]));
    const productsSold = aggregate(periodSales.map(sale => [sale.productName || 'Product', Number(sale.quantity) || 0]));

    return {
      periodOrders,
      periodSales,
      tailorBilled,
      tailorCollected,
      tailorBalance,
      tailorGarmentsCount,
      tailorEstimatedCost,
      tailorProfit,
      retailRevenue,
      retailCollected,
      retailCost,
      retailProfit,
      retailUnitsSold,
      totalShopBilled,
      totalShopCollected,
      totalShopCost,
      totalShopProfit,
      totalShopExpenses,
      totalShopNetProfit,
      totalShopNetCash,
      periodExpenses,
      totalShopBalance,
      collectionEfficiency,
      retailByPayment,
      activeCustomers: new Set([...periodOrders.map(o => o.customerId), ...periodSales.map(s => s.customerId)].filter(Boolean)).size,
      statusCounts: {
        pending: countByStatus('pending'),
        in_progress: countByStatus('in_progress'),
        ready: countByStatus('ready'),
        delivered: countByStatus('delivered'),
      },
      paymentCounts: {
        paid: countByPayment('paid'),
        partial: countByPayment('partial'),
        unpaid: countByPayment('unpaid'),
      },
      garments,
      productsSold,
    };
  }, [orders, productSales, expenses, range, period]);

  const lowStockProducts = products.filter(product => (Number(product.stockQuantity) || 0) <= (product.lowStockThreshold ?? 3));
  const lowStockFabrics = fabrics.filter(fabric => (Number(fabric.stockMeters) || 0) <= 15);

  const periodLabel = period === 'daily' 
    ? (language === 'fa' ? 'امروز' : language === 'ps' ? 'نن ورځ' : 'Today')
    : period === 'weekly' 
    ? (language === 'fa' ? 'این هفته' : language === 'ps' ? 'دا اونۍ' : 'This Week')
    : period === 'monthly'
    ? (language === 'fa' ? 'این ماه' : language === 'ps' ? 'دا میاشت' : 'This Month')
    : (language === 'fa' ? 'همه اوقات' : language === 'ps' ? 'ټول وخت' : 'All Time');

  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (!reportContainerRef.current) {
      window.print();
      return;
    }
    const shopTitle = language === 'fa' 
      ? (shopSettings?.shopNameFa || 'Mujeeb Afghan') 
      : language === 'ps' 
      ? (shopSettings?.shopNamePs || 'Mujeeb Afghan') 
      : (shopSettings?.shopNameEn || 'MUJEEB AFGHAN FASHION HOUSE');

    await printReceiptElement(reportContainerRef.current, {
      title: `${shopTitle} - Financial Report (${period})`,
      pageFormat: 'a4',
      dir: language === 'en' ? 'ltr' : 'rtl',
      onStart: () => setIsPrinting(true),
      onComplete: () => setIsPrinting(false),
      onError: () => {
        setIsPrinting(false);
        window.print();
      }
    });
  };

  // Export CSV Handler
  const downloadCsv = () => {
    const rows: unknown[][] = [
      ['Report Period', periodLabel],
      ['From', dateKey(range.start.toISOString())],
      ['To', dateKey(range.end.toISOString())],
      ['Generated On', new Date().toLocaleString()],
      [],
      ['=== COMBINED SUMMARY ==='],
      ['Metric', 'Amount / Value'],
      ['Total Shop Revenue Billed', report.totalShopBilled],
      ['Total Money Collected (Cash In Hand)', report.totalShopCollected],
      ['Total Estimated Cost of Goods & Materials', report.totalShopCost],
      ['Total Combined Net Profit', report.totalShopProfit],
      ['Total Tailoring Outstanding Due', report.totalShopBalance],
      [],
      ['=== TAILORING STREAM ==='],
      ['Tailoring Orders Count', report.periodOrders.length],
      ['Tailoring Total Billed', report.tailorBilled],
      ['Tailoring Money Collected (Cash)', report.tailorCollected],
      ['Tailoring Outstanding Balance', report.tailorBalance],
      ['Tailoring Estimated Profit', report.tailorProfit],
      [],
      ['=== RETAIL PRODUCTS STREAM ==='],
      ['Retail Transactions Count', report.periodSales.length],
      ['Retail Total Revenue', report.retailRevenue],
      ['Retail Money Collected (Cash)', report.retailCollected],
      ['Retail Purchase Cost (COGS)', report.retailCost],
      ['Retail Net Profit', report.retailProfit],
      [],
      ['=== TAILORING ORDERS LIST ==='],
      ['Order ID', 'Customer', 'Phone', 'Garment', 'Status', 'Total', 'Paid', 'Balance', 'Date'],
      ...report.periodOrders.map(order => [
        order.orderNumber,
        order.customerName,
        order.customerPhone,
        order.garmentType,
        order.status,
        order.totalAmount,
        order.paidAmount,
        order.balanceAmount,
        order.orderDate
      ]),
      [],
      ['=== RETAIL SALES LIST ==='],
      ['Sale ID', 'Product', 'Category', 'Customer', 'Qty', 'Unit Sell Price', 'Total', 'Purchase Cost', 'Profit', 'Date'],
      ...report.periodSales.map(sale => [
        `SL-${sale.id.slice(-6).toUpperCase()}`,
        sale.productName,
        sale.category,
        sale.customerName || 'Direct Cash Customer',
        sale.quantity,
        sale.sellingPrice,
        sale.totalAmount,
        sale.purchasePrice,
        sale.profit,
        sale.saleDate
      ])
    ];

    const blob = new Blob([rows.map(row => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Shop_Financial_Report_${period}_${dateKey(range.start.toISOString())}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={reportContainerRef} className="space-y-6 pb-16 animate-in fade-in duration-200 print:bg-white print:p-0">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#173b3b] text-[#e4bd63] shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">
              {t.reportsNav}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {language === 'fa' 
                ? 'تفکیک عواید، پول نقد دریافت شده و مفاد برای هر بخش (خیاطی و فروشات پرچون)' 
                : language === 'ps' 
                ? 'د هرې برخې (خیاطي او پرچون پلور) لپاره د عوایدو، راټولو شویو پیسو او ګټې تفکیک' 
                : 'Detailed financial split of revenue, collected money, and profit for Tailoring & Retail'}
            </p>
          </div>
        </div>

        {/* Time Period Selector, CSV & Print Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto no-print">
          <div className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200">
            {(['daily', 'weekly', 'monthly', 'all'] as Period[]).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  period === option 
                    ? 'bg-[#173b3b] text-white shadow-xs' 
                    : 'text-stone-600 hover:bg-white hover:text-stone-900'
                }`}
              >
                <CalendarDays className="mr-1 inline h-3 w-3" />
                {option === 'daily' 
                  ? (language === 'fa' ? 'امروز' : language === 'ps' ? 'نن ورځ' : 'Daily') 
                  : option === 'weekly' 
                  ? (language === 'fa' ? 'این هفته' : language === 'ps' ? 'اونۍ' : 'Weekly') 
                  : option === 'monthly' 
                  ? (language === 'fa' ? 'این ماه' : language === 'ps' ? 'میاشت' : 'Monthly') 
                  : (language === 'fa' ? 'همه' : language === 'ps' ? 'ټول' : 'All Time')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#173b3b] px-4 py-2 text-xs font-black text-white hover:bg-[#245454] transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{isPrinting ? t.loading : t.print}</span>
          </button>
        </div>
      </div>

      {/* 2. Range Badge and Stream Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50 border border-stone-200 rounded-2xl p-3 no-print">
        {/* Stream Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#173b3b] text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.combinedStream}</span>
          </button>

          <button
            onClick={() => setActiveTab('tailor')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tailor'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.tailoringStream} ({report.periodOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('retail')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'retail'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t.retailStream} ({report.periodSales.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('collections')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'collections'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-blue-500" />
            <span>{t.moneyCollectedBreakdown}</span>
          </button>
        </div>

        <div className="text-xs font-mono font-bold text-stone-600 bg-white px-3 py-1.5 rounded-xl border border-stone-200">
          📅 {periodLabel}: {dateKey(range.start.toISOString())} ➔ {dateKey(range.end.toISOString())}
        </div>
      </div>

      {/* 3. Top KPI Cards: Combined Overview */}
      <div className="grid grid-cols-1 min-[430px]:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Money Collected */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">
                💰 {t.totalShopCollected}
              </p>
              <p className="mt-1.5 text-2xl font-black text-emerald-950 font-mono">
                {money(report.totalShopCollected)}
              </p>
              <p className="mt-1 text-[11px] font-bold text-emerald-800">
                ✂️ {t.tailorCollected}: {money(report.tailorCollected)}<br />
                🛍️ {t.retailCollected}: {money(report.retailCollected)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-300 bg-white p-2.5 text-emerald-700 shadow-2xs">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Total Shop Revenue (Billed + Retail) */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900">
                📊 {t.totalShopRevenue}
              </p>
              <p className="mt-1.5 text-2xl font-black text-blue-950 font-mono">
                {money(report.totalShopBilled)}
              </p>
              <p className="mt-1 text-[11px] font-bold text-blue-800">
                ✂️ {t.tailorRevenue}: {money(report.tailorBilled)}<br />
                🛍️ {t.retailRevenue}: {money(report.retailRevenue)}
              </p>
            </div>
            <div className="rounded-xl border border-blue-300 bg-white p-2.5 text-blue-700 shadow-2xs">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Total Net Profit (Tailor + Retail - Expenses) */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                ✨ {t.netProfit}
              </p>
              <p className="mt-1.5 text-2xl font-black text-amber-950 font-mono">
                {money(report.totalShopNetProfit)}
              </p>
              <p className="mt-1 text-[11px] font-bold text-amber-800">
                🏷️ {t.totalShopProfit}: {money(report.totalShopProfit)}<br />
                💸 {t.totalExpenses}: -{money(report.totalShopExpenses)}
              </p>
            </div>
            <div className="rounded-xl border border-amber-300 bg-white p-2.5 text-amber-700 shadow-2xs">
              <Percent className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 4: Outstanding Tailoring Balance */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900">
                ⏳ {t.tailorBalance}
              </p>
              <p className="mt-1.5 text-2xl font-black text-rose-950 font-mono">
                {money(report.tailorBalance)}
              </p>
              <p className="mt-1 text-[11px] font-bold text-rose-800">
                {report.paymentCounts.partial} {language === 'fa' ? 'پرداخت قسمی' : 'Partial'} · {report.paymentCounts.unpaid} {language === 'fa' ? 'پرداخت نشده' : 'Unpaid'}
              </p>
            </div>
            <div className="rounded-xl border border-rose-300 bg-white p-2.5 text-rose-700 shadow-2xs">
              <Clock3 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Side-by-Side Detailed Breakdown: Tailoring vs Retail vs Collected Money */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stream 1: Tailoring Department */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-base font-black text-[#1A1A1A] flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Scissors className="w-4 h-4" />
              </div>
              <span>{t.tailoringStream} ({language === 'fa' ? 'بخش خیاطی و دوخت' : 'Tailor Workshop'})</span>
            </h2>
            <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">
              {report.periodOrders.length} {t.totalOrders}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] text-stone-500 block font-bold">{t.tailorRevenue}</span>
              <span className="text-sm font-black font-mono text-stone-900">{money(report.tailorBilled)}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[11px] text-emerald-800 block font-bold">{t.tailorCollected}</span>
              <span className="text-sm font-black font-mono text-emerald-900">{money(report.tailorCollected)}</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[11px] text-rose-800 block font-bold">{t.tailorBalance}</span>
              <span className="text-sm font-black font-mono text-rose-900">{money(report.tailorBalance)}</span>
            </div>
          </div>

          {/* Tailoring Status Distribution */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <span className="text-xs font-bold text-stone-700 block">{t.orderStatus}:</span>
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-center font-bold">
                <span>⏳ {t.statusPending}: {report.statusCounts.pending}</span>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-center font-bold">
                <span>✂️ {t.statusInProgress}: {report.statusCounts.in_progress}</span>
              </div>
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-center font-bold">
                <span>✅ {t.statusReady}: {report.statusCounts.ready}</span>
              </div>
              <div className="p-2 bg-stone-100 border border-stone-300 rounded-lg text-stone-800 text-center font-bold">
                <span>📦 {t.statusDelivered}: {report.statusCounts.delivered}</span>
              </div>
            </div>
          </div>

          {/* Top Tailored Garments */}
          <div className="pt-2 border-t border-stone-100">
            <span className="text-xs font-bold text-stone-700 block mb-2">{language === 'fa' ? 'محبوب‌ترین لباس‌های سفارش شده:' : 'Top Tailored Garment Types:'}</span>
            <div className="space-y-1.5">
              {report.garments.length > 0 ? (
                report.garments.map(([name, count]) => (
                  <div key={name} className="flex justify-between items-center text-xs p-2 bg-stone-50 rounded-lg">
                    <span className="font-bold text-stone-800">{name}</span>
                    <span className="font-mono font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded">{count} {language === 'fa' ? 'دست' : 'suits'}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400 italic">{t.noDataFound}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stream 2: Retail Boutique Department */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-base font-black text-[#1A1A1A] flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span>{t.retailStream} ({language === 'fa' ? 'فروشات پرچون بوتیک' : 'Retail Boutique'})</span>
            </h2>
            <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
              {report.periodSales.length} {t.totalRetailSales}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] text-stone-500 block font-bold">{t.retailRevenue}</span>
              <span className="text-sm font-black font-mono text-stone-900">{money(report.retailRevenue)}</span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] text-stone-500 block font-bold">{t.retailCost}</span>
              <span className="text-sm font-black font-mono text-stone-700">{money(report.retailCost)}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[11px] text-emerald-800 block font-bold">{t.retailProfit}</span>
              <span className="text-sm font-black font-mono text-emerald-900">{money(report.retailProfit)}</span>
            </div>
          </div>

          {/* Retail Payment Methods Breakdown */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <span className="text-xs font-bold text-stone-700 block">{language === 'fa' ? 'تفکیک روش پرداخت پرچون:' : 'Retail Payment Methods:'}</span>
            <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2 text-xs">
              {(Object.entries(report.retailByPayment) as [string, { count: number; total: number }][]).map(([method, data]) => (
                <div key={method} className="p-2 bg-emerald-50/50 border border-emerald-200 rounded-lg text-center">
                  <span className="block font-bold text-emerald-900 capitalize">{method}</span>
                  <span className="font-mono text-[11px] font-black text-emerald-700">{money(data.total)}</span>
                  <span className="block text-[10px] text-stone-500">({data.count} {language === 'fa' ? 'معامله' : 'deals'})</span>
                </div>
              ))}
              {Object.keys(report.retailByPayment).length === 0 && (
                <div className="col-span-3 p-2 text-center text-xs text-stone-400 bg-stone-50 rounded-lg">
                  {language === 'fa' ? 'فروشی در این بازه ثبت نشده است' : 'No retail sales in this range'}
                </div>
              )}
            </div>
          </div>

          {/* Top Retail Products Sold */}
          <div className="pt-2 border-t border-stone-100">
            <span className="text-xs font-bold text-stone-700 block mb-2">{language === 'fa' ? 'پر فروش‌ترین اجناس پرچون:' : 'Top Selling Retail Items:'}</span>
            <div className="space-y-1.5">
              {report.productsSold.length > 0 ? (
                report.productsSold.map(([name, count]) => (
                  <div key={name} className="flex justify-between items-center text-xs p-2 bg-stone-50 rounded-lg">
                    <span className="font-bold text-stone-800">{name}</span>
                    <span className="font-mono font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">{count} {language === 'fa' ? 'دانه' : 'units'}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400 italic">{t.noDataFound}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Comprehensive Money Collected Breakdown Table */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h2 className="text-base font-black text-[#1A1A1A] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span>{t.moneyCollectedBreakdown} ({language === 'fa' ? 'تحلیل نقدینگی و پول جمع‌آوری شده' : 'Cash Flow & Collections Data'})</span>
          </h2>
          <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-lg">
            {language === 'fa' ? 'مجموع نقدینگی وصولی' : 'Total Cash Inflow'}: {money(report.totalShopCollected)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <th className="py-2.5 px-3 text-start">{language === 'fa' ? 'بخش کاری / منبع' : 'Business Stream'}</th>
                <th className="py-2.5 px-3 text-start">{language === 'fa' ? 'تعداد معاملات / سفارشات' : 'Transactions / Orders'}</th>
                <th className="py-2.5 px-3 text-start">{language === 'fa' ? 'مبلغ مجموعی (Billed/Gross)' : 'Gross Billed'}</th>
                <th className="py-2.5 px-3 text-start">{language === 'fa' ? 'پول نقد دریافت شده (Collected)' : 'Money Collected (Cash)'}</th>
                <th className="py-2.5 px-3 text-start">{language === 'fa' ? 'باقیمانده وصول‌نشده' : 'Outstanding Balance'}</th>
                <th className="py-2.5 px-3 text-start">{language === 'fa' ? 'مفاد خالص تخمینی' : 'Net Profit'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-150">
              {/* Tailor Row */}
              <tr className="hover:bg-stone-50">
                <td className="py-3 px-3 font-bold text-amber-900 flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-amber-700" />
                  <span>{t.tailoringStream}</span>
                </td>
                <td className="py-3 px-3 font-mono">{report.periodOrders.length} {language === 'fa' ? 'سفارش' : 'orders'}</td>
                <td className="py-3 px-3 font-mono font-bold">{money(report.tailorBilled)}</td>
                <td className="py-3 px-3 font-mono font-black text-emerald-700 bg-emerald-50/50">{money(report.tailorCollected)}</td>
                <td className="py-3 px-3 font-mono font-bold text-rose-700">{money(report.tailorBalance)}</td>
                <td className="py-3 px-3 font-mono font-black text-amber-800">{money(report.tailorProfit)}</td>
              </tr>

              {/* Retail Row */}
              <tr className="hover:bg-stone-50">
                <td className="py-3 px-3 font-bold text-emerald-900 flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t.retailStream}</span>
                </td>
                <td className="py-3 px-3 font-mono">{report.periodSales.length} {language === 'fa' ? 'فروش' : 'sales'}</td>
                <td className="py-3 px-3 font-mono font-bold">{money(report.retailRevenue)}</td>
                <td className="py-3 px-3 font-mono font-black text-emerald-700 bg-emerald-50/50">{money(report.retailCollected)}</td>
                <td className="py-3 px-3 font-mono text-stone-400">0 {currency} (نقد کامل)</td>
                <td className="py-3 px-3 font-mono font-black text-emerald-800">{money(report.retailProfit)}</td>
              </tr>

              {/* Combined Grand Total Row */}
              <tr className="bg-stone-100 font-black text-sm">
                <td className="py-3 px-3 text-[#1A1A1A] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>{t.totalShopRevenue}</span>
                </td>
                <td className="py-3 px-3 font-mono">{report.periodOrders.length + report.periodSales.length}</td>
                <td className="py-3 px-3 font-mono">{money(report.totalShopBilled)}</td>
                <td className="py-3 px-3 font-mono text-emerald-800 bg-emerald-100">{money(report.totalShopCollected)}</td>
                <td className="py-3 px-3 font-mono text-rose-800">{money(report.totalShopBalance)}</td>
                <td className="py-3 px-3 font-mono text-emerald-800">{money(report.totalShopProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Low Stock & Inventory Alerts */}
      <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-sm font-black text-rose-900 mb-3">
          <Package className="h-4 w-4 text-rose-700" />
          <span>{language === 'fa' ? 'هشدارهای گدام و موجودی کم:' : 'Inventory & Low Stock Alerts:'}</span>
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ...lowStockProducts.map(p => ({
              title: p.name,
              detail: `${p.stockQuantity} ${t.units || 'units'} left in stock`,
              category: p.category,
              type: 'product'
            })),
            ...lowStockFabrics.map(f => ({
              title: f.name,
              detail: `${f.stockMeters} ${f.unit || 'meters'} remaining`,
              category: f.color || 'Fabric',
              type: 'fabric'
            }))
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-rose-950 block">{item.title}</span>
                <span className="text-[11px] text-rose-700 font-mono">{item.detail}</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-900 rounded-md">
                {item.category}
              </span>
            </div>
          ))}
          {lowStockProducts.length === 0 && lowStockFabrics.length === 0 && (
            <p className="text-xs text-stone-500 italic col-span-full py-2">
              {language === 'fa' ? 'تمام اجناس و تکه‌ها موجودی کافی دارند.' : 'All products and fabrics have sufficient stock.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
