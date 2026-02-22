import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import Sparkline from '../components/Sparkline.jsx'

function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/accounts');
      setAccounts(response.data);
    } catch (err) {
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Generate sparkline data for each account
  const generateSparklineData = (accountId) => {
    const base = 50;
    return Array.from({ length: 10 }, (_, i) => {
      const seed = accountId + i;
      return base + Math.sin(seed) * 20 + Math.random() * 10;
    });
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your accounts and financial activity</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Accounts</h3>
          <div className="value purple">{accounts.length}</div>
        </div>
        <div className="stat-card">
          <h3>Total Balance</h3>
          <div className="value">${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <h3>Active Savings</h3>
          <div className="value cyan">
            ${accounts
              .filter(acc => acc.account_type === 'Savings')
              .reduce((sum, acc) => sum + acc.balance, 0)
              .toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Account Cards */}
      <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 600 }}>Your Accounts</h2>
      
      {accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <p>No accounts found. Create your first account to get started.</p>
        </div>
      ) : (
        <div className="accounts-grid">
          {accounts.map((account) => (
            <Link
              to={`/account-details?account=${account.account_number}`}
              key={account.account_id}
              className="account-card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="account-card-header">
                <span className="account-type">{account.account_type}</span>
              </div>
              <div className="account-name">{account.account_name}</div>
              <div className="account-number">{account.account_number}</div>
              <div className="account-balance-label">Current Balance</div>
              <div className="account-balance">
                ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="sparkline-container">
                <Sparkline 
                  data={generateSparklineData(account.account_id)}
                  color={account.account_type === 'Savings' ? '#00ff9d' : '#00f5ff'}
                />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/add-account" className="quick-action-btn">
          <span>➕</span> Add Account
        </Link>
        <Link to="/transfer" className="quick-action-btn">
          <span>↔️</span> Transfer
        </Link>
        <Link to="/transactions" className="quick-action-btn">
          <span>📜</span> View Transactions
        </Link>
        <Link to="/balance" className="quick-action-btn">
          <span>💰</span> Check Balance
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;
