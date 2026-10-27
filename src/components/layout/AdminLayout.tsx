import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { clearAllStoredData } from '../../services/storageService'
import { ShieldCheck, LogOut, ExternalLink } from 'lucide-react'

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-900/5 flex flex-col font-sans">
      {/* Admin Specific Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Mark & Portal Badge */}
            <div className="flex items-center space-x-3.5">
              <Link to="/admin" className="flex items-center space-x-3 group focus:outline-none">
                <div className="w-9 h-9 rounded-lg bg-onion text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                  O
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-base tracking-tight text-white">ORKI</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-onion-500/20 text-onion-200 border border-onion-500/30 uppercase tracking-wider">
                      Protocol Admin
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 leading-none mt-0.5">
                    Multi-Tenant Settlement Governance
                  </p>
                </div>
              </Link>
            </div>

            {/* Central Security & Chain Status Chip */}
            <div className="hidden md:flex items-center space-x-2.5 bg-slate-800/80 py-1.5 px-3.5 rounded-lg border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">Orki Protocol Vault</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                Base + Solana Live
              </span>
            </div>

            {/* Actions & Session */}
            <div className="flex items-center space-x-2.5">
              <Link
                to="/api-workbench"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>API Workbench</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-rose-300 bg-slate-800 hover:bg-rose-950/30 border border-slate-700 hover:border-rose-800 transition"
                title="Sign out of Orki Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          Orki Headquarters · Institutional Multi-Tenant Settlement Protocol
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Base (EVM) Splitter · Solana (SVM) Anchor Program · VARA/CBUAE Compliance Core
        </p>
        <div className="mt-2">
          <button
            onClick={() => {
              if (window.confirm('Reset all locally stored organizations and merchants?')) {
                clearAllStoredData()
                window.location.href = '/login'
              }
            }}
            className="text-[10px] text-slate-400 hover:text-slate-600 underline"
          >
            Clear Local Test Cache
          </button>
        </div>
      </footer>
    </div>
  )
}
