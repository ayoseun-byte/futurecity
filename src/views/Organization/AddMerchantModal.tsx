import React, { useState } from 'react'
import { X, Building, User, Mail, ShieldCheck } from 'lucide-react'
import type { Merchant } from '../../types'

interface AddMerchantModalProps {
  isOpen: boolean
  onClose: () => void
  onAddMerchant: (merchant: Partial<Merchant>) => void
}

export const AddMerchantModal: React.FC<AddMerchantModalProps> = ({ isOpen, onClose, onAddMerchant }) => {
  const [formData, setFormData] = useState({
    externalId: 'XSQ-MERCH-' + Math.floor(1000 + Math.random() * 9000),
    legalBusinessName: '',
    tradeLicenseNumber: '',
    jurisdiction: 'Dubai DED',
    representativeName: '',
    representativeEmail: '',
    consentNoticeVersion: 'v1',
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.legalBusinessName || !formData.tradeLicenseNumber) return

    onAddMerchant({
      externalId: formData.externalId,
      legalBusinessName: formData.legalBusinessName,
      tradeLicenseNumber: formData.tradeLicenseNumber,
      jurisdiction: formData.jurisdiction,
      representativeName: formData.representativeName,
      representativeEmail: formData.representativeEmail,
      status: 'invited',
      settlementMode: 'hold_as_received',
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-onion-200 overflow-hidden">
        {/* Header */}
        <div className="bg-onion p-5 text-white flex items-center justify-between border-b border-onion-700">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-onion-200" />
            <h2 className="font-bold text-base">Register Single Merchant (Pre-Fill)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-onion-700/60 transition text-onion-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-onion-50 border border-onion-200 rounded-xl text-onion-900 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-onion-700 inline mr-1" />
            <strong>Pre-Fill Only Rule:</strong> PSPs provide basic business identification. Document collection, UBO identification, and passkeys are gathered directly by Orki via Sumsub.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Merchant External ID</label>
              <input
                type="text"
                required
                value={formData.externalId}
                onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Licensing Authority</label>
              <select
                value={formData.jurisdiction}
                onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
              >
                <option value="Dubai DED">Dubai DED</option>
                <option value="Abu Dhabi DED">Abu Dhabi DED</option>
                <option value="IFZA Dubai">IFZA Dubai</option>
                <option value="DMCC Free Zone">DMCC Free Zone</option>
                <option value="ADGM">ADGM</option>
                <option value="DIFC">DIFC</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Legal Business Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme General Trading LLC"
              value={formData.legalBusinessName}
              onChange={(e) => setFormData({ ...formData, legalBusinessName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Trade Licence Number</label>
            <input
              type="text"
              required
              placeholder="e.g. TL-98214"
              value={formData.tradeLicenseNumber}
              onChange={(e) => setFormData({ ...formData, tradeLicenseNumber: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Representative Name</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={formData.representativeName}
                  onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Representative Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="contact@business.example"
                  value={formData.representativeEmail}
                  onChange={(e) => setFormData({ ...formData, representativeEmail: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-bold text-slate-800 block text-[11px]">Consent Evidence Timestamped</span>
            <p className="text-[11px] text-slate-500">
              Recorded consent method: <code>contract_addendum</code> · Notice version <code>v1</code>
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-5 bg-onion hover:bg-onion-700 text-white font-bold rounded-xl shadow-md transition"
            >
              Register Merchant
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
