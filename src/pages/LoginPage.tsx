import React, { useState } from 'react';
import { Language, ShopSettings } from '../types';
import { translations } from '../translations/i18n';
import { supabase } from '../lib/supabase';
import { 
  Scissors, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  Globe, 
  ShieldCheck,
  Ruler,
  FileText,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

interface LoginViewProps {
  language: Language;
  shopSettings: ShopSettings;
  onLanguageChange: (lang: Language) => void;
  onLoginSuccess: (user: { email: string; name: string }) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  language,
  shopSettings,
  onLanguageChange,
  onLoginSuccess,
}) => {
  const t = translations[language];
  const isRtl = language === 'fa' || language === 'ps';

  // Strictly empty state with no pre-filled credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (loginError || !data.user) throw loginError || new Error('Invalid credentials');
      onLoginSuccess({
        email: data.user.email || email.trim().toLowerCase(),
        name: String(data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Admin'),
      });
    } catch {
      setError(t.invalidCredentials || 'Invalid email or password. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const shopTitle = language === 'ps' 
    ? shopSettings.shopNamePs || 'مجیب افغان خیاطي او رخت پلورنځی'
    : language === 'fa' 
    ? shopSettings.shopNameFa || 'مجیب افغان خیاطی و لباس‌فروشی'
    : shopSettings.shopNameEn || 'MUJEEB AFGHAN FASION HOUSE';

  return (
    <div className="min-h-screen bg-[#141414] text-[#F9F7F2] flex flex-col justify-between selection:bg-[#D4AF37]/40 relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Language Switcher */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <a href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-white transition" aria-label="Back to customer tracking">
            <ArrowLeft className="h-4 w-4" />
            <span>{language === 'fa' ? 'بازگشت' : language === 'ps' ? 'بېرته' : 'Back'}</span>
          </a>
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37] flex items-center justify-center text-[#1A1A1A] font-black shadow-lg shadow-[#D4AF37]/20">
            <img src={shopSettings.logoUrl || '/mujeeb-afghan-logo.jpeg'} alt="Mujeeb Afghan Fashion" className="h-full w-full rounded-xl object-contain" />
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base text-white tracking-wide block">
              {shopTitle}
            </span>
            <span className="text-[11px] text-[#D4AF37] font-medium block">
              {t.appSubtitle}
            </span>
          </div>
        </div>

        {/* Trilingual Toggle */}
        <div className="flex items-center gap-1 bg-[#222222] p-1 rounded-xl border border-stone-800 shadow-xs">
          <Globe className="w-3.5 h-3.5 text-[#D4AF37] mx-1.5 hidden sm:inline-block" />
          <button
            type="button"
            onClick={() => onLanguageChange('fa')}
            id="login-lang-fa"
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              language === 'fa'
                ? 'bg-[#D4AF37] text-[#1A1A1A] font-black shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            دری
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('ps')}
            id="login-lang-ps"
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              language === 'ps'
                ? 'bg-[#D4AF37] text-[#1A1A1A] font-black shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            پښتو
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            id="login-lang-en"
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              language === 'en'
                ? 'bg-[#D4AF37] text-[#1A1A1A] font-black shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            English
          </button>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="w-full max-w-md mx-auto px-4 py-8 z-10">
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] hover:border-[#D4AF37]/40 transition-colors duration-300 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative">
          
          {/* Card Top Brand Badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-[#D4AF37] mb-4 shadow-xl shadow-[#D4AF37]/25 ring-4 ring-[#D4AF37]/10 overflow-hidden">
              <img src={shopSettings.logoUrl || '/mujeeb-afghan-logo.jpeg'} alt="Mujeeb Afghan Fashion" className="h-full w-full object-contain" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {t.loginTitle}
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              {t.loginSubtitle}
            </p>
          </div>

          {/* Error Alert Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field - Empty with standard placeholder */}
            <div>
              <label 
                htmlFor="login-email" 
                className="block text-xs font-bold text-stone-300 mb-1.5"
              >
                {t.email}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none text-stone-400`}>
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={language === 'fa' ? 'ایمیل خود را وارد نمایید...' : language === 'ps' ? 'خپل بریښنالیک ولیکئ...' : 'Enter your email...'}
                  dir="ltr"
                  className={`w-full py-2.5 bg-[#141414] border border-stone-700 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 rounded-xl text-sm text-white placeholder-stone-500 font-mono transition outline-none ${
                    isRtl ? 'pr-10 pl-3.5 text-right' : 'pl-10 pr-3.5 text-left'
                  }`}
                />
              </div>
            </div>

            {/* Password Field - Empty, no hints */}
            <div>
              <label 
                htmlFor="login-password" 
                className="block text-xs font-bold text-stone-300 mb-1.5"
              >
                {t.password}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none text-stone-400`}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'fa' ? 'رمز عبور خود را وارد نمایید...' : language === 'ps' ? 'خپل پټنوم دننه کړئ...' : 'Enter your password...'}
                  dir="ltr"
                  className={`w-full py-2.5 bg-[#141414] border border-stone-700 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 rounded-xl text-sm text-white placeholder-stone-500 font-mono transition outline-none ${
                    isRtl ? 'pr-10 pl-10' : 'pl-10 pr-10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 ${isRtl ? 'left-0 pl-3.5' : 'right-0 pr-3.5'} flex items-center text-stone-400 hover:text-white transition cursor-pointer`}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              id="login-submit-button"
              className="w-full py-3 px-4 bg-[#D4AF37] hover:bg-[#B39025] active:bg-[#997B1E] disabled:opacity-50 text-[#1A1A1A] font-black rounded-xl text-sm shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer mt-3"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span>{isLoading ? t.loading : t.signInBtn}</span>
            </button>
          </form>

          {/* Credentials Info Footnote */}
          <div className="mt-6 pt-5 border-t border-stone-800 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'fa' ? 'دسترسی امن مدیر خیاطی' : language === 'ps' ? 'د خیاطۍ مدیر خوندي لاسرسی' : 'Secure Tailor Shop Management'}</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Bento Badges */}
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <div className="p-3 bg-[#1A1A1A]/80 border border-stone-800/80 rounded-2xl flex items-center gap-2.5">
            <Ruler className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <div className="text-[11px] text-stone-300 font-medium leading-tight">
              {language === 'fa' ? 'ثبت اندازه‌های دقیق' : language === 'ps' ? 'د دقیقو اندازو ثبت' : 'Bespoke Measurements'}
            </div>
          </div>

          <div className="p-3 bg-[#1A1A1A]/80 border border-stone-800/80 rounded-2xl flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <div className="text-[11px] text-stone-300 font-medium leading-tight">
              {language === 'fa' ? 'چاپ بل و بارکود' : language === 'ps' ? 'د بِل او بارکوډ چاپ' : 'Printable Receipts'}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-4 text-center text-stone-500 text-xs z-10">
        <p>© {new Date().getFullYear()} {shopTitle} • {language === 'fa' ? 'تمامی حقوق محفوظ است' : language === 'ps' ? 'ټولې حقونه خوندي دي' : 'All rights reserved'}</p>
        <a href="/" className="mt-2 inline-block text-[#D4AF37] hover:text-white transition">
          {language === 'fa' ? 'پیگیری وضعیت لباس مشتری' : language === 'ps' ? 'د خپلو جامو حالت وګورئ' : 'Track your cloth order'}
        </a>
      </footer>
    </div>
  );
};
