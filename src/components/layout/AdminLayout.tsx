import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import orkiLogoWhite from '../../assets/logo-white-svg.svg'
import { ShieldCheck, LogOut, ExternalLink, Activity } from 'lucide-react'

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900">
      {/* Enterprise Admin Topbar */}
      <header className="bg-[#0B0F19] text-white sticky top-0 z-40 h-14 border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/admin" className="flex items-center pr-2 focus:outline-none">
            <img src={orkiLogoWhite} alt="Orki" className="h-6 w-auto" />
          </Link>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-onion-500/20 text-onion-200 border border-onion-500/30 uppercase tracking-wider">
            Protocol Admin
          </span>
          <span className="hidden md:inline-flex items-center space-x-1.5 text-[11px] text-slate-400 pl-2 border-l border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Base &amp; Solana Settlement Core</span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/admin/rails"
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Test integration rails against chain-service"
          >
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Rails Lab</span>
          </Link>
          <Link
            to="/api-workbench"
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>API Workbench</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-rose-300 hover:bg-slate-800 transition"
            title="Sign out of Orki Admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-500">
        Orki Protocol Administration · Multi-Tenant Settlement Governance
      </footer>
    </div>
  )
}
