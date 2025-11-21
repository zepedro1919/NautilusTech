import React from 'react';
import './Sidebar.css'; // We will create this css below

const Sidebar = ({ user, activeModule, setActiveModule }) => {
  return (
    <div className="sidebar">
      <div className="user-profile">
        <div className="avatar-circle">
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="user-info">
          <p className="user-name">{user.name}</p>
          <span className="user-role">Colaborador</span>
        </div>
      </div>

      <nav className="nav-menu">
        <button 
          className={`nav-item ${activeModule === 'RH' ? 'active' : ''}`}
          onClick={() => setActiveModule('RH')}
        >
          Recursos Humanos
        </button>
        {/* Future modules go here */}
        <button className="nav-item disabled">Financeiro (Em breve)</button>
      </nav>
    </div>
  );
};

export default Sidebar;