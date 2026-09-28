import React, { useState, useMemo } from 'react';
import { Fabric, ShopSettings, Language } from '../types';
import { translations } from '../translations/i18n';
import { storageService } from '../services/storage';
import { textIncludes } from '../lib/search';
import { 
  Layers, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Scissors, 
  Check, 
  X, 
  Sparkles,
  AlertTriangle,
  Package,
  ArrowUpDown
} from 'lucide-react';

interface FabricsViewProps {
  fabrics: Fabric[];
  shopSettings: ShopSettings;
  language: Language;
  onFabricUpdated: () => void;
  onSelectFabricForOrder?: (fabric: Fabric) => void;
}

export const FabricsView: React.FC<FabricsViewProps> = ({
  fabrics,
  shopSettings,
  language,
  onFabricUpdated,
  onSelectFabricForOrder,
}) => {
  const t = translations[language];

  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [editingFabric, setEditingFabric] = useState<Fabric | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Configurable Low Stock Threshold (default: 15 meters)
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(() => storageService.getUiPreferences().fabricLowStockThreshold);

  const handleUpdateThreshold = (val: number) => {
    const cleaned = Math.max(1, val);
    setLowStockThreshold(cleaned);
    storageService.saveUiPreferences({ ...storageService.getUiPreferences(), fabricLowStockThreshold: cleaned });
  };

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formType, setFormType] = useState('');
  const [formPrice, setFormPrice] = useState<number>(500);
  const [formStock, setFormStock] = useState<number>(50);
  const [formNotes, setFormNotes] = useState('');

  const currencySymbol = language === 'ps' 
    ? (shopSettings?.currencyPs || 'افغانۍ') 
    : language === 'fa' 
    ? (shopSettings?.currencyFa || 'افغانی') 
    : (shopSettings?.currencySymbol || shopSettings?.currencyEn || 'AFN');

  // Filtered Fabrics
  const filteredFabrics = useMemo(() => {
    return fabrics.filter(fabric => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || (
        textIncludes(fabric.name, q) ||
        textIncludes(fabric.code, q) ||
        textIncludes(fabric.color, q) ||
        textIncludes(fabric.type, q) ||
        textIncludes(fabric.notes, q)
      );

      let matchesStock = true;
      const stock = Number(fabric.stockMeters) || 0;
      if (stockFilter === 'in_stock') matchesStock = stock > lowStockThreshold;
      else if (stockFilter === 'low_stock') matchesStock = stock > 0 && stock <= lowStockThreshold;
      else if (stockFilter === 'out_of_stock') matchesStock = stock <= 0;

      return matchesSearch && matchesStock;
    });
  }, [fabrics, searchTerm, stockFilter, lowStockThreshold]);

  // Total stock summary
  const summary = useMemo(() => {
    const totalVarieties = fabrics.length;
    const totalMeters = fabrics.reduce((sum, f) => sum + (Number(f.stockMeters) || 0), 0);
    const lowStockCount = fabrics.filter(f => {
      const s = Number(f.stockMeters) || 0;
      return s > 0 && s <= lowStockThreshold;
    }).length;
    const totalValue = fabrics.reduce((sum, f) => sum + ((Number(f.stockMeters) || 0) * (Number(f.pricePerMeter) || 0)), 0);

    return { totalVarieties, totalMeters, lowStockCount, totalValue };
  }, [fabrics, lowStockThreshold]);

  const openAddModal = () => {
    const nextNum = (fabrics.length + 1).toString().padStart(3, '0');
    setEditingFabric(null);
    setFormName('');
    setFormCode(`FAB-${nextNum}`);
    setFormColor('');
    setFormType('نخی لته (Cotton Latha)');
    setFormPrice(500);
    setFormStock(50);
    setFormNotes('');
    setIsAddingNew(true);
  };

  const openEditModal = (fabric: Fabric) => {
    setEditingFabric(fabric);
    setFormName(fabric.name);
    setFormCode(fabric.code);
    setFormColor(fabric.color);
    setFormType(fabric.type);
    setFormPrice(fabric.pricePerMeter);
    setFormStock(fabric.stockMeters);
    setFormNotes(fabric.notes || '');
    setIsAddingNew(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const fabricToSave: Fabric = {
      id: editingFabric ? editingFabric.id : `fab_${Date.now()}`,
      name: formName.trim(),
      code: formCode.trim() || `FAB-${Date.now().toString().slice(-4)}`,
      color: formColor.trim() || 'سفید / White',
      type: formType.trim() || 'نخی لته',
      pricePerMeter: Number(formPrice) || 0,
      stockMeters: Number(formStock) || 0,
      notes: formNotes.trim(),
      updatedAt: new Date().toISOString(),
      createdAt: editingFabric?.createdAt || new Date().toISOString(),
    };

    storageService.saveFabric(fabricToSave);
    setIsAddingNew(false);
    setEditingFabric(null);
    onFabricUpdated();
  };

  const handleDelete = (fabric: Fabric) => {
    if (window.confirm(`${t.confirmDelete} (${fabric.name})`)) {
      storageService.deleteFabric(fabric.id);
      onFabricUpdated();
    }
  };

  const handleUpdateStock = (fabric: Fabric, newStock: number) => {
    storageService.saveFabric({
      ...fabric,
      stockMeters: Math.max(0, newStock),
      updatedAt: new Date().toISOString()
    });
    onFabricUpdated();
  };

  const handleRestock = (fabric: Fabric) => {
    const label = language === 'fa' ? 'تعداد متر برای افزایش موجودی' : language === 'ps' ? 'د موجودۍ زیاتولو لپاره متره' : 'Meters to add to stock';
    const amount = Number(window.prompt(label, '10'));
    if (Number.isFinite(amount) && amount > 0) {
      handleUpdateStock(fabric, (Number(fabric.stockMeters) || 0) + amount);
    }
  };

  // Quick preset template
  const applyPreset = (presetName: string, presetType: string, presetColor: string, defaultPrice: number) => {
    setFormName(presetName);
    setFormType(presetType);
    setFormColor(presetColor);
    setFormPrice(defaultPrice);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-xs">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-7 bg-[#D4AF37] rounded-full inline-block shrink-0" />
          <div>
            <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">
              {t.fabricInventory}
            </h1>
            <p className="text-xs text-stone-700 font-medium">
              {language === 'fa' 
                ? 'مدیریت موجودی رخت‌ها، قیمت فی متر و موجودی گدام' 
                : language === 'ps' 
                ? 'د رختونو موجودي، د متر بیه او د ذخیرې مدیریت'
                : 'Manage shop fabrics stock, meters available and price per meter'}
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          id="btn-add-new-fabric"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#C29E2E] text-[#1A1A1A] rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addFabric}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-700 block">
              {language === 'fa' ? 'انواع رخت ثبت شده' : language === 'ps' ? 'د رختونو ډولونه' : 'Fabric Types'}
            </span>
            <span className="text-xl font-black text-[#1A1A1A] font-mono mt-0.5 block">
              {summary.totalVarieties}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#D4AF37]">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-700 block">
              {language === 'fa' ? 'مجموع موجودی (متر)' : language === 'ps' ? 'ټوله ذخیره (متره)' : 'Total Stock'}
            </span>
            <span className="text-xl font-black text-[#1A1A1A] font-mono mt-0.5 block">
              {summary.totalMeters.toLocaleString()} <span className="text-xs font-normal text-stone-700">{t.meters}</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-700 block">
              {language === 'fa' ? 'موجودی کم / هشدار' : language === 'ps' ? 'لږ پاتې رختونه' : 'Low Stock Warning'}
            </span>
            <span className="text-xl font-black text-amber-600 font-mono mt-0.5 block">
              {summary.lowStockCount}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-700 block">
              {language === 'fa' ? 'ارزش کل موجودی' : language === 'ps' ? 'د ذخیرې ټول ارزښت' : 'Inventory Value'}
            </span>
            <span className="text-xl font-black text-[#1A1A1A] font-mono mt-0.5 block">
              {summary.totalValue.toLocaleString()} <span className="text-xs font-normal text-stone-700">{currencySymbol}</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E5E5] shadow-xs">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-600 absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t.searchFabricPlaceholder}
            className="w-full ps-10 pe-9 py-2 bg-stone-50 border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:bg-white transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stock status pills & Configurable Low Stock Threshold */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-[#1A1A1A] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t.all} ({fabrics.length})
            </button>
            <button
              onClick={() => setStockFilter('in_stock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                stockFilter === 'in_stock'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {t.inStock}
            </button>
            <button
              onClick={() => setStockFilter('low_stock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                stockFilter === 'low_stock'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t.lowStock} ({summary.lowStockCount})</span>
            </button>
          </div>

          {/* Configurable Threshold Input */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900">
            <span className="text-[11px] font-bold">{t.lowStockThreshold || (language === 'fa' ? 'آستانه هشدار کمبود:' : 'Alert Threshold:')}</span>
            <input
              type="number"
              min="1"
              max="500"
              value={lowStockThreshold}
              onChange={e => handleUpdateThreshold(parseInt(e.target.value) || 1)}
              className="w-14 px-1.5 py-0.5 bg-white border border-amber-300 rounded text-center text-xs font-bold font-mono text-stone-900"
            />
            <span className="text-[11px] font-medium">{t.meters}</span>
          </div>
        </div>
      </div>

      {/* Fabric Cards Grid */}
      {filteredFabrics.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-600 mb-3">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">{t.noDataFound}</h3>
          <p className="text-xs text-stone-700 max-w-sm mx-auto mb-4">
            {language === 'fa' 
              ? 'هیچ رختی با این مشخصات یافت نشد. می‌توانید رخت جدید ثبت نمایید.' 
              : 'No fabrics matching your search criteria.'}
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#C29E2E] text-[#1A1A1A] rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addFabric}</span>
          </button>
        </div>
      ) : (
        /* Fabric Inventory Rows Form */
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xs overflow-hidden divide-y divide-stone-200">
          {/* Header Row for Large Screens */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 bg-stone-50 text-[11px] font-bold text-stone-600 uppercase tracking-wider border-b border-stone-200">
            <div className="col-span-2">
              {language === 'fa' ? 'کد و رخت' : language === 'ps' ? 'کوډ او رخت' : 'Code & Name'}
            </div>
            <div className="col-span-2">
              {language === 'fa' ? 'جنس و رنگ' : language === 'ps' ? 'جنس او رنګ' : 'Material & Color'}
            </div>
            <div className="col-span-3">
              {language === 'fa' ? 'موجودی و ذخیره' : language === 'ps' ? 'موجودي او زېرمه' : 'Stock (Meters)'}
            </div>
            <div className="col-span-2 text-start">
              {t.pricePerMeter}
            </div>
            <div className="col-span-3 text-end">
              {t.actions}
            </div>
          </div>

          {/* Individual Fabric Rows */}
          {filteredFabrics.map(fabric => {
            const stock = Number(fabric.stockMeters) || 0;
            const isLow = stock > 0 && stock <= lowStockThreshold;
            const isOut = stock <= 0;
            const totalRowValue = stock * (Number(fabric.pricePerMeter) || 0);

            return (
              <div
                key={fabric.id}
                id={`fabric-row-${fabric.id}`}
                className={`p-4 lg:px-5 lg:py-3.5 hover:bg-stone-50/70 transition-colors flex flex-col lg:grid lg:grid-cols-12 gap-3 items-start lg:items-center ${
                  isLow ? 'bg-amber-50/30' : ''
                }`}
              >
                {/* 1. Code & Name */}
                <div className="w-full lg:col-span-2 flex items-center gap-2.5">
                  <span className="font-mono text-xs font-black px-2.5 py-1 bg-stone-100 text-stone-800 rounded-lg border border-stone-200 shrink-0">
                    {fabric.code}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-[#1A1A1A] leading-tight truncate">
                      {fabric.name}
                    </h3>
                    {fabric.notes && (
                      <p className="text-[11px] text-stone-700 italic truncate max-w-[200px]" title={fabric.notes}>
                        {fabric.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Type & Color */}
                <div className="w-full lg:col-span-2 text-xs text-stone-700">
                  <div className="flex items-center gap-1.5 font-semibold text-[#1A1A1A]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] shrink-0 inline-block" />
                    <span>{fabric.color}</span>
                  </div>
                  <span className="text-[11px] text-stone-700 block mt-0.5">
                    {fabric.type}
                  </span>
                </div>

                {/* 3. Stock with meters & progress bar */}
                <div className="w-full lg:col-span-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[#1A1A1A] text-sm">
                        {stock} <span className="text-xs font-normal text-stone-700">{t.meters}</span>
                      </span>
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 border border-amber-600 shadow-xs animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{t.lowStockAlert || (language === 'fa' ? 'کمبود موجودی' : 'Low Stock')} (&le;{lowStockThreshold}{t.meters})</span>
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

                    {/* Quick +/- Stock buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateStock(fabric, Math.max(0, stock - 5))}
                        title="-5m"
                        className="px-1.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                      >
                        -5m
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStock(fabric, stock + 5)}
                        title="+5m"
                        className="px-1.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                      >
                        +5m
                      </button>
                    </div>
                  </div>

                  <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (stock / 60) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 4. Price per meter & Total Row Value */}
                <div className="w-full lg:col-span-2 text-xs">
                  <div className="font-mono font-extrabold text-[#1A1A1A] text-sm">
                    {Number(fabric.pricePerMeter).toLocaleString()} <span className="text-[11px] font-normal text-stone-700">{currencySymbol} / {t.meters}</span>
                  </div>
                  <div className="text-[10px] text-stone-700 font-mono mt-0.5">
                    {language === 'fa' ? 'ارزش:' : language === 'ps' ? 'ارزښت:' : 'Value:'} {totalRowValue.toLocaleString()} {currencySymbol}
                  </div>
                </div>

                {/* 5. Row Actions */}
                <div className="w-full lg:col-span-3 flex items-center justify-between lg:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                  {(isLow || isOut) && (
                    <button
                      type="button"
                      onClick={() => handleRestock(fabric)}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>{language === 'fa' ? 'افزایش موجودی' : language === 'ps' ? 'موجودي زیاته کړئ' : 'Restock'}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1 ms-auto lg:ms-0">
                    <button
                      onClick={() => openEditModal(fabric)}
                      title={t.edit}
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(fabric)}
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

      {/* Add / Edit Fabric Modal */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center text-[#B39025]">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="font-extrabold text-base text-[#1A1A1A]">
                  {editingFabric ? t.editFabric : t.addFabric}
                </h2>
              </div>
              <button
                onClick={() => setIsAddingNew(false)}
                className="p-1 text-stone-600 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Preset Badges */}
            {!editingFabric && (
              <div className="px-6 pt-3 pb-1 border-b border-stone-100 bg-amber-50/50">
                <span className="text-[11px] font-bold text-stone-700 block mb-1.5">
                  {language === 'fa' ? 'انتخاب سریع از رخت‌های پرکاربرد افغانی:' : 'Quick Presets:'}
                </span>
                <div className="flex flex-wrap gap-1.5 pb-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('لته سفید اعلا (White Cotton Latha)', 'نخی لته (Cotton Latha)', 'سفید / White', 450)}
                    className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-[11px] font-semibold text-stone-700 hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition cursor-pointer"
                  >
                    لته سفید (Latha)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('ابریشم بوسکی کرمی (Silk Boski Cream)', 'ابریشم بوسکی (Silk)', 'کرمی / Cream', 850)}
                    className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-[11px] font-semibold text-stone-700 hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition cursor-pointer"
                  >
                    بوسکی (Boski)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('پشم واسکتی طوسی (Charcoal Wool Blend)', 'پشم مجلسی (Wool)', 'خاکستری تیره / Charcoal', 1100)}
                    className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-[11px] font-semibold text-stone-700 hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition cursor-pointer"
                  >
                    پشم واسکتی (Wool)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('واش این ویر ضد چروک (Wash & Wear)', 'واش این ویر (Wash & Wear)', 'آبی آسمانی / Sky Blue', 550)}
                    className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-[11px] font-semibold text-stone-700 hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition cursor-pointer"
                  >
                    واش این ویر
                  </button>
                </div>
              </div>
            )}

            {/* Modal Body / Form */}
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t.fabricName} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. لته سفید اعلا / White Cotton Latha"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.fabricCode}
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    placeholder="e.g. FAB-001"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.fabricColor}
                  </label>
                  <input
                    type="text"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    placeholder="e.g. سفید، کرمی، سیاه، آبی..."
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t.fabricType}
                </label>
                <input
                  type="text"
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  placeholder="e.g. نخی لته، ابریشم بوسکی، پشم، مخمل، واش این ویر"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.stockMeters} ({t.meters})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formStock}
                    onChange={e => setFormStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t.pricePerMeter} ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={formPrice}
                    onChange={e => setFormPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t.notes}
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="یادداشت‌های اضافی درباره کیفیت یا تامین کننده رخت..."
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:bg-white resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2.5 border border-stone-200 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#C29E2E] text-[#1A1A1A] rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
