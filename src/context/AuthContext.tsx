import React, { createContext, useContext, useState } from 'react'
import type { Merchant } from '../types'
import { getApiConfig, saveApiConfig, clearAdminSessionToken, clearAllMerchantSessions } from '../services/apiConfig'

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
  merchantProfile?: Merchant
}

interface AuthContextType {
  user: AuthUser | null
  login: (role: UserRole, entityId?: string, customUser?: Partial<AuthUser>) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)

  const login = (role: UserRole, entityId?: string, customUser?: Partial<AuthUser>) => {
    if (customUser) {
      setUser({
        id: customUser.id || entityId || 'authenticated-user',
        name: customUser.name || 'User',
        email: customUser.email || '',
        role: role,
        organizationId: customUser.organizationId || '',
        merchantId: customUser.merchantId,
        status: customUser.status || 'active',
        isRegulatedEntity: customUser.isRegulatedEntity,
        merchantProfile: customUser.merchantProfile,
      })
    }
  }

  const logout = () => {
    setUser(null)
    clearAdminSessionToken()
    clearAllMerchantSessions()
    const config = getApiConfig()
    saveApiConfig({ ...config, adminKey: '', feeApproverKey: '', pspKey: '', merchantSession: '' })
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
