import { ref, onMounted, onUnmounted } from 'vue';

export const usePwaInstall = () => {
  const deferredPrompt = ref(null);
  const isInstallable = ref(false);

  const handleBeforeInstallPrompt = (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt.value = e;
    isInstallable.value = true;
  };

  const promptInstall = async () => {
    if (!deferredPrompt.value) return;
    
    // Show the install prompt
    deferredPrompt.value.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.value.userChoice;
    
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt.value = null;
    isInstallable.value = false;
  };

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Also handle successful install
    window.addEventListener('appinstalled', () => {
      isInstallable.value = false;
      deferredPrompt.value = null;
      console.log('PWA was installed');
    });
  });

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  });

  return {
    isInstallable,
    promptInstall
  };
};
