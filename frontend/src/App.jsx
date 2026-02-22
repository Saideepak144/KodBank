import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AddAccount from './pages/AddAccount.jsx'
import Balance from './pages/Balance.jsx'
import Transfer from './pages/Transfer.jsx'
import Transactions from './pages/Transactions.jsx'
import AccountDetails from './pages/AccountDetails.jsx'
import Layout from './components/Layout.jsx'

// Configure axios
axios.defaults.withCredentials = true
axios.defaults.baseURL = 'http://localhost:5000'

// Add request interceptor to add token from localStorage
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
)

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/me')
      setUser(response.data)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout')
      localStorage.removeItem('token') // Clear token from localStorage
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      localStorage.removeItem('token') // Still clear token even if request fails
      setUser(null)
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
      />
      <Route 
        path="/register" 
        element={user ? <Navigate to="/" /> : <Register />} 
      />
      <Route 
        path="/" 
        element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
      >
        <Route index element={<Dashboard />} />
        <Route path="add-account" element={<AddAccount />} />
        <Route path="balance" element={<Balance />} />
        <Route path="transfer" element={<Transfer />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="account-details" element={<AccountDetails />} />
      </Route>
    </Routes>
  )
}

export default App
