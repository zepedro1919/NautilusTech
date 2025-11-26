import React, { useState, useEffect } from 'react';
import {
  isPushSupported,
  getPermissionStatus,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed
} from '../pushNotifications';
import './NotificationManager.css';

const NotificationManager = ({ user }) => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const isSupported = isPushSupported();
    setSupported(isSupported);

    if (isSupported) {
      const permStatus = getPermissionStatus();
      setPermission(permStatus);

      const isSub = await isSubscribed();
      setSubscribed(isSub);

      // Show banner if notifications are supported but not enabled
      if (permStatus === 'default' && !isSub) {
        // Delay showing banner for better UX
        setTimeout(() => setShowBanner(true), 3000);
      }
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);

    try {
      const permResult = await requestPermission();
      setPermission(permResult);

      if (permResult === 'granted') {
        const subscription = await subscribeToPush(user.id);
        if (subscription) {
          setSubscribed(true);
          setShowBanner(false);
        }
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);

    try {
      const success = await unsubscribeFromPush();
      if (success) {
        setSubscribed(false);
      }
    } catch (err) {
      console.error('Error disabling notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    // Store in localStorage to not show again for a while
    localStorage.setItem('notificationBannerDismissed', Date.now().toString());
  };

  // Don't render anything if not supported
  if (!supported) {
    return null;
  }

  // Show floating banner for first-time users
  if (showBanner && permission === 'default') {
    // Check if banner was recently dismissed
    const dismissed = localStorage.getItem('notificationBannerDismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
      return null; // Don't show for 24 hours after dismissal
    }

    return (
      <div className="notification-banner">
        <div className="banner-content">
          <span className="banner-icon">🔔</span>
          <div className="banner-text">
            <strong>Ativar Notificações</strong>
            <p>Receba alertas de novas mensagens e formulários</p>
          </div>
        </div>
        <div className="banner-actions">
          <button 
            className="btn-enable" 
            onClick={handleEnableNotifications}
            disabled={loading}
          >
            {loading ? 'A ativar...' : 'Ativar'}
          </button>
          <button 
            className="btn-dismiss" 
            onClick={handleDismissBanner}
          >
            Mais tarde
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// Settings component to show in user settings/profile
export const NotificationSettings = ({ user }) => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const isSupported = isPushSupported();
    setSupported(isSupported);

    if (isSupported) {
      setPermission(getPermissionStatus());
      setSubscribed(await isSubscribed());
    }
  };

  const handleToggle = async () => {
    setLoading(true);

    try {
      if (subscribed) {
        const success = await unsubscribeFromPush();
        if (success) setSubscribed(false);
      } else {
        const permResult = await requestPermission();
        setPermission(permResult);

        if (permResult === 'granted') {
          const subscription = await subscribeToPush(user.id);
          if (subscription) setSubscribed(true);
        }
      }
    } catch (err) {
      console.error('Error toggling notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="notification-settings">
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-icon">🔔</span>
            <div>
              <strong>Notificações Push</strong>
              <p className="setting-desc">Não suportado neste dispositivo/navegador</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="notification-settings">
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-icon">🔕</span>
            <div>
              <strong>Notificações Push</strong>
              <p className="setting-desc warning">
                Bloqueadas. Altere nas definições do navegador.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <div className="setting-row">
        <div className="setting-info">
          <span className="setting-icon">{subscribed ? '🔔' : '🔕'}</span>
          <div>
            <strong>Notificações Push</strong>
            <p className="setting-desc">
              {subscribed 
                ? 'Recebe alertas de mensagens e formulários' 
                : 'Ative para receber alertas'}
            </p>
          </div>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={subscribed}
            onChange={handleToggle}
            disabled={loading}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );
};

export default NotificationManager;
