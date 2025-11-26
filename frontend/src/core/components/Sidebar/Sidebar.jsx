import React from 'react';
import './Sidebar.css';

/**
 * Reusable Sidebar component - receives tabs configuration from parent module
 * 
 * @param {Object} user - Current user object
 * @param {Array} tabs - Array of tab objects: { id, label, icon }
 * @param {Array} adminTabs - Optional array of admin-only tabs (shown only if user.isAdmin)
 * @param {string} activeTab - Currently active tab id
 * @param {Function} setActiveTab - Function to change active tab
 * @param {boolean} isOpen - Whether sidebar is expanded
 * @param {Function} onClose - Function to close sidebar (mobile)
 * @param {Function} onToggle - Function to toggle sidebar
 */
const Sidebar = ({ 
  user, 
  tabs = [], 
  adminTabs = [], 
  activeTab, 
  setActiveTab, 
  isOpen, 
  onClose, 
  onToggle 
}) => {
  // Show admin badge if user is admin
  const userRole = user.isAdmin ? ' (Admin)' : '';
  
  // Display first department or module name
  const userSubtitle = user.departments?.length > 0 
    ? user.departments[0] 
    : user.module || '';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-user-info">
          <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div className="user-details">
            <h3>{user.name.split(' ')[0]}{userRole}</h3>
            <p>{userSubtitle}</p>
          </div>
        </div>
        <button className="sidebar-toggle-btn" onClick={onToggle} title="Minimizar sidebar">
          {isOpen ? '◀' : '▶'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              if (window.innerWidth <= 768) {
                onClose();
              }
            }}
          >
            <span className="tab-icon">{tab.icon}</span>
            {isOpen && <span className="tab-label">{tab.label}</span>}
          </button>
        ))}

        {/* Admin Section - Only visible to admins and if adminTabs provided */}
        {user.isAdmin && adminTabs.length > 0 && (
          <>
            <div className="sidebar-divider">
              {isOpen && <span>Administração</span>}
            </div>
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                className={`sidebar-tab admin-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (window.innerWidth <= 768) {
                    onClose();
                  }
                }}
              >
                <span className="tab-icon">{tab.icon}</span>
                {isOpen && <span className="tab-label">{tab.label}</span>}
              </button>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
