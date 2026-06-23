import { reactive, ref } from 'vue';
import { supabase } from '../supabase.js';
import { enqueue, loadQueue } from './offlineQueue.js';

export const isLoading = ref(true);
export const globalDebtAlert = ref(null);

export const store = reactive({
  customers: [],
  operations: [],
  prices: {
    phone: 10,
    laptop: 20,
    battery: 5,
    powerbank: 5
  },
});

const CACHE_KEY = 'charging_db_cache';

export const loadLocalCache = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.customers) store.customers = parsed.customers;
      if (parsed.operations) store.operations = parsed.operations;
      if (parsed.prices) store.prices = parsed.prices;
    }
  } catch (e) {
    console.warn('Failed to load local cache', e);
  }
};

export const saveLocalCache = () => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      customers: store.customers,
      operations: store.operations,
      prices: store.prices
    }));
  } catch (e) {
    console.warn('Failed to save local cache', e);
  }
};

export const initData = async () => {
  // عرض البيانات فوراً من الذاكرة إذا وجدت
  loadLocalCache();
  
  // لا نظهر شريط التحميل المزعج إذا كانت البيانات موجودة مسبقاً
  if (store.customers.length === 0) {
    isLoading.value = true;
  }
  
  // تحميل قائمة الانتظار
  loadQueue();

  try {
    // Fetch prices
    const { data: pricesData, error: pricesError } = await supabase.from('prices').select('*');
    if (!pricesError && pricesData) {
      pricesData.forEach(p => {
        store.prices[p.device_type] = Number(p.price);
      });
    }

    // Fetch customers
    const { data: customersData, error: custError } = await supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(500);
    if (!custError && customersData) {
      store.customers = customersData;
    }

    // Fetch operations
    const { data: operationsData, error: opError } = await supabase.from('operations').select('*').order('created_at', { ascending: false }).limit(500);
    if (!opError && operationsData) {
      store.operations = operationsData;
    }
    
    // تحديث الذاكرة بعد جلب البيانات الجديدة
    saveLocalCache();
  } catch (err) {
    console.error('Error fetching data from Supabase:', err);
  } finally {
    isLoading.value = false;
  }
};

// ───────── Helper ─────────
const isOffline = () => !navigator.onLine;

// ───────── Actions ─────────

export const addOperation = async (op) => {
  const newOp = {
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
    ...op
  };
  
  store.operations.unshift(newOp);
  saveLocalCache(); // حفظ بعد التعديل لضمان بقائها لو أُغلق التطبيق بلا إنترنت
  
  if (isOffline()) {
    enqueue('addOperation', newOp);
  } else {
    const { error } = await supabase.from('operations').insert(newOp);
    if (error) enqueue('addOperation', newOp);
  }
  return newOp;
};

export const addCustomer = async (customer) => {
  const newCust = {
    id: Date.now().toString(),
    balance: 0,
    created_at: new Date().toISOString(),
    ...customer
  };
  
  store.customers.unshift(newCust); // Unshift أفضل للظهور بأول القائمة
  saveLocalCache();
  
  if (isOffline()) {
    enqueue('addCustomer', newCust);
  } else {
    const { error } = await supabase.from('customers').insert(newCust);
    if (error) enqueue('addCustomer', newCust);
  }
  return newCust;
};

export const updateCustomerBalance = async (customerId, amount) => {
  const cust = store.customers.find(c => c.id === customerId);
  if (cust) {
    cust.balance = Number(cust.balance) + Number(amount);
    saveLocalCache();
    
    if (isOffline()) {
      enqueue('updateBalance', { customerId, balance: cust.balance });
    } else {
      const { error } = await supabase.from('customers')
        .update({ balance: cust.balance })
        .eq('id', customerId);
        
      if (error) enqueue('updateBalance', { customerId, balance: cust.balance });
    }
  }
};

export const deleteCustomer = async (customerId) => {
  store.customers = store.customers.filter(c => c.id !== customerId);
  store.operations = store.operations.filter(op => op.customer_id !== customerId);
  saveLocalCache();
  
  if (!isOffline()) {
    await supabase.from('operations').delete().eq('customer_id', customerId);
    await supabase.from('customers').delete().eq('id', customerId);
  }
};

export const deleteOperation = async (operationId) => {
  const op = store.operations.find(o => o.id === operationId);
  if (!op) return;

  if (op.customer_id) {
    if (op.type === 'charge') {
      if (op.payment_mode === 'debt' || op.payment_mode === 'balance') {
        await updateCustomerBalance(op.customer_id, Number(op.amount)); 
      }
    } else if (op.type === 'payment') {
      await updateCustomerBalance(op.customer_id, -Number(op.amount)); 
    }
  }

  store.operations = store.operations.filter(o => o.id !== operationId);
  saveLocalCache();

  if (isOffline()) {
    enqueue('deleteOperation', { id: operationId });
  } else {
    const { error } = await supabase.from('operations').delete().eq('id', operationId);
    if (error) enqueue('deleteOperation', { id: operationId });
  }
};

export const editCustomer = async (customerId, updatedData) => {
  const index = store.customers.findIndex(c => c.id === customerId);
  if (index !== -1) {
    store.customers[index] = { ...store.customers[index], ...updatedData };
    saveLocalCache();
    
    if (!isOffline()) {
      await supabase.from('customers').update(updatedData).eq('id', customerId);
    }
  }
};

export const updatePrices = async (newPrices) => {
  for (const key in newPrices) {
    store.prices[key] = newPrices[key];
    saveLocalCache();
    
    if (isOffline()) {
      enqueue('updatePrices', { device_type: key, price: newPrices[key] });
    } else {
      await supabase.from('prices').upsert({ device_type: key, price: newPrices[key] });
    }
  }
};
