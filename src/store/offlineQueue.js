/**
 * Offline Queue System
 * يحفظ العمليات الفاشلة بسبب انقطاع الإنترنت ويرسلها تلقائياً عند عودة الاتصال
 */
import { reactive, ref } from 'vue';
import { supabase } from '../supabase.js';

const QUEUE_KEY = 'charging_offline_queue';

// حالة القائمة
export const offlineQueue = reactive({
  items: [],
  isSyncing: false,
  lastSyncAttempt: null,
});

export const pendingCount = ref(0);

// تحميل القائمة من localStorage عند بدء التطبيق
export const loadQueue = () => {
  try {
    const saved = localStorage.getItem(QUEUE_KEY);
    if (saved) {
      offlineQueue.items = JSON.parse(saved);
      pendingCount.value = offlineQueue.items.length;
    }
  } catch (e) {
    console.warn('خطأ في تحميل قائمة الانتظار:', e);
    offlineQueue.items = [];
  }
};

// حفظ القائمة في localStorage
const saveQueue = () => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(offlineQueue.items));
    pendingCount.value = offlineQueue.items.length;
  } catch (e) {
    console.warn('خطأ في حفظ قائمة الانتظار:', e);
  }
};

// إضافة عملية للقائمة
export const enqueue = (type, payload) => {
  const item = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,      // 'addOperation' | 'addCustomer' | 'updateBalance' | 'updatePrices'
    payload,
    queuedAt: new Date().toISOString(),
    retries: 0,
  };
  offlineQueue.items.push(item);
  saveQueue();

  // محاولة المزامنة التلقائية بعد 5 ثوانٍ إذا كنا متصلين
  if (navigator.onLine) {
    setTimeout(() => syncQueue(), 5000);
  }

  return item.id;
};

// تنفيذ عملية واحدة من القائمة
const executeItem = async (item) => {
  const { type, payload } = item;

  if (type === 'addCustomer') {
    const { error } = await supabase.from('customers').insert(payload);
    if (error) throw error;
  }
  else if (type === 'addOperation') {
    const { error } = await supabase.from('operations').insert(payload);
    if (error) throw error;
  }
  else if (type === 'updateBalance') {
    const { customerId, balance } = payload;
    const { error } = await supabase.from('customers')
      .update({ balance })
      .eq('id', customerId);
    if (error) throw error;
  }
  else if (type === 'updatePrices') {
    const { device_type, price } = payload;
    const { error } = await supabase.from('prices')
      .upsert({ device_type, price });
    if (error) throw error;
  }
};

// مزامنة كل العمليات المعلّقة
export const syncQueue = async () => {
  if (offlineQueue.isSyncing || offlineQueue.items.length === 0) return;

  offlineQueue.isSyncing = true;
  offlineQueue.lastSyncAttempt = new Date().toISOString();

  const remaining = [];

  for (const item of offlineQueue.items) {
    try {
      await executeItem(item);
      // نجحت العملية - لا نضيفها للقائمة الجديدة
    } catch (err) {
      item.retries = (item.retries || 0) + 1;
      if (item.retries < 10) {
        // نُبقيها في القائمة للمحاولة لاحقاً
        remaining.push(item);
      } else {
        console.error('تم تجاوز الحد الأقصى للمحاولات للعملية:', item);
      }
    }
  }

  offlineQueue.items = remaining;
  saveQueue();
  offlineQueue.isSyncing = false;

  return remaining.length === 0; // true = تمت المزامنة الكاملة
};

// مسح القائمة (للطوارئ فقط)
export const clearQueue = () => {
  offlineQueue.items = [];
  saveQueue();
};
