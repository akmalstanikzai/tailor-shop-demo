import React, { useState, useRef, useEffect } from 'react';
import { Language, ShopSettings } from '../types';
import { translations } from '../translations/i18n';
import { 
  Menu, 
  Globe, 
  ChevronDown,
  Check,
  Search
} from 'lucide-react';
import { MainNavTab, SettingsSubTab } from './Sidebar';

interface NavbarProps {
  currentTab: MainNavTab;
  language: Language;
  shopSettings: ShopSettings;
  onToggleSidebar: () => void;
  onTabChange: (tab: MainNavTab, subTab?: SettingsSubTab) => void;
  onLanguageChange: (lang: Language) => void;
  onSignOut?: () => void;
  onSearchOrders: (query: string) => void;
  dbConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  shopSettings,
  onToggleSidebar,
  onTabChange,
  onLanguageChange,
  onSearchOrders,
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const shopTitle = language === 'ps' 
    ? shopSettings.shopNamePs 
    : language === 'fa' 
    ? shopSettings.shopNameFa 
    : shopSettings.shopNameEn;

  const currentLanguageLabel = 
    language === 'fa' ? 'دری' : language === 'ps' ? 'پښتو' : 'English';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md text-stone-900 border-b border-stone-200 shadow-xs no-print">
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3 min-w-0">
          {/* Left / Start: Sidebar Toggle & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Sidebar toggle button */}
            <button
              onClick={onToggleSidebar}
              id="sidebar-toggle-btn"
              className="p-2.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer shrink-0"
              title={t.menu}
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Shop Brand */}
            <div 
              onClick={() => onTabChange('dashboard')}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group min-w-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 overflow-hidden rounded-xl bg-stone-900 shadow-xs transition group-hover:scale-105">
                <img src={shopSettings.logoUrl || '/mujeeb-afghan-logo.jpeg'} alt="Mujeeb Afghan Fashion" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-xs sm:text-base text-stone-900 tracking-tight leading-tight flex items-center gap-2 min-w-0">
                  <span className="truncate block max-w-[42vw] sm:max-w-none">{shopTitle || 'MUJEEB AFGHAN FASHION HOUSE'}</span>
                </h1>
                <p className="text-[10px] text-amber-700 font-semibold hidden sm:block">
                  {t.appSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Global Search */}
            <div className="relative hidden md:block w-52 lg:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  onSearchOrders(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSearchOrders(searchQuery);
                }}
                placeholder={language === 'fa' ? 'جستجوی سفارش یا مشتری...' : language === 'ps' ? 'فرمایش یا پېرودونکی ولټوئ...' : 'Search order or customer...'}
                aria-label="Search orders by customer name or order ID"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl ps-9 pe-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 outline-none focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>

            {/* Compact Language Selector Dropdown - Showing only the selected language */}
            <div className="relative" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                id="topbar-lang-selector-btn"
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 bg-stone-100 hover:bg-stone-200/80 text-stone-800 rounded-xl text-xs font-bold transition border border-stone-200 cursor-pointer shadow-2xs"
                aria-label="Select Language"
              >
                <Globe className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden min-[380px]:inline">{currentLanguageLabel}</span>
                <ChevronDown className={`w-3 h-3 text-stone-500 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangDropdownOpen && (
                <div className="absolute end-0 mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-stone-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      onLanguageChange('fa');
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full text-start px-3 py-2 text-xs flex items-center justify-between font-bold transition cursor-pointer ${
                      language === 'fa' ? 'bg-amber-50 text-amber-900' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>دری (Dari)</span>
                    {language === 'fa' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLanguageChange('ps');
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full text-start px-3 py-2 text-xs flex items-center justify-between font-bold transition cursor-pointer ${
                      language === 'ps' ? 'bg-amber-50 text-amber-900' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>پښتو (Pashto)</span>
                    {language === 'ps' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLanguageChange('en');
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full text-start px-3 py-2 text-xs flex items-center justify-between font-bold transition cursor-pointer ${
                      language === 'en' ? 'bg-amber-50 text-amber-900' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>English</span>
                    {language === 'en' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
