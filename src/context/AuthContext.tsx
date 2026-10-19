import React, { createContext, useContext, useState, useEffect } from 'react'
import { INITIAL_ORGANIZATIONS, INITIAL_MERCHANTS } from '../services/mockData'

export type UserRole = 'org' | 'merchant' | 'admin'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  organizationId: string
  merchantId?: string
  status?: string
  isRegulatedEntity?: boolean
}

interface AuthContextType {
  user: AuthUser | null
  login: (role: UserRole, entityId?: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('orki_auth_user')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('orki_auth_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('orki_auth_user')
    }
  }, [user])

  const login = (role: UserRole, entityId?: string) => {
    if (role === 'org') {
      const targetOrg = INITIAL_ORGANIZATIONS.find((o) => o.id === entityId) || INITIAL_ORGANIZATIONS[0]
      const primaryContact = targetOrg.contacts[0]

      setUser({
        id: 'usr_org_' + targetOrg.id,
        name: targetOrg.name,
        email: primaryContact?.email || 'ops@' + targetOrg.id + '.example',
        role: 'org',
        organizationId: targetOrg.id,
        status: targetOrg.status,
        isRegulatedEntity: targetOrg.isRegulatedEntity,
      })
    } else if (role === 'merchant') {
      const targetMerch = INITIAL_MERCHANTS.find((m) => m.id === entityId) || INITIAL_MERCHANTS[0]

      setUser({
        id: 'usr_merch_' + targetMerch.id,
        name: targetMerch.legalBusinessName,
        email: targetMerch.representativeEmail,
        role: 'merchant',
        organizationId: targetMerch.organizationId || 'psp_xsquare01',
        merchantId: targetMerch.id,
        status: targetMerch.status,
      })
    } else if (role === 'admin') {
      setUser({
        id: 'usr_admin_01',
        name: 'Sarah Connor (Risk & Compliance)',
        email: 'sarah.ops@orki.com',
        role: 'admin',
        organizationId: 'orki_hq',
        status: 'active',
      })
    }
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
