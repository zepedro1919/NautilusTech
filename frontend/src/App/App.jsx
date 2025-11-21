/*
  This is the main container component for our application. It usually handles routing
  (switching between pages) or global layout.
*/

import { useState } from 'react';
import Login from '../Login/Login';
import Dashboard from '../Dashboard/Dashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  // Check if user is already logged in (optional persistence)
  // For now, simple state
  
  if (user) {
    return <Dashboard user={user} onLogout={() => setUser(null)} />;
  }

  return <Login onLogin={(userData) => setUser(userData)} />;
}

export default App;
