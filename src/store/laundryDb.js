import { reactive, ref } from 'vue';
import { supabase } from '../supabase.js';
import { enqueueLaundry, loadLaundryQueue } from './laundryOfflineQueue.js';

export const laundryLoading = ref(true);

export const laundryStore = reactive({
  customers: [],
  orders: [],
  orderItems: [],
  payments: [],
  prices: {
    clothes_with_powder: 1.0,
    clothes_without_powder: 1.5,
    carpet_default: 20.0,
    blanket_default: 15.0,
  },
});

// ───────── Helpers ─────────
const uid = () => Date.now().toString() + Math.random().toString(36).slice(2, 7);
const isOffline = () => !navigator.onLine;

// ───────── Init ─────────
export const initLaundryData = async () => {
  loadLaundryQueue();
  laundryLoading.value = true;
  try {
    // Prices
    const { data: pricesData } = await supabase.from('laundry_prices').select('*');
    if (pricesData) {
      pricesData.forEach(p => { laundryStore.prices[p.key] = Number(p.price); });
    }

    // Customers
    const { data: customers } = await supabase
      .from('laundry_customers').select('*').order('created_at', { ascending: false }).limit(500);
    if (customers) laundryStore.customers = customers;

    // Orders
    const { data: orders } = await supabase
      .from('laundry_orders').select('*').order('created_at', { ascending: false }).limit(500);
    if (orders) laundryStore.orders = orders;

    // Order Items
    const { data: items } = await supabase.from('laundry_order_items').select('*').order('created_at', { ascending: false }).limit(2000);
    if (items) laundryStore.orderItems = items;

    // Payments
    const { data: payments } = await supabase
      .from('laundry_payments').select('*').order('created_at', { ascending: false }).limit(500);
    if (payments) laundryStore.payments = payments;

  } catch (err) {
    console.error('خطأ في تحميل بيانات المغسلة:', err);
  } finally {
    laundryLoading.value = false;
  }
};

// ───────── Customers ─────────
export const addLaundryCustomer = async (data) => {
  const customer = { id: uid(), total_debt: 0, created_at: new Date().toISOString(), ...data };
  laundryStore.customers.unshift(customer);
  try {
    const { error } = await supabase.from('laundry_customers').insert(customer);
    if (error) throw error;
  } catch (err) {
    enqueueLaundry('addLaundryCustomer', customer);
  }
  return customer;
};

export const editLaundryCustomer = async (id, data) => {
  const idx = laundryStore.customers.findIndex(c => c.id === id);
  if (idx !== -1) {
    laundryStore.customers[idx] = { ...laundryStore.customers[idx], ...data };
    try {
      const { error } = await supabase.from('laundry_customers').update(data).eq('id', id);
      if (error) throw error;
    } catch (err) {
      enqueueLaundry('updateLaundryCustomer', { id, data });
    }
  }
};

export const deleteLaundryCustomer = async (customerId, withOrders = false) => {
  if (withOrders) {
    const orderIds = laundryStore.orders.filter(o => o.customer_id === customerId).map(o => o.id);
    laundryStore.orderItems = laundryStore.orderItems.filter(i => !orderIds.includes(i.order_id));
    laundryStore.orders = laundryStore.orders.filter(o => o.customer_id !== customerId);
    laundryStore.payments = laundryStore.payments.filter(p => p.customer_id !== customerId);
    
    for (const oid of orderIds) {
      try {
        const { error } = await supabase.from('laundry_order_items').delete().eq('order_id', oid);
        if (error) throw error;
        const { error: e2 } = await supabase.from('laundry_orders').delete().eq('id', oid);
        if (e2) throw e2;
      } catch (err) {
        enqueueLaundry('deleteLaundryOrder', { orderId: oid });
      }
    }
    // Delete payments
    try {
      await supabase.from('laundry_payments').delete().eq('customer_id', customerId);
    } catch (err) {}
  }
  laundryStore.customers = laundryStore.customers.filter(c => c.id !== customerId);
  try {
    const { error } = await supabase.from('laundry_customers').delete().eq('id', customerId);
    if (error) throw error;
  } catch (err) {
    enqueueLaundry('deleteLaundryCustomer', { id: customerId });
  }
};

export const updateLaundryCustomerDebt = async (customerId, debtDelta) => {
  const cust = laundryStore.customers.find(c => c.id === customerId);
  if (cust) {
    cust.total_debt = Number(cust.total_debt) + debtDelta;
    try {
      const { error } = await supabase.from('laundry_customers').update({ total_debt: cust.total_debt }).eq('id', customerId);
      if (error) throw error;
    } catch (err) {
      enqueueLaundry('updateLaundryCustomer', { id: customerId, data: { total_debt: cust.total_debt } });
    }
  }
};

