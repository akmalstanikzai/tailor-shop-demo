import React, { useState, useEffect } from 'react';
import { 
  Order, 
  Customer, 
  MeasurementField, 
  DesignCategory, 
  ShopSettings, 
  Language,
  Fabric,
  Product,
  ProductSale,
  Expense
} from './types';
import { storageService } from './services/storage';
import { Navbar } from './components/Navbar';
import { Sidebar, MainNavTab, SettingsSubTab } from './components/Sidebar';
import { Dashboard } from './pages/DashboardPage';
import { OrderForm } from './components/OrderForm';
import { CustomersView } from './pages/CustomersPage';
import { FabricsView } from './pages/FabricsPage';
import { ExpensesView } from './pages/ExpensesPage';
import { DesignSettingsView } from './pages/SettingsPage';
import { ReceiptSlipModal } from './components/ReceiptSlipModal';
import { LoginView } from './pages/LoginPage';
import { ReportsView } from './pages/ReportsPage';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { getErrorMessage } from './lib/errors';
import { migrateLegacyLocalData } from './services/legacyMigration';

export default function App() {
  return <ShopApp />;
}

function ShopApp() {

  // 1. Language State & RTL
  const [language, setLanguage] = useState<Language>(() => storageService.getLanguage());

  // 2. Authentication State
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(() => storageService.getAuthUser());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      if (data?.user) {
        const u = { email: data.user.email || '', name: String(data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Admin') };
        setCurrentUser(u);
        storageService.saveAuthUser(u);
        if (isSupabaseConfigured) {
          migrateLegacyLocalData().then(() => storageService.syncFromDatabase()).then(reloadData).catch(console.warn);
        }
      }
    }).catch(() => {});
    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      const user = session?.user;
      const u = user ? { email: user.email || '', name: String(user.user_metadata?.name || user.email?.split('@')[0] || 'Admin') } : null;
      setCurrentUser(u);
      storageService.saveAuthUser(u);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  // 3. Data State
  const [orders, setOrders] = useState<Order[]>(() => storageService.getOrders());
  const [customers, setCustomers] = useState<Customer[]>(() => storageService.getCustomers());
  const [fabrics, setFabrics] = useState<Fabric[]>(() => storageService.getFabrics());
  const [products, setProducts] = useState<Product[]>(() => storageService.getProducts());
  const [productSales, setProductSales] = useState<ProductSale[]>(() => 
    storageService.getProductSales()
  );
  const [expenses, setExpenses] = useState<Expense[]>(() => 
    storageService.getExpenses()
  );
  const [measurementFields, setMeasurementFields] = useState<MeasurementField[]>(() => 
    storageService.getMeasurementFields()
  );
  const [designCategories, setDesignCategories] = useState<DesignCategory[]>(() => 
    storageService.getDesignCategories()
  );
  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => 
    storageService.getShopSettings()
  );

  // 4. Navigation & Modal State
  const [currentTab, setCurrentTab] = useState<MainNavTab>('dashboard');
  const [globalOrderSearch, setGlobalOrderSearch] = useState('');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('design');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);
  const [dbConnected, setDbConnected] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [prefilledCustomer, setPrefilledCustomer] = useState<Customer | null>(null);
  const [prefilledFabric, setPrefilledFabric] = useState<Fabric | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // Sync RTL and Document Language
  useEffect(() => {
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
    document.documentElement.lang = language === 'en' ? 'en' : language === 'fa' ? 'fa' : 'ps';
    storageService.saveLanguage(language);
  }, [language]);

  // Initial & Periodic Automatic Background Database Sync
  useEffect(() => {
    const checkDbHealth = () => {
      if (!isSupabaseConfigured) {
        setDbConnected(true);
        return;
      }
      supabase.from('orders').select('id', { head: true, count: 'exact' })
        .then(({ error }: any) => setDbConnected(!error))
        .catch(() => setDbConnected(false));
    };

    const doSync = () => {
      checkDbHealth();
      if (!isSupabaseConfigured) return;
      storageService.syncFromDatabase().then((updated) => {
        if (updated) {
          reloadData();
        }
      }).catch(() => {});
    };

    // Initial sync
    doSync();

    if (!isSupabaseConfigured) return;

    // Auto-sync every 8 seconds so orders from other computers appear automatically in real-time
    const syncInterval = setInterval(doSync, 8000);

    // Sync on window focus and visibility change
    const handleFocus = () => doSync();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        doSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Keyboard shortcuts (e.g. F2 for new order)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleStartNewOrder();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Refresh all state from storage
  const reloadData = () => {
    setOrders(storageService.getOrders());
    setCustomers(storageService.getCustomers());
    setFabrics(storageService.getFabrics());
    setProducts(storageService.getProducts());
    setProductSales(storageService.getProductSales());
    setExpenses(storageService.getExpenses());
    setMeasurementFields(storageService.getMeasurementFields());
    setDesignCategories(storageService.getDesignCategories());
    setShopSettings(storageService.getShopSettings());
  };

  // Switch Language
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  // Login handler
  const handleLoginSuccess = (user: { email: string; name: string }) => {
    storageService.saveAuthUser(user);
    setCurrentUser(user);
    // Immediately synchronize database on login so latest persistent records are shown
    migrateLegacyLocalData().then(() => storageService.syncFromDatabase()).then((updated) => {
      if (updated) reloadData();
    });
  };

  // Logout handler
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    storageService.saveAuthUser(null);
    setCurrentUser(null);
  };

  // Navigation Selection Handler (from Sidebar or Navbar)
  const handleSelectNav = (tab: MainNavTab, subTab?: SettingsSubTab) => {
    if (tab === 'new_order') {
      setEditingOrder(null);
      setPrefilledCustomer(null);
      setPrefilledFabric(null);
    }
    if (subTab) {
      setSettingsSubTab(subTab);
    }
    setCurrentTab(tab);
  };

  // Save Order Handler
  const handleSaveOrder = async (savedOrder: Order, shouldPrint: boolean) => {
    try {
      await storageService.saveOrderAsync(savedOrder);
    } catch (error) {
      const detail = getErrorMessage(error);
      console.warn('Supabase sync note on handleSaveOrder:', detail);
    }
    reloadData();
    setEditingOrder(null);
    setPrefilledCustomer(null);
    setPrefilledFabric(null);

    if (shouldPrint) {
      setActiveReceiptOrder(savedOrder);
    }
    setCurrentTab('dashboard');
    setNotification({
      type: 'success',
      message: language === 'fa' 
        ? `سفارش ${savedOrder.orderNumber} با موفقیت ثبت و ذخیره شد.` 
        : language === 'ps' 
        ? `فرمایش ${savedOrder.orderNumber} په بریالیتوب خوندي شو.` 
        : `Order ${savedOrder.orderNumber} saved successfully.`,
    });
    window.setTimeout(() => setNotification(null), 5000);
  };

  // Start New Blank Order
  const handleStartNewOrder = () => {
    setEditingOrder(null);
    setPrefilledCustomer(null);
    setPrefilledFabric(null);
    setCurrentTab('new_order');
  };

  // Start New Order for a Specific Customer (prefilled measurements!)
  const handleNewOrderForCustomer = (customer: Customer) => {
    setEditingOrder(null);
    setPrefilledCustomer(customer);
    setPrefilledFabric(null);
    setCurrentTab('new_order');
  };

  // Start New Order with a Selected Fabric from Fabric Inventory
  const handleNewOrderForFabric = (fabric: Fabric) => {
    setEditingOrder(null);
    setPrefilledCustomer(null);
    setPrefilledFabric(fabric);
    setCurrentTab('new_order');
  };

  // Edit Order
  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setPrefilledCustomer(null);
    setPrefilledFabric(null);
    setCurrentTab('new_order');
  };

  // View Receipt
  const handleViewReceipt = (order: Order) => {
    setActiveReceiptOrder(order);
  };

  // Select Customer from Dashboard
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCurrentTab('customers');
  };

  const isRtl = language === 'fa' || language === 'ps';

  // If not logged in, display the Login View
  if (!currentUser) {
    return (
      <LoginView
        language={language}
        shopSettings={shopSettings}
        onLanguageChange={handleLanguageChange}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#1A1A1A] flex flex-col font-sans selection:bg-amber-400/30">
      {notification && <div role="status" className={`fixed inset-x-3 top-3 sm:left-auto sm:right-4 sm:top-4 z-[100] sm:max-w-md rounded-xl border px-4 py-3 text-sm font-bold shadow-xl ${notification.type === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-rose-300 bg-rose-50 text-rose-800'}`}>{notification.message}</div>}
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        settingsSubTab={settingsSubTab}
        language={language}
        shopSettings={shopSettings}
        orders={orders}
        customers={customers}
        fabrics={fabrics}
        products={products}
        salesCount={productSales.length}
        expensesCount={expenses.length}
        designCategoriesCount={designCategories.length}
        isOpenOnMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        onSelectNav={handleSelectNav}
        onSignOut={handleSignOut}
        currentUser={currentUser}
      />

      {/* Main Content Layout with responsive margin for desktop sidebar */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${
        isRtl ? 'lg:mr-72' : 'lg:ml-72'
      }`}>
        {/* Top Navbar Header */}
        <Navbar
          currentTab={currentTab}
          language={language}
          shopSettings={shopSettings}
          onToggleSidebar={() => setIsSidebarOpenMobile(prev => !prev)}
          onTabChange={handleSelectNav}
          onSearchOrders={(query) => {
            setGlobalOrderSearch(query);
            if (query.trim()) setCurrentTab('dashboard');
          }}
          onLanguageChange={handleLanguageChange}
          onSignOut={handleSignOut}
          dbConnected={dbConnected}
        />

        {/* Main Content View Container */}
        <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-5">
          {currentTab === 'dashboard' && (
            <Dashboard
              orders={orders}
              productSales={productSales}
              globalSearchTerm={globalOrderSearch}
              shopSettings={shopSettings}
              language={language}
              onNewOrder={handleStartNewOrder}
              onEditOrder={handleEditOrder}
              onViewReceipt={handleViewReceipt}
              onSelectCustomer={handleSelectCustomer}
              onOrderUpdated={reloadData}
            />
          )}

          {currentTab === 'new_order' && (
            <OrderForm
              initialOrder={editingOrder}
              prefilledCustomer={prefilledCustomer}
              prefilledFabric={prefilledFabric}
              measurementFields={measurementFields}
              designCategories={designCategories}
              shopSettings={shopSettings}
              language={language}
              onSave={handleSaveOrder}
              onCancel={() => {
                setEditingOrder(null);
                setPrefilledCustomer(null);
                setPrefilledFabric(null);
                setCurrentTab('dashboard');
              }}
            />
          )}

          {currentTab === 'fabrics' && (
            <FabricsView
              fabrics={fabrics}
              shopSettings={shopSettings}
              language={language}
              onFabricUpdated={reloadData}
              onSelectFabricForOrder={handleNewOrderForFabric}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              orders={orders}
              productSales={productSales}
              shopSettings={shopSettings}
              language={language}
              onExpenseUpdated={reloadData}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              orders={orders}
              products={products}
              fabrics={fabrics}
              productSales={productSales}
              expenses={expenses}
              shopSettings={shopSettings}
              language={language}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              customers={customers}
              orders={orders}
              productSales={productSales}
              measurementFields={measurementFields}
              shopSettings={shopSettings}
              language={language}
              selectedCustomerId={selectedCustomerId}
              onNewOrderForCustomer={handleNewOrderForCustomer}
              onViewReceipt={handleViewReceipt}
              onCustomerUpdated={reloadData}
            />
          )}

          {currentTab === 'settings' && (
            <DesignSettingsView
              designCategories={designCategories}
              measurementFields={measurementFields}
              shopSettings={shopSettings}
              language={language}
              activeSubTab={settingsSubTab}
              onSubTabChange={setSettingsSubTab}
              onUpdateShopSettings={setShopSettings}
              onCategoryUpdated={reloadData}
              onMeasurementFieldsUpdated={reloadData}
              onSettingsUpdated={reloadData}
              onDatabaseRestored={reloadData}
            />
          )}
        </main>
      </div>

      {/* Printable Receipt Modal Slip */}
      {activeReceiptOrder && (
        <ReceiptSlipModal
          order={activeReceiptOrder}
          shopSettings={shopSettings}
          measurementFields={measurementFields}
          designCategories={designCategories}
          language={language}
          onClose={() => setActiveReceiptOrder(null)}
        />
      )}
    </div>
  );
}
