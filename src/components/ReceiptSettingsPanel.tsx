import React, { useState, useRef } from 'react';
import { 
  ShopSettings, 
  Language, 
  ReceiptPaperFormat, 
  ThermalReceiptStyle 
} from '../types';
import { translations } from '../translations/i18n';
import { storageService } from '../services/storage';
import { printReceiptElement, downloadReceiptPdf } from '../services/printService';
import { BarcodeView } from './BarcodeView';
import { 
  Printer, 
  FileText, 
  Check, 
  Download, 
  Eye, 
  Sparkles, 
  ShieldCheck, 
  Scissors, 
  QrCode, 
  Barcode, 
  Smartphone,
  CheckCircle2,
  Settings2,
  FileSpreadsheet,
  HelpCircle
} from 'lucide-react';

interface ReceiptSettingsPanelProps {
  shopSettings: ShopSettings;
  language: Language;
  onUpdateShopSettings?: (settings: ShopSettings) => void;
  onSettingsUpdated?: () => void;
}

export const ReceiptSettingsPanel: React.FC<ReceiptSettingsPanelProps> = ({
  shopSettings,
  language,
  onUpdateShopSettings,
  onSettingsUpdated,
}) => {
  const t = translations[language];

  // Local copy of shop settings for editing receipt configuration
  const [settings, setSettings] = useState<ShopSettings>(() => ({
    receiptFormat: 'thermal80',
    receiptThermalStyle: 'standard',
    receiptShowLogo: true,
    receiptShowBarcode: true,
    receiptShowQrCode: true,
    receiptShowNotes: true,
    receiptShowTerms: true,
    receiptHeaderNoteFa: 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    receiptHeaderNotePs: 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    receiptHeaderNoteEn: 'IN THE NAME OF ALLAH',
    ...shopSettings,
  }));

  // Sync if external props change
  React.useEffect(() => {
    setSettings(prev => ({
      ...prev,
      ...shopSettings,
    }));
  }, [shopSettings]);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [isTestPdf, setIsTestPdf] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Active preferences
  const currentFormat: ReceiptPaperFormat = settings.receiptFormat || 'thermal80';
  const currentStyle: ThermalReceiptStyle = settings.receiptThermalStyle || 'standard';

  // Save changes to Supabase and notify the parent view.
  const handleSave = () => {
    storageService.saveShopSettings(settings);
    if (onUpdateShopSettings) {
      onUpdateShopSettings(settings);
    }
    if (onSettingsUpdated) {
      onSettingsUpdated();
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Instant Format change with automatic preference update
  const handleSelectFormat = (format: ReceiptPaperFormat) => {
    const updated = { ...settings, receiptFormat: format };
    setSettings(updated);
    storageService.saveShopSettings(updated);
    if (onUpdateShopSettings) onUpdateShopSettings(updated);
    if (onSettingsUpdated) onSettingsUpdated();
  };

  // Thermal style change
  const handleSelectStyle = (style: ThermalReceiptStyle) => {
    const updated = { ...settings, receiptThermalStyle: style };
    setSettings(updated);
    storageService.saveShopSettings(updated);
    if (onUpdateShopSettings) onUpdateShopSettings(updated);
    if (onSettingsUpdated) onSettingsUpdated();
  };

  // Toggle boolean fields
  const handleToggle = (field: keyof ShopSettings) => {
    const updated = { ...settings, [field]: !settings[field] };
    setSettings(updated);
  };

  // Test Print
  const handleTestPrint = async () => {
    if (!previewRef.current) return;
    const shopName = language === 'ps' 
      ? (settings.shopNamePs || 'Mujeeb Afghan') 
      : language === 'fa' 
      ? (settings.shopNameFa || 'مجیب افغان') 
      : (settings.shopNameEn || 'MUJEEB AFGHAN FASHION');

    await printReceiptElement(previewRef.current, {
      title: `${shopName} - Test Receipt Slip`,
      pageFormat: currentFormat,
      dir: language === 'en' ? 'ltr' : 'rtl',
      onStart: () => setIsTestPrinting(true),
      onComplete: () => setIsTestPrinting(false),
      onError: () => setIsTestPrinting(false),
    });
  };

  // Test PDF Download
  const handleTestDownloadPdf = async () => {
    if (!previewRef.current) return;
    const filename = `Receipt_Sample_${currentFormat}_${Date.now().toString().slice(-4)}`;
    await downloadReceiptPdf(previewRef.current, {
      filename,
      pageFormat: currentFormat,
      onStart: () => setIsTestPdf(true),
      onComplete: () => setIsTestPdf(false),
      onError: () => {
        setIsTestPdf(false);
        handleTestPrint();
      },
    });
  };

  const currencyText = language === 'ps' 
    ? (settings.currencyPs || 'افغانۍ') 
    : language === 'fa' 
    ? (settings.currencyFa || 'افغانی') 
    : (settings.currencyEn || 'AFN');

  const shopTitle = language === 'ps' 
    ? settings.shopNamePs 
    : language === 'fa' 
    ? settings.shopNameFa 
    : settings.shopNameEn;

  const headerBlessing = language === 'ps'
    ? settings.receiptHeaderNotePs
    : language === 'fa'
    ? settings.receiptHeaderNoteFa
    : settings.receiptHeaderNoteEn;

  const footerNotice = language === 'ps'
    ? settings.receiptFooterPs
    : language === 'fa'
    ? settings.receiptFooterFa
    : settings.receiptFooterEn;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E5E5E5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#D4AF37]">
              <Printer className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="font-black text-base text-[#1A1A1A]">
              {language === 'fa' ? 'تنظیمات رسید و پرینتر خیاطی' : language === 'ps' ? 'د خیاطۍ بِل او پرینټر ترتیبات' : 'Receipt & Printer Settings'}
            </h3>
          </div>
          <p className="text-xs text-[#706E6B] mt-1 max-w-2xl">
            {language === 'fa'
              ? 'نوع کاغذ چاپ (پرینتر حرارتی POS ۸۰ میلی‌متر، ۵۸ میلی‌متر یا کاغذ رسمی A4)، استایل رسید و اطلاعات مندرج در بل را مطابق نیاز دکان خود تنظیم نمایید.'
              : language === 'ps'
              ? 'د چاپ بڼه (حرارتي ۸۰ ملي متر، ۵۸ ملي متر یا رسمي A4 پاڼه)، د بِل سټایل او چاپ کېدونکي مالومات وټاکئ.'
              : 'Configure default print layout (Thermal POS 80mm, 58mm, or standard A4 format), typography styling, and receipt content.'}
          </p>
        </div>

        {/* Save button in header */}
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{language === 'fa' ? 'تنظیمات ذخیره شد' : language === 'ps' ? 'ترتیبات وساتل شول' : 'Saved'}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#B39025] text-[#1A1A1A] font-black rounded-xl text-xs transition cursor-pointer shadow-xs flex items-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{language === 'fa' ? 'ذخیره در تنظیمات دکان' : language === 'ps' ? 'د هټۍ په ترتیباتو کې ساتل' : 'Save Receipt Preferences'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= LEFT CONFIGURATION PANEL (7 COLS) ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: Paper & Printer Format Selection */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#D4AF37]" />
                <h4 className="font-bold text-xs text-[#1A1A1A] uppercase tracking-wider">
                  {language === 'fa' ? '۱. فرمت پیش‌فرض کاغذ و پرینتر' : language === 'ps' ? '۱. د کاغذ او پرینټر اصلي بڼه' : '1. Default Paper & Printer Format'}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-[#706E6B] font-bold">
                {currentFormat === 'a6' ? 'A6 Standard Sheet' : currentFormat === 'a4' ? 'Sheet Paper (A4)' : 'POS Thermal Roll'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option 1: A6 Paper (Primary for Tailor Slips & Customer Bills) */}
              <div
                onClick={() => handleSelectFormat('a6')}
                className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between relative ${
                  currentFormat === 'a6'
                    ? 'border-[#D4AF37] bg-amber-50/40 shadow-xs'
                    : 'border-[#E5E5E5] hover:border-stone-300 bg-white'
                }`}
              >
                {currentFormat === 'a6' && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-[#D4AF37] text-[#1A1A1A] text-[9px] font-black rounded-full uppercase tracking-wider">
                    {language === 'fa' ? 'انتخاب شده' : 'Active'}
                  </span>
                )}
                <div>
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800 mb-2">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-xs text-[#1A1A1A]">
                    {language === 'fa' ? 'کاغذ A6 (استاندارد)' : language === 'ps' ? 'معیاري A6 پاڼه' : 'A6 Standard (105×148)'}
                  </h5>
                  <p className="text-[10px] text-[#706E6B] mt-1 leading-snug">
                    {language === 'fa' 
                      ? 'سایز ایده‌آل و استاندارد برای قبض مشتری و برگه مشخصات خیاط' 
                      : 'Perfect standard size for Customer Receipts and Tailor Slips'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono font-bold text-stone-600">
                  <span>105 × 148 mm</span>
                  <span className="text-[#D4AF37] font-black">{language === 'fa' ? 'پیشنهادی' : 'Recommended'}</span>
                </div>
              </div>

              {/* Option 2: Thermal 80mm */}
              <div
                onClick={() => handleSelectFormat('thermal80')}
                className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between relative ${
                  currentFormat === 'thermal80'
                    ? 'border-[#D4AF37] bg-amber-50/40 shadow-xs'
                    : 'border-[#E5E5E5] hover:border-stone-300 bg-white'
                }`}
              >
                {currentFormat === 'thermal80' && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-[#D4AF37] text-[#1A1A1A] text-[9px] font-black rounded-full uppercase tracking-wider">
                    {language === 'fa' ? 'انتخاب شده' : 'Active'}
                  </span>
                )}
                <div>
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800 mb-2">
                    <Printer className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-xs text-[#1A1A1A]">
                    {language === 'fa' ? 'حرارتی ۸۰ میلی‌متر' : language === 'ps' ? 'حرارتي ۸۰ ملي متر' : 'Thermal 80mm POS'}
                  </h5>
                  <p className="text-[10px] text-[#706E6B] mt-1 leading-snug">
                    {language === 'fa' 
                      ? 'رول استاندارد پرینترهای صندوق (Epson, Xprinter, Bixolon)' 
                      : 'Standard retail roll width (3.15" / 576 dots)'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono font-bold text-stone-600">
                  <span>80mm / 3.15"</span>
                  <span>Roll</span>
                </div>
              </div>

              {/* Option 3: Thermal 58mm */}
              <div
                onClick={() => handleSelectFormat('thermal58')}
                className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between relative ${
                  currentFormat === 'thermal58'
                    ? 'border-[#D4AF37] bg-amber-50/40 shadow-xs'
                    : 'border-[#E5E5E5] hover:border-stone-300 bg-white'
                }`}
              >
                {currentFormat === 'thermal58' && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-[#D4AF37] text-[#1A1A1A] text-[9px] font-black rounded-full uppercase tracking-wider">
                    {language === 'fa' ? 'انتخاب شده' : 'Active'}
                  </span>
                )}
                <div>
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800 mb-2">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-xs text-[#1A1A1A]">
                    {language === 'fa' ? 'حرارتی ۵۸ میلی‌متر' : language === 'ps' ? 'حرارتي ۵۸ ملي متر' : 'Thermal 58mm Mini'}
                  </h5>
                  <p className="text-[10px] text-[#706E6B] mt-1 leading-snug">
                    {language === 'fa'
                      ? 'پرینترهای دستی و بیسیم بلوتوث همراه یا صندوق‌های کوچک'
                      : 'Compact handheld or Bluetooth mobile printers (2.28")'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono font-bold text-stone-600">
                  <span>58mm / 2.28"</span>
                  <span>Mini Roll</span>
                </div>
              </div>

              {/* Option 4: Standard A4 Paper */}
              <div
                onClick={() => handleSelectFormat('a4')}
                className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between relative ${
                  currentFormat === 'a4'
                    ? 'border-[#D4AF37] bg-amber-50/40 shadow-xs'
                    : 'border-[#E5E5E5] hover:border-stone-300 bg-white'
                }`}
              >
                {currentFormat === 'a4' && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-[#D4AF37] text-[#1A1A1A] text-[9px] font-black rounded-full uppercase tracking-wider">
                    {language === 'fa' ? 'انتخاب شده' : 'Active'}
                  </span>
                )}
                <div>
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800 mb-2">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-xs text-[#1A1A1A]">
                    {language === 'fa' ? 'کاغذ رسمی A4' : language === 'ps' ? 'معیاري A4 پاڼه' : 'Standard A4 Sheet'}
                  </h5>
                  <p className="text-[10px] text-[#706E6B] mt-1 leading-snug">
                    {language === 'fa'
                      ? 'پرینترهای دفتری لیزری / جوهرافشان با ابعاد کامل ورق A4'
                      : 'Full-page laser or inkjet office printouts and PDF files'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono font-bold text-stone-600">
                  <span>210 × 297 mm</span>
                  <span>Office Sheet</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Thermal Printer Style Variations */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <h4 className="font-bold text-xs text-[#1A1A1A] uppercase tracking-wider">
                  {language === 'fa' ? '۲. استایل ظاهری چاپ رسید' : language === 'ps' ? '۲. د چاپ ډیزاین او سټایل' : '2. Receipt Visual Style Variant'}
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md font-bold">
                {currentStyle.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Style 1: Standard Modern */}
              <div
                onClick={() => handleSelectStyle('standard')}
                className={`p-3.5 rounded-xl border transition cursor-pointer ${
                  currentStyle === 'standard'
                    ? 'border-[#D4AF37] bg-amber-50/40 text-[#1A1A1A]'
                    : 'border-[#E5E5E5] hover:border-stone-300 bg-[#F9F7F2]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs">
                    {language === 'fa' ? 'مدرن و منظم (استاندارد)' : 'Modern & Balanced'}
                  </span>
                  {currentStyle === 'standard' && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                </div>
                <p className="text-[10px] text-[#706E6B] leading-snug">
                  {language === 'fa'
                    ? 'خطوط تفکیک واضح، فاصله‌های استاندارد و نمایش متناسب لوگو و بارکد.'
                    : 'Clean line dividers, balanced margins, crisp QR and barcode layout.'}
                </p>
              </div>

              {/* Style 2: Classic POS Monospace */}
              <div
                onClick={() => handleSelectStyle('classic')}
                className={`p-3.5 rounded-xl border transition cursor-pointer ${
                  currentStyle === 'classic'
                    ? 'border-[#D4AF37] bg-amber-50/40 text-[#1A1A1A]'
                    : 'border-[#E5E5E5] hover:border-stone-300 bg-[#F9F7F2]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs">
                    {language === 'fa' ? 'کلاسیک مونو‌اسپیس' : 'Classic Monospace'}
                  </span>
                  {currentStyle === 'classic' && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                </div>
                <p className="text-[10px] text-[#706E6B] leading-snug">
                  {language === 'fa'
                    ? 'فونت سنتی صندوق‌داری مونو، خط‌چین‌های تکرارشونده و ظاهر فاکتورهای حرارتی سنتی.'
                    : 'Fixed-width monospace typography with dashed borders for authentic POS slip feel.'}
                </p>
              </div>

              {/* Style 3: Compact Paper Saver */}
              <div
                onClick={() => handleSelectStyle('compact')}
                className={`p-3.5 rounded-xl border transition cursor-pointer ${
                  currentStyle === 'compact'
                    ? 'border-[#D4AF37] bg-amber-50/40 text-[#1A1A1A]'
                    : 'border-[#E5E5E5] hover:border-stone-300 bg-[#F9F7F2]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs">
                    {language === 'fa' ? 'فشرده و کم‌مصرف' : 'Compact Roll Saver'}
                  </span>
                  {currentStyle === 'compact' && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                </div>
                <p className="text-[10px] text-[#706E6B] leading-snug">
                  {language === 'fa'
                    ? 'حداقل فاصله عمودی و فشردگی اطلاعات جهت کاهش مصرف رول کاغذ حرارتی.'
                    : 'High density spacing with tight margins to minimize thermal paper roll consumption.'}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Content Display Toggles */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#D4AF37]" />
                <h4 className="font-bold text-xs text-[#1A1A1A] uppercase tracking-wider">
                  {language === 'fa' ? '۳. اجزای قابل نمایش در رسید' : language === 'ps' ? '۳. په بِل کې د ښودل کېدونکو برخو ټاکل' : '3. Receipt Display Elements'}
                </h4>
              </div>
              <span className="text-[10px] text-[#706E6B]">
                {language === 'fa' ? 'کنترل بخش‌های چاپی' : 'Toggle Sections'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Toggle Logo */}
              <label className="flex items-center justify-between p-3 bg-[#F9F7F2] rounded-xl border border-[#E5E5E5] cursor-pointer hover:bg-stone-100 transition">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-stone-600" />
                  <div>
                    <span className="font-bold text-stone-900 block">
                      {language === 'fa' ? 'نمایش لوگوی خیاطی' : language === 'ps' ? 'د هټۍ د لوګو ښودل' : 'Show Shop Logo'}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {language === 'fa' ? 'درج نشان در سربرگ بل' : 'Header logo watermark'}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.receiptShowLogo !== false}
                  onChange={() => handleToggle('receiptShowLogo')}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                />
              </label>

              {/* Toggle Barcode */}
              <label className="flex items-center justify-between p-3 bg-[#F9F7F2] rounded-xl border border-[#E5E5E5] cursor-pointer hover:bg-stone-100 transition">
                <div className="flex items-center gap-2.5">
                  <Barcode className="w-4 h-4 text-stone-600" />
                  <div>
                    <span className="font-bold text-stone-900 block">
                      {language === 'fa' ? 'بارکد اسکن سفارش و مشتری' : language === 'ps' ? 'د فرمایش او پېرودونکي بارکوډ' : 'Show Order & Phone Barcode'}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {language === 'fa' ? 'اسکن سریع با اسکنر بارکد' : 'Code-128 scannable bars'}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.receiptShowBarcode !== false}
                  onChange={() => handleToggle('receiptShowBarcode')}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                />
              </label>

              {/* Toggle Tailor Notes */}
              <label className="flex items-center justify-between p-3 bg-[#F9F7F2] rounded-xl border border-[#E5E5E5] cursor-pointer hover:bg-stone-100 transition">
                <div className="flex items-center gap-2.5">
                  <Scissors className="w-4 h-4 text-stone-600" />
                  <div>
                    <span className="font-bold text-stone-900 block">
                      {language === 'fa' ? 'یادداشت‌های اختصاصی خیاط' : language === 'ps' ? 'د خیاط ځانګړی یادښت' : 'Show Tailor Special Notes'}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {language === 'fa' ? 'توضیحات یخن، آستین و دوخت' : 'Instructions & fabric notes'}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.receiptShowNotes !== false}
                  onChange={() => handleToggle('receiptShowNotes')}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                />
              </label>

              {/* Toggle QR Code */}
              <label className="flex items-center justify-between p-3 bg-[#F9F7F2] rounded-xl border border-[#E5E5E5] cursor-pointer hover:bg-stone-100 transition">
                <div className="flex items-center gap-2.5">
                  <QrCode className="w-4 h-4 text-stone-600" />
                  <div>
                    <span className="font-bold text-stone-900 block">
                      {language === 'fa' ? 'کیو‌آرکد پیگیری مشتری' : language === 'ps' ? 'د پیګیرۍ کیو آر کوډ' : 'Show Tracking QR Code'}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {language === 'fa' ? 'اسکن با کمره تیلیفون هوشمند' : 'Mobile camera tracking link'}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.receiptShowQrCode !== false}
                  onChange={() => handleToggle('receiptShowQrCode')}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* SECTION 4: Header Notice & Footer Policy */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-3">
              <FileSpreadsheet className="w-4 h-4 text-[#D4AF37]" />
              <h4 className="font-bold text-xs text-[#1A1A1A] uppercase tracking-wider">
                {language === 'fa' ? '۴. متن سربرگ و پاورقی رسید' : language === 'ps' ? '۴. د بِل د سر او پښې پیغامونه' : '4. Header Blessing & Receipt Footer'}
              </h4>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#706E6B] mb-1">
                  {language === 'fa' ? 'متن متبرکه بالای بل (دری)' : language === 'ps' ? 'د بِل د سر متن (دري)' : 'Header Blessing (Dari)'}
                </label>
                <input
                  type="text"
                  value={settings.receiptHeaderNoteFa || ''}
                  onChange={e => setSettings({ ...settings, receiptHeaderNoteFa: e.target.value })}
                  placeholder="بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
                  className="w-full px-3 py-2 bg-[#F9F7F2] border border-[#E5E5E5] rounded-xl text-xs font-serif text-center"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#706E6B] mb-1">
                    {language === 'fa' ? 'متن پاورقی رسید (دری)' : 'Receipt Footer (Dari)'}
                  </label>
                  <input
                    type="text"
                    value={settings.receiptFooterFa || ''}
                    onChange={e => setSettings({ ...settings, receiptFooterFa: e.target.value })}
                    placeholder="لطفاً هنگام دریافت سفارش، این بل را همراه داشته باشید."
                    className="w-full px-3 py-2 bg-[#F9F7F2] border border-[#E5E5E5] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#706E6B] mb-1">
                    {language === 'ps' ? 'د بِل د پښې متن (پښتو)' : 'Receipt Footer (Pashto)'}
                  </label>
                  <input
                    type="text"
                    value={settings.receiptFooterPs || ''}
                    onChange={e => setSettings({ ...settings, receiptFooterPs: e.target.value })}
                    placeholder="مهرباني وکړئ د فرمایش د اخیستلو پر مهال دا بِل له ځان سره ولرئ."
                    className="w-full px-3 py-2 bg-[#F9F7F2] border border-[#E5E5E5] rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#B39025] text-[#1A1A1A] font-black rounded-xl text-xs transition cursor-pointer shadow-xs flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'fa' ? 'ذخیره دایمی در تنظیمات' : language === 'ps' ? 'په ترتیباتو کې ساتل' : 'Save All Receipt Settings'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= RIGHT LIVE PREVIEW PANEL (5 COLS) ================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#D4AF37]" />
                <h4 className="font-bold text-xs text-[#1A1A1A] uppercase tracking-wider">
                  {language === 'fa' ? 'پیش‌نمایش زنده رسید' : language === 'ps' ? 'د بِل ژوندی مخکتنه' : 'Live Receipt Preview'}
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-50 text-[#B39025] border border-[#D4AF37]/30 rounded-md font-bold uppercase">
                {currentFormat}
              </span>
            </div>

            <p className="text-[11px] text-[#706E6B]">
              {language === 'fa' 
                ? 'نمای شبیه‌سازی شده رسید با اندازه و فونت انتخاب شده در پرینتر:' 
                : 'Simulated preview reflecting your active printer paper and styling:'}
            </p>

            {/* Test Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isTestPrinting}
                className="flex-1 py-2 bg-[#1A1A1A] hover:bg-black text-[#D4AF37] font-black rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isTestPrinting ? t.loading : (language === 'fa' ? 'چاپ آزمایشی' : 'Test Print Slip')}</span>
              </button>

              <button
                type="button"
                onClick={handleTestDownloadPdf}
                disabled={isTestPdf}
                className="px-4 py-2 bg-[#F9F7F2] hover:bg-stone-200 border border-[#E5E5E5] text-[#1A1A1A] font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5 text-stone-700" />
                <span>PDF</span>
              </button>
            </div>

            {/* Live Paper Canvas */}
            <div className="bg-stone-100 p-4 rounded-xl flex justify-center overflow-x-auto min-h-[460px] border border-stone-200">
              <div
                ref={previewRef}
                dir={language === 'en' ? 'ltr' : 'rtl'}
                className={`bg-white shadow-md text-[#1A1A1A] p-4 text-xs transition-all duration-300 relative select-text border border-stone-300 ${
                  currentFormat === 'a4'
                    ? 'w-full max-w-[360px] rounded-lg'
                    : currentFormat === 'thermal58'
                    ? 'w-[260px] rounded-sm font-sans'
                    : 'w-[320px] rounded-sm font-sans'
                } ${
                  currentStyle === 'classic'
                    ? 'font-mono'
                    : currentStyle === 'compact'
                    ? 'p-2 text-[11px] leading-tight'
                    : 'font-sans'
                }`}
              >
                {/* Blessing / Bismillah */}
                {headerBlessing && (
                  <div className="text-center font-serif text-[10px] text-stone-600 pb-1 mb-1 border-b border-stone-200">
                    {headerBlessing}
                  </div>
                )}

                {/* Shop Logo & Name */}
                <div className="text-center pb-2 border-b-2 border-stone-900">
                  {settings.receiptShowLogo !== false && (
                    <img
                      src={settings.logoUrl || '/mujeeb-afghan-logo.jpeg'}
                      alt="Logo"
                      className="mx-auto mb-1.5 h-14 w-14 rounded-md object-contain"
                    />
                  )}
                  <h4 className="font-black text-sm font-serif tracking-tight text-stone-950">
                    {shopTitle || 'MUJEEB AFGHAN FASHION'}
                  </h4>
                  <div className="flex justify-between items-center text-[10px] font-semibold text-stone-700 mt-1 pt-1 border-t border-dotted border-stone-300">
                    <span>تلیفون: <b className="font-mono">{settings.phone1 || '0772559881'}</b></span>
                    <span>واتساپ: <b className="font-mono">{settings.whatsapp || '0782220194'}</b></span>
                  </div>
                  <p className="text-[9px] text-stone-500 mt-0.5 truncate">
                    {language === 'ps' ? settings.addressPs : language === 'fa' ? settings.addressFa : settings.addressEn}
                  </p>
                </div>

                {/* Slip Number and Date */}
                <div className="grid grid-cols-2 border-b-2 border-stone-900 text-[11px] font-bold bg-stone-50 my-1">
                  <div className="p-1.5 border-l border-stone-900 flex justify-between">
                    <span className="text-stone-500">{language === 'fa' ? 'شماره بل:' : 'Bill #:'}</span>
                    <span className="font-mono font-black">ORD-8821</span>
                  </div>
                  <div className="p-1.5 flex justify-between">
                    <span className="text-stone-500">{language === 'fa' ? 'مشتری:' : 'Client:'}</span>
                    <span className="font-black truncate max-w-[100px]">{language === 'fa' ? 'احمد شاه' : 'Ahmad Shah'}</span>
                  </div>
                </div>

                {/* Sample Measurements Table */}
                <div className="border border-stone-800 my-1">
                  <div className="bg-stone-100 px-2 py-1 font-bold text-[10px] border-b border-stone-800 flex justify-between">
                    <span>{language === 'fa' ? 'اندازه‌های ثبت شده (انچ)' : 'Measurements (Inches)'}</span>
                    <span>{language === 'fa' ? 'پیراهن و تنبان' : 'Suit'}</span>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-x-reverse divide-stone-300 text-[10px] text-center p-1 font-semibold">
                    <div>قد: <b className="font-mono">41.5</b></div>
                    <div>شانه: <b className="font-mono">18.0</b></div>
                    <div>آستین: <b className="font-mono">24.5</b></div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-x-reverse divide-stone-300 text-[10px] text-center p-1 border-t border-stone-200 font-semibold">
                    <div>یخن: <b className="font-mono">16.0</b></div>
                    <div>چاتی: <b className="font-mono">22.0</b></div>
                    <div>پاچه: <b className="font-mono">17.5</b></div>
                  </div>
                </div>

                {/* Tailor Notes */}
                {settings.receiptShowNotes !== false && (
                  <div className="p-1.5 bg-amber-50/80 border border-amber-300 text-[10px] text-stone-800 my-1 rounded-xs">
                    <b className="text-amber-900 block">{language === 'fa' ? 'یادداشت خیاط:' : 'Tailor Note:'}</b>
                    <span>{language === 'fa' ? 'یخن قاق ۴ سانتی، جیب دوتایی ساده، دوخت دست‌دوز' : 'Collared neckline, dual side pockets, hand-stitched hem'}</span>
                  </div>
                )}

                {/* Delivery Date & Time */}
                <div className="p-1 border border-dashed border-stone-400 my-1 flex justify-between items-center text-[10px]">
                  <span>{language === 'fa' ? 'تاریخ تسلیمی:' : 'Delivery:'} <b className="font-mono">{new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)}</b></span>
                  <span>{language === 'fa' ? 'تعداد:' : 'Qty:'} <b className="font-mono">2</b></span>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-3 border-2 border-stone-900 text-center font-bold divide-x divide-x-reverse divide-stone-900 bg-stone-50 my-1">
                  <div className="p-1">
                    <div className="text-[9px] text-stone-500">{language === 'fa' ? 'مجموع' : 'Total'}</div>
                    <div className="font-mono font-black text-stone-950 text-xs">3,500 <span className="text-[8px] font-normal">{currencyText}</span></div>
                  </div>
                  <div className="p-1 bg-emerald-50">
                    <div className="text-[9px] text-emerald-700">{language === 'fa' ? 'رسید' : 'Paid'}</div>
                    <div className="font-mono font-black text-emerald-700 text-xs">2,000 <span className="text-[8px] font-normal">{currencyText}</span></div>
                  </div>
                  <div className="p-1 bg-amber-50">
                    <div className="text-[9px] text-amber-800">{language === 'fa' ? 'باقی' : 'Due'}</div>
                    <div className="font-mono font-black text-rose-600 text-xs">1,500 <span className="text-[8px] font-normal">{currencyText}</span></div>
                  </div>
                </div>

                {/* Barcode & QR Code Section */}
                {(settings.receiptShowBarcode !== false || settings.receiptShowQrCode !== false) && (
                  <div className="py-2 border-t border-b border-dashed border-stone-400 my-1 flex items-center justify-around">
                    {settings.receiptShowBarcode !== false && (
                      <div className="text-center">
                        <BarcodeView value="ORD-8821" height={22} width={1.1} fontSize={8} />
                        <span className="text-[8px] text-stone-500 block">ORD-8821</span>
                      </div>
                    )}
                    {settings.receiptShowQrCode !== false && (
                      <div className="text-center">
                        <div className="w-12 h-12 border border-stone-400 bg-stone-50 rounded flex flex-col items-center justify-center p-1 mx-auto">
                          <QrCode className="w-7 h-7 text-stone-800" />
                        </div>
                        <span className="text-[7px] text-stone-500 block mt-0.5">TRACK #8821</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Notice */}
                <div className="text-center pt-1 text-[9px] text-stone-500">
                  <p>{footerNotice || 'لطفاً هنگام دریافت سفارش این بل را همراه داشته باشید.'}</p>
                  <p className="text-[7px] text-stone-400 mt-0.5">Developed by: Rayan Tech solution</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
