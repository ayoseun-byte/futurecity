import React, { createContext, useContext, useState, useEffect } from 'react'
import { getStoredOrganizations, getStoredMerchants } from '../services/storageService'

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
  login: (role: UserRole, entityId?: string, customUser?: Partial<AuthUser>) => void
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

  const login = (role: UserRole, entityId?: string, customUser?: Partial<AuthUser>) => {
    if (customUser && customUser.email) {
      setUser({
        id: customUser.id || 'usr_' + Math.random().toString(36).substring(2, 9),
        name: customUser.name || 'User',
        email: customUser.email,
        role: role,
        organizationId: customUser.organizationId || 'orki_default',
        merchantId: customUser.merchantId,
        status: customUser.status || 'active',
        isRegulatedEntity: customUser.isRegulatedEntity,
      })
      return
    }

    if (role === 'org') {
      const orgs = getStoredOrganizations()
      const targetOrg = orgs.find((o) => o.id === entityId) || orgs[0]
      if (targetOrg) {
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
      }
    } else if (role === 'merchant') {
      const merchants = getStoredMerchants()
      const targetMerch = merchants.find((m) => m.id === entityId) || merchants[0]
      if (targetMerch) {
        setUser({
          id: 'usr_merch_' + targetMerch.id,
          name: targetMerch.legalBusinessName,
          email: targetMerch.representativeEmail,
          role: 'merchant',
          organizationId: targetMerch.organizationId || 'psp_default',
          merchantId: targetMerch.id,
          status: targetMerch.status,
        })
      }
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
