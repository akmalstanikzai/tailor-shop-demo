// This frontend-only build deliberately has no remote database client.
// The compatibility API below stores all demo data in the current browser.
export const isSupabaseConfigured = false;

const clean = (row: Record<string, any>) => Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));

export function toDatabaseRow(table: string, row: any): any {
  if (!row || typeof row !== 'object') return row;
  const commonDates = { created_at: row.createdAt, updated_at: row.updatedAt };
  const mappings: Record<string, Record<string, any>> = {
    orders: {
      id: row.id, order_number: row.orderNumber, customer_id: row.customerId || null,
      customer_name: row.customerName, customer_phone: row.customerPhone || null,
      customer_whatsapp: row.customerWhatsApp || null, garment_type: row.garmentType || null,
      quantity: row.quantity, fabric_id: row.fabricId || null, fabric_name: row.fabricName || null,
      fabric_color: row.fabricColor || null, fabric_meters: row.fabricMeters ?? 0,
      is_customer_fabric: row.isCustomerFabric ?? false, measurements: row.measurements || {},
      design_selections: row.designSelections || {}, special_instructions: row.specialInstructions || null,
      cabinet_slot: row.cabinetSlot || null, items: row.items || [], total_amount: row.totalAmount ?? 0,
      paid_amount: row.paidAmount ?? 0, balance_amount: row.balanceAmount ?? 0,
      payment_status: row.paymentStatus || 'unpaid', status: row.status || 'pending',
      order_date: row.orderDate || null, delivery_date: row.deliveryDate || null,
      completed_date: row.completedDate || null, delivered_date: row.deliveredDate || null, ...commonDates,
    },
    customers: {
      id: row.id, name: row.name, phone: row.phone || null, whatsapp: row.whatsapp || null,
      address: row.address || null, notes: row.notes || null,
      standard_measurements: row.standardMeasurements || {}, preferred_garment_type: row.preferredGarmentType || null,
      total_orders_count: row.totalOrdersCount ?? 0, total_spent: row.totalSpent ?? 0,
      total_balance: row.totalBalance ?? 0, ...commonDates,
    },
    fabrics: {
      id: row.id, name: row.name, code: row.code || null, color: row.color || null, type: row.type || null,
      price_per_meter: row.pricePerMeter ?? 0, stock_meters: row.stockMeters ?? 0, supplier: row.supplier || null,
      image_url: row.imageUrl || null, notes: row.notes || null, ...commonDates,
    },
    products: {
      id: row.id, name: row.name, category: row.category, vendor: row.vendor || null, brand: row.brand || null,
      sku: row.sku || null, image_url: row.imageUrl || null, purchase_price: row.purchasePrice ?? 0,
      stock_quantity: row.stockQuantity ?? 0, low_stock_threshold: row.lowStockThreshold ?? 5,
      description: row.description || null, ...commonDates,
    },
    product_sales: {
      id: row.id, product_id: row.productId, product_name: row.productName, category: row.category,
      quantity: row.quantity, purchase_price: row.purchasePrice ?? 0, selling_price: row.sellingPrice ?? 0,
      total_amount: row.totalAmount ?? 0, paid_amount: row.paidAmount ?? 0,
      balance_amount: row.balanceAmount ?? 0, payment_status: row.paymentStatus || 'paid', profit: row.profit ?? 0,
      customer_id: row.customerId || null, customer_name: row.customerName || null,
      customer_phone: row.customerPhone || null, sale_date: row.saleDate,
      payment_method: row.paymentMethod || null, notes: row.notes || null, created_at: row.createdAt,
    },
    measurement_fields: {
      id: row.id, key: row.key, label_en: row.labelEn, label_fa: row.labelFa, label_ps: row.labelPs,
      unit: row.unit || 'in', default_value: row.defaultValue == null ? null : String(row.defaultValue),
      is_standard: row.isStandard ?? true, sort_order: row.sortOrder ?? 0,
      garment_category: row.garmentCategory || 'perahan_tunban', step: row.step || null, required: row.required ?? false,
    },
    design_categories: {
      id: row.id, key: row.key, title_en: row.titleEn, title_fa: row.titleFa, title_ps: row.titlePs,
      options: row.options || [], garment_category: row.garmentCategory || 'perahan_tunban',
      allow_custom_input: row.allowCustomInput ?? false, sort_order: row.sortOrder ?? 0,
    },
    product_categories: {
      id: row.id, name: row.name, sort_order: row.sortOrder ?? 0,
    },
    garment_types: {
      id: row.id, key: row.key, name_en: row.nameEn, name_fa: row.nameFa, name_ps: row.namePs,
      description_en: row.descriptionEn || null, description_fa: row.descriptionFa || null,
      description_ps: row.descriptionPs || null, icon: row.icon || null,
      sort_order: row.sortOrder ?? 0, is_standard: row.isStandard ?? false,
    },
    ui_preferences: {
      id: 'default', fabric_low_stock_threshold: row.fabricLowStockThreshold ?? 15,
      product_low_stock_threshold: row.productLowStockThreshold ?? 3,
    },
    expenses: {
      id: row.id,
      title: row.title,
      category: row.category || 'other',
      amount: Number(row.amount) || 0,
      date: row.date || new Date().toISOString().slice(0, 10),
      spent_by: row.spentBy || '',
      payment_method: row.paymentMethod || 'cash',
      notes: row.notes || null,
      receipt_number: row.receiptNumber || null,
      ...commonDates,
    },
  };
  return clean(mappings[table] || row);
}

