/*
  This is the main container component for our application. It usually handles routing
  (switching between pages) or global layout.
*/

import { useState } from 'react';
import Login from '../core/auth/login';
import HRDashboard from '../modules/HR/HRDashboard';
import SalesDashboard from '../modules/Sales/SalesDashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  // Check if user is already logged in (optional persistence)
  // For now, simple state
  
  if (user) {
    // Route to appropriate dashboard based on selected module
    if (user.module === 'HR') {
      return <HRDashboard user={user} onLogout={() => setUser(null)} />;
    } else if (user.module === 'SALES') {
      return <SalesDashboard user={user} onLogout={() => setUser(null)} />;
    } else if (user.module === 'PRODUCTION') {
      // Placeholder for Production module (similar to Sales)
      return <SalesDashboard user={user} onLogout={() => setUser(null)} />;
    }
  }

  return <Login onLogin={(userData) => setUser(userData)} />;
}

export default App;
