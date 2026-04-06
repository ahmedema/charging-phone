import { reactive, ref } from 'vue';
import { supabase } from '../supabase.js';

export const isLoading = ref(true);

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

// Actions

export const addOperation = async (op) => {
  const newOp = {
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
    ...op
  };
  
  // Optimistic update
  store.operations.unshift(newOp);
  
  // DB update
  const { error } = await supabase.from('operations').insert(newOp);
  if (error) {
    console.error("Error adding operation:", error);
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
  
  // DB update
  const { error } = await supabase.from('customers').insert(newCust);
  if (error) {
    console.error("Error adding customer:", error);
  }
  return newCust;
};

export const updateCustomerBalance = async (customerId, amount) => {
  const cust = store.customers.find(c => c.id === customerId);
  if (cust) {
    // Optimistic update
    cust.balance = Number(cust.balance) + Number(amount);
    
    // DB update
    const { error } = await supabase.from('customers')
      .update({ balance: cust.balance })
      .eq('id', customerId);
      
    if (error) {
      console.error("Error updating customer balance:", error);
    }
  }
};

export const deleteCustomer = async (customerId) => {
  store.customers = store.customers.filter(c => c.id !== customerId);
  store.operations = store.operations.filter(op => op.customer_id !== customerId);
  
  await supabase.from('operations').delete().eq('customer_id', customerId);
  await supabase.from('customers').delete().eq('id', customerId);
};

export const editCustomer = async (customerId, updatedData) => {
  const index = store.customers.findIndex(c => c.id === customerId);
  if (index !== -1) {
    store.customers[index] = { ...store.customers[index], ...updatedData };
    
    await supabase.from('customers').update(updatedData).eq('id', customerId);
  }
};

export const updatePrices = async (newPrices) => {
  // Update local store
  for (const key in newPrices) {
    store.prices[key] = newPrices[key];
    
    // Upsert to DB
    await supabase.from('prices').upsert({ device_type: key, price: newPrices[key] });
  }
};
