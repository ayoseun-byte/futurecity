import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Merchant, Organization } from '../../types'
import { getStoredOrganizations, getStoredMerchants } from '../../services/storageService'
import {
  LayoutGrid,
  BarChart3,
  FileCheck2,
  Send,
  CreditCard,
  AlertTriangle,
  Blocks,
  Settings,
  Share2,
  HelpCircle,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  Store,
  Building2,
  LogOut,
  Key,
  Users,
} from 'lucide-react'

interface PspLayoutProps {
  children: React.ReactNode
  organization?: Organization | null
  merchants?: Merchant[]
}

export const PspLayout: React.FC<PspLayoutProps> = ({
  children,
  organization: propOrg,
  merchants: propMerchants,
}) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [merchantMenuOpen, setMerchantMenuOpen] = useState(false)

  const storedOrgs = getStoredOrganizations()
  const organization = propOrg ?? storedOrgs.find((o) => o.id === user?.organizationId) ?? storedOrgs[0] ?? null
  const allMerchants = propMerchants ?? getStoredMerchants()
  const orgMerchants = organization
    ? allMerchants.filter((m) => m.organizationId === organization.id)
    : allMerchants

  // Determine currently selected merchant from URL if on /psp/merchants/:id
  const merchantMatch = location.pathname.match(/^\/psp\/merchants\/([^/]+)/)
  const activeMerchantId = merchantMatch ? decodeURIComponent(merchantMatch[1]) : null
  const activeMerchant = activeMerchantId
    ? orgMerchants.find((m) => m.id === activeMerchantId || m.externalId === activeMerchantId) ?? null
    : null

  const searchParams = new URLSearchParams(location.search)
  const currentTab = searchParams.get('tab') || 'dashboard'

  const handleSignOut = () => {
    logout()
    navigate('/psp/login')
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, to: '/psp?tab=dashboard' },
    { id: 'merchants', label: 'Merchants & Onboarding', icon: Users, to: '/psp?tab=merchants', hasChevron: true },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, to: '/psp?tab=reports', hasChevron: true },
    { id: 'settlement', label: 'Settlement Report', icon: FileCheck2, to: '/psp?tab=settlement', hasChevron: true },
    { id: 'direct', label: 'Orki Direct', icon: Send, to: '/psp/rails', hasChevron: true, isPath: true },
    { id: 'transactions', label: 'Payments Management', icon: CreditCard, to: '/psp?tab=transactions', hasChevron: true },
    { id: 'fraud', label: 'Fraud Detection', icon: AlertTriangle, to: '/psp?tab=fraud' },
    { id: 'webhooks', label: 'Widgets & Webhooks', icon: Blocks, to: '/psp?tab=webhooks' },
    { id: 'config', label: 'Settings', icon: Settings, to: '/psp?tab=config' },
    { id: 'channels', label: 'Channels', icon: Share2, to: '/psp?tab=channels' },
  ]

  const isNavActive = (item: (typeof navItems)[number]) => {
    if (item.isPath) {
      return location.pathname.startsWith(item.to)
    }
    if (location.pathname === '/psp') {
      return currentTab === item.id
    }
    if (location.pathname.startsWith('/psp/merchants') && item.id === 'merchants') {
      return true
    }
    return false
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900">
      {/* Dark Enterprise Topbar (matching reference screenshot) */}
      <header className="bg-[#0B0F19] text-white sticky top-0 z-40 h-14 border-b border-slate-800/80 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Solely Orki Brand Mark */}
          <Link to="/psp" className="flex items-center space-x-2 pr-2 focus:outline-none">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-onion-600 flex items-center justify-center font-extrabold text-sm text-white shadow-xs">
              O
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">orki</span>
          </Link>

          {/* Logged-in PSP Organization Badge */}
          <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/80 text-xs">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-100 truncate max-w-[180px]">
              {organization?.name || 'Orki Partner'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              PSP
            </span>
          </div>

          {/* Merchant Context Quick-Switcher Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMerchantMenuOpen((o) => !o)}
              className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs transition"
            >
              <Store className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-medium text-slate-200 truncate max-w-[180px]">
                {activeMerchant ? activeMerchant.legalBusinessName : 'All Merchants'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-400/30">
                {activeMerchant ? 'Merchant' : `${orgMerchants.length}`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {merchantMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-white text-slate-900 shadow-xl border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Switch Merchant Workspace
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMerchantMenuOpen(false)
                    navigate('/psp?tab=merchants')
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                    !activeMerchant ? 'bg-indigo-50/60 font-semibold text-indigo-700' : 'text-slate-700'
                  }`}
                >
                  <span>All PSP Merchants ({orgMerchants.length})</span>
                  <span className="text-[10px] text-slate-400">Directory</span>
                </button>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                  {orgMerchants.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-slate-400 text-center">
                      No notice-accepted merchants yet.
                    </div>
                  ) : (
                    orgMerchants.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMerchantMenuOpen(false)
                          navigate(`/psp/merchants/${encodeURIComponent(m.id)}/console`)
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                          activeMerchant?.id === m.id ? 'bg-indigo-50/70 font-semibold text-indigo-700' : 'text-slate-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate font-medium">{m.legalBusinessName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{m.id}</div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-slate-100 text-slate-600 shrink-0">
                          {m.status}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Utilities: Support, Notifications, Profile */}
        <div className="flex items-center space-x-3">
          <Link
            to="/api-workbench"
            className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="API Keys & Support Workbench"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Support</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate('/psp?tab=notifications')}
            className="relative p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              3
            </span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((o) => !o)}
              className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs transition"
            >
              <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-200">
                <User className="w-3 h-3" />
              </div>
              <span className="hidden sm:inline font-medium text-slate-100">
                {user?.name || 'Partner Officer'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white text-slate-900 shadow-xl border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-xs font-semibold text-slate-900 truncate">{user?.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{user?.email || organization?.name}</div>
                </div>
                <Link
                  to="/api-workbench"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>API Workbench &amp; Keys</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body: Light Collapsible Sidebar + Content Canvas */}
      <div className="flex flex-1 min-h-0">
        <aside
          className={`${
            sidebarCollapsed ? 'w-16' : 'w-60'
          } bg-white border-r border-slate-200/90 flex flex-col justify-between transition-all duration-200 shrink-0`}
        >
          <div>
            {/* Environment Header */}
            <div className="px-4 py-4 flex items-center justify-between border-b border-slate-100">
              {!sidebarCollapsed && (
                <div>
                  <div className="text-xs font-bold text-slate-900 capitalize">
                    {organization?.status === 'sandbox' ? 'Sandbox' : 'Production'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Universal Payments Platform
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-2.5 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isNavActive(item)
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                      active
                        ? 'bg-indigo-50/70 text-indigo-700 border border-indigo-200/80 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!sidebarCollapsed && item.hasChevron && (
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-indigo-500' : 'text-slate-300'}`} />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Bottom Demo Videos Card (matching reference screenshot) */}
          {!sidebarCollapsed && (
            <div className="p-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                <div className="text-xs font-bold text-slate-900">Orki&apos;s demo videos</div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Unlock Orki&apos;s Potential: Step-by-Step Storefront &amp; Checkout Demo
                </p>
                <div className="flex items-center justify-between pt-1">
                  <Link
                    to="/store"
                    target="_blank"
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Watch now</span>
                    <PlayCircle className="w-3.5 h-3.5" />
                  </Link>
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <PlayCircle className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Workspace Canvas */}
        <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
