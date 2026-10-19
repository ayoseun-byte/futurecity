import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Building2,
  Store,
  ShieldCheck,
  LogOut,
} from 'lucide-react'

export const Header: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return null
  }

  const handleSignOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-onion text-white sticky top-0 z-40 shadow-lg border-b border-onion-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3">
            <Link to={user.role === 'org' ? '/org' : user.role === 'merchant' ? '/merchant' : '/admin'} className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-white text-onion flex items-center justify-center font-black text-xl shadow-inner group-hover:scale-105 transition-transform">
                O
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg tracking-tight">ORKI</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-onion-700 text-onion-100 font-semibold uppercase tracking-wider">
                    {user.role === 'org' ? 'PSP Portal' : user.role === 'merchant' ? 'Merchant Hub' : 'Admin'}
                  </span>
                </div>
                <p className="text-[11px] text-onion-200">
                  Non-Custodial Settlement Core
                </p>
              </div>
            </Link>
          </div>

          {/* Current Active Tenant Identity Badge */}
          <div className="hidden md:flex items-center space-x-2 bg-onion-900/60 py-1.5 px-3.5 rounded-xl border border-onion-700/50">
            {user.role === 'org' && <Building2 className="w-4 h-4 text-onion-200" />}
            {user.role === 'merchant' && <Store className="w-4 h-4 text-onion-200" />}
            {user.role === 'admin' && <ShieldCheck className="w-4 h-4 text-onion-200" />}
            <span className="text-xs font-bold text-white tracking-wide">{user.name}</span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {user.status || 'Active'}
            </span>
          </div>

          {/* User Profile & Sign Out */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-onion-800/80 hover:bg-rose-900/40 text-onion-100 hover:text-rose-200 border border-onion-700/60 hover:border-rose-700/50 transition-all shadow-sm"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
