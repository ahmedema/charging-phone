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

export const initData = async () => {
  isLoading.value = true;
  
  // تحميل قائمة الانتظار أولاً
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
    const { data: customersData, error: custError } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (!custError && customersData) {
      store.customers = customersData;
    }

    // Fetch operations
    const { data: operationsData, error: opError } = await supabase.from('operations').select('*').order('created_at', { ascending: false });
    if (!opError && operationsData) {
      store.operations = operationsData;
    }
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
  
  // Optimistic update (يُعرض فوراً في الواجهة)
  store.operations.unshift(newOp);
  
  if (isOffline()) {
    // ❌ لا يوجد إنترنت → ضعها في قائمة الانتظار
    enqueue('addOperation', newOp);
    console.warn('⏳ لا إنترنت: تم حفظ العملية في قائمة الانتظار');
  } else {
    // ✅ يوجد إنترنت → أرسل مباشرة
    const { error } = await supabase.from('operations').insert(newOp);
    if (error) {
      console.error("Error adding operation:", error);
      // فشل الإرسال → ضع في قائمة الانتظار
      enqueue('addOperation', newOp);
    }
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
  
  // Optimistic update
  store.customers.push(newCust);
  
  if (isOffline()) {
    enqueue('addCustomer', newCust);
    console.warn('⏳ لا إنترنت: تم حفظ الزبون في قائمة الانتظار');
  } else {
    const { error } = await supabase.from('customers').insert(newCust);
    if (error) {
      console.error("Error adding customer:", error);
      enqueue('addCustomer', newCust);
    }
  }
  return newCust;
};

export const updateCustomerBalance = async (customerId, amount) => {
  const cust = store.customers.find(c => c.id === customerId);
  if (cust) {
    // Optimistic update
    cust.balance = Number(cust.balance) + Number(amount);
    
    if (isOffline()) {
      enqueue('updateBalance', { customerId, balance: cust.balance });
      console.warn('⏳ لا إنترنت: تم حفظ تحديث الرصيد في قائمة الانتظار');
    } else {
      const { error } = await supabase.from('customers')
        .update({ balance: cust.balance })
        .eq('id', customerId);
        
      if (error) {
        console.error("Error updating customer balance:", error);
        enqueue('updateBalance', { customerId, balance: cust.balance });
      }
    }
  }
};

export const deleteCustomer = async (customerId) => {
  store.customers = store.customers.filter(c => c.id !== customerId);
  store.operations = store.operations.filter(op => op.customer_id !== customerId);
  
  if (!isOffline()) {
    await supabase.from('operations').delete().eq('customer_id', customerId);
    await supabase.from('customers').delete().eq('id', customerId);
  }
};

export const editCustomer = async (customerId, updatedData) => {
  const index = store.customers.findIndex(c => c.id === customerId);
  if (index !== -1) {
    store.customers[index] = { ...store.customers[index], ...updatedData };
    
    if (!isOffline()) {
      await supabase.from('customers').update(updatedData).eq('id', customerId);
    }
  }
};

export const updatePrices = async (newPrices) => {
  // Update local store
  for (const key in newPrices) {
    store.prices[key] = newPrices[key];
    
    if (isOffline()) {
      enqueue('updatePrices', { device_type: key, price: newPrices[key] });
    } else {
      await supabase.from('prices').upsert({ device_type: key, price: newPrices[key] });
    }
  }
};