// ───────── Orders ─────────
export const addLaundryOrder = async ({ customer, items, totalAmount, paidAmount, notes, orderStatus }) => {
  let custId = customer.id;
  if (!custId) {
    const newCust = await addLaundryCustomer({ name: customer.name, phone: customer.phone || null });
    custId = newCust.id;
  }

  const remainingDebt = Math.max(0, totalAmount - paidAmount);
  const paymentStatus = remainingDebt === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'debt';

  const order = {
    id: uid(),
    customer_id: custId,
    customer_name: customer.name,
    order_date: new Date().toISOString(),
    total_amount: totalAmount,
    paid_amount: paidAmount,
    remaining_debt: remainingDebt,
    payment_status: paymentStatus,
    order_status: orderStatus || 'new',
    notes: notes || null,
    created_at: new Date().toISOString(),
  };

  const orderItems = items.map(item => ({
    id: uid(),
    order_id: order.id,
    item_type: item.type,
    weight_kg: item.weightKg || null,
    with_powder: item.withPowder ?? null,
    description: item.description || null,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    created_at: new Date().toISOString(),
  }));

  laundryStore.orders.unshift(order);
  laundryStore.orderItems.push(...orderItems);

  if (remainingDebt > 0) updateLaundryCustomerDebt(custId, remainingDebt);

  try {
    const { error: orderErr } = await supabase.from('laundry_orders').insert(order);
    if (orderErr) throw orderErr;
    if (orderItems.length > 0) {
      const { error: itemsErr } = await supabase.from('laundry_order_items').insert(orderItems);
      if (itemsErr) throw itemsErr;
    }
  } catch (err) {
    enqueueLaundry('addLaundryOrder', { order, orderItems });
  }

  return { order, custId };
};

export const updateLaundryOrder = async (orderId, data) => {
  const idx = laundryStore.orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    const old = laundryStore.orders[idx];

    if (old.customer_id) {
      await updateLaundryCustomerDebt(old.customer_id, -Number(old.remaining_debt));
    }

    laundryStore.orders[idx] = { ...old, ...data };

    if (data.customer_id && data.remaining_debt > 0) {
      updateLaundryCustomerDebt(data.customer_id, Number(data.remaining_debt));
    }

    try {
      const { error } = await supabase.from('laundry_orders').update(data).eq('id', orderId);
      if (error) throw error;
    } catch (err) {
      enqueueLaundry('updateLaundryOrder', { orderId, data });
    }
  }
};

export const updateOrderStatus = async (orderId, orderStatus) => {
  const order = laundryStore.orders.find(o => o.id === orderId);
  if (order) {
    order.order_status = orderStatus;
    try {
      const { error } = await supabase.from('laundry_orders').update({ order_status: orderStatus }).eq('id', orderId);
      if (error) throw error;
    } catch (err) {
      enqueueLaundry('updateLaundryOrder', { orderId, data: { order_status: orderStatus } });
    }
  }
};

export const deleteLaundryOrder = async (orderId) => {
  const order = laundryStore.orders.find(o => o.id === orderId);
  if (!order) return;

  if (order.customer_id && order.remaining_debt > 0) {
    updateLaundryCustomerDebt(order.customer_id, -Number(order.remaining_debt));
  }

  laundryStore.orders = laundryStore.orders.filter(o => o.id !== orderId);
  laundryStore.orderItems = laundryStore.orderItems.filter(i => i.order_id !== orderId);

  try {
    const { error } = await supabase.from('laundry_order_items').delete().eq('order_id', orderId);
    if (error) throw error;
    const { error: e2 } = await supabase.from('laundry_orders').delete().eq('id', orderId);
    if (e2) throw e2;
  } catch (err) {
    enqueueLaundry('deleteLaundryOrder', { orderId });
  }
};

// ───────── Payments ─────────
export const addLaundryPayment = async ({ customerId, customerName, amount, notes }) => {
  const payment = {
    id: uid(),
    customer_id: customerId,
    customer_name: customerName,
    amount: Number(amount),
    notes: notes || null,
    payment_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  laundryStore.payments.unshift(payment);
  updateLaundryCustomerDebt(customerId, -Number(amount));

  try {
    const { error } = await supabase.from('laundry_payments').insert(payment);
    if (error) throw error;
  } catch (err) {
    enqueueLaundry('addLaundryPayment', { payment });
  }

  return payment;
};

// ───────── Prices ─────────
export const updateLaundryPrices = async (newPrices) => {
  for (const key in newPrices) {
    laundryStore.prices[key] = newPrices[key];
    const updated_at = new Date().toISOString();
    try {
      const { error } = await supabase.from('laundry_prices').update({ price: newPrices[key], updated_at }).eq('key', key);
      if (error) throw error;
    } catch (err) {
      enqueueLaundry('updateLaundryPrices', { key, price: newPrices[key], updated_at });
    }
  }
};
