import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

function Layout({ user, onLogout }) {
  return (
    <div className="app-container">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
