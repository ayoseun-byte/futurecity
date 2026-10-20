import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Building2,
  Store,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ExternalLink,
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

  const getPortalLabel = () => {
    if (user.role === 'org') return 'PSP & FinTech Network'
    if (user.role === 'merchant') return 'Merchant Portal'
    return 'Orki Protocol Headquarters'
  }

  const getPortalHome = () => {
    if (user.role === 'org') return '/org'
    if (user.role === 'merchant') return '/merchant'
    return '/admin'
  }

  return (
    <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Mark & Breadcrumb Navigation */}
          <div className="flex items-center space-x-3.5">
            <Link
              to={getPortalHome()}
              className="flex items-center space-x-3 group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-onion text-white flex items-center justify-center font-bold text-lg shadow-sm transition-transform group-hover:scale-105">
                O
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-base tracking-tight text-slate-900">
                    ORKI
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                    {user.role === 'org' ? 'PSP' : user.role === 'merchant' ? 'Merchant' : 'Admin'}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-400 leading-none mt-0.5">
                  Split Settlement Core
                </p>
              </div>
            </Link>

            <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-slate-200 text-xs text-slate-500">
              <span>{getPortalLabel()}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800">{user.name}</span>
            </div>
          </div>

          {/* Center Identity Chip */}
          <div className="hidden md:flex items-center space-x-2.5 bg-slate-50 py-1.5 px-3.5 rounded-lg border border-slate-200">
            {user.role === 'org' && <Building2 className="w-4 h-4 text-slate-500" />}
            {user.role === 'merchant' && <Store className="w-4 h-4 text-slate-500" />}
            {user.role === 'admin' && <ShieldCheck className="w-4 h-4 text-slate-500" />}
            <span className="text-xs font-semibold text-slate-800">{user.name}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
              {user.status || 'Active'}
            </span>
          </div>

          {/* Quick Actions & Logout */}
          <div className="flex items-center space-x-2.5">
            {user.role === 'merchant' && (
              <Link
                to="/checkout/falcon-vip-concierge"
                target="_blank"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buyer Demo</span>
              </Link>
            )}

            <button
              onClick={handleSignOut}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition"
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
