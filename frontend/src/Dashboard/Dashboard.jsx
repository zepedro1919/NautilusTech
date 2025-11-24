import React, { useState } from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import RHModule from '../modules/RH/RHModule/RHModule';
import './Dashboard.css'; 

const Dashboard = ({ user, onLogout }) => {
  const [activeModule, setActiveModule] = useState('RH');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar =  () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="dashboard-layout">
      {/* Mobile Overlay - Closes sidebar when clicking outside */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <Sidebar 
        user={user} 
        activeModule={activeModule} 
        setActiveModule={(module) => {
          setActiveModule(module);
          closeSidebar(); // Close sidebar on mobile after selection
        }}
        isOpen={isSidebarOpen}  // Pass state
        onClose={closeSidebar}  // Pass close function
      />
      
      <main className="main-content">
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
          {activeModule === 'RH' && <RHModule user={user} />}
          {/* Add other modules here later: activeModule === 'Finance' && <FinanceModule /> */}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;