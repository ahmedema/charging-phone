/**
 * Laundry Offline Queue System
 * يحفظ العمليات الفاشلة بسبب انقطاع الإنترنت ويرسلها تلقائياً عند عودة الاتصال لقسم المغسلة
 */
import { reactive, ref } from 'vue';
import { supabase } from '../supabase.js';

const QUEUE_KEY = 'laundry_offline_queue';

// حالة القائمة
export const laundryOfflineQueue = reactive({
  items: [],
  isSyncing: false,
  lastSyncAttempt: null,
});

export const laundryPendingCount = ref(0);

// تحميل القائمة من localStorage عند بدء التطبيق
export const loadLaundryQueue = () => {
  try {
    const saved = localStorage.getItem(QUEUE_KEY);
    if (saved) {
      laundryOfflineQueue.items = JSON.parse(saved);
      laundryPendingCount.value = laundryOfflineQueue.items.length;
    }
  } catch (e) {
    console.warn('خطأ في تحميل قائمة انتظار المغسلة:', e);
    laundryOfflineQueue.items = [];
  }
};

// حفظ القائمة في localStorage
const saveLaundryQueue = () => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(laundryOfflineQueue.items));
    laundryPendingCount.value = laundryOfflineQueue.items.length;
  } catch (e) {
    console.warn('خطأ في حفظ قائمة انتظار المغسلة:', e);
  }
};

// إضافة عملية للقائمة
export const enqueueLaundry = (type, payload) => {
  const item = {
    id: `lq_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    payload,
    queuedAt: new Date().toISOString(),
    retries: 0,
  };
  laundryOfflineQueue.items.push(item);
  saveLaundryQueue();

  // محاولة المزامنة التلقائية بعد 5 ثوانٍ إذا كنا متصلين
  if (navigator.onLine) {
    setTimeout(() => syncLaundryQueue(), 5000);
  }

  return item.id;
};

// تنفيذ عملية واحدة من القائمة
const executeLaundryItem = async (item) => {
  const { type, payload } = item;

  if (type === 'addLaundryCustomer') {
    const { error } = await supabase.from('laundry_customers').insert(payload);
    if (error) throw error;
  }
  else if (type === 'updateLaundryCustomer') {
    const { id, data } = payload;
    const { error } = await supabase.from('laundry_customers').update(data).eq('id', id);
    if (error) throw error;
  }
  else if (type === 'deleteLaundryCustomer') {
    const { id } = payload;
    const { error } = await supabase.from('laundry_customers').delete().eq('id', id);
    if (error) throw error;
  }
  else if (type === 'addLaundryOrder') {
    const { order, orderItems } = payload;
    const { error: orderErr } = await supabase.from('laundry_orders').insert(order);
    if (orderErr) throw orderErr;
    if (orderItems && orderItems.length > 0) {
      const { error: itemsErr } = await supabase.from('laundry_order_items').insert(orderItems);
      if (itemsErr) throw itemsErr;
    }
  }
  else if (type === 'updateLaundryOrder') {
    const { orderId, data } = payload;
    const { error } = await supabase.from('laundry_orders').update(data).eq('id', orderId);
    if (error) throw error;
  }
  else if (type === 'deleteLaundryOrder') {
    const { orderId } = payload;
    // Delete items first
    await supabase.from('laundry_order_items').delete().eq('order_id', orderId);
    const { error } = await supabase.from('laundry_orders').delete().eq('id', orderId);
    if (error) throw error;
  }
  else if (type === 'addLaundryPayment') {
    const { payment } = payload;
    const { error } = await supabase.from('laundry_payments').insert(payment);
    if (error) throw error;
  }
  else if (type === 'updateLaundryPrices') {
    const { key, price, updated_at } = payload;
    const { error } = await supabase.from('laundry_prices')
      .update({ price, updated_at })
      .eq('key', key);
    if (error) throw error;
  }
};

// مزامنة كل العمليات المعلّقة
export const syncLaundryQueue = async () => {
  if (laundryOfflineQueue.isSyncing || laundryOfflineQueue.items.length === 0) return;

  laundryOfflineQueue.isSyncing = true;
  laundryOfflineQueue.lastSyncAttempt = new Date().toISOString();

  const remaining = [];

  for (const item of laundryOfflineQueue.items) {
    try {
      await executeLaundryItem(item);
    } catch (err) {
      item.retries = (item.retries || 0) + 1;
      if (item.retries < 10) {
        remaining.push(item);
      } else {
        console.error('تم تجاوز الحد الأقصى للمحاولات لعملية المغسلة:', item);
      }
    }
  }

  laundryOfflineQueue.items = remaining;
  saveLaundryQueue();
  laundryOfflineQueue.isSyncing = false;

  return remaining.length === 0;
};

// مسح القائمة (للطوارئ فقط)
export const clearLaundryQueue = () => {
  laundryOfflineQueue.items = [];
  saveLaundryQueue();
};
