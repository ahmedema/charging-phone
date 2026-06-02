import { reactive, ref } from 'vue';
import { supabase } from '../supabase.js';

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
  laundryLoading.value = true;
  try {
    // Prices
    const { data: pricesData } = await supabase.from('laundry_prices').select('*');
    if (pricesData) {
      pricesData.forEach(p => { laundryStore.prices[p.key] = Number(p.price); });
    }

    // Customers
    const { data: customers } = await supabase
      .from('laundry_customers').select('*').order('created_at', { ascending: false });
    if (customers) laundryStore.customers = customers;

    // Orders
    const { data: orders } = await supabase
      .from('laundry_orders').select('*').order('created_at', { ascending: false });
    if (orders) laundryStore.orders = orders;

    // Order Items
    const { data: items } = await supabase.from('laundry_order_items').select('*');
    if (items) laundryStore.orderItems = items;

    // Payments
    const { data: payments } = await supabase
      .from('laundry_payments').select('*').order('created_at', { ascending: false });
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
  if (!isOffline()) {
    const { error } = await supabase.from('laundry_customers').insert(customer);
    if (error) console.error('خطأ في إضافة الزبون:', error);
  }
  return customer;
};

export const editLaundryCustomer = async (id, data) => {
  const idx = laundryStore.customers.findIndex(c => c.id === id);
  if (idx !== -1) {
    laundryStore.customers[idx] = { ...laundryStore.customers[idx], ...data };
    if (!isOffline()) await supabase.from('laundry_customers').update(data).eq('id', id);
  }
};

export const deleteLaundryCustomer = async (customerId, withOrders = false) => {
  if (withOrders) {
    // حذف كل بيانات الزبون
    const orderIds = laundryStore.orders.filter(o => o.customer_id === customerId).map(o => o.id);
    laundryStore.orderItems = laundryStore.orderItems.filter(i => !orderIds.includes(i.order_id));
    laundryStore.orders = laundryStore.orders.filter(o => o.customer_id !== customerId);
    laundryStore.payments = laundryStore.payments.filter(p => p.customer_id !== customerId);
    if (!isOffline()) {
      for (const oid of orderIds) {
        await supabase.from('laundry_order_items').delete().eq('order_id', oid);
        await supabase.from('laundry_orders').delete().eq('id', oid);
      }
      await supabase.from('laundry_payments').delete().eq('customer_id', customerId);
    }
  }
  laundryStore.customers = laundryStore.customers.filter(c => c.id !== customerId);
  if (!isOffline()) await supabase.from('laundry_customers').delete().eq('id', customerId);
};

export const updateLaundryCustomerDebt = async (customerId, debtDelta) => {
  const cust = laundryStore.customers.find(c => c.id === customerId);
  if (cust) {
    cust.total_debt = Number(cust.total_debt) + debtDelta;
    if (!isOffline()) {
      await supabase.from('laundry_customers').update({ total_debt: cust.total_debt }).eq('id', customerId);
    }
  }
};

// ───────── Orders ─────────
export const addLaundryOrder = async ({ customer, items, totalAmount, paidAmount, notes, orderStatus }) => {
  // 1. Ensure customer exists
  let custId = customer.id;
  if (!custId) {
    const newCust = await addLaundryCustomer({ name: customer.name, phone: customer.phone || null });
    custId = newCust.id;
  }

  const remainingDebt = Math.max(0, totalAmount - paidAmount);
  const paymentStatus = remainingDebt === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'debt';

  // 2. Create order
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

  // 3. Create items
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

  // Optimistic update
  laundryStore.orders.unshift(order);
  laundryStore.orderItems.push(...orderItems);

  // Update customer debt
  if (remainingDebt > 0) await updateLaundryCustomerDebt(custId, remainingDebt);

  // Sync to Supabase
  if (!isOffline()) {
    const { error: orderErr } = await supabase.from('laundry_orders').insert(order);
    if (orderErr) console.error('خطأ حفظ الطلب:', orderErr);
    if (orderItems.length > 0) {
      const { error: itemsErr } = await supabase.from('laundry_order_items').insert(orderItems);
      if (itemsErr) console.error('خطأ حفظ تفاصيل الطلب:', itemsErr);
    }
  }

  return { order, custId };
};

export const updateLaundryOrder = async (orderId, data) => {
  const idx = laundryStore.orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    const old = laundryStore.orders[idx];

    // Reverse old debt, apply new debt
    if (old.customer_id) {
      await updateLaundryCustomerDebt(old.customer_id, -Number(old.remaining_debt));
    }

    laundryStore.orders[idx] = { ...old, ...data };

    if (data.customer_id && data.remaining_debt > 0) {
      await updateLaundryCustomerDebt(data.customer_id, Number(data.remaining_debt));
    }

    if (!isOffline()) {
      await supabase.from('laundry_orders').update(data).eq('id', orderId);
    }
  }
};

export const updateOrderStatus = async (orderId, orderStatus) => {
  const order = laundryStore.orders.find(o => o.id === orderId);
  if (order) {
    order.order_status = orderStatus;
    if (!isOffline()) {
      await supabase.from('laundry_orders').update({ order_status: orderStatus }).eq('id', orderId);
    }
  }
};

export const deleteLaundryOrder = async (orderId) => {
  const order = laundryStore.orders.find(o => o.id === orderId);
  if (!order) return;

  // Reverse debt
  if (order.customer_id && order.remaining_debt > 0) {
    await updateLaundryCustomerDebt(order.customer_id, -Number(order.remaining_debt));
  }

  laundryStore.orders = laundryStore.orders.filter(o => o.id !== orderId);
  laundryStore.orderItems = laundryStore.orderItems.filter(i => i.order_id !== orderId);

  if (!isOffline()) {
    await supabase.from('laundry_order_items').delete().eq('order_id', orderId);
    await supabase.from('laundry_orders').delete().eq('id', orderId);
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
  await updateLaundryCustomerDebt(customerId, -Number(amount));

  if (!isOffline()) {
    const { error } = await supabase.from('laundry_payments').insert(payment);
    if (error) console.error('خطأ في حفظ الدفعة:', error);
  }

  return payment;
};

// ───────── Prices ─────────
export const updateLaundryPrices = async (newPrices) => {
  for (const key in newPrices) {
    laundryStore.prices[key] = newPrices[key];
    if (!isOffline()) {
      await supabase.from('laundry_prices').update({ price: newPrices[key], updated_at: new Date().toISOString() }).eq('key', key);
    }
  }
};
