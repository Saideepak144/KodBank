import React from 'react';
import { NavLink } from 'react-router-dom';

function Sidebar({ user, onLogout }) {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/add-account', label: 'Add Account', icon: '➕' },
    { path: '/balance', label: 'Balance', icon: '💰' },
    { path: '/transfer', label: 'Transfer', icon: '↔️' },
    { path: '/transactions', label: 'Transactions', icon: '📜' },
    { path: '/account-details', label: 'Account Details', icon: '📋' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">KodBank</div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            end={item.path === '/'}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div style={{ marginBottom: '16px', padding: '0 8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              {user.email}
            </div>
          </div>
        )}
        <button onClick={onLogout} className="glass-button" style={{ width: '100%' }}>
          <span style={{ marginRight: '8px' }}>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
