import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import Sparkline from '../components/Sparkline.jsx'

function AccountDetails() {
  const [searchParams] = useSearchParams();
  const accountNumber = searchParams.get('account');
  
  const [account, setAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (accountNumber && accounts.length > 0) {
      fetchAccountDetails(accountNumber);
    } else if (accounts.length > 0 && !accountNumber) {
      // If no account specified, show first account
      fetchAccountDetails(accounts[0].account_number);
    }
  }, [accountNumber, accounts]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/accounts');
      setAccounts(response.data);
    } catch (err) {
      setError('Failed to load accounts');
      setLoading(false);
    }
  };

  const fetchAccountDetails = async (accNum) => {
    setLoading(true);
    try {
      const [accountRes, transactionsRes] = await Promise.all([
        axios.get(`/api/accounts/${accNum}`),
        axios.get('/api/transactions')
      ]);
      setAccount(accountRes.data);
      
      // Filter transactions for this account
      const accountTransactions = transactionsRes.data.filter(
        t => t.from_account === accNum || t.to_account === accNum
      );
      setTransactions(accountTransactions);
    } catch (err) {
      setError('Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (e) => {
    const newAccountNumber = e.target.value;
    fetchAccountDetails(newAccountNumber);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const generateSparklineData = () => {
    const base = account ? account.balance : 1000;
    return Array.from({ length: 10 }, (_, i) => {
      return base + Math.sin(i) * (base * 0.1) + Math.random() * (base * 0.05);
    });
  };

  if (loading) {
    return <div className="loading">Loading account details...</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💳</div>
        <p>No accounts found. Create an account to view details.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Account Details</h1>
        <p>View detailed information about your account</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Account Selector */}
      <div className="form-group" style={{ marginBottom: '24px' }}>
        <label>Select Account</label>
        <select
          className="form-select"
          value={account?.account_number || ''}
          onChange={handleAccountChange}
        >
          {accounts.map((acc) => (
            <option key={acc.account_id} value={acc.account_number}>
              {acc.account_name} ({acc.account_number})
            </option>
          ))}
        </select>
      </div>

      {account && (
        <>
          {/* Account Info Card */}
          <div className="account-card" style={{ marginBottom: '32px' }}>
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
                data={generateSparklineData()}
                color={account.account_type === 'Savings' ? '#00ff9d' : '#00f5ff'}
              />
            </div>
          </div>

          {/* Account Info Details */}
          <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Account Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Account Type</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{account.account_type}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Account Number</div>
                <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'monospace' }}>{account.account_number}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Created On</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{formatDate(account.created_at)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Status</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--vivid-emerald)' }}>Active</div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 600 }}>Recent Transactions</h2>
          
          {transactions.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <p>No transactions for this account yet.</p>
            </div>
          ) : (
            <div className="transactions-list">
              {transactions.slice(0, 5).map((transaction) => {
                const outgoing = transaction.from_account === account.account_number;
                return (
                  <div key={transaction.transaction_id} className="transaction-item">
                    <div className="transaction-info">
                      <h4>
                        {outgoing ? 'Transfer to' : 'Transfer from'} {outgoing ? transaction.to_account : transaction.from_account}
                      </h4>
                      <p>{transaction.description || 'No description'} • {formatDate(transaction.created_at)}</p>
                    </div>
                    <div className={`transaction-amount ${outgoing ? 'negative' : 'positive'}`}>
                      {outgoing ? '-' : '+'}${parseFloat(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AccountDetails;