export const toDatabaseRows = (table: string, value: any): any =>
  Array.isArray(value) ? value.map(row => toDatabaseRow(table, row)) : toDatabaseRow(table, value);

export function fromDatabaseRow(table: string, row: any): any {
  if (!row || typeof row !== 'object') return row;
  const result: any = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    result[camelKey] = value;
  }
  if (table === 'orders') {
    result.customerWhatsApp = row.customer_whatsapp;
    delete result.customerWhatsapp;
  }
  return result;
}

export const fromDatabaseRows = (table: string, rows: any[]) => rows.map(row => fromDatabaseRow(table, row));

// In-memory & LocalStorage Fallback Client when Supabase is not provisioned
function createLocalFallbackClient() {
  const authListeners: ((event: string, session: any) => void)[] = [];

  const getStoredUser = () => {
    try {
      const raw = localStorage.getItem('tailor_app_auth_user_v1');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const setStoredUser = (user: any) => {
    try {
      if (user) localStorage.setItem('tailor_app_auth_user_v1', JSON.stringify(user));
      else localStorage.removeItem('tailor_app_auth_user_v1');
    } catch {}
  };

  const getStoredRows = (table: string): any[] => {
    const tableKeys: Record<string, string> = {
      orders: 'tailor_orders_v1',
      customers: 'tailor_customers_v1',
      fabrics: 'tailor_fabrics_v1',
      products: 'tailor_products_v1',
      product_sales: 'tailor_product_sales_v1',
      measurement_fields: 'tailor_measurement_fields_v1',
      design_categories: 'tailor_design_categories_v1',
      garment_types: 'tailor_garment_types_v1',
      product_categories: 'tailor_product_categories_v1',
      product_vendors: 'tailor_product_vendors_v1',
      product_brands: 'tailor_product_brands_v1',
      ui_preferences: 'ui_preferences',
      shop_settings: 'tailor_shop_settings_v1',
      expenses: 'tailor_expenses_v1',
    };
    const key = tableKeys[table] || `tailor_${table}_v1`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(r => toDatabaseRow(table, r));
        if (table === 'shop_settings') return [{ id: 'default', data: parsed }];
        if (table === 'ui_preferences' && !Array.isArray(parsed)) return [{ id: 'default', ...toDatabaseRow(table, parsed) }];
      }
    } catch {}
    return [];
  };

  const saveStoredRows = (table: string, rows: any[]) => {
    const tableKeys: Record<string, string> = {
      orders: 'tailor_orders_v1',
      customers: 'tailor_customers_v1',
      fabrics: 'tailor_fabrics_v1',
      products: 'tailor_products_v1',
      product_sales: 'tailor_product_sales_v1',
      measurement_fields: 'tailor_measurement_fields_v1',
      design_categories: 'tailor_design_categories_v1',
      garment_types: 'tailor_garment_types_v1',
      product_categories: 'tailor_product_categories_v1',
      product_vendors: 'tailor_product_vendors_v1',
      product_brands: 'tailor_product_brands_v1',
      ui_preferences: 'ui_preferences',
      shop_settings: 'tailor_shop_settings_v1',
      expenses: 'tailor_expenses_v1',
    };
    const key = tableKeys[table] || `tailor_${table}_v1`;
    try {
      const converted = rows.map(r => fromDatabaseRow(table, r));
      localStorage.setItem(key, JSON.stringify(converted));
    } catch {}
  };

  class LocalQueryBuilder {
    private tableName: string;
    private filters: ((row: any) => boolean)[] = [];
    private isHead = false;

    constructor(tableName: string) {
      this.tableName = tableName;
    }

    select(_columns?: string, options?: { head?: boolean; count?: 'exact' }) {
      if (options?.head) this.isHead = true;
      return this;
    }

    eq(column: string, value: any) {
      this.filters.push(row => row[column] === value || String(row[column]) === String(value));
      return this;
    }

    neq(column: string, value: any) {
      this.filters.push(row => row[column] !== value);
      return this;
    }

    not(column: string, _operator: string, value: any) {
      this.filters.push(row => row[column] !== value);
      return this;
    }

    in(column: string, values: any[]) {
      this.filters.push(row => values.includes(row[column]));
      return this;
    }

    async upsert(payload: any) {
      const current = getStoredRows(this.tableName);
      const itemsToUpsert = Array.isArray(payload) ? payload : [payload];
      for (const item of itemsToUpsert) {
        const idx = current.findIndex(r => r.id === item.id);
        if (idx >= 0) current[idx] = { ...current[idx], ...item };
        else current.unshift(item);
      }
      saveStoredRows(this.tableName, current);
      return {
        data: payload,
        error: null,
        select: async () => ({ data: payload, error: null })
      };
    }

    async delete() {
      let current = getStoredRows(this.tableName);
      if (this.filters.length) {
        current = current.filter(row => !this.filters.every(f => f(row)));
      } else {
        current = [];
      }
      saveStoredRows(this.tableName, current);
      return { data: null, error: null };
    }

    async single() {
      const res = await this.execute();
      return { data: res.data?.[0] || null, error: res.data?.[0] ? null : new Error('No rows found') };
    }

    async maybeSingle() {
      const res = await this.execute();
      return { data: res.data?.[0] || null, error: null };
    }

    // Promise implementation
    then(onfulfilled?: ((value: any) => any) | null, onrejected?: ((reason: any) => any) | null): Promise<any> {
      return this.execute().then(onfulfilled, onrejected);
    }

    private async execute() {
      let rows = getStoredRows(this.tableName);
      for (const filter of this.filters) {
        rows = rows.filter(filter);
      }
      return {
        data: this.isHead ? null : rows,
        count: rows.length,
        error: null,
      };
    }
  }

  return {
    auth: {
      async getUser() {
        const user = getStoredUser();
        if (user) {
          return { data: { user: { id: 'local_admin', email: user.email, user_metadata: { name: user.name || 'Admin' } } }, error: null };
        }
        return { data: { user: null }, error: null };
      },
      async getSession() {
        const user = getStoredUser();
        if (user) {
          return { data: { session: { access_token: 'local_token', user: { id: 'local_admin', email: user.email } } }, error: null };
        }
        return { data: { session: null }, error: null };
      },
      async signInWithPassword({ email, password: _password }: { email: string; password?: string }) {
        const cleanEmail = (email || 'admin@mujeeb.af').trim().toLowerCase();
        if (cleanEmail !== 'admin@tailorshop.com' || _password !== 'admin123') {
          return { data: { user: null, session: null }, error: new Error('Invalid demo credentials') };
        }
        const user = { email: cleanEmail, name: cleanEmail.split('@')[0] || 'Admin' };
        setStoredUser(user);
        const session = { access_token: 'local_session', user: { id: 'local_admin', email: cleanEmail, user_metadata: { name: user.name } } };
        authListeners.forEach(listener => listener('SIGNED_IN', session));
        return { data: { user: session.user, session }, error: null };
      },
      async signOut() {
        setStoredUser(null);
        authListeners.forEach(listener => listener('SIGNED_OUT', null));
        return { error: null };
      },
      onAuthStateChange(callback: (event: string, session: any) => void) {
        authListeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const idx = authListeners.indexOf(callback);
                if (idx >= 0) authListeners.splice(idx, 1);
              },
            },
          },
        };
      },
    },
    from(tableName: string) {
      return new LocalQueryBuilder(tableName);
    },
    async rpc(fnName: string, args: Record<string, any>) {
      if (fnName === 'lookup_public_orders') {
        const lookup = String(args?.lookup_value || '').trim().toLowerCase();
        const orders = getStoredRows('orders');
        const matched = orders.filter(row => {
          const ordNum = String(row.order_number || '').toLowerCase();
          const phone = String(row.customer_phone || '').replace(/[^0-9]/g, '');
          const whatsapp = String(row.customer_whatsapp || '').replace(/[^0-9]/g, '');
          const cleanLookup = lookup.replace(/[^a-z0-9]/g, '');
          return (
            ordNum.toLowerCase().includes(cleanLookup) ||
            ordNum.replace(/[^0-9]/g, '').includes(cleanLookup) ||
            (cleanLookup.length >= 3 && (phone.includes(cleanLookup) || whatsapp.includes(cleanLookup)))
          );
        });

        return {
          data: matched.map(row => ({
            order_number: row.order_number,
            garment_type: row.garment_type,
            quantity: row.quantity,
            status: row.status,
            order_date: row.order_date,
            delivery_date: row.delivery_date,
            completed_date: row.completed_date,
            delivered_date: row.delivered_date,
          })),
          error: matched.length > 0 ? null : new Error('No order was found for this Order ID or contact'),
        };
      }
      return { data: null, error: new Error(`RPC ${fnName} not implemented in local mode`) };
    },
  };
}

export const supabase: any = createLocalFallbackClient();
