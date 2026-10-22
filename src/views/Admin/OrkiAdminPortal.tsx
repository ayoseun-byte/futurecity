import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Organization } from '../../types'
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  UserCheck,
  Key,
  Eye,
  ChevronRight,
  X,
} from 'lucide-react'

interface OrkiAdminPortalProps {
  organizations: Organization[]
  onUpdateOrganization: (updated: Organization) => void
  onAddOrganization: (newOrg: Organization) => void
}

export const OrkiAdminPortal: React.FC<OrkiAdminPortalProps> = ({
  organizations,
  onUpdateOrganization,
  onAddOrganization,
}) => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'licensed' | 'unlicensed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)
  const [approvalOfficer, setApprovalOfficer] = useState('david.risk@orki.com')
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Registration Form State
  const [newPspForm, setNewPspForm] = useState({
    name: '',
    category: 'FINANCE' as 'LOGISTICS' | 'FINANCE' | 'MARKET',
    categoryType: 'psp' as 'psp' | 'fintech' | 'bank' | 'neo_broker',
    isRegulated: false,
    regulatorName: 'VARA (Dubai)',
    licenseNumber: '',
    techName: '',
    techEmail: '',
    commercialName: '',
    commercialEmail: '',
    initialMarkupBps: '35',
  })

  // Filter organizations
  const filteredOrgs = organizations.filter((org) => {
    if (statusFilter !== 'all' && org.status !== statusFilter) return false
    if (licenseFilter === 'licensed' && !org.isRegulatedEntity) return false
    if (licenseFilter === 'unlicensed' && org.isRegulatedEntity) return false
    if (categoryFilter !== 'all' && (org.category || 'FINANCE') !== categoryFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        org.name.toLowerCase().includes(q) ||
        org.id.toLowerCase().includes(q) ||
        org.dueDiligence?.caseReference.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Two-Person Production Approval Handler (Darshan Part 1 Stage 7)
  const handleExecuteApproval = () => {
    if (!selectedOrg) return

    // Strict Two-Person Rule Validation
    const preparer = selectedOrg.preparedBy || 'sarah.ops@orki.com'
    if (approvalOfficer === preparer) {
      setApprovalError(
        `Two-Person Rule Violation: The approver (${approvalOfficer}) cannot be the same person who prepared the approval (${preparer}).`
      )
      return
    }

    const updated: Organization = {
      ...selectedOrg,
      status: 'approved',
      approvedBy: approvalOfficer,
      approvedAt: new Date().toISOString(),
      apiCredentials: {
        ...selectedOrg.apiCredentials,
        production: {
          environment: 'production',
          publicKey: 'pk_live_' + Math.random().toString(36).substring(2, 14),
          secretKeyMasked: 'sk_live_••••••••••••••••' + Math.random().toString(36).substring(2, 6),
          webhookSecretMasked: 'whsec_live_••••••••••••••••' + Math.random().toString(36).substring(2, 6),
          shareUrl: 'https://share.1password.com/s#claim_live_' + selectedOrg.id,
          status: 'link_sent',
          sentTo: selectedOrg.contacts.find((c) => c.role === 'technical')?.email || 'tech@example.com',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        },
      },
    }

    onUpdateOrganization(updated)
    setSelectedOrg(updated)
    setIsApprovalModalOpen(false)
    setApprovalError(null)
  }

  // Handle New PSP Registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPspForm.name.trim()) return

    const pspId = 'psp_' + newPspForm.name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(10 + Math.random() * 90)
    const markup = Math.min(parseInt(newPspForm.initialMarkupBps, 10) || 35, 100) // Strictly capped at 1.00% (100 bps)

    const newOrg: Organization = {
      id: pspId,
      name: newPspForm.name,
      category: newPspForm.category,
      categoryType: newPspForm.categoryType,
      status: 'sandbox',
      isRegulatedEntity: newPspForm.isRegulated,
      feeWallet: '0x' + pspId + 'Vault000000000001',
      contacts: [
        { name: newPspForm.techName || 'Tech Lead', email: newPspForm.techEmail || 'tech@' + pspId + '.example', role: 'technical' },
        { name: newPspForm.commercialName || 'Director', email: newPspForm.commercialEmail || 'dir@' + pspId + '.example', role: 'commercial' },
      ],
      ndaSignedAt: new Date().toISOString(),
      dueDiligence: {
        isRegulatedEntity: newPspForm.isRegulated,
        regulatorName: newPspForm.isRegulated ? newPspForm.regulatorName : undefined,
        licenseNumber: newPspForm.isRegulated ? newPspForm.licenseNumber : undefined,
        amlPolicyVerified: true,
        caseReference: 'ORKI-PSP-KYB-' + Math.floor(1000 + Math.random() * 9000),
        riskRating: newPspForm.isRegulated ? 'low' : 'medium',
        reviewDate: new Date().toISOString().split('T')[0],
        nextReviewDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
        ubos: newPspForm.isRegulated
          ? undefined
          : [
              {
                name: newPspForm.commercialName || 'Founding Shareholder',
                ownershipPercentage: 100,
                nationality: 'AE',
                idDocumentType: 'passport',
                idDocumentVerified: true,
                proofOfAddressVerified: true,
                pepOrSanctionsClear: true,
              },
            ],
      },
      feeSchedule: {
        orkiFeeBps: 100,
        orkiFeeCapPercent: 1.00,
        orkiFeeCapAmount: 25.00,
        pspMarkupBps: markup,
        combinedCapBps: 200,
        lockedUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        orkiFeeWallet: '0xOrkiProtocolFeeVault0000000000000000001',
        pspFeeWallet: '0x' + pspId + 'Vault000000000001',
        offrampSpreadBps: 25,
      },
      goLiveChecklist: {
        webhookSignatureVerified: true,
        idempotencyHandled: true,
        duplicateEventsHandled: false,
        onboardingComponentMounted: false,
        merchantStatusesHandled: false,
        passkeyHooksVerified: false,
        termsDisclosuresIncluded: true,
        cspAllowed: false,
        supportContactNamed: true,
      },
      apiCredentials: {
        sandbox: {
          environment: 'sandbox',
          publicKey: 'pk_test_' + Math.random().toString(36).substring(2, 14),
          secretKeyMasked: 'sk_test_••••••••••••••••' + Math.random().toString(36).substring(2, 6),
          webhookSecretMasked: 'whsec_test_••••••••••••••••' + Math.random().toString(36).substring(2, 6),
          shareUrl: 'https://share.1password.com/s#claim_test_' + pspId,
          status: 'link_sent',
          sentTo: newPspForm.techEmail || 'tech@' + pspId + '.example',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        },
      },
      preparedBy: 'sarah.ops@orki.com',
      createdAt: new Date().toISOString(),
      volumeUsdc: 0.0,
    }

    onAddOrganization(newOrg)
    setIsRegisterModalOpen(false)
    setNewPspForm({
      name: '',
      category: 'FINANCE',
      categoryType: 'psp',
      isRegulated: false,
      regulatorName: 'VARA (Dubai)',
      licenseNumber: '',
      techName: '',
      techEmail: '',
      commercialName: '',
      commercialEmail: '',
      initialMarkupBps: '35',
    })
  }

  return (
    <div className="space-y-8">
      {/* Top Banner / Mission Statement */}
      <div className="bg-gradient-to-r from-slate-900 via-onion-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-onion-900/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-onion-500/20 text-onion-300 border border-onion-500/30">
                Orki Headquarters · Part 1 Offline Pipeline
              </span>
              <span className="text-slate-400 text-xs">· Two-Person Rule Enforced</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              PSP Onboarding & Compliance Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Orki onboards PSPs offline through 8 verification gates. Distinguishes between <strong>Licensed Financial Entities</strong> and <strong>Unlicensed FinTechs</strong> with heightened UBO due diligence. Production keys are issued only with two independent Orki approvals.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-onion-700 to-onion text-white font-bold text-xs shadow-lg shadow-onion/30 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New PSP (Stage 1-3)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total PSPs</span>
            <Building2 className="w-4 h-4 text-onion" />
          </div>
          <p className="text-2xl font-black text-slate-900">{organizations.length}</p>
          <p className="text-[11px] text-slate-400">Approved, in review, and sandbox</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Licensed / Regulated</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">
            {organizations.filter((o) => o.isRegulatedEntity).length}
          </p>
          <p className="text-[11px] text-emerald-600">VARA, CBUAE, FSRA, FCA verified</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Unlicensed (UBO Check)</span>
            <UserCheck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">
            {organizations.filter((o) => !o.isRegulatedEntity).length}
          </p>
          <p className="text-[11px] text-amber-600">Heightened shareholder screening</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Awaiting Stage 7 Keys</span>
            <Key className="w-4 h-4 text-onion-600" />
          </div>
          <p className="text-2xl font-black text-onion">
            {organizations.filter((o) => o.status === 'in_review').length}
          </p>
          <p className="text-[11px] text-onion-700">Ready for 2nd person approval</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search PSP name, ID, KYB ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setLicenseFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                licenseFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Entities
            </button>
            <button
              onClick={() => setLicenseFilter('licensed')}
              className={`px-3 py-1 rounded-lg transition-all ${
                licenseFilter === 'licensed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Licensed Only
            </button>
            <button
              onClick={() => setLicenseFilter('unlicensed')}
              className={`px-3 py-1 rounded-lg transition-all ${
                licenseFilter === 'unlicensed' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Unlicensed (UBOs)
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none text-slate-700 font-medium"
          >
            <option value="all">All Lifecycle Statuses</option>
            <option value="approved">Approved (Live Production)</option>
            <option value="in_review">In Review (Checklist Ready)</option>
            <option value="sandbox">Sandbox (Testing)</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none text-slate-700 font-medium"
          >
            <option value="all">All Categories</option>
            <option value="FINANCE">Category: FINANCE</option>
            <option value="LOGISTICS">Category: LOGISTICS</option>
            <option value="MARKET">Category: MARKET</option>
          </select>
        </div>
      </div>

      {/* PSP Organizations Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-5">PSP Name & ID</th>
                <th className="py-3.5 px-5">Regulatory Posture</th>
                <th className="py-3.5 px-5">KYB & Risk Rating</th>
                <th className="py-3.5 px-5">Fee Schedule (Locked)</th>
                <th className="py-3.5 px-5">Lifecycle Gate</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrgs.map((org) => {
                const isApproved = org.status === 'approved'
                const isInReview = org.status === 'in_review'
                const isSandbox = org.status === 'sandbox'

                return (
                  <tr key={org.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-onion-50 border border-onion-200 text-onion font-black flex items-center justify-center text-sm shadow-sm">
                          {org.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <p className="font-bold text-slate-900 text-sm">{org.name}</p>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                              (org.category || 'FINANCE') === 'FINANCE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : (org.category || 'FINANCE') === 'LOGISTICS'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              {org.category || 'FINANCE'}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                              {org.categoryType?.toUpperCase() || 'PSP'}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">{org.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      {org.isRegulatedEntity ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Licensed Entity
                          </span>
                          <p className="text-[11px] font-semibold text-slate-700">{org.dueDiligence?.regulatorName}</p>
                          <p className="text-[10px] font-mono text-slate-400">{org.dueDiligence?.licenseNumber}</p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Unlicensed (UBO Check)
                          </span>
                          <p className="text-[11px] text-slate-500">
                            {org.dueDiligence?.ubos?.length || 1} UBOs Screened (≥25%)
                          </p>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-[11px] font-bold text-slate-800">
                            {org.dueDiligence?.caseReference}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                              org.dueDiligence?.riskRating === 'low'
                                ? 'bg-emerald-100 text-emerald-800'
                                : org.dueDiligence?.riskRating === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {org.dueDiligence?.riskRating} Risk
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Next Review: {org.dueDiligence?.nextReviewDate}
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      {org.feeSchedule ? (
                        <div className="space-y-0.5">
                          <p className="font-mono font-bold text-slate-800">
                            Orki 1.00% + PSP {(org.feeSchedule.pspMarkupBps / 100).toFixed(2)}%
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Total: {((org.feeSchedule.orkiFeeBps + org.feeSchedule.pspMarkupBps) / 100).toFixed(2)}% (Cap 3.00%)
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Pending Negotiation</span>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      {isApproved && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Stage 7 Approved (Live)
                        </span>
                      )}
                      {isInReview && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-onion-100 text-onion-800 border border-onion-200">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          Stage 7: Approval Ready
                        </span>
                      )}
                      {isSandbox && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Key className="w-3.5 h-3.5 mr-1" />
                          Stage 3-6: Sandbox Testing
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedOrg(org)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>Dossier</span>
                      </button>

                      <button
                        onClick={() => {
                          login('org', org.id)
                          navigate('/org')
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-onion-50 hover:bg-onion-100 text-onion font-bold text-xs transition"
                        title="Sign in directly as this PSP"
                      >
                        <span>Login as PSP</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PSP DOSSIER & TWO-PERSON APPROVAL MODAL (STAGE 1 TO 8)
         ───────────────────────────────────────────────────────────── */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-onion text-white font-black flex items-center justify-center text-lg">
                  {selectedOrg.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedOrg.name}</h2>
                    <span className="font-mono text-xs text-slate-400">({selectedOrg.id})</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Onboarding Dossier · Created on {new Date(selectedOrg.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrg(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Progress Bar (1 to 8) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
                <span>Part 1: Eight-Stage Onboarding Progress</span>
                <span className="text-onion font-mono">
                  {selectedOrg.status === 'approved' ? 'Stage 8: Live Oversight' : selectedOrg.status === 'in_review' ? 'Stage 7: Approval Pending' : 'Stage 6: Testing'}
                </span>
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center text-[10px] font-bold">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">1. Qualify</div>
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">2. NDA</div>
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">3. Sandbox</div>
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">4. Agreement</div>
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">5. KYB</div>
                <div className={`p-2 rounded-lg border ${selectedOrg.goLiveChecklist?.webhookSignatureVerified ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-600'}`}>6. Test</div>
                <div className={`p-2 rounded-lg border ${selectedOrg.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : selectedOrg.status === 'in_review' ? 'bg-onion-100 text-onion-800 border-onion-300 animate-pulse' : 'bg-slate-200 text-slate-600'}`}>7. Approve</div>
                <div className={`p-2 rounded-lg border ${selectedOrg.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-600'}`}>8. Live</div>
              </div>
            </div>

            {/* Dossier Tabs / Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Regulatory Posture & Due Diligence */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>Stage 5: Regulatory Compliance & Due Diligence</span>
                    {selectedOrg.isRegulatedEntity ? (
                      <span className="text-emerald-700 font-bold flex items-center text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Licensed Entity
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold flex items-center text-[11px]">
                        <UserCheck className="w-3.5 h-3.5 mr-1" /> Unlicensed (UBO Dossier)
                      </span>
                    )}
                  </h3>

                  {selectedOrg.isRegulatedEntity ? (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                        <p className="font-bold text-emerald-950">Regulator Public Registry Verified</p>
                        <p className="text-emerald-800 text-[11px] mt-0.5">
                          Authority: <strong>{selectedOrg.dueDiligence?.regulatorName}</strong>
                        </p>
                        <p className="text-emerald-800 text-[11px]">
                          License: <span className="font-mono font-bold">{selectedOrg.dueDiligence?.licenseNumber}</span>
                        </p>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>AML & Compliance Policy:</span>
                        <span className="font-bold text-emerald-600">Verified & Uploaded</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                        <p className="font-bold text-amber-950">Heightened UBO Due Diligence (≥25%)</p>
                        <p className="text-amber-800 text-[11px] mt-0.5">
                          Unlicensed entity — all beneficial owners and directors screened against Sanctions and PEP registers.
                        </p>
                      </div>

                      <div className="space-y-1.5 mt-2">
                        {selectedOrg.dueDiligence?.ubos?.map((ubo, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-[11px]">
                            <div>
                              <p className="font-bold text-slate-800">{ubo.name} ({ubo.ownershipPercentage}%)</p>
                              <p className="text-slate-400">{ubo.nationality} · {ubo.idDocumentType.toUpperCase()}</p>
                            </div>
                            <span className="text-emerald-600 font-bold">Clear & Verified</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
                    <span className="text-slate-500">Risk Assessment:</span>
                    <span className="font-bold uppercase text-slate-800">
                      {selectedOrg.dueDiligence?.riskRating} Risk Rating
                    </span>
                  </div>
                </div>

                {/* Fee Schedule */}
                <div className="p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Stage 4: Fee Schedule & Non-Custodial Agreement
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-400 text-[10px]">Orki Base Fee</p>
                      <p className="font-bold text-slate-900 mt-0.5">1.00%</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-400 text-[10px]">PSP Markup</p>
                      <p className="font-bold text-onion mt-0.5">{((selectedOrg.feeSchedule?.pspMarkupBps || 35) / 100).toFixed(2)}%</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-400 text-[10px]">Safety Cap</p>
                      <p className="font-bold text-slate-900 mt-0.5">3.00%</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    🔒 Locked for 30 days until {new Date(selectedOrg.feeSchedule?.lockedUntil || '').toLocaleDateString()}. Changes apply to new payments only.
                  </p>
                </div>
              </div>

              {/* Right Column: Key Delivery & Stage 7 Two-Person Approval */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Cryptographic Credentials & Secure Key Delivery
                  </h3>

                  {/* Sandbox Keys */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>Stage 3: Sandbox Keys</span>
                      <span className="text-emerald-600 font-bold">Issued</span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-600 truncate">
                      {selectedOrg.apiCredentials?.sandbox?.publicKey}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Delivered to {selectedOrg.apiCredentials?.sandbox?.sentTo} via 1Password Send (24h expiry)
                    </p>
                  </div>

                  {/* Production Keys */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>Stage 7: Production Keys</span>
                      {selectedOrg.status === 'approved' ? (
                        <span className="text-emerald-600 font-bold">Active in Prod</span>
                      ) : (
                        <span className="text-amber-600 font-bold">Awaiting Approval</span>
                      )}
                    </div>
                    {selectedOrg.apiCredentials?.production ? (
                      <div>
                        <p className="font-mono text-[11px] text-slate-600 truncate">
                          {selectedOrg.apiCredentials.production.publicKey}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Approved by {selectedOrg.approvedBy} on {new Date(selectedOrg.approvedAt || '').toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        Production keys will be minted once Stage 7 Two-Person rule is executed.
                      </p>
                    )}
                  </div>
                </div>

                {/* Two-Person Approval Action Box */}
                <div className="p-5 rounded-2xl bg-onion-50/60 border border-onion-200 space-y-3">
                  <div className="flex items-center space-x-2 text-onion">
                    <Key className="w-5 h-5 flex-shrink-0" />
                    <h4 className="font-bold text-sm text-slate-900">
                      Stage 7: Two-Person Production Approval Rule
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    Prepared by: <strong>{selectedOrg.preparedBy || 'sarah.ops@orki.com'}</strong>. A distinct Orki compliance/risk officer must sign off.
                  </p>

                  {selectedOrg.status === 'approved' ? (
                    <div className="p-3 bg-emerald-100 rounded-xl border border-emerald-300 text-xs text-emerald-900 font-bold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>Production Approved & Live by {selectedOrg.approvedBy}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsApprovalModalOpen(true)}
                      className="w-full py-2.5 px-4 bg-onion hover:bg-onion-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Execute Two-Person Production Sign-Off</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => {
                  login('org', selectedOrg.id)
                  navigate('/org')
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Access this PSP's Portal View
              </button>
              <button
                onClick={() => setSelectedOrg(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TWO-PERSON APPROVAL CONFIRMATION MODAL
         ───────────────────────────────────────────────────────────── */}
      {isApprovalModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 border border-onion-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-onion" />
                <span>Confirm Production Approval</span>
              </h3>
              <button onClick={() => setIsApprovalModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Confirm that all three mandatory preconditions are met:
            </p>

            <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Non-Custodial Agreement & Fee Schedule Signed</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Due Diligence Completed ({selectedOrg.isRegulatedEntity ? 'Regulator Verified' : 'UBOs Screened'})</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Go-Live Checklist Signed by PSP Technical Lead</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Authorizing Second Approver Email
              </label>
              <input
                type="email"
                value={approvalOfficer}
                onChange={(e) => setApprovalOfficer(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Cannot match preparer: <strong>{selectedOrg.preparedBy || 'sarah.ops@orki.com'}</strong>
              </p>
            </div>

            {approvalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{approvalError}</span>
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setIsApprovalModalOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteApproval}
                className="w-1/2 py-2.5 bg-onion text-white rounded-xl text-xs font-bold hover:bg-onion-700 shadow-md"
              >
                Issue Production Keys
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          REGISTER NEW PSP MODAL (STAGE 1 TO 3)
         ───────────────────────────────────────────────────────────── */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 border border-slate-200 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-onion" />
                <span>Onboard New PSP (Stages 1-3)</span>
              </h3>
              <button onClick={() => setIsRegisterModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">PSP Legal Entity Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Citadel Pay FZ-LLC"
                  value={newPspForm.name}
                  onChange={(e) => setNewPspForm({ ...newPspForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PSP Category</label>
                  <select
                    value={newPspForm.category}
                    onChange={(e) => setNewPspForm({ ...newPspForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none bg-white font-medium text-slate-800"
                  >
                    <option value="FINANCE">FINANCE (FinTech / Banking)</option>
                    <option value="LOGISTICS">LOGISTICS (Shipping / Supply)</option>
                    <option value="MARKET">MARKET (Marketplaces / Retail)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Entity Structure</label>
                  <select
                    value={newPspForm.categoryType}
                    onChange={(e) => setNewPspForm({ ...newPspForm, categoryType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none bg-white font-medium text-slate-800"
                  >
                    <option value="psp">Payment Service Provider (PSP)</option>
                    <option value="fintech">FinTech Platform</option>
                    <option value="bank">Digital Bank</option>
                    <option value="neo_broker">Neo-Broker / Exchange</option>
                  </select>
                </div>
              </div>

              {/* Regulatory Selection (Licensed vs Unlicensed) */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Is this a Licensed / Regulated Entity?</span>
                  <input
                    type="checkbox"
                    checked={newPspForm.isRegulated}
                    onChange={(e) => setNewPspForm({ ...newPspForm, isRegulated: e.target.checked })}
                    className="w-4 h-4 text-onion rounded border-slate-300 focus:ring-onion"
                  />
                </div>

                {newPspForm.isRegulated ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Regulator</label>
                      <select
                        value={newPspForm.regulatorName}
                        onChange={(e) => setNewPspForm({ ...newPspForm, regulatorName: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="VARA (Dubai)">VARA (Dubai)</option>
                        <option value="CBUAE (Central Bank UAE)">CBUAE (Central Bank UAE)</option>
                        <option value="FSRA (ADGM)">FSRA (ADGM)</option>
                        <option value="FCA (United Kingdom)">FCA (United Kingdom)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">License No.</label>
                      <input
                        type="text"
                        placeholder="VARA-VASP-2026-..."
                        value={newPspForm.licenseNumber}
                        onChange={(e) => setNewPspForm({ ...newPspForm, licenseNumber: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700">
                    ⚠️ Unlicensed entities trigger Heightened Due Diligence: UBO identification for holders ≥25%, passport scans, and Sanction/PEP screening.
                  </p>
                )}
              </div>

              {/* Contacts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Technical Contact Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={newPspForm.techName}
                    onChange={(e) => setNewPspForm({ ...newPspForm, techName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Technical Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="jane@psp.com"
                    value={newPspForm.techEmail}
                    onChange={(e) => setNewPspForm({ ...newPspForm, techEmail: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Agreed PSP Markup (Basis Points)</label>
                <input
                  type="number"
                  required
                  placeholder="35 (0.35%)"
                  value={newPspForm.initialMarkupBps}
                  onChange={(e) => setNewPspForm({ ...newPspForm, initialMarkupBps: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">Orki base: 100 bps (1.00%) · Combined cap: 300 bps (3.00%)</p>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-onion text-white rounded-xl font-bold hover:bg-onion-700 shadow-md"
                >
                  Issue Sandbox Keys
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
