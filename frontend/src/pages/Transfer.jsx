import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Transfer() {
  const [accounts, setAccounts] = useState([]);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/accounts');
      setAccounts(response.data);
      if (response.data.length > 0 && !fromAccount) {
        setFromAccount(response.data[0].account_number);
      }
    } catch (err) {
      setError('Failed to load accounts');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (fromAccount === toAccount) {
      setError('Cannot transfer to the same account');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/transfer', {
        fromAccount,
        toAccount,
        amount: parseFloat(amount),
        description
      });
      setSuccess(`Transfer successful! Transaction ID: ${response.data.transactionId}`);
      setAmount('');
      setDescription('');
      setToAccount('');
      fetchAccounts(); // Refresh accounts to show updated balances
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="page-header">
        <h1>Transfer Funds</h1>
        <p>Transfer money between your accounts</p>
      </div>

      <div className="glass-card" style={{ padding: '32px' }}>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fromAccount">From Account</label>
            <select
              id="fromAccount"
              className="form-select"
              value={fromAccount}
              onChange={(e) => {
                setFromAccount(e.target.value);
                setToAccount(''); // Clear destination when source changes
              }}
              required
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.account_id} value={account.account_number}>
                  {account.account_name} ({account.account_number}) - ${account.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="toAccount">To Account</label>
            <select
              id="toAccount"
              className="form-select"
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
              required
            >
              <option value="">Select destination account</option>
              {accounts
                .filter(acc => acc.account_number !== fromAccount)
                .map((account) => (
                  <option key={account.account_id} value={account.account_number}>
                    {account.account_name} ({account.account_number}) - ${account.balance.toFixed(2)}
                  </option>
                ))}
            </select>
            <small style={{ color: '#888', marginTop: '8px', display: 'block' }}>
              Or enter external account number:
            </small>
            <input
              type="text"
              className="glass-input"
              placeholder="Enter external account number (optional)"
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
              style={{ marginTop: '8px' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount ($)</label>
            <input
              type="number"
              id="amount"
              className="glass-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <input
              type="text"
              id="description"
              className="glass-input"
              placeholder="e.g., Monthly savings, Rent payment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
            <button
              type="button"
              className="glass-button"
              style={{ flex: 1 }}
              onClick={() => navigate('/')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="glass-button primary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Transfer Funds'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Transfer;
