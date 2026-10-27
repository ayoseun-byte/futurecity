import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Building2, LogOut, ExternalLink, Clock } from 'lucide-react'

export const PspLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* PSP Specific Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Mark & Portal Badge */}
            <div className="flex items-center space-x-3.5">
              <Link to="/psp" className="flex items-center space-x-3 group focus:outline-none">
                <div className="w-9 h-9 rounded-lg bg-onion text-white flex items-center justify-center font-extrabold text-lg shadow-xs">
                  O
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-base tracking-tight text-slate-900">ORKI</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                      PSP Portal
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 leading-none mt-0.5">
                    Merchant Network & Markup Settlement
                  </p>
                </div>
              </Link>
            </div>

            {/* Central PSP Identity Chip */}
            <div className="hidden md:flex items-center space-x-2.5 bg-slate-50 py-1.5 px-3.5 rounded-lg border border-slate-200">
              <Building2 className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-semibold text-slate-800">{user?.name || 'PSP Partner'}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Clock className="w-3 h-3 mr-1 text-emerald-600" />
                30-Day Rate Lock Active
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2.5">
              <Link
                to="/api-workbench"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>API Keys</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition"
                title="Sign out of PSP Portal"
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

      {/* PSP Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          Orki × PSP Partner Network · Non-Custodial Multi-Tenant Settlement Core
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Base (EVM) · Solana (SVM) · Automated Merchant Onboarding & Split Settlement
        </p>
      </footer>
    </div>
  )
}
