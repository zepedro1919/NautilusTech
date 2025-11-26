import React from 'react';
import './SalesDashboard.css';

const SalesDashboard = ({ user, onLogout }) => {
  return (
    <div className="sales-dashboard">
      <header className="sales-header">
        <h1>NAUTILUS SALES</h1>
        <button onClick={onLogout} className="logout-btn">Sair</button>
      </header>
      <div className="sales-content">
        <div className="coming-soon">
          <h2>🚧 Em Desenvolvimento 🚧</h2>
          <p>O módulo NAUTILUS SALES estará disponível em breve.</p>
          <p className="user-info">Bem-vindo, {user.name}!</p>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
