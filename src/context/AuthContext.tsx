import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'org' | 'merchant' | 'admin'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  organizationId: string
  merchantId?: string
  status?: string
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
    // Start unauthenticated so user sees the login page first
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
      setUser({
        id: 'usr_org_' + (entityId || 'xsquare'),
        name: entityId === 'psp_sandbox02' ? 'Apex Pay Global' : 'XSquare Financial Technologies',
        email: entityId === 'psp_sandbox02' ? 'liam@apexpay.io' : 'tariq@xsquare.example',
        role: 'org',
        organizationId: entityId || 'psp_xsquare01',
        status: entityId === 'psp_sandbox02' ? 'sandbox' : 'approved',
      })
    } else if (role === 'merchant') {
      const merchantNames: Record<string, string> = {
        mrch_9f2a1c: 'Falcon Luxury Goods FZ-LLC',
        mrch_3d8b2e: 'Al-Noor Electronics Trading',
        mrch_7c1a9f: 'Desert Oasis Hospitality Ltd',
      }
      const targetId = entityId || 'mrch_9f2a1c'
      setUser({
        id: 'usr_merch_' + targetId,
        name: merchantNames[targetId] || 'Merchant Portal',
        email: 'billing@' + targetId + '.example',
        role: 'merchant',
        organizationId: 'psp_xsquare01',
        merchantId: targetId,
        status: targetId === 'mrch_9f2a1c' ? 'active' : 'pending_verification',
      })
    } else if (role === 'admin') {
      setUser({
        id: 'usr_admin_01',
        name: 'Sarah Connor (Risk & Compliance)',
        email: 'sarah.ops@orki.com',
        role: 'admin',
        organizationId: 'orki_hq',
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
