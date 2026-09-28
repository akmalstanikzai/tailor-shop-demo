import React, { useState, useMemo, useEffect } from 'react';
import { Expense, ExpenseCategory, ShopSettings, Language, Order, ProductSale } from '../types';
import { translations } from '../translations/i18n';
import { storageService } from '../services/storage';
import { textIncludes } from '../lib/search';
import { 
  Wallet, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  User, 
  DollarSign, 
  FileText, 
  Check, 
  X, 
  Filter, 
  Download, 
  Database, 
  Copy, 
  TrendingDown, 
  TrendingUp,
  Receipt,
  Layers,
  Sparkles,
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';

interface ExpensesViewProps {
  expenses: Expense[];
  orders?: Order[];
  productSales?: ProductSale[];
  shopSettings: ShopSettings;
  language: Language;
  onExpenseUpdated: () => void;
}

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  rent: '🏢',
  utilities: '⚡',
  materials: '🧵',
  maintenance: '🔧',
  food_hospitality: '☕',
  salaries: '💼',
  salaries_wages: '💼',
  transport: '🚗',
  marketing: '📢',
  other: '📦',
};

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  orders = [],
  productSales = [],
  shopSettings,
  language,
  onExpenseUpdated,
}) => {
  const t = translations[language];
  const isRtl = language === 'fa' || language === 'ps';

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modals & Forms
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [adjustmentToast, setAdjustmentToast] = useState<{ title: string; amount: number } | null>(null);

  // Auto-dismiss adjustment toast
  useEffect(() => {
    if (!adjustmentToast) return;
    const timer = setTimeout(() => {
      setAdjustmentToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [adjustmentToast]);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('materials');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [formSpentBy, setFormSpentBy] = useState<string>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'cash' | 'bank_transfer' | 'hawala' | 'other'>('cash');
  const [formReceiptNumber, setFormReceiptNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const currencySymbol = language === 'ps' 
    ? shopSettings.currencyPs 
    : language === 'fa' 
    ? shopSettings.currencyFa 
    : shopSettings.currencyEn || 'AFN';

  // All distinct person names for autocomplete suggestions
  const existingPersons = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => {
      if (e.spentBy && e.spentBy.trim()) set.add(e.spentBy.trim());
    });
    // Add default popular Afghan shop staff names if empty
    if (set.size === 0) {
      set.add('Mujeeb (مجیب)');
      set.add('Ahmad (احمد)');
      set.add('Ustad Karim (استاد کریم)');
    }
    return Array.from(set);
  }, [expenses]);

  // Open modal for new expense
  const handleOpenAdd = () => {
    setFormTitle('');
    setFormCategory('materials');
    setFormAmount('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormSpentBy(existingPersons[0] || 'Mujeeb (مجیب)');
    setFormPaymentMethod('cash');
    setFormReceiptNumber('');
    setFormNotes('');
    setEditingExpense(null);
    setIsAddingNew(true);
  };

  // Open modal for editing
  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormTitle(exp.title);
    setFormCategory(exp.category);
    setFormAmount(String(exp.amount));
    setFormDate(exp.date);
    setFormSpentBy(exp.spentBy);
    setFormPaymentMethod(exp.paymentMethod || 'cash');
    setFormReceiptNumber(exp.receiptNumber || '');
    setFormNotes(exp.notes || '');
    setIsAddingNew(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || Number(formAmount) <= 0 || !formSpentBy.trim()) {
      return;
    }

    const newExpense: Expense = {
      id: editingExpense ? editingExpense.id : `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: formTitle.trim(),
      category: formCategory,
      amount: Number(formAmount),
      date: formDate || new Date().toISOString().slice(0, 10),
      spentBy: formSpentBy.trim(),
      paymentMethod: formPaymentMethod,
      receiptNumber: formReceiptNumber.trim() || undefined,
      notes: formNotes.trim() || undefined,
      createdAt: editingExpense ? editingExpense.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveExpense(newExpense);
    onExpenseUpdated();
    setIsAddingNew(false);
    setEditingExpense(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const targetTitle = deleteTarget.title;
    const targetAmount = Number(deleteTarget.amount) || 0;
    storageService.deleteExpense(deleteTarget.id);
    setDeleteTarget(null);
    setAdjustmentToast({ title: targetTitle, amount: targetAmount });
    onExpenseUpdated();
  };

  const getCategoryLabel = (cat: ExpenseCategory): string => {
    switch (cat) {
      case 'rent': return t.categoryRent;
      case 'utilities': return t.categoryUtilities;
      case 'materials': return t.categoryMaterials;
      case 'maintenance': return t.categoryMaintenance;
      case 'food_hospitality': return t.categoryFood;
      case 'salaries_wages': return t.categorySalaries;
      case 'transport': return t.categoryTransport;
      case 'marketing': return t.categoryMarketing;
      case 'other':
      default:
        return t.categoryOther;
    }
  };

  // Filtered & sorted expenses
  const filteredExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);
    const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    return expenses.filter(exp => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = textIncludes(exp.title, query);
        const matchesPerson = textIncludes(exp.spentBy, query);
        const matchesReceipt = textIncludes(exp.receiptNumber, query);
        const matchesNotes = textIncludes(exp.notes, query);
        if (!matchesTitle && !matchesPerson && !matchesReceipt && !matchesNotes) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) {
        return false;
      }

      // Person filter
      if (selectedPerson !== 'all' && exp.spentBy !== selectedPerson) {
        return false;
      }

      // Date filter
      if (dateFilter === 'today' && exp.date !== todayStr) {
        return false;
      }
      if (dateFilter === 'this_week' && exp.date < startOfWeekStr) {
        return false;
      }
      if (dateFilter === 'this_month' && exp.date < startOfMonthStr) {
        return false;
      }
      if (dateFilter === 'custom') {
        if (customStartDate && exp.date < customStartDate) return false;
        if (customEndDate && exp.date > customEndDate) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'amount') {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
      // sort by date
      const dateA = a.date || '';
      const dateB = b.date || '';
      return sortOrder === 'desc' 
        ? dateB.localeCompare(dateA) || (b.createdAt || '').localeCompare(a.createdAt || '')
        : dateA.localeCompare(dateB) || (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }, [expenses, searchTerm, selectedCategory, selectedPerson, dateFilter, customStartDate, customEndDate, sortField, sortOrder]);

  // KPIs
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const startOfMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

    let total = 0;
    let thisMonth = 0;
    let today = 0;

    expenses.forEach(e => {
      const amt = Number(e.amount) || 0;
      total += amt;
      if (e.date >= startOfMonthStr) {
        thisMonth += amt;
      }
      if (e.date === todayStr) {
        today += amt;
      }
    });

    const average = expenses.length > 0 ? Math.round(total / expenses.length) : 0;

    return { total, thisMonth, today, average, count: expenses.length };
  }, [expenses]);

  // Shop Cash Inflows vs Total Expenses -> Net Cash Balance
  const financialTotals = useMemo(() => {
    const ordersCollected = (orders || []).reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    const retailCollected = (productSales || []).reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalInflows = ordersCollected + retailCollected;
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netCashBalance = totalInflows - totalExpenses;
    return {
      ordersCollected,
      retailCollected,
      totalInflows,
      totalExpenses,
      netCashBalance,
    };
  }, [orders, productSales, expenses]);

  // Export to CSV
  const handleExportCsv = () => {
    if (expenses.length === 0) return;
    const headers = ['ID', 'Title', 'Category', 'Amount', 'Currency', 'Date', 'Spent By', 'Payment Method', 'Receipt #', 'Notes'];
    const rows = filteredExpenses.map(e => [
      `"${e.id}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      e.amount,
      `"${currencySymbol}"`,
      `"${e.date}"`,
      `"${e.spentBy.replace(/"/g, '""')}"`,
      `"${e.paymentMethod || 'cash'}"`,
      `"${(e.receiptNumber || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shop_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sqlCode = `-- ========================================================
-- Supabase SQL Code: Shop Expenses Table
-- Run this in your Supabase SQL Editor:
-- ========================================================

create table if not exists public.expenses (
  id text primary key,
  title text not null,
  category text not null default 'other',
  amount numeric not null default 0,
  date date not null default current_date,
  spent_by text not null default '',
  payment_method text not null default 'cash',
  receipt_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for optimal performance
create index if not exists idx_expenses_date on public.expenses(date desc);
create index if not exists idx_expenses_category on public.expenses(category);
create index if not exists idx_expenses_spent_by on public.expenses(spent_by);
create index if not exists idx_expenses_created_at on public.expenses(created_at desc);

-- Enable RLS and setup permissions
alter table public.expenses enable row level security;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.expenses to anon;

drop policy if exists authenticated_manage_expenses on public.expenses;
create policy authenticated_manage_expenses on public.expenses
  for all to authenticated using (true) with check (true);

drop policy if exists anon_manage_expenses on public.expenses;
create policy anon_manage_expenses on public.expenses
  for all to anon using (true) with check (true);
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900 tracking-tight">
                {t.expenses}
              </h1>
              <p className="text-xs text-stone-500 font-medium">
                {t.expensesNav} — {language === 'fa' ? 'ثبت و پیگیری مخارج، مصارف روزمره و نام اشخاص' : language === 'ps' ? 'د ورځني لګښتونو او اشخاصو ثبت' : 'Record & track shop operating expenses by person and date'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Supabase SQL code button */}
          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all cursor-pointer border border-stone-300"
            title="View Supabase SQL code"
          >
            <Database className="w-4 h-4 text-emerald-600" />
            <span>{language === 'fa' ? 'کد SQL برای Supabase' : language === 'ps' ? 'د Supabase لپاره SQL کوډ' : 'Supabase SQL Code'}</span>
          </button>

          {/* Export CSV button */}
          <button
            onClick={handleExportCsv}
            disabled={expenses.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 rounded-xl transition-all cursor-pointer border border-stone-300"
          >
            <Download className="w-4 h-4 text-stone-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Add New Expense CTA */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-black text-stone-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t.addExpense}</span>
          </button>
        </div>
      </div>

      {/* Real-time money adjustment confirmation toast */}
      {adjustmentToast && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-950 px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-900">
                {t.moneyRefundedToast}
              </div>
              <div className="text-[11px] text-emerald-800 font-medium">
                «{adjustmentToast.title}» — <span className="font-mono font-bold text-emerald-950">+{adjustmentToast.amount.toLocaleString()} {currencySymbol}</span> {language === 'fa' ? 'به صندوق و موجودی دکان تعدیل (اضافه) شد.' : language === 'ps' ? 'بېرته د دوکان نغدو پیسو ته ورزیاتې شوې.' : 'adjusted back into shop funds.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setAdjustmentToast(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1.5 rounded-lg hover:bg-emerald-100 cursor-pointer"
            title={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Net Cash Balance & Money Adjustment Hub */}
      <div className="bg-stone-900 text-white p-4 sm:p-5 rounded-2xl border border-stone-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{t.netShopBalance}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {language === 'fa' ? 'تعدیل خودکار با ثبت و حذف' : language === 'ps' ? 'د ثبت او ړنګولو سره اتومات حساب' : 'Auto-adjusted on delete & add'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
              {financialTotals.netCashBalance.toLocaleString()} <span className="text-xs font-bold text-stone-300">{currencySymbol}</span>
            </div>
            <p className="text-[11px] text-stone-400 font-medium max-w-xl">
              {language === 'fa' 
                ? 'مجموع پول نقد دریافتی دکان منفی مصارف عملیاتی. هرگاه مصرفی را حذف کنید، پول آن فوراً به دخل دکان برگشت داده می‌شود.' 
                : language === 'ps' 
                ? 'د دوکان ټولې ترلاسه شوې نغدې پیسې منفي لګښتونه. کله چې لګښت ړنګ کړئ، پیسې یې سمدستي بېرته دلته جمع کېږي.' 
                : 'Net shop funds: Customer cash received minus operating costs. Deleting an expense immediately adjusts the amount back here.'}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-stone-950/60 border border-stone-800/80 p-3 rounded-xl shrink-0">
            <div className="text-start">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t.totalInflows}</div>
              <div className="text-sm font-bold font-mono text-stone-200">
                +{financialTotals.totalInflows.toLocaleString()} <span className="text-[10px] text-stone-400">{currencySymbol}</span>
              </div>
            </div>
            <div className="text-stone-600 font-bold">−</div>
            <div className="text-start">
              <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">{t.totalExpenses}</div>
              <div className="text-sm font-bold font-mono text-rose-400">
                -{financialTotals.totalExpenses.toLocaleString()} <span className="text-[10px] text-rose-500">{currencySymbol}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Expenses */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-2">
            <span>{t.totalExpenses}</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono tracking-tight">
            {stats.total.toLocaleString()} <span className="text-xs font-bold text-stone-500">{currencySymbol}</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500 font-medium">
            {stats.count} {language === 'fa' ? 'مصرف ثبت شده' : language === 'ps' ? 'ثبت شوي لګښتونه' : 'records registered'}
          </div>
        </div>

        {/* This Month's Expenses */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-2">
            <span>{t.thisMonthExpenses}</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono tracking-tight">
            {stats.thisMonth.toLocaleString()} <span className="text-xs font-bold text-amber-600">{currencySymbol}</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500 font-medium">
            {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'fa-AF', { month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-2">
            <span>{t.todayExpenses}</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-700 font-mono tracking-tight">
            {stats.today.toLocaleString()} <span className="text-xs font-bold text-sky-600">{currencySymbol}</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500 font-medium">
            {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'fa-AF', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>

        {/* Average per Expense */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-2">
            <span>{t.averageExpense}</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-800 font-mono tracking-tight">
            {stats.average.toLocaleString()} <span className="text-xs font-bold text-stone-500">{currencySymbol}</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500 font-medium">
            {language === 'fa' ? 'میانگین هر قلم مصرف' : language === 'ps' ? 'د هر لګښت اوسط کچه' : 'Average per registered cost'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-stone-400 ${isRtl ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={language === 'fa' 
                ? 'جستجوی عنوان مصرف، نام شخص، یا شماره سند...' 
                : language === 'ps' 
                ? 'د لګښت عنوان، د کس نوم، یا د سند نمبر وپلټئ...' 
                : 'Search expense title, spender name, or receipt #...'}
              className={`w-full text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl py-2.5 outline-none focus:border-amber-400 focus:bg-white transition-all ${
                isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 ${isRtl ? 'left-3' : 'right-3'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-52">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 outline-none focus:border-amber-400 focus:bg-white cursor-pointer"
            >
              <option value="all">📁 {t.all} ({t.expenseCategory})</option>
              <option value="materials">{CATEGORY_ICONS.materials} {t.categoryMaterials}</option>
              <option value="utilities">{CATEGORY_ICONS.utilities} {t.categoryUtilities}</option>
              <option value="food_hospitality">{CATEGORY_ICONS.food_hospitality} {t.categoryFood}</option>
              <option value="maintenance">{CATEGORY_ICONS.maintenance} {t.categoryMaintenance}</option>
              <option value="rent">{CATEGORY_ICONS.rent} {t.categoryRent}</option>
              <option value="salaries_wages">{CATEGORY_ICONS.salaries_wages} {t.categorySalaries}</option>
              <option value="transport">{CATEGORY_ICONS.transport} {t.categoryTransport}</option>
              <option value="marketing">{CATEGORY_ICONS.marketing} {t.categoryMarketing}</option>
              <option value="other">{CATEGORY_ICONS.other} {t.categoryOther}</option>
            </select>
          </div>

          {/* Spender (Person) Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedPerson}
              onChange={e => setSelectedPerson(e.target.value)}
              className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 outline-none focus:border-amber-400 focus:bg-white cursor-pointer"
            >
              <option value="all">👤 {t.all} ({t.spentBy})</option>
              {existingPersons.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Date Range Preset */}
          <div className="w-full md:w-44">
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as any)}
              className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 outline-none focus:border-amber-400 focus:bg-white cursor-pointer"
            >
              <option value="all">🗓️ {t.all} ({t.expenseDate})</option>
              <option value="today">⚡ {t.todayExpenses}</option>
              <option value="this_week">📅 {language === 'fa' ? 'این هفته' : language === 'ps' ? 'دا اونۍ' : 'This Week'}</option>
              <option value="this_month">📊 {t.thisMonthExpenses}</option>
              <option value="custom">🔍 {language === 'fa' ? 'تاریخ مشخص' : language === 'ps' ? 'ځانګړې نېټه' : 'Custom Dates'}</option>
            </select>
          </div>
        </div>

        {/* Custom date range if selected */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100">
            <div className="flex items-center gap-2 text-xs text-stone-600 font-bold">
              <span>{language === 'fa' ? 'از تاریخ:' : language === 'ps' ? 'له نېټې:' : 'From:'}</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-600 font-bold">
              <span>{language === 'fa' ? 'تا تاریخ:' : language === 'ps' ? 'تر نېټې:' : 'To:'}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                className="text-[11px] text-rose-600 hover:underline font-bold"
              >
                {language === 'fa' ? 'پاک‌کردن تاریخ' : language === 'ps' ? 'نېټې پاکول' : 'Clear dates'}
              </button>
            )}
          </div>
        )}

        {/* Active Filter Chips & Reset */}
        {(searchTerm || selectedCategory !== 'all' || selectedPerson !== 'all' || dateFilter !== 'all') && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
            <span className="text-stone-500 font-medium">
              {filteredExpenses.length} {language === 'fa' ? 'نتیجه پیدا شد' : language === 'ps' ? 'پایلې وموندل شوې' : 'results found'}
            </span>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedPerson('all');
                setDateFilter('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-amber-700 hover:text-amber-800 font-bold hover:underline"
            >
              {language === 'fa' ? 'پاک‌سازی تمام فیلترها' : language === 'ps' ? 'ټول فلټرونه پاکول' : 'Reset all filters'}
            </button>
          </div>
        )}
      </div>

      {/* Main Expenses List: Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-3">
              <Wallet className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold text-stone-800 mb-1">
              {t.noDataFound}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
              {language === 'fa'
                ? 'هیچ مصرفی مطابق این فیلترها یا جستجو ثبت نشده است. می‌توانید مصرف جدید اضافه کنید.'
                : language === 'ps'
                ? 'په دې پلټنه کې کوم لګښت ونه موندل شو. تاسي کولی شئ نوی لګښت ثبت کړئ.'
                : 'No expense records found matching criteria. Click Add New Expense to record a shop cost.'}
            </p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-stone-900 bg-amber-400 hover:bg-amber-500 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t.addExpense}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                    <th className="py-3 px-4 text-start">
                      <button
                        onClick={() => {
                          if (sortField === 'date') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                          else { setSortField('date'); setSortOrder('desc'); }
                        }}
                        className="flex items-center gap-1.5 hover:text-stone-900 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{t.expenseDate}</span>
                        <ArrowUpDown className="w-3 h-3 text-stone-400" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-start">{t.expenseTitle}</th>
                    <th className="py-3 px-4 text-start">{t.expenseCategory}</th>
                    <th className="py-3 px-4 text-start">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        <span>{t.spentBy}</span>
                      </span>
                    </th>
                    <th className="py-3 px-4 text-start">
                      <button
                        onClick={() => {
                          if (sortField === 'amount') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                          else { setSortField('amount'); setSortOrder('desc'); }
                        }}
                        className="flex items-center gap-1.5 hover:text-stone-900 cursor-pointer"
                      >
                        <span>{t.expenseAmount}</span>
                        <ArrowUpDown className="w-3 h-3 text-stone-400" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-start">{t.paymentMethod}</th>
                    <th className="py-3 px-4 text-start">{t.expenseReceiptNo}</th>
                    <th className="py-3 px-4 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-amber-50/40 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono font-medium text-stone-700 whitespace-nowrap">
                        {exp.date}
                      </td>

                      {/* Title & Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-stone-900">{exp.title}</div>
                        {exp.notes && (
                          <div className="text-[11px] text-stone-500 truncate" title={exp.notes}>
                            {exp.notes}
                          </div>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-stone-100 text-stone-800 border border-stone-200">
                          <span>{CATEGORY_ICONS[exp.category] || '📦'}</span>
                          <span>{getCategoryLabel(exp.category)}</span>
                        </span>
                      </td>

                      {/* Person Name (Spender) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/60">
                          <User className="w-3 h-3 text-amber-600" />
                          <span>{exp.spentBy}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-rose-700 text-sm">
                          {Number(exp.amount).toLocaleString()}
                        </span>{' '}
                        <span className="text-[10px] font-bold text-stone-500">{currencySymbol}</span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-stone-600 font-medium capitalize">
                        {exp.paymentMethod === 'bank_transfer' 
                          ? (language === 'fa' ? 'حساب بانکی' : language === 'ps' ? 'بانکي حساب' : 'Bank Transfer')
                          : exp.paymentMethod === 'hawala'
                          ? (language === 'fa' ? 'حواله / صرافی' : language === 'ps' ? 'حواله / صرافي' : 'Hawala')
                          : (language === 'fa' ? 'نقد' : language === 'ps' ? 'نغدې' : 'Cash')}
                      </td>

                      {/* Receipt # */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-stone-500">
                        {exp.receiptNumber || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(exp)}
                            className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
                            title={t.edit}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(exp)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={t.deleteExpense}
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

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-stone-100">
              {filteredExpenses.map(exp => (
                <div key={exp.id} className="p-4 space-y-2.5 hover:bg-stone-50/70 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-black text-sm text-stone-900 leading-snug">
                        {exp.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                          <span>{CATEGORY_ICONS[exp.category]}</span>
                          <span>{getCategoryLabel(exp.category)}</span>
                        </span>
                        <span className="text-[11px] font-mono text-stone-500">
                          {exp.date}
                        </span>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="font-mono font-black text-rose-700 text-base">
                        {Number(exp.amount).toLocaleString()} <span className="text-[10px] font-bold text-stone-500">{currencySymbol}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 capitalize">
                        {exp.paymentMethod || 'cash'}
                      </span>
                    </div>
                  </div>

                  {/* Person and details */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                    <div className="flex items-center gap-1.5 text-xs text-amber-900 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/50">
                      <User className="w-3 h-3 text-amber-600" />
                      <span>{exp.spentBy}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {exp.receiptNumber && (
                        <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                          #{exp.receiptNumber}
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                        title={t.edit}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(exp)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title={t.deleteExpense}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {exp.notes && (
                    <div className="text-xs text-stone-500 bg-stone-50 p-2 rounded-lg font-medium">
                      {exp.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {(isAddingNew || editingExpense) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-1 sm:my-8 max-h-[calc(100dvh-1rem)] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-700 flex items-center justify-center font-bold">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-stone-900">
                  {editingExpense ? t.editExpense : t.addExpense}
                </h3>
              </div>
              <button
                onClick={() => { setIsAddingNew(false); setEditingExpense(null); }}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t.expenseTitle} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder={language === 'fa' 
                    ? 'مثلاً: خرید تار خیاطی، بل برق، نان چاشت شاگردان...' 
                    : language === 'ps' 
                    ? 'لکه: د خیاطۍ تار پیرودل، د برېښنا بِل، د شاګردانو ډوډۍ...' 
                    : 'e.g. Sewing threads & needles, Electricity bill, Lunch & tea...'}
                  className="w-full text-xs font-medium border border-stone-300 rounded-xl px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {/* Amount & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.expenseAmount} ({currencySymbol}) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={formAmount}
                      onChange={e => setFormAmount(e.target.value)}
                      placeholder="0"
                      className="w-full text-sm font-mono font-black border border-stone-300 rounded-xl px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  {/* Quick amount chips */}
                  <div className="flex gap-1.5 mt-1.5">
                    {[200, 500, 1000, 2000, 5000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormAmount(String(val))}
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 hover:bg-amber-100 text-stone-700 rounded cursor-pointer transition-colors"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.expenseDate} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full text-xs font-medium border border-stone-300 rounded-xl px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setFormDate(new Date().toISOString().slice(0, 10))}
                      className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded cursor-pointer"
                    >
                      {language === 'fa' ? 'امروز' : language === 'ps' ? 'نن' : 'Today'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setFormDate(yesterday.toISOString().slice(0, 10));
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded cursor-pointer"
                    >
                      {language === 'fa' ? 'دیروز' : language === 'ps' ? 'پرون' : 'Yesterday'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Person Name (Spender) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t.spentBy} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formSpentBy}
                    onChange={e => setFormSpentBy(e.target.value)}
                    placeholder={language === 'fa' ? 'نام شخص پرداخت‌کننده (مثلاً: مجیب، احمد، استاد کریم...)' : language === 'ps' ? 'د لګوونکي کس نوم (لکه: مجیب، احمد، استاد کریم...)' : 'Name of person who made expense (e.g. Mujeeb, Ahmad...)'}
                    className="w-full text-xs font-medium border border-stone-300 rounded-xl px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                {/* Person quick suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {existingPersons.slice(0, 5).map(person => (
                    <button
                      key={person}
                      type="button"
                      onClick={() => setFormSpentBy(person)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                        formSpentBy === person 
                          ? 'bg-amber-400 text-stone-900 border-amber-500' 
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {person}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category & Payment Method Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.expenseCategory}
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-800 outline-none focus:border-amber-400 focus:bg-white cursor-pointer"
                  >
                    <option value="materials">{CATEGORY_ICONS.materials} {t.categoryMaterials}</option>
                    <option value="utilities">{CATEGORY_ICONS.utilities} {t.categoryUtilities}</option>
                    <option value="food_hospitality">{CATEGORY_ICONS.food_hospitality} {t.categoryFood}</option>
                    <option value="maintenance">{CATEGORY_ICONS.maintenance} {t.categoryMaintenance}</option>
                    <option value="rent">{CATEGORY_ICONS.rent} {t.categoryRent}</option>
                    <option value="salaries_wages">{CATEGORY_ICONS.salaries_wages} {t.categorySalaries}</option>
                    <option value="transport">{CATEGORY_ICONS.transport} {t.categoryTransport}</option>
                    <option value="marketing">{CATEGORY_ICONS.marketing} {t.categoryMarketing}</option>
                    <option value="other">{CATEGORY_ICONS.other} {t.categoryOther}</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.paymentMethod}
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={e => setFormPaymentMethod(e.target.value as any)}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-800 outline-none focus:border-amber-400 focus:bg-white cursor-pointer"
                  >
                    <option value="cash">💵 {language === 'fa' ? 'نقد' : language === 'ps' ? 'نغدې' : 'Cash'}</option>
                    <option value="bank_transfer">🏦 {language === 'fa' ? 'حساب بانکی' : language === 'ps' ? 'بانکي حساب' : 'Bank Transfer'}</option>
                    <option value="hawala">📜 {language === 'fa' ? 'حواله / صرافی' : language === 'ps' ? 'حواله / صرافي' : 'Hawala'}</option>
                    <option value="other">📦 {language === 'fa' ? 'سایر' : language === 'ps' ? 'نور' : 'Other'}</option>
                  </select>
                </div>
              </div>

              {/* Receipt / Voucher Number */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t.expenseReceiptNo} <span className="text-[10px] text-stone-400 font-normal">({t.optional})</span>
                </label>
                <input
                  type="text"
                  value={formReceiptNumber}
                  onChange={e => setFormReceiptNumber(e.target.value)}
                  placeholder="e.g. RCP-1002, DABS-551, Bill #..."
                  className="w-full text-xs font-mono border border-stone-300 rounded-xl px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t.expenseNotes} <span className="text-[10px] text-stone-400 font-normal">({t.optional})</span>
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder={language === 'fa' ? 'جزئیات اضافه یا یادداشت درباره این هزینه...' : language === 'ps' ? 'د دې لګښت په اړه اضافي معلومات او یادښت...' : 'Extra notes or supplier details...'}
                  className="w-full text-xs font-medium border border-stone-300 rounded-xl p-3 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-stone-100">
                {editingExpense ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = editingExpense;
                      setIsAddingNew(false);
                      setEditingExpense(null);
                      setDeleteTarget(target);
                    }}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.deleteExpense}</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsAddingNew(false); setEditingExpense(null); }}
                    className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-black text-stone-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{t.save}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal with Clear Money Adjustment Back to Shop */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-4 sm:p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-100 shadow-xs">
              <Trash2 className="w-7 h-7 stroke-[2]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-stone-900">
                {t.deleteExpenseConfirmTitle}
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                {t.deleteExpenseConfirmMessage}
              </p>
            </div>

            {/* Expense Record Summary */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">{t.expenseTitle}:</span>
                <span className="font-black text-stone-900">{deleteTarget.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">{t.spentBy}:</span>
                <span className="font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-md">{deleteTarget.spentBy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">{t.expenseDate}:</span>
                <span className="font-mono text-stone-700">{deleteTarget.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">{t.expenseCategory}:</span>
                <span className="font-medium text-stone-700">{CATEGORY_ICONS[deleteTarget.category]} {getCategoryLabel(deleteTarget.category)}</span>
              </div>
              {deleteTarget.receiptNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-medium">{t.expenseReceiptNo}:</span>
                  <span className="font-mono text-stone-700">#{deleteTarget.receiptNumber}</span>
                </div>
              )}
            </div>

            {/* Prominent Money Adjustment Notice */}
            <div className="bg-emerald-50 border-2 border-emerald-300/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                  {t.moneyAdjustedNotice}
                </div>
                <div className="text-lg font-black font-mono text-emerald-800 mt-0.5">
                  +{Number(deleteTarget.amount).toLocaleString()} <span className="text-xs">{currencySymbol}</span>
                </div>
                <div className="text-[11px] text-emerald-700 mt-1 leading-relaxed font-medium">
                  {language === 'fa' 
                    ? 'این مبلغ بلافاصله به صندوق نقد و موجودی خالص دکان بازگردانده می‌شود.' 
                    : language === 'ps' 
                    ? 'دا پیسې به سمدستي بېرته د دوکان نغدو پیسو (دخل) ته جمع او ورزیاتې شي.' 
                    : 'This amount will be immediately adjusted back into your shop cash balance.'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="w-1/2 py-2.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-1/2 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.deleteExpense}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase SQL Code Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 text-stone-100 w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-800 overflow-hidden my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {language === 'fa' ? 'دستورات SQL برای دیتابیس Supabase' : language === 'ps' ? 'د Supabase لپاره SQL هدایتونه' : 'Supabase SQL Code for Expenses Table'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {language === 'fa' ? 'این کد را در بخش SQL Editor در Supabase کاپی کرده و Run کنید' : language === 'ps' ? 'دا کوډ په Supabase SQL Editor کې کاپي او Run کړئ' : 'Copy and paste into your Supabase Dashboard -> SQL Editor and click Run'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs p-3 rounded-xl flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    {language === 'fa' ? 'همگام‌سازی ابری خودکار' : language === 'ps' ? 'اتوماتیک کلاوډ سنک' : 'Cloud Synchronization Enabled'}
                  </div>
                  <div className="text-[11px] text-emerald-400/90 mt-0.5">
                    {language === 'fa'
                      ? 'این جدول فیلدهای عنوان مصرف، مبلغ، تاریخ، نام شخص، نحوه پرداخت و یادداشت را ذخیره و بین تمام دستگاه‌ها در لحظه همگام می‌سازد.'
                      : language === 'ps'
                      ? 'دا جدول به ستاسو د مصارفو عنوان، پیسې، نېټه، د کس نوم، او سند په ټولو دستګاوو کې په مستقیمه توګه همګام کړي.'
                      : 'This table stores expense title, amount, date, spender name, category, payment method, and receipts in real time.'}
                  </div>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-black/70 p-4 rounded-xl text-emerald-400 text-xs font-mono overflow-x-auto max-h-72 border border-stone-800">
                  {sqlCode}
                </pre>
                <button
                  onClick={handleCopySql}
                  className="absolute top-3 end-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md cursor-pointer"
                >
                  {sqlCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{language === 'fa' ? 'کاپی شد!' : language === 'ps' ? 'کاپي شو!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === 'fa' ? 'کاپی کد SQL' : language === 'ps' ? 'د SQL کوډ کاپي' : 'Copy SQL'}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-800">
                <div className="text-stone-400">
                  File location: <code className="text-stone-300 font-mono">/supabase/migrations/20260924_expenses.sql</code>
                </div>
                <button
                  onClick={() => setIsSqlModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-white cursor-pointer"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
