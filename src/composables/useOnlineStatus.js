import { ref, onMounted, onUnmounted } from 'vue';
import { syncQueue } from '../store/offlineQueue';
import { syncLaundryQueue } from '../store/laundryOfflineQueue';

export const isOnline = ref(navigator.onLine);

let syncTimeout = null;

const handleOnline = () => {
  isOnline.value = true;
  // نُزامن بعد ثانية للتأكد من استقرار الاتصال
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncQueue();
    syncLaundryQueue();
  }, 1500);
};

const handleOffline = () => {
  isOnline.value = false;
  clearTimeout(syncTimeout);
};

// نُضيف المستمعات مرة واحدة على مستوى الوحدة
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

export const useOnlineStatus = () => {
  return { isOnline };
};
