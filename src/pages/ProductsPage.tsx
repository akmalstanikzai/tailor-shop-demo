import React, { useState, useMemo } from 'react';
import { Product, ProductCategory, ProductSale, Language } from '../types';
import { translations } from '../translations/i18n';
import { storageService } from '../services/storage';
import { searchText, textIncludes } from '../lib/search';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Tag, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Edit3, 
  Trash2, 
  ShoppingCart, 
  Check, 
  X, 
  Filter, 
  ArrowUpRight,
  Clock,
  Layers,
  Sparkles,
  Watch,
  Footprints,
  Flame,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  categories: ProductCategory[];
  sales: ProductSale[];
  currencySymbol: string;
  language: Language;
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onMakeSale: (product: Product) => void;
  onAddCategory: (categoryName: string) => Promise<ProductCategory>;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  sales,
  currencySymbol: propCurrencySymbol,
  language,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onMakeSale,
  onAddCategory
}) => {
  const currencySymbol = propCurrencySymbol || (language === 'ps' ? 'افغانۍ' : language === 'fa' ? 'افغانی' : 'AFN');
  const t = translations[language];

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [activeViewTab, setActiveViewTab] = useState<'inventory' | 'sales'>('inventory');

  // Configurable Low Stock Threshold (default: 3 units)
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(() => storageService.getUiPreferences().productLowStockThreshold);

  const handleUpdateThreshold = (val: number) => {
    const cleaned = Math.max(1, val);
    setLowStockThreshold(cleaned);
    storageService.saveUiPreferences({ ...storageService.getUiPreferences(), productLowStockThreshold: cleaned });
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Add/Edit Form State (NOTE: strictly NO selling price field as requested)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Shoes',
    brand: '',
    sku: '',
    purchasePrice: 0,
    stockQuantity: 1,
    description: '',
    imageUrl: ''
  });

  // New category creation input
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Calculations & Analytics
  const summary = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stockQuantity) || 0), 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + ((Number(p.purchasePrice) || 0) * (Number(p.stockQuantity) || 0)), 0);
    const lowStockCount = products.filter(p => {
      const s = Number(p.stockQuantity) || 0;
      return s > 0 && s <= lowStockThreshold;
    }).length;
    
    const totalSalesRevenue = sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalProfit = sales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    
    return {
      totalProducts,
      totalStock,
      totalInventoryValue,
      lowStockCount,
      totalSalesRevenue,
      totalProfit
    };
  }, [products, sales, lowStockThreshold]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        textIncludes(p.name, searchTerm) ||
        textIncludes(p.sku, searchTerm) ||
        textIncludes(p.brand, searchTerm) ||
        textIncludes(p.category, searchTerm);

      const matchesCat = selectedCategory === 'all' || searchText(p.category) === searchText(selectedCategory);

      let matchesStock = true;
      const s = Number(p.stockQuantity) || 0;
      if (stockFilter === 'in_stock') matchesStock = s > lowStockThreshold;
      else if (stockFilter === 'low_stock') matchesStock = s > 0 && s <= lowStockThreshold;
      else if (stockFilter === 'out_of_stock') matchesStock = s <= 0;

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter, lowStockThreshold]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    const randomSku = `PRD-${Math.floor(100 + Math.random() * 900)}`;
    setFormData({
      name: '',
      category: categories[0]?.name || 'Shoes',
      brand: '',
      sku: randomSku,
      purchasePrice: 0,
      stockQuantity: 1,
      description: '',
      imageUrl: ''
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      category: prod.category,
      brand: prod.brand || '',
      sku: prod.sku || '',
      purchasePrice: prod.purchasePrice || 0,
      stockQuantity: prod.stockQuantity || 0,
      description: prod.description || '',
      imageUrl: prod.imageUrl || ''
    });
    setIsAddModalOpen(true);
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProduct) {
      await onUpdateProduct({
        ...editingProduct,
        name: formData.name.trim(),
        category: formData.category,
        brand: formData.brand.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        purchasePrice: Number(formData.purchasePrice) || 0,
        stockQuantity: Number(formData.stockQuantity) || 0,
        description: formData.description.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
        updatedAt: new Date().toISOString()
      });
    } else {
      await onAddProduct({
        name: formData.name.trim(),
        category: formData.category,
        brand: formData.brand.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        purchasePrice: Number(formData.purchasePrice) || 0,
        stockQuantity: Number(formData.stockQuantity) || 0,
        description: formData.description.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined
      });
    }

    setIsAddModalOpen(false);
    setEditingProduct(null);
  };

  // Quick category icon helper
  const getCategoryIcon = (categoryName: string) => {
    const lower = searchText(categoryName);
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

  // Quick add category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    await onAddCategory(newCategoryName.trim());
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleRestock = async (product: Product) => {
    const label = language === 'fa' ? 'تعداد برای افزایش موجودی' : language === 'ps' ? 'د موجودۍ زیاتولو لپاره تعداد' : 'Units to add to stock';
    const amount = Number(window.prompt(label, '5'));
    if (Number.isFinite(amount) && amount > 0) {
      await onUpdateProduct({
        ...product,
        stockQuantity: (Number(product.stockQuantity) || 0) + amount,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center text-[#B39025]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span>{t.productsInventory}</span>
          </h1>
          <p className="text-xs text-stone-700 font-medium mt-1">
            {language === 'fa' 
              ? 'مدیریت اجناس و محصولات دکان (بوت، ساعت، عطر و غیره) با ثبت قیمت خرید و تعیین قیمت فروش هنگام معامله'
              : language === 'ps'
              ? 'د هټۍ د توکو اداره (بوټان، ساعتونه، عطرونه او نور) د پېرودلو بیې سره او د پلور په وخت د پلور بیې ټاکل'
              : 'Manage shop products (Shoes, Watches, Perfumes) with purchase price tracking and flexible selling price on sale'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* View toggle (Inventory vs Sales Log) */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-bold">
            <button
              onClick={() => setActiveViewTab('inventory')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeViewTab === 'inventory'
                  ? 'bg-white text-[#1A1A1A] shadow-xs'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              {t.products} ({products.length})
            </button>
            <button
              onClick={() => setActiveViewTab('sales')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeViewTab === 'sales'
                  ? 'bg-white text-[#1A1A1A] shadow-xs'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              {t.salesHistory} ({sales.length})
            </button>
          </div>

          <button
            onClick={handleOpenAddModal}
            id="btn-add-new-product"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#C29E2E] text-[#1A1A1A] rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addProduct}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-700 block">
              {language === 'fa' ? 'تعداد اجناس' : language === 'ps' ? 'د توکو شمیر' : 'Total Items'}
            </span>
            <span className="text-xl font-black text-[#1A1A1A] font-mono mt-0.5 block">
              {summary.totalProducts}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#B39025]">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-700 block">
              {language === 'fa' ? 'موجودی کل' : language === 'ps' ? 'ټوله موجوده' : 'Stock in Store'}
            </span>
            <span className="text-xl font-black text-[#1A1A1A] font-mono mt-0.5 block">
              {summary.totalStock}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-700 block">
              {language === 'fa' ? 'سرمایه جنس گدام' : language === 'ps' ? 'د ګدام سرمایه' : 'Inventory Cost'}
            </span>
            <span className="text-xl font-black text-[#1A1A1A] font-mono mt-0.5 block">
              {summary.totalInventoryValue.toLocaleString()} <span className="text-xs font-normal text-stone-700">{currencySymbol}</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-700 block">
              {language === 'fa' ? 'مجموع مفاد فروش' : language === 'ps' ? 'د پلور ټوله ګټه' : 'Total Sales Profit'}
            </span>
            <span className="text-xl font-black text-emerald-600 font-mono mt-0.5 block">
              +{summary.totalProfit.toLocaleString()} <span className="text-xs font-normal text-stone-700">{currencySymbol}</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {activeViewTab === 'inventory' ? (
        <>
          {/* Category Chips Bar & Search */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] shadow-xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-600 absolute start-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t.searchProductPlaceholder}
                className="w-full ps-10 pe-9 py-2 bg-stone-50 border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:bg-white transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-800 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills & Stock status pills with configurable threshold */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#1A1A1A] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t.allCategories} ({products.length})</span>
                </button>

                {categories.map(cat => {
                  const count = products.filter(p => searchText(p.category) === searchText(cat.name)).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                        searchText(selectedCategory) === searchText(cat.name)
                          ? 'bg-[#D4AF37] text-[#1A1A1A] shadow-xs font-black'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {getCategoryIcon(cat.name)}
                      <span>{cat.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">({count})</span>
                    </button>
                  );
                })}

                {/* Add Category quick toggle */}
                {!isAddingCategory ? (
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#B39025] hover:bg-amber-50 border border-dashed border-[#D4AF37]/50 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addCategory}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Perfume"
                      className="px-2.5 py-1 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium w-28 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="p-1 bg-[#D4AF37] text-white rounded-lg cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="p-1 bg-stone-200 text-stone-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Stock Filter Pills & Configurable Threshold Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setStockFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      stockFilter === 'all'
                        ? 'bg-[#1A1A1A] text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {t.all}
                  </button>
                  <button
                    onClick={() => setStockFilter('in_stock')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      stockFilter === 'in_stock'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {t.inStock}
                  </button>
                  <button
                    onClick={() => setStockFilter('low_stock')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      stockFilter === 'low_stock'
                        ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{t.lowStock} ({summary.lowStockCount})</span>
                  </button>
                </div>

                {/* Configurable Low Stock Threshold Input */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <span className="text-[11px] font-bold">{t.lowStockThreshold || (language === 'fa' ? 'آستانه هشدار کمبود:' : 'Alert Threshold:')}</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={lowStockThreshold}
                    onChange={e => handleUpdateThreshold(parseInt(e.target.value) || 1)}
                    className="w-12 px-1 py-0.5 bg-white border border-amber-300 rounded text-center text-xs font-bold font-mono text-stone-900"
                  />
                  <span className="text-[11px] font-medium">{t.units}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Products Rows Layout */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="font-extrabold text-stone-800 text-sm">{t.noProductsFound}</h3>
              <p className="text-xs text-stone-700 mt-1 max-w-sm mx-auto">
                {language === 'fa' 
                  ? 'هنوز جنسی در این کتگوری اضافه نگردیده است. با دکمه بالا جنس جدید اضافه کنید.'
                  : 'No products found. Use the Add Product button above to add Shoes, Watches, or Perfumes.'}
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-4 px-4 py-2 bg-[#D4AF37] text-[#1A1A1A] font-bold text-xs rounded-xl hover:bg-[#C29E2E] transition cursor-pointer"
              >
                {t.addProduct}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xs overflow-hidden divide-y divide-stone-200">
              {/* Header Row for Large Screens */}
              <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 bg-stone-50 text-[11px] font-bold text-stone-600 uppercase tracking-wider border-b border-stone-200">
                <div className="col-span-3">
                  {language === 'fa' ? 'محصول و کتگوری' : language === 'ps' ? 'توکی او کتګوري' : 'Product & Category'}
                </div>
                <div className="col-span-2">
                  {language === 'fa' ? 'کد / برند' : language === 'ps' ? 'کوډ / برنډ' : 'SKU / Brand'}
                </div>
                <div className="col-span-2 text-start">
                  {t.purchasePrice} ({currencySymbol})
                </div>
                <div className="col-span-2 text-start">
                  {t.inStock}
                </div>
                <div className="col-span-3 text-end">
                  {t.actions}
                </div>
              </div>

              {/* Individual Product Rows */}
              {filteredProducts.map(product => {
                const stock = Number(product.stockQuantity) || 0;
                const isLow = stock > 0 && stock <= lowStockThreshold;
                const isOut = stock <= 0;

                return (
                  <div
                    key={product.id}
                    id={`product-row-${product.id}`}
                    className={`p-4 lg:px-5 lg:py-3.5 hover:bg-stone-50/70 transition-colors flex flex-col lg:grid lg:grid-cols-12 gap-3 items-start lg:items-center ${
                      isLow ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    {/* 1. Name & Category */}
                    <div className="w-full lg:col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#B39025] shrink-0">
                        {getCategoryIcon(product.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                            {product.category}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-[#1A1A1A] leading-tight truncate">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-[11px] text-stone-700 italic truncate max-w-[220px]" title={product.description}>
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 2. SKU / Brand */}
                    <div className="w-full lg:col-span-2 text-xs text-stone-700">
                      {product.sku && (
                        <div className="font-mono font-bold text-stone-800 text-[11px]">
                          № {product.sku}
                        </div>
                      )}
                      {product.brand && (
                        <div className="text-[11px] text-stone-700 mt-0.5">
                          {language === 'fa' ? 'برند:' : 'Brand:'} <span className="font-semibold text-stone-800">{product.brand}</span>
                        </div>
                      )}
                    </div>

                    {/* 3. Purchase Price (Cost) */}
                    <div className="w-full lg:col-span-2 text-xs">
                      <span className="text-[10px] text-stone-700 block lg:hidden">{t.purchasePrice}:</span>
                      <span className="font-mono font-black text-[#1A1A1A] text-sm">
                        {Number(product.purchasePrice).toLocaleString()} <span className="text-[11px] font-normal text-stone-700">{currencySymbol}</span>
                      </span>
                      <span className="text-[10px] text-stone-700 block mt-0.5">
                        {language === 'fa' ? '(قیمت خرید)' : '(Purchase Cost)'}
                      </span>
                    </div>

                    {/* 4. In Stock */}
                    <div className="w-full lg:col-span-2 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-[#1A1A1A]">
                          {stock} <span className="text-xs font-normal text-stone-700">{t.units}</span>
                        </span>
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 border border-amber-600 shadow-xs animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{t.lowStockAlert || (language === 'fa' ? 'کمبود موجودی' : 'Low Stock')} (&le;{lowStockThreshold})</span>
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isOut ? t.outOfStock : t.inStock}
                          </span>
                        )}
                      </div>

                      {/* Quick stock +/- */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdateProduct({ ...product, stockQuantity: Math.max(0, stock - 1) })}
                          className="px-1.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                          title="-1"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateProduct({ ...product, stockQuantity: stock + 1 })}
                          className="px-1.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                          title="+1"
                        >
                          +1
                        </button>
                      </div>
                    </div>

                    {/* 5. Row Actions (Sell / Edit / Delete) */}
                    <div className="w-full lg:col-span-3 flex items-center justify-between lg:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                      {/* Sell Button - Decides selling price now! */}
                      <button
                        onClick={() => onMakeSale(product)}
                        disabled={stock <= 0}
                        className={`py-1.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          stock <= 0
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{t.sellProduct}</span>
                      </button>

                      {(isLow || isOut) && (
                        <button
                          type="button"
                          onClick={() => handleRestock(product)}
                          className="py-1.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-2xs bg-amber-500 hover:bg-amber-600 text-stone-950"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>{language === 'fa' ? 'افزایش موجودی' : language === 'ps' ? 'موجودي زیاته کړئ' : 'Restock'}</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1 ms-auto lg:ms-0">
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          title={t.edit}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteProduct(product.id)}
                          title={t.delete}
                          className="p-1.5 text-stone-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Sales History View */
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-[#1A1A1A]">{t.salesHistory}</h3>
            </div>
            <span className="text-xs font-mono text-stone-700">
              {sales.length} {language === 'fa' ? 'معامله ثبت شده' : 'Sales Records'}
            </span>
          </div>

          {sales.length === 0 ? (
            <div className="p-12 text-center text-stone-700 text-xs">
              {language === 'fa' ? 'تاکنون هیچ فروشی ثبت نشده است.' : 'No sales recorded yet. Click Sell on any product to register a sale.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4 text-start">{t.date}</th>
                    <th className="py-2.5 px-4 text-start">{t.product}</th>
                    <th className="py-2.5 px-4 text-start">{t.quantity}</th>
                    <th className="py-2.5 px-4 text-start">{t.purchasePrice}</th>
                    <th className="py-2.5 px-4 text-start">{t.sellingPrice}</th>
                    <th className="py-2.5 px-4 text-start">{t.totalAmount}</th>
                    <th className="py-2.5 px-4 text-start">{t.profit}</th>
                    <th className="py-2.5 px-4 text-start">{t.customer}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4 font-mono text-stone-700">
                        {sale.saleDate ? sale.saleDate.slice(0, 10) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#1A1A1A] block">{sale.productName}</span>
                        <span className="text-[10px] text-stone-700">{sale.category}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {sale.quantity}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-700">
                        {sale.purchasePrice.toLocaleString()} {currencySymbol}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#1A1A1A]">
                        {sale.sellingPrice.toLocaleString()} {currencySymbol}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-stone-900">
                        {sale.totalAmount.toLocaleString()} {currencySymbol}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                        +{sale.profit.toLocaleString()} {currencySymbol}
                      </td>
                      <td className="py-3 px-4 text-stone-700">
                        {sale.customerName || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Add / Edit Product (CRITICAL: Strictly NO Selling Price field requested) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center text-[#B39025]">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-[#1A1A1A]">
                    {editingProduct ? t.editProduct : t.addProduct}
                  </h2>
                  <p className="text-[11px] text-stone-700">
                    {language === 'fa' 
                      ? 'قیمت فروش هنگام عرضه و معامله جنس تعیین می‌شود' 
                      : 'Selling price will be decided when selling the product'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-stone-600 hover:text-stone-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t.productName} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. بوت چرمی اعلا / ساعت مچی / عطر شیخ"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#D4AF37] outline-hidden"
                />
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.category} *
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-[#1A1A1A] outline-hidden cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.brand} / {language === 'fa' ? 'سازنده' : 'Manufacturer'}
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Rolex, Bata, Dior"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#D4AF37] outline-hidden"
                  />
                </div>
              </div>

              {/* Purchase Price (Cost) & Initial Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.purchasePrice} ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={formData.purchasePrice === 0 ? '' : formData.purchasePrice}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, purchasePrice: val === '' ? 0 : parseFloat(val) || 0 });
                    }}
                    placeholder="1200"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-[#1A1A1A] focus:bg-white focus:border-[#D4AF37] outline-hidden"
                  />
                  <span className="text-[10px] text-stone-700 mt-0.5 block">
                    {language === 'fa' ? 'قیمتی که جنس را خریده‌اید' : 'Price you paid for the product'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.initialStock} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stockQuantity}
                    onChange={e => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-[#1A1A1A] focus:bg-white focus:border-[#D4AF37] outline-hidden"
                  />
                </div>
              </div>

              {/* SKU / Code */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t.sku} ({language === 'fa' ? 'کد جنس' : 'Item Code'})
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={e => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="PRD-101"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:border-[#D4AF37] outline-hidden"
                />
              </div>

              {/* Notes / Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t.description} ({language === 'fa' ? 'توضیحات اختیاری: سایز، رنگ، جزئیات' : 'Optional details'})
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. سایز ۴۱ و ۴۲، رنگ قهوه‌ای تیره..."
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#D4AF37] outline-hidden"
                />
              </div>

              {/* Selling price reassurance notice */}
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <Sparkles className="w-4 h-4 text-[#B39025] shrink-0 mt-0.5" />
                <p>
                  {language === 'fa'
                    ? 'طبق خواسته شما، قیمت فروش در این مرحله درج نمی‌شود. هنگام فروش هر جنس، قیمت فروش را دلخواه خود تعیین می‌نمایید.'
                    : 'Selling price is not fixed here. You will set the exact selling price at the time of each sale.'}
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#C29E2E] text-[#1A1A1A] rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
                >
                  {editingProduct ? t.updateProduct : t.addProduct}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
