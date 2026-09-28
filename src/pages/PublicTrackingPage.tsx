import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Scissors, Search, Shirt, XCircle } from 'lucide-react';
import { Language } from '../types';
import { storageService } from '../services/storage';
import { translations } from '../translations/i18n';
import { supabase } from '../lib/supabase';

type PublicOrder = {
  orderNumber: string;
  garmentType: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'ready' | 'delivered';
  orderDate: string;
  deliveryDate: string;
  completedDate?: string | null;
  deliveredDate?: string | null;
};

const statusMeta = {
  pending: { icon: Clock3, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  in_progress: { icon: Scissors, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  ready: { icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  delivered: { icon: CheckCircle2, color: 'text-stone-700 bg-stone-100 border-stone-300' },
};

export const PublicTrackingView: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [lookup, setLookup] = useState('');
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shopSettings, setShopSettings] = useState(storageService.getShopSettings());
  useEffect(() => {
    supabase.from('shop_settings').select('data').eq('id', 'default').maybeSingle()
      .then(({ data }) => { if (data?.data) setShopSettings({ ...shopSettings, ...data.data }); });
  }, []);
  const garmentKeys = ['perahanTunban', 'waistcoat', 'suit', 'coatKorti', 'kameezShalwar', 'kurta', 'otherGarment'] as const;
  const localizeGarment = (garmentType: string) => {
    const key = garmentKeys.find(item =>
      translations.en[item] === garmentType || translations.fa[item] === garmentType || translations.ps[item] === garmentType
    );
    return key ? translations[language][key] : garmentType;
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = lookup.trim();
    if (!value) return;

    setError('');
    setOrders([]);
    setIsLoading(true);
    try {
      let matchedOrders: PublicOrder[] = [];
      try {
        const { data, error: lookupError } = await supabase.rpc('lookup_public_orders', { lookup_value: value });
        if (!lookupError && Array.isArray(data) && data.length > 0) {
          matchedOrders = data.map((row: any) => ({
            orderNumber: row.order_number,
            garmentType: row.garment_type,
            quantity: row.quantity,
            status: row.status,
            orderDate: row.order_date,
            deliveryDate: row.delivery_date,
            completedDate: row.completed_date,
            deliveredDate: row.delivered_date,
          }));
        }
      } catch {
        // Fall back to local storage query
      }

      if (matchedOrders.length === 0) {
        const localOrders = storageService.getOrders();
        const norm = value.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matched = localOrders.filter(o => {
          const ordNum = (o.orderNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const phone = (o.customerPhone || '').replace(/[^0-9]/g, '');
          const whatsapp = (o.customerWhatsApp || '').replace(/[^0-9]/g, '');
          const id = (o.id || '').toLowerCase();
          return (
            ordNum.includes(norm) ||
            (norm.length >= 3 && (phone.includes(norm) || whatsapp.includes(norm))) ||
            id.includes(norm)
          );
        });

        if (matched.length > 0) {
          matchedOrders = matched.map(o => ({
            orderNumber: o.orderNumber,
            garmentType: o.garmentType,
            quantity: o.quantity,
            status: o.status,
            orderDate: o.orderDate,
            deliveryDate: o.deliveryDate,
            completedDate: o.completedDate || null,
            deliveredDate: o.deliveredDate || null,
          }));
        }
      }

      if (matchedOrders.length > 0) {
        setOrders(matchedOrders);
        return;
      }
      throw new Error('No order was found for this Order ID or contact');
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'No order was found for this Order ID or contact');
    } finally {
      setIsLoading(false);
    }
  };

  const copy = {
    en: { staff: 'Staff login', title: 'Find your order.', description: 'Search your orders by Order ID or contact number to see the latest production status.', label: 'Order ID or contact number', placeholder: 'e.g. 0001 or 0772559881', button: 'Find order', checking: 'Searching...', clothId: 'Order ID', garment: 'Garment', quantity: 'Quantity', collection: 'Expected collection', notFound: 'No order was found for this Order ID or contact.', toBeConfirmed: 'To be confirmed', developed: 'Developed by: Rayan Tech solution', statuses: { pending: ['Received', 'Your order is registered and waiting to enter production.'], in_progress: ['In production', 'Your cloth is being cut or stitched by our team.'], ready: ['Ready for collection', 'Your cloth is ready. Please bring your order slip when collecting it.'], delivered: ['Collected', 'This order has been collected from the shop.'] } },
    fa: { staff: 'ورود کارمندان', title: 'سفارش خود را پیدا کنید.', description: 'برای دیدن آخرین وضعیت، سفارش‌های خود را با شماره سفارش یا شماره تماس جستجو کنید.', label: 'شماره سفارش یا تماس', placeholder: 'مثلاً ۰۰۰۱ یا ۰۷۷۲۵۵۹۸۸۱', button: 'پیدا کردن سفارش', checking: 'در حال جستجو...', clothId: 'شماره سفارش', garment: 'نوع لباس', quantity: 'تعداد', collection: 'تاریخ تسلیمی', notFound: 'برای این شماره سفارش یا تماس سفارشی یافت نشد.', toBeConfirmed: 'تعیین نشده', developed: 'ساخته شده توسط: Rayan Tech solution', statuses: { pending: ['دریافت شد', 'سفارش شما ثبت شده و در انتظار شروع کار است.'], in_progress: ['در حال آماده‌سازی', 'لباس شما توسط تیم ما برش یا دوخته می‌شود.'], ready: ['آماده تحویل', 'لباس شما آماده است. هنگام دریافت، بل سفارش را همراه داشته باشید.'], delivered: ['تحویل شد', 'این سفارش از فروشگاه تحویل گرفته شده است.'] } },
    ps: { staff: 'د کارکوونکو ننوتل', title: 'خپل فرمایش پیدا کړئ.', description: 'د وروستي حالت لپاره خپل فرمایشونه د فرمایش شمېرې یا اړیکې شمېرې له لارې ولټوئ.', label: 'د فرمایش شمېره یا اړیکه', placeholder: 'لکه ۰۰۰۱ یا ۰۷۷۲۵۵۹۸۸۱', button: 'فرمایش پیدا کړئ', checking: 'لټون کېږي...', clothId: 'د فرمایش شمېره', garment: 'د جامو ډول', quantity: 'تعداد', collection: 'د اخیستلو نېټه', notFound: 'د دې فرمایش یا اړیکې شمېرې لپاره فرمایش ونه موندل شو.', toBeConfirmed: 'لا نه ده ټاکل شوې', developed: 'جوړونکی: Rayan Tech solution', statuses: { pending: ['ترلاسه شو', 'ستاسو فرمایش ثبت شوی او د تولید پیل ته منتظر دی.'], in_progress: ['د تولید په حال کې', 'ستاسو کالي زموږ د ډلې له خوا پرې کېږي یا ګنډل کېږي.'], ready: ['د اخیستلو لپاره چمتو', 'ستاسو کالي چمتو دي. د اخیستلو پر مهال د فرمایش بِل راوړئ.'], delivered: ['تحویل شو', 'دا فرمایش له هټۍ څخه اخیستل شوی دی.'] } },
  }[language];
  const isRtl = language !== 'en';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f4f1ea] text-[#1c2421] px-2.5 sm:px-4 py-3 sm:py-10">
      <main className="mx-auto max-w-2xl">
        <div className="flex items-center justify-end gap-4">
          <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 text-xs font-bold">
            {(['en', 'fa', 'ps'] as Language[]).map(option => <button key={option} type="button" onClick={() => setLanguage(option)} className={`rounded-lg px-2.5 py-1.5 ${language === option ? 'bg-[#173b3b] text-white' : 'text-stone-500 hover:bg-stone-100'}`}>{option === 'en' ? 'English' : option === 'fa' ? 'دری' : 'پښتو'}</button>)}
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl shadow-stone-900/5">
          <div className="bg-[#173b3b] px-4 py-7 text-white sm:px-10 sm:py-10">
              <div className="flex items-center gap-3 text-[#e4bd63]">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-black"><img src={shopSettings.logoUrl || '/mujeeb-afghan-logo.jpeg'} alt="Mujeeb Afghan Fashion" className="h-full w-full object-contain" /></div>
              <span className="text-xs font-bold uppercase tracking-[0.2em]">{language === 'ps' ? shopSettings.shopNamePs : language === 'fa' ? shopSettings.shopNameFa : shopSettings.shopNameEn}</span>
            </div>
            <h1 className="mt-6 sm:mt-8 max-w-lg text-2xl min-[400px]:text-3xl font-black tracking-tight sm:text-5xl">{copy.title}</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-teal-50/80">{copy.description}</p>
          </div>

          <div className="p-4 sm:p-10">
            <form onSubmit={handleSearch} className="space-y-3">
              <label htmlFor="order-lookup" className="text-xs font-bold uppercase tracking-wider text-stone-500">{copy.label}</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input id="order-lookup" type="search" autoComplete="off" value={lookup} onChange={event => setLookup(event.target.value)} placeholder={copy.placeholder} aria-label={copy.label} className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 font-mono text-base outline-none transition focus:border-[#173b3b] focus:ring-2 focus:ring-[#173b3b]/15" />
                <button type="submit" disabled={isLoading || !lookup.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e4bd63] px-5 py-3 font-black text-[#173b3b] transition hover:bg-[#d6aa45] disabled:cursor-not-allowed disabled:opacity-50">
                  <Search className="h-4 w-4" /> {isLoading ? copy.checking : copy.button}
                </button>
              </div>
            </form>

            {error && <div className="mt-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><XCircle className="h-5 w-5 shrink-0" /> {error === 'No order was found for this Order ID or contact' ? copy.notFound : error}</div>}

            {orders.length > 0 && (
              <div className="mt-8 space-y-4 border-t border-stone-200 pt-8">
                {orders.map(order => {
                  const meta = statusMeta[order.status] || statusMeta.pending;
                  const statusText = copy.statuses[order.status] || copy.statuses.pending;
                  const StatusIcon = meta.icon || Shirt;
                  return (
              <div key={order.orderNumber} className="rounded-2xl border border-stone-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{copy.clothId}</p>
                    <p className="mt-1 font-mono text-2xl font-black">{order.orderNumber}</p>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-black ${meta.color}`}><StatusIcon className="h-4 w-4" /> {statusText[0]}</div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-stone-50 p-4"><p className="text-xs text-stone-500">{copy.garment}</p><p className="mt-1 font-bold">{localizeGarment(order.garmentType)}</p></div>
                  <div className="rounded-xl bg-stone-50 p-4"><p className="text-xs text-stone-500">{copy.quantity}</p><p className="mt-1 font-bold">{order.quantity}</p></div>
                  <div className="rounded-xl bg-stone-50 p-4"><p className="text-xs text-stone-500">{copy.collection}</p><p className="mt-1 font-bold">{order.deliveryDate || copy.toBeConfirmed}</p></div>
                </div>
                  <div className="mt-4 rounded-xl border border-stone-200 p-4 text-sm leading-6 text-stone-600">{statusText[1]}</div>
              </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <footer className="py-6 text-center text-xs text-stone-500">{language === 'ps' ? shopSettings.addressPs : language === 'fa' ? shopSettings.addressFa : shopSettings.addressEn}<br />{shopSettings.phone1} · {shopSettings.phone2}<br /><a href="https://rayan-tech-solution.tech" target="_blank" rel="noreferrer" className="underline">{copy.developed}</a></footer>
      </main>
      <a href="/#/login" className="fixed bottom-4 left-4 z-10 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-700 shadow-lg shadow-stone-900/10 transition hover:border-[#173b3b] hover:bg-[#173b3b] hover:text-white">{copy.staff}</a>
    </div>
  );
};
