import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Store, LogOut, ExternalLink, ShieldCheck } from 'lucide-react'

export const MerchantLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans">
      {/* Merchant Specific Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Mark & Portal Badge */}
            <div className="flex items-center space-x-3.5">
              <Link to="/merchant" className="flex items-center space-x-3 group focus:outline-none">
                <div className="w-9 h-9 rounded-lg bg-onion text-white flex items-center justify-center font-extrabold text-lg shadow-xs">
                  O
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-base tracking-tight text-slate-900">ORKI</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                      Merchant Portal
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 leading-none mt-0.5">
                    Direct Stablecoin Settlement & Paylinks
                  </p>
                </div>
              </Link>
            </div>

            {/* Central Merchant Identity Chip */}
            <div className="hidden md:flex items-center space-x-2.5 bg-slate-50 py-1.5 px-3.5 rounded-lg border border-slate-200">
              <Store className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-semibold text-slate-800">{user?.name || 'Merchant Account'}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                Non-Custodial
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2.5">
              <Link
                to="/checkout/falcon-vip-concierge"
                target="_blank"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Customer Checkout Demo</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition"
                title="Sign out of Merchant Portal"
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

      {/* Merchant Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          Orki Settlement Network · Non-Custodial Multi-Chain Merchant Infrastructure
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Zero-Custody Treasury · ZeroDev Smart Wallets & Web3Auth Passkey Security
        </p>
      </footer>
    </div>
  )
}
