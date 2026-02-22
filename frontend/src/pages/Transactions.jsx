import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transactionsRes, accountsRes] = await Promise.all([
        axios.get('/api/transactions'),
        axios.get('/api/accounts')
      ]);
      setTransactions(transactionsRes.data);
      setAccounts(accountsRes.data);
    } catch (err) {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getAccountName = (accountNumber) => {
    const account = accounts.find(acc => acc.account_number === accountNumber);
    return account ? account.account_name : accountNumber;
  };

  const isOutgoing = (fromAccount) => {
    return accounts.some(acc => acc.account_number === fromAccount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Loading transactions...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Transaction History</h1>
        <p>View all your recent transactions</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📜</div>
          <p>No transactions found.</p>
        </div>
      ) : (
        <div className="transactions-list">
          {transactions.map((transaction) => {
            const outgoing = isOutgoing(transaction.from_account);
            return (
              <div key={transaction.transaction_id} className="transaction-item">
                <div className="transaction-info">
                  <h4>
                    {outgoing ? 'Transfer to' : 'Transfer from'} {getAccountName(outgoing ? transaction.to_account : transaction.from_account)}
                  </h4>
                  <p>
                    {transaction.description || 'No description'} • {formatDate(transaction.created_at)}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                    From: {transaction.from_account} → To: {transaction.to_account}
                  </p>
                </div>
                <div className={`transaction-amount ${outgoing ? 'negative' : 'positive'}`}>
                  {outgoing ? '-' : '+'}${parseFloat(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Transactions;
