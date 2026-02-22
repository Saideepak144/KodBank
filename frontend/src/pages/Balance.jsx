import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Balance() {
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
      setError('Failed to load account balances');
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  if (loading) {
    return <div className="loading">Loading balances...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Account Balances</h1>
        <p>View all your account balances in one place</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Total Balance Card */}
      <div className="glass-card" style={{ padding: '32px', marginBottom: '32px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Total Net Worth
        </h3>
        <div style={{ fontSize: '48px', fontWeight: 700, color: 'var(--vivid-emerald)' }}>
          ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Individual Balances */}
      <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 600 }}>Individual Accounts</h2>

      {accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <p>No accounts found.</p>
        </div>
      ) : (
        <div className="balance-list">
          {accounts.map((account) => (
            <div key={account.account_id} className="balance-item">
              <div className="balance-item-info">
                <h3>{account.account_name}</h3>
                <p>{account.account_number} • {account.account_type}</p>
              </div>
              <div className="balance-item-amount">
                ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Balance;
