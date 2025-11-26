import api from './api';

// Check if push notifications are supported
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Get current notification permission status
export const getPermissionStatus = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
};

// Request notification permission
export const requestPermission = async () => {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting permission:', err);
    return 'denied';
  }
};

// Convert URL-safe base64 to Uint8Array (for VAPID key)
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Subscribe to push notifications
export const subscribeToPush = async (userId) => {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return null;
  }

  try {
    // Get VAPID public key from backend
    const keyResponse = await api.get('/api/push/vapid-public-key');
    const vapidPublicKey = keyResponse.data.publicKey;

    if (!vapidPublicKey) {
      console.error('VAPID public key not available');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }

    // Send subscription to backend
    await api.post('/api/push/subscribe', {
      userId: userId,
      subscription: subscription.toJSON()
    });

    console.log('Push subscription successful');
    return subscription;
  } catch (err) {
    console.error('Error subscribing to push:', err);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async () => {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Remove from backend
      await api.post('/api/push/unsubscribe', {
        endpoint: subscription.endpoint
      });
    }

    console.log('Push unsubscription successful');
    return true;
  } catch (err) {
    console.error('Error unsubscribing from push:', err);
    return false;
  }
};

// Check if user is currently subscribed
export const isSubscribed = async () => {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (err) {
    console.error('Error checking subscription:', err);
    return false;
  }
};
