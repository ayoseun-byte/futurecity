import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Organization } from '../../types'
import { getStoredOrganizations } from '../../services/storageService'
import orkiLogoWhite from '../../assets/logo-white-svg.svg'
import {
  LayoutGrid,
  BarChart3,
  FileCheck2,
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
  Building2,
  LogOut,
  Key,
  Users,
} from 'lucide-react'

interface PspLayoutProps {
  children: React.ReactNode
  organization?: Organization | null
}

export const PspLayout: React.FC<PspLayoutProps> = ({
  children,
  organization: propOrg,
}) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const storedOrgs = getStoredOrganizations()
  const organization = propOrg ?? storedOrgs.find((o) => o.id === user?.organizationId) ?? storedOrgs[0] ?? null

  const searchParams = new URLSearchParams(location.search)
  const currentTab = searchParams.get('tab') || 'dashboard'

  const handleSignOut = () => {
    logout()
    navigate('/psp/login')
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, to: '/psp?tab=dashboard' },
    { id: 'merchants', label: 'Merchants', icon: Users, to: '/psp?tab=merchants', hasChevron: true },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, to: '/psp?tab=reports', hasChevron: true },
    { id: 'settlement', label: 'Settlement Report', icon: FileCheck2, to: '/psp?tab=settlement', hasChevron: true },
    { id: 'transactions', label: 'Payments Management', icon: CreditCard, to: '/psp?tab=transactions', hasChevron: true },
    { id: 'fraud', label: 'Fraud Detection', icon: AlertTriangle, to: '/psp?tab=fraud' },
    { id: 'webhooks', label: 'Widgets & Webhooks', icon: Blocks, to: '/psp?tab=webhooks' },
    { id: 'config', label: 'Settings', icon: Settings, to: '/psp?tab=config' },
    { id: 'channels', label: 'Channels', icon: Share2, to: '/psp?tab=channels' },
  ]

  const isNavActive = (item: (typeof navItems)[number]) => {
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
      {/* Dark Enterprise Topbar */}
      <header className="bg-[#0B0F19] text-white sticky top-0 z-40 h-14 border-b border-slate-800/80 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Solely Orki Brand Mark */}
          <Link to="/psp" className="flex items-center pr-3 focus:outline-none">
            <img src={orkiLogoWhite} alt="Orki" className="h-6 w-auto" />
          </Link>

          {/* Logged-in PSP Organization Badge */}
          <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/80 text-xs">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-100 truncate max-w-[220px]">
              {organization?.name || 'Orki Partner'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              PSP
            </span>
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

          {/* Bottom Demo Link */}
          {!sidebarCollapsed && (
            <div className="p-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                <div className="text-xs font-bold text-slate-900">Partner Sandbox</div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Simulate an existing PSP &amp; merchant onboarding into Orki
                </p>
                <div className="flex items-center justify-between pt-1">
                  <Link
                    to="/partner-demo"
                    target="_blank"
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Open Simulator</span>
                    <PlayCircle className="w-3.5 h-3.5" />
                  </Link>
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
