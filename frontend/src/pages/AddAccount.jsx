import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AddAccount() {
  const [accountType, setAccountType] = useState('Savings');
  const [accountName, setAccountName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axios.post('/api/accounts', {
        accountType,
        accountName
      });
      setSuccess(`Account created successfully! Account Number: ${response.data.accountNumber}`);
      setAccountName('');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="page-header">
        <h1>Add New Account</h1>
        <p>Create a new bank account to manage your finances</p>
      </div>

      <div className="glass-card" style={{ padding: '32px' }}>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="accountType">Account Type</label>
            <select
              id="accountType"
              className="form-select"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              required
            >
              <option value="Savings">Savings Account</option>
              <option value="Checking">Checking Account</option>
              <option value="Investment">Investment Account</option>
              <option value="Business">Business Account</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="accountName">Account Name</label>
            <input
              type="text"
              id="accountName"
              className="glass-input"
              placeholder="e.g., My Savings, Vacation Fund"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
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
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddAccount;
