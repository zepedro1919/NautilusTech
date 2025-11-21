import React, { useState } from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import RHModule from '../modules/RH/RHModule/RHModule';
import './Dashboard.css'; 

const Dashboard = ({ user, onLogout }) => {
  const [activeModule, setActiveModule] = useState('RH');

  return (
    <div className="dashboard-layout">
      <Sidebar 
        user={user} 
        activeModule={activeModule} 
        setActiveModule={setActiveModule} 
      />
      
      <main className="main-content">
        <header className="top-bar">
          <h1>Bem vindo, {user.name}</h1>
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