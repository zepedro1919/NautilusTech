import React, { useState, useEffect } from 'react';
import Sidebar from '../../core/components/Sidebar/Sidebar';
import RHModule from './components/RHModule';
import NotificationManager from '../../core/NotificationManager/NotificationManager';
import './HRDashboard.css'; 

// HR Module specific tabs
const hrTabs = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'reservations', label: 'Reservas', icon: '📋' },
  { id: 'calendar', label: 'Calendário', icon: '📅' },
  { id: 'settings', label: 'Definições', icon: '⚙️' },
];

// Admin-only tabs for HR module
const hrAdminTabs = [
  { id: 'admin-users', label: 'Utilizadores', icon: '👤' },
  { id: 'admin-departments', label: 'Departamentos', icon: '🏢' },
  { id: 'admin-assignments', label: 'Atribuições', icon: '🔗' },
  { id: 'admin-rooms', label: 'Salas', icon: '🚪' },
  { id: 'admin-reservations', label: 'Gestão Reservas', icon: '📊' },
  { id: 'admin-forms', label: 'Formulários', icon: '📋' },
];

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    // Set initial sidebar state based on screen size
    setIsSidebarOpen(window.innerWidth > 768);

    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile, auto-open on desktop
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="dashboard-layout">
      {/* Notification Manager - Prompts user to enable push notifications */}
      <NotificationManager user={user} />

      {/* Mobile Overlay - Closes sidebar when clicking outside */}
      {isMobile && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onToggle={toggleSidebar}
        tabs={hrTabs}
        adminTabs={hrAdminTabs}
      />
      
      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className="top-bar">
          <div className='header-left'>
            {/* Hamburger Button (Visible only on Mobile) */}
            <button className='mobile-menu-btn' onClick={toggleSidebar}>
              ☰
            </button>
            <h1>Bem vindo, {user.name.split(' ')[0]}</h1>
          </div>
          <button onClick={onLogout} className="logout-btn-small">Sair</button>
        </header>

        <div className="module-display">
          <RHModule user={user} activeTab={activeTab} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;