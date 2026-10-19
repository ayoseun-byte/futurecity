import React, { useState } from 'react'
import { ShieldCheck, UserCheck, AlertOctagon, CheckCircle2, Key, Copy, Check } from 'lucide-react'

export const AdminPortalView: React.FC = () => {
  const [preparedBy, setPreparedBy] = useState('admin_sarah')
  const [approvedBy, setApprovedBy] = useState('admin_michael')
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'success' | 'violation'>('pending')
  const [violationError, setViolationError] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  const handleRunApproval = (e: React.FormEvent) => {
    e.preventDefault()

    // Test Two-Person Rule directly
    if (preparedBy.trim().toLowerCase() === approvedBy.trim().toLowerCase()) {
      setApprovalStatus('violation')
      setViolationError(`Two-Person Rule Violation: '${preparedBy}' cannot both prepare and approve production keys.`)
      return
    }

    setApprovalStatus('success')
    setViolationError('')
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText('https://auth.orki.io/v1/admin/secrets/claim?token=sec_share_891294819284')
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-onion text-white flex items-center justify-center font-black text-xl shadow-md">
            🛡️
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Orki Platform Admin</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Dual-Control Authorization Engine · Stages 3 & 7 PSP Governance
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-onion-50 text-onion-800 border border-onion-200">
          Platform Super-Admin Mode
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stage 3: Sandbox Keys Creation & Share Link */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-onion" />
            <h2 className="font-extrabold text-sm text-slate-900">Stage 3: Sandbox Keys Issuance</h2>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Upon signing the NDA, an Orki admin creates the PSP record in <code>sandbox</code> status. Secret keys and webhook secrets are delivered via a 24-hour one-time share link.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Target PSP:</span>
              <span className="font-bold text-slate-900">XSquare Payments LLC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Technical Contact:</span>
              <span className="font-mono text-slate-800">t***@xsquare.example</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Key Status:</span>
              <span className="font-bold text-emerald-600">Delivered & Confirmed</span>
            </div>
          </div>

          <div className="p-3 bg-onion-50 border border-onion-200 rounded-xl space-y-1.5">
            <span className="font-bold text-onion-950 block">One-Time Secret Share Link (24h Expiry):</span>
            <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-onion-200 font-mono text-[11px] text-slate-700">
              <span className="truncate">https://auth.orki.io/v1/admin/secrets/claim?token=...</span>
              <button onClick={copyShareLink} className="text-onion hover:text-onion-800">
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Stage 7: Dual-Control Production Approval */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-onion" />
            <h2 className="font-extrabold text-sm text-slate-900">Stage 7: Two-Person Rule Approval</h2>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Production keys are only issued when two distinct Orki administrators sign off: one prepares, a second approves. <strong>They cannot be the same person.</strong>
          </p>

          <form onSubmit={handleRunApproval} className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Prepared By (Admin 1)</label>
              <input
                type="text"
                required
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Approved By (Admin 2)</label>
              <input
                type="text"
                required
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
              />
            </div>

            {approvalStatus === 'violation' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 font-medium">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{violationError}</span>
              </div>
            )}

            {approvalStatus === 'success' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2 text-emerald-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Two-Person Rule Satisfied! Production keys generated and dispatched via 1-time link.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-onion hover:bg-onion-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Dual Signatures & Approve</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
