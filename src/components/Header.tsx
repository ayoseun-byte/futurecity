import React from 'react'
import { Building2, Store, ShieldCheck, ShoppingCart } from 'lucide-react'

export type ActiveRole = 'org' | 'merchant' | 'admin' | 'checkout'

interface HeaderProps {
  activeRole: ActiveRole
  onRoleChange: (role: ActiveRole) => void
  activeMerchantName?: string
}

export const Header: React.FC<HeaderProps> = ({ activeRole, onRoleChange, activeMerchantName }) => {
  return (
    <header className="bg-onion text-white sticky top-0 z-40 shadow-lg border-b border-onion-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white text-onion flex items-center justify-center font-black text-xl shadow-inner">
              O
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight">ORKI</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-onion-700 text-onion-100 font-semibold uppercase tracking-wider">
                  PSP Core
                </span>
              </div>
              <p className="text-xs text-onion-200">
                Non-Custodial Settlement & Stablecoin Infrastructure
              </p>
            </div>
          </div>

          {/* Role Switcher Pill */}
          <div className="flex items-center bg-onion-900/60 p-1 rounded-xl border border-onion-700/50">
            <button
              onClick={() => onRoleChange('org')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRole === 'org'
                  ? 'bg-white text-onion shadow-md'
                  : 'text-onion-200 hover:text-white hover:bg-onion-800/50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>PSP Portal (XSquare)</span>
            </button>

            <button
              onClick={() => onRoleChange('merchant')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRole === 'merchant'
                  ? 'bg-white text-onion shadow-md'
                  : 'text-onion-200 hover:text-white hover:bg-onion-800/50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Merchant ({activeMerchantName || 'Acme Trading'})</span>
            </button>

            <button
              onClick={() => onRoleChange('checkout')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRole === 'checkout'
                  ? 'bg-white text-onion shadow-md'
                  : 'text-onion-200 hover:text-white hover:bg-onion-800/50'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Buyer Checkout Simulator</span>
            </button>

            <button
              onClick={() => onRoleChange('admin')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRole === 'admin'
                  ? 'bg-white text-onion shadow-md'
                  : 'text-onion-200 hover:text-white hover:bg-onion-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Orki Admin</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
