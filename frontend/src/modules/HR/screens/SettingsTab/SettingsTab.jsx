import React, { useState, useEffect } from 'react';
import { 
  isPushSupported, 
  requestPermission, 
  subscribeToPush, 
  unsubscribeFromPush, 
  isSubscribed 
} from '../../../../core/pushNotifications';
import './SettingsTab.css';

const SettingsTab = ({ user }) => {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const supported = isPushSupported();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    if (supported) {
      const subscribed = await isSubscribed();
      setPushEnabled(subscribed);
      setPermissionStatus(Notification.permission);
    }
  };

  const handleToggleNotifications = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (pushEnabled) {
        // Disable notifications
        const success = await unsubscribeFromPush(user.id);
        if (success) {
          setPushEnabled(false);
        }
      } else {
        // Enable notifications
        const permission = await requestPermission();
        setPermissionStatus(permission);
        
        if (permission === 'granted') {
          const success = await subscribeToPush(user.id);
          if (success) {
            setPushEnabled(true);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-tab">
      <h2>Definições</h2>

      <div className="settings-section">
        <h3>🔔 Notificações</h3>
        
        <div className="setting-card">
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-icon">📱</span>
              <div>
                <strong>Notificações Push</strong>
                <p className="setting-desc">
                  Receba notificações quando houver novas mensagens nos grupos ou formulários
                </p>
              </div>
            </div>
            
            {supported ? (
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={handleToggleNotifications}
                  disabled={loading || permissionStatus === 'denied'}
                />
                <span className="slider"></span>
              </label>
            ) : (
              <span className="not-supported">Não suportado</span>
            )}
          </div>

          {permissionStatus === 'denied' && (
            <div className="permission-warning">
              <span>⚠️</span>
              <p>
                As notificações foram bloqueadas no browser. Para ativar, vá às definições 
                do browser e permita notificações para este site.
              </p>
            </div>
          )}

          {!supported && (
            <div className="permission-warning">
              <span>ℹ️</span>
              <p>
                O seu browser não suporta notificações push. Experimente usar Chrome, 
                Firefox, Edge ou Safari.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h3>👤 Conta</h3>
        
        <div className="setting-card">
          <div className="info-row">
            <span className="info-label">Nome:</span>
            <span className="info-value">{user.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">{user.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Tipo:</span>
            <span className="info-value">{user.isAdmin ? 'Administrador' : 'Utilizador'}</span>
          </div>
          {user.departments && user.departments.length > 0 && (
            <div className="info-row">
              <span className="info-label">Departamentos:</span>
              <span className="info-value">{user.departments.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
