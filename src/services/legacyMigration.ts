import { isSupabaseConfigured, supabase, toDatabaseRows } from '../lib/supabase';

const keys = {
  tailor_fabrics_v1: 'fabrics', tailor_orders_v1: 'orders', tailor_customers_v1: 'customers',
  tailor_products_v1: 'products', tailor_product_sales_v1: 'product_sales',
  tailor_measurement_fields_v1: 'measurement_fields', tailor_design_categories_v1: 'design_categories',
} as const;

export async function migrateLegacyLocalData(): Promise<number> {
  if (!isSupabaseConfigured) {
    return 0;
  }
  let imported = 0;
  for (const [key, table] of Object.entries(keys)) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const rows = JSON.parse(raw);
    if (Array.isArray(rows) && rows.length) {
      const { error } = await supabase.from(table).upsert(toDatabaseRows(table, rows));
      if (error) throw error;
      imported += rows.length;
    }
  }
  const settingsRaw = localStorage.getItem('tailor_shop_settings_v1');
  if (settingsRaw) {
    const { error } = await supabase.from('shop_settings').upsert({ id: 'default', data: JSON.parse(settingsRaw) });
    if (error) throw error;
    imported++;
  }
  const categories = JSON.parse(localStorage.getItem('tailor_product_categories_v1') || '[]');
  if (Array.isArray(categories) && categories.length) {
    const rows = categories.map((value: any, index: number) => typeof value === 'string'
      ? { id: `cat_${index}_${value.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, name: value, sort_order: index }
      : { id: value.id, name: value.name, sort_order: index });
    const { error } = await supabase.from('product_categories').upsert(rows);
    if (error) throw error;
    imported += rows.length;
  }
  for (const [key, table] of [['tailor_product_vendors_v1', 'product_vendors'], ['tailor_product_brands_v1', 'product_brands']] as const) {
    const values = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(values) || !values.length) continue;
    const { error } = await supabase.from(table).upsert(values.map((name: string, sort_order: number) => ({ name, sort_order })));
    if (error) throw error;
    imported += values.length;
  }
  const garmentTypes = JSON.parse(localStorage.getItem('tailor_garment_types_v1') || '[]');
  if (Array.isArray(garmentTypes) && garmentTypes.length) {
    const { error } = await supabase.from('garment_types').upsert(toDatabaseRows('garment_types', garmentTypes));
    if (error) throw error;
    imported += garmentTypes.length;
  }
  const uiPreferences = {
    fabricLowStockThreshold: Math.max(1, Number(localStorage.getItem('fabrics_low_stock_threshold')) || 15),
    productLowStockThreshold: Math.max(1, Number(localStorage.getItem('products_low_stock_threshold')) || 3),
  };
  const { error: preferencesError } = await supabase.from('ui_preferences').upsert(toDatabaseRows('ui_preferences', uiPreferences));
  if (preferencesError) throw preferencesError;
  for (const key of [...Object.keys(keys), 'tailor_product_categories_v1', 'tailor_product_vendors_v1', 'tailor_product_brands_v1', 'tailor_garment_types_v1', 'tailor_shop_settings_v1', 'tailor_app_auth_user_v1', 'tailor_app_auth_token_v1']) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem('fabrics_low_stock_threshold');
  localStorage.removeItem('products_low_stock_threshold');
  return imported;
}
