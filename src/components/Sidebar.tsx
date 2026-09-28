import React from 'react';
import { Language, ShopSettings, Order, Customer, Fabric, Product } from '../types';
import { translations } from '../translations/i18n';
import { storageService } from '../services/storage';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  SlidersHorizontal, 
  Layers, 
  ShoppingBag, 
  TrendingUp, 
  X, 
  LogOut, 
  UserCheck, 
  BarChart3, 
  Wallet
} from 'lucide-react';

export type MainNavTab = 'dashboard' | 'new_order' | 'customers' | 'fabrics' | 'products' | 'sales_history' | 'expenses' | 'reports' | 'settings';
export type SettingsSubTab = 'design' | 'measurements' | 'garments' | 'shop' | 'receipt' | 'backup';

interface SidebarProps {
  currentTab: MainNavTab;
  settingsSubTab: SettingsSubTab;
  language: Language;
  shopSettings: ShopSettings;
  orders: Order[];
  customers: Customer[];
  fabrics: Fabric[];
  products: Product[];
  salesCount?: number;
  expensesCount?: number;
  designCategoriesCount: number;
  isOpenOnMobile: boolean;
  onCloseMobile: () => void;
  onSelectNav: (tab: MainNavTab, subTab?: SettingsSubTab) => void;
  onSignOut?: () => void;
  currentUser?: { email: string; name: string } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  language,
  shopSettings,
  orders,
  customers,
  fabrics,
  products,
  salesCount = 0,
  expensesCount = 0,
  isOpenOnMobile,
  onCloseMobile,
  onSelectNav,
  onSignOut,
  currentUser,
}) => {
  const t = translations[language];
  const isRtl = language === 'fa' || language === 'ps';
  const shopTitle = language === 'ps' 
    ? shopSettings.shopNamePs 
    : language === 'fa' 
    ? shopSettings.shopNameFa 
    : shopSettings.shopNameEn;

  // Stats for badge chips
  const totalOrdersCount = orders.length;
  const totalCustomersCount = customers.length;
  const totalFabricsCount = fabrics.length;
  const fabricThreshold = storageService.getUiPreferences().fabricLowStockThreshold;
  const lowFabricCount = fabrics.filter(fabric => {
    const stock = Number(fabric.stockMeters) || 0;
    return stock > 0 && stock <= fabricThreshold;
  }).length;
  const lowProductCount = products.filter(product => {
    const stock = Number(product.stockQuantity) || 0;
    return stock <= (product.lowStockThreshold ?? 5);
  }).length;

  const handleNavClick = (tab: MainNavTab) => {
    onSelectNav(tab);
    onCloseMobile();
  };

  const isTabActive = (tab: MainNavTab) => currentTab === tab;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenOnMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity no-print"
          aria-hidden="true"
        />
      )}

      {/* Light, Elegant Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 z-50 flex flex-col w-[min(18rem,88vw)] bg-white text-stone-800 transition-transform duration-300 ease-in-out lg:translate-x-0 no-print shadow-xl lg:shadow-xs ${
          isRtl 
            ? 'right-0 border-l border-stone-200' 
            : 'left-0 border-r border-stone-200'
        } ${
          isOpenOnMobile 
            ? 'translate-x-0' 
            : isRtl 
            ? 'translate-x-full lg:translate-x-0' 
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4.5 border-b border-stone-200 shrink-0 bg-stone-50/70">
          <div 
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-amber-500 font-black shadow-xs group-hover:scale-105 transition-transform shrink-0 overflow-hidden">
              <img src={shopSettings.logoUrl || '/mujeeb-afghan-logo.jpeg'} alt="Mujeeb Afghan Fashion" className="h-full w-full object-contain" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-sm text-stone-900 tracking-tight leading-tight truncate">
                {shopTitle || 'MUJEEB AFGHAN FASHION HOUSE'}
              </h1>
              <p className="text-[11px] text-amber-700 font-semibold tracking-wide truncate">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition cursor-pointer shrink-0"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {/* 1. New Order Primary CTA */}
          <button
            onClick={() => handleNavClick('new_order')}
            id="sidebar-new-order-btn"
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black transition-all duration-150 cursor-pointer shadow-xs group mb-3 ${
              isTabActive('new_order')
                ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span className="text-sm font-black">{t.newOrder}</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-black/20 text-white rounded-md">
              F2
            </span>
          </button>

          {/* Tailoring Section Header */}
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {language === 'fa' ? 'بخش خیاطی' : language === 'ps' ? 'د خیاطۍ برخه' : 'Tailoring'}
          </div>

          {/* 2. Order Dashboard */}
          <button
            onClick={() => handleNavClick('dashboard')}
            id="sidebar-dashboard-link"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTabActive('dashboard')
                ? 'bg-amber-50 text-amber-900 border border-amber-200/90 font-black shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className={`w-4 h-4 ${isTabActive('dashboard') ? 'text-amber-700' : 'text-stone-400'}`} />
              <span>{t.dashboard}</span>
            </div>
            {totalOrdersCount > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                isTabActive('dashboard') ? 'bg-amber-200 text-amber-900' : 'bg-stone-100 text-stone-600'
              }`}>
                {totalOrdersCount}
              </span>
            )}
          </button>

          {/* 3. Customer Directory */}
          <button
            onClick={() => handleNavClick('customers')}
            id="sidebar-customers-link"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTabActive('customers')
                ? 'bg-amber-50 text-amber-900 border border-amber-200/90 font-black shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className={`w-4 h-4 ${isTabActive('customers') ? 'text-amber-700' : 'text-stone-400'}`} />
              <span>{t.customers}</span>
            </div>
            {totalCustomersCount > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                isTabActive('customers') ? 'bg-amber-200 text-amber-900' : 'bg-stone-100 text-stone-600'
              }`}>
                {totalCustomersCount}
              </span>
            )}
          </button>

          {/* 4. Fabric Inventory */}
          <button
            onClick={() => handleNavClick('fabrics')}
            id="sidebar-fabrics-link"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTabActive('fabrics')
                ? 'bg-amber-50 text-amber-900 border border-amber-200/90 font-black shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Layers className={`w-4 h-4 ${isTabActive('fabrics') ? 'text-amber-700' : 'text-stone-400'}`} />
              <span>{t.fabricInventory}</span>
            </div>
            {totalFabricsCount > 0 && (
              <span title={lowFabricCount ? `${lowFabricCount} low-stock fabrics` : undefined} className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                lowFabricCount > 0 ? 'bg-rose-500 text-white' : isTabActive('fabrics') ? 'bg-amber-200 text-amber-900' : 'bg-stone-100 text-stone-600'
              }`}>
                {lowFabricCount > 0 ? `! ${lowFabricCount}` : totalFabricsCount}
              </span>
            )}
          </button>

          <div className="hidden" aria-hidden="true">
          {/* Retail workspace */}
          <div className="my-2.5 border-t border-stone-200 pt-2.5">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              {language === 'fa' ? 'بخش فروش محصولات' : language === 'ps' ? 'د محصولاتو پلور' : 'Retail & Products'}
            </div>
          </div>

          {/* Products Inventory */}
          <button
            onClick={() => handleNavClick('products')}
            id="sidebar-products-link"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTabActive('products')
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/90 font-black shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className={`w-4 h-4 ${isTabActive('products') ? 'text-emerald-700' : 'text-stone-400'}`} />
              <span>{t.products}</span>
            </div>
            {products.length > 0 && (
              <span title={lowProductCount ? `${lowProductCount} low-stock products` : undefined} className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                lowProductCount > 0 ? 'bg-rose-500 text-white' : isTabActive('products') ? 'bg-emerald-200 text-emerald-900' : 'bg-stone-100 text-stone-600'
              }`}>
                {lowProductCount > 0 ? `! ${lowProductCount}` : products.length}
              </span>
            )}
          </button>

          {/* Sales History */}
          <button
            onClick={() => handleNavClick('sales_history')}
            id="sidebar-sales-history-link"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTabActive('sales_history')
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/90 font-black shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className={`w-4 h-4 ${isTabActive('sales_history') ? 'text-emerald-700' : 'text-stone-400'}`} />
              <span>{t.salesHistory || (language === 'fa' ? 'تاریخچه فروشات' : language === 'ps' ? 'د پلور تاریخچه' : 'Sales History')}</span>
            </div>
            {salesCount > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                isTabActive('sales_history') ? 'bg-emerald-200 text-emerald-900' : 'bg-stone-100 text-stone-600'
              }`}>
                {salesCount}
              </span>
            )}
          </button>

          </div>

          {/* Financials & Accounts workspace */}
          <div className="my-2.5 border-t border-stone-200 pt-2.5">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              {language === 'fa' ? 'حسابداری و مصارف' : language === 'ps' ? 'حسابونه او لګښتونه' : 'Finance & Expenses'}
            </div>
          </div>

          {/* Expenses */}
          <button
            onClick={() => handleNavClick('expenses')}
            id="sidebar-expenses-link"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTabActive('expenses')
                ? 'bg-amber-50 text-amber-900 border border-amber-200/90 font-black shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wallet className={`w-4 h-4 ${isTabActive('expenses') ? 'text-amber-700' : 'text-stone-400'}`} />
              <span>{t.expenses}</span>
            </div>
            {expensesCount > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                isTabActive('expenses') ? 'bg-amber-200 text-amber-900' : 'bg-stone-100 text-stone-600'
              }`}>
                {expensesCount}
              </span>
            )}
          </button>

          {/* Reports */}
          <button
            onClick={() => handleNavClick('reports')}
            id="sidebar-reports-link"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTabActive('reports')
                ? 'bg-amber-50 text-amber-900 border border-amber-200/90 font-black shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className={`w-4 h-4 ${isTabActive('reports') ? 'text-amber-700' : 'text-stone-400'}`} />
              <span>{language === 'fa' ? 'گزارش‌ها' : language === 'ps' ? 'راپورونه' : 'Reports'}</span>
            </div>
          </button>

          {/* System Section */}
          <div className="my-2.5 border-t border-stone-200 pt-2.5">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {language === 'fa' ? 'مدیریت سیستم' : language === 'ps' ? 'د سیستم اداره' : 'System'}
            </div>
          </div>

          {/* Settings */}
          <button
            onClick={() => handleNavClick('settings')}
            id="sidebar-settings-link"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTabActive('settings')
                ? 'bg-amber-50 text-amber-900 border border-amber-200/90 font-black shadow-2xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <SlidersHorizontal className={`w-4 h-4 ${isTabActive('settings') ? 'text-amber-700' : 'text-stone-400'}`} />
              <span>{t.designAndSettings}</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-stone-100 rounded text-stone-500 font-bold">
              6
            </span>
          </button>
        </div>

        {/* User Account & Sign Out Section */}
        <div className="px-3 py-2 mx-3 mb-2 rounded-xl bg-stone-100/90 border border-stone-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden leading-tight">
              <span className="font-bold text-stone-900 block text-[11px] truncate">
                {currentUser?.email || 'tailor1@gmail.com'}
              </span>
              <span className="text-[9px] text-stone-500 font-semibold block truncate">
                {currentUser?.name || t.adminAccount || 'Master Tailor Admin'}
              </span>
            </div>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              id="sidebar-signout-btn"
              title={t.signOut}
              className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
