const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'kodbank_secret';

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration - must be before routes
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Database paths
const authDbPath = path.join(__dirname, 'KodBankAuth.db');
const bankDbPath = path.join(__dirname, 'KodBank.db');

// Initialize databases
const authDb = new sqlite3.Database(authDbPath);
const bankDb = new sqlite3.Database(bankDbPath);

// Create tables on startup
function initDatabases() {
  // Auth database tables
  authDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  authDb.run(`
    CREATE TABLE IF NOT EXISTS user_tokens (
      token_id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_value TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      expiry DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);

  // Banking database tables
  bankDb.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      account_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      account_number TEXT UNIQUE NOT NULL,
      account_type TEXT NOT NULL,
      account_name TEXT NOT NULL,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  bankDb.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_account TEXT,
      to_account TEXT,
      amount REAL NOT NULL,
      transaction_type TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database tables initialized');
}

initDatabases();

// Helper function to generate account number
function generateAccountNumber() {
  return 'KB' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

// Authentication middleware
function authenticateToken(req, res, next) {
  // Check cookie first, then Authorization header
  let token = req.cookies.token;
  
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  console.log('Auth check - Cookies:', req.cookies);
  console.log('Auth check - Token present:', !!token);

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify JWT signature
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Double-check: verify token exists in database
    authDb.get(
      'SELECT * FROM user_tokens WHERE token_value = ? AND expiry > datetime("now")',
      [token],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
      }
    );
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Error handling middleware
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
}

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    authDb.run(
      'INSERT INTO users (name, email, password) VALUES (?, LOWER(?), ?)',
      [name, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Email already registered' });
          }
          return res.status(500).json({ error: 'Database error' });
        }

        const userId = this.lastID;
        
        // Create default Savings account with $1000
        const accountNumber = generateAccountNumber();
        bankDb.run(
          'INSERT INTO accounts (user_id, account_number, account_type, account_name, balance) VALUES (?, ?, ?, ?, ?)',
          [userId, accountNumber, 'Savings', 'Primary Savings', 1000],
          (err) => {
            if (err) {
              console.error('Error creating default account:', err);
            }
          }
        );

        res.status(201).json({ 
          message: 'User registered successfully',
          userId: userId,
          defaultAccount: accountNumber
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  authDb.get(
    'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
    [email],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      try {
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
          { userId: user.user_id, email: user.email },
          JWT_SECRET,
          { expiresIn: '30m' }
        );

        // Store token in database
        const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        authDb.run(
          'INSERT INTO user_tokens (token_value, user_id, expiry) VALUES (?, ?, ?)',
          [token, user.user_id, expiry.toISOString()]
        );

        // Set cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: false, // false for localhost
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 60 * 1000 // 30 minutes
        });

        res.json({
          message: 'Login successful',
          token: token, // Also return token for localStorage backup
          user: {
            userId: user.user_id,
            name: user.name,
            email: user.email
          }
        });
      } catch (error) {
        res.status(500).json({ error: 'Server error' });
      }
    }
  );
});

// Logout
app.post('/api/logout', authenticateToken, (req, res) => {
  const token = req.cookies.token;
  
  authDb.run(
    'DELETE FROM user_tokens WHERE token_value = ?',
    [token],
    (err) => {
      if (err) {
        console.error('Error deleting token:', err);
      }
    }
  );

  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

// Get current user
app.get('/api/me', authenticateToken, (req, res) => {
  authDb.get(
    'SELECT user_id, name, email, created_at FROM users WHERE user_id = ?',
    [req.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    }
  );
});

// ==================== ACCOUNT ROUTES ====================

// Create new account
app.post('/api/accounts', authenticateToken, (req, res) => {
  const { accountType, accountName } = req.body;

  if (!accountType || !accountName) {
    return res.status(400).json({ error: 'Account type and name are required' });
  }

  const accountNumber = generateAccountNumber();
  
  bankDb.run(
    'INSERT INTO accounts (user_id, account_number, account_type, account_name, balance) VALUES (?, ?, ?, ?, ?)',
    [req.userId, accountNumber, accountType, accountName, 0],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Account number already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }

      res.status(201).json({
        message: 'Account created successfully',
        accountId: this.lastID,
        accountNumber: accountNumber
      });
    }
  );
});

// List user accounts
app.get('/api/accounts', authenticateToken, (req, res) => {
  bankDb.all(
    'SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC',
    [req.userId],
    (err, accounts) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(accounts);
    }
  );
});

// Get specific account details
app.get('/api/accounts/:accountNumber', authenticateToken, (req, res) => {
  const { accountNumber } = req.params;

  bankDb.get(
    'SELECT * FROM accounts WHERE account_number = ? AND user_id = ?',
    [accountNumber, req.userId],
    (err, account) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json(account);
    }
  );
});

// Get account balance
app.get('/api/balance/:accountNumber', authenticateToken, (req, res) => {
  const { accountNumber } = req.params;

  bankDb.get(
    'SELECT account_number, account_name, balance FROM accounts WHERE account_number = ? AND user_id = ?',
    [accountNumber, req.userId],
    (err, account) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json(account);
    }
  );
});

// ==================== TRANSACTION ROUTES ====================

// Transfer between accounts
app.post('/api/transfer', authenticateToken, (req, res) => {
  const { fromAccount, toAccount, amount, description } = req.body;
  
  console.log('Transfer request:', { fromAccount, toAccount, amount, userId: req.userId });

  if (!fromAccount || !toAccount || !amount) {
    return res.status(400).json({ error: 'From account, to account, and amount are required' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  if (fromAccount === toAccount) {
    return res.status(400).json({ error: 'Cannot transfer to the same account' });
  }

  // Use a simpler approach without serialize
  bankDb.get(
    'SELECT * FROM accounts WHERE account_number = ? AND user_id = ?',
    [fromAccount, req.userId],
    (err, sourceAccount) => {
      if (err) {
        console.error('Error checking source account:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!sourceAccount) {
        return res.status(404).json({ error: 'Source account not found' });
      }

      if (sourceAccount.balance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Check destination account exists
      bankDb.get(
        'SELECT * FROM accounts WHERE account_number = ?',
        [toAccount],
        (err, destAccount) => {
          if (err) {
            console.error('Error checking destination account:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          if (!destAccount) {
            return res.status(404).json({ error: 'Destination account not found' });
          }

          // Deduct from source
          bankDb.run(
            'UPDATE accounts SET balance = balance - ? WHERE account_number = ?',
            [amount, fromAccount],
            function(err) {
              if (err) {
                console.error('Error deducting from source:', err);
                return res.status(500).json({ error: 'Database error' });
              }

              // Add to destination
              bankDb.run(
                'UPDATE accounts SET balance = balance + ? WHERE account_number = ?',
                [amount, toAccount],
                function(err) {
                  if (err) {
                    console.error('Error adding to destination:', err);
                    // Try to rollback the deduction
                    bankDb.run('UPDATE accounts SET balance = balance + ? WHERE account_number = ?', [amount, fromAccount]);
                    return res.status(500).json({ error: 'Database error' });
                  }

                  // Record transaction
                  bankDb.run(
                    'INSERT INTO transactions (from_account, to_account, amount, transaction_type, description) VALUES (?, ?, ?, ?, ?)',
                    [fromAccount, toAccount, amount, 'transfer', description || ''],
                    function(err) {
                      if (err) {
                        console.error('Error recording transaction:', err);
                        return res.status(500).json({ error: 'Database error' });
                      }

                      console.log('Transfer successful:', { transactionId: this.lastID });
                      res.json({
                        message: 'Transfer successful',
                        transactionId: this.lastID,
                        fromAccount: fromAccount,
                        toAccount: toAccount,
                        amount: amount
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get transaction history
app.get('/api/transactions', authenticateToken, (req, res) => {
  // Get user's account numbers first
  bankDb.all(
    'SELECT account_number FROM accounts WHERE user_id = ?',
    [req.userId],
    (err, accounts) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (accounts.length === 0) {
        return res.json([]);
      }

      const accountNumbers = accounts.map(acc => acc.account_number);
      const placeholders = accountNumbers.map(() => '?').join(',');

      // Get transactions where user is either sender or receiver
      bankDb.all(
        `SELECT * FROM transactions 
         WHERE from_account IN (${placeholders}) OR to_account IN (${placeholders})
         ORDER BY created_at DESC`,
        [...accountNumbers, ...accountNumbers],
        (err, transactions) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json(transactions);
        }
      );
    }
  );
});

// Apply error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`KodBank server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  authDb.close();
  bankDb.close();
  console.log('Databases closed');
  process.exit(0);
});
