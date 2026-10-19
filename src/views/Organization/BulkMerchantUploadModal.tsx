import React, { useState } from 'react'
import { X, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { Merchant } from '../../types'

interface BulkMerchantUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onBatchCreated: (newMerchants: Merchant[]) => void
}

export const BulkMerchantUploadModal: React.FC<BulkMerchantUploadModalProps> = ({
  isOpen,
  onClose,
  onBatchCreated,
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState<Array<{ id: string; status: 'created' | 'rejected'; text: string }>>([])

  if (!isOpen) return null

  const handleRunBatch = () => {
    setIsProcessing(true)
    setLogs([])

    const simulatedRows = [
      { ext: 'XSQ-BATCH-201', name: 'Al-Zahra Luxury Perfumes LLC', licence: 'TL-55102', juris: 'Dubai DED' },
      { ext: 'XSQ-BATCH-202', name: 'Emirates Drone Surveying FZCO', licence: 'FZ-9921', juris: 'IFZA Dubai' },
      { ext: 'XSQ-BATCH-203', name: 'Incomplete Holdings Ltd', licence: '', juris: 'Abu Dhabi DED' }, // Deliberate failure
      { ext: 'XSQ-BATCH-204', name: 'Red Sea Marine Logistics LLC', licence: 'TL-88123', juris: 'Dubai DED' },
    ]

    const created: Merchant[] = []

    simulatedRows.forEach((row, idx) => {
      setTimeout(() => {
        if (!row.licence) {
          setLogs((prev) => [
            ...prev,
            { id: row.ext, status: 'rejected', text: `${row.ext}: Rejected (missing_kyb_field: tradeLicenseNumber)` },
          ])
        } else {
          const newMerchant: Merchant = {
            id: 'mrch_' + Math.random().toString(36).substring(7),
            externalId: row.ext,
            legalBusinessName: row.name,
            tradeLicenseNumber: row.licence,
            jurisdiction: row.juris,
            representativeName: 'Authorized Signer',
            representativeEmail: `ops@${row.ext.toLowerCase()}.example`,
            status: 'invited',
            settlementMode: 'hold_as_received',
            createdAt: new Date().toISOString(),
            volumeUsdc: 0.0,
          }
          created.push(newMerchant)
          setLogs((prev) => [
            ...prev,
            { id: row.ext, status: 'created', text: `${row.ext}: Created (${newMerchant.id})` },
          ])
        }

        if (idx === simulatedRows.length - 1) {
          setIsProcessing(false)
          onBatchCreated(created)
        }
      }, (idx + 1) * 450)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-onion-200 overflow-hidden">
        {/* Header */}
        <div className="bg-onion p-5 text-white flex items-center justify-between border-b border-onion-700">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-onion-200" />
            <h2 className="font-bold text-base">Bulk Merchant Ingestion (POST /v1/psp/merchants/batch)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-onion-700/60 transition text-onion-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600">
            Upload CSV or run a sample batch of pre-agreed merchants. Each row is judged independently in chunks up to 100. One row failure never blocks the rest.
          </p>

          <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50">
            <UploadCloud className="w-8 h-8 text-onion mx-auto mb-1.5" />
            <p className="font-semibold text-slate-800">Drag and drop merchants CSV here</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Required headers: merchantExternalId, legalBusinessName, tradeLicenseNumber, jurisdiction</p>
          </div>

          <button
            disabled={isProcessing}
            onClick={handleRunBatch}
            className="w-full py-2.5 bg-onion hover:bg-onion-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center space-x-2"
          >
            {isProcessing ? 'Processing Chunked Batch (4 rows)...' : 'Run Sample Ingestion Batch'}
          </button>

          {/* Real-time Logs Feed */}
          {logs.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                Batch Execution Results:
              </span>
              <div className="max-h-44 overflow-y-auto space-y-1.5 p-3 bg-slate-900 rounded-xl font-mono text-[11px]">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-1.5 ${
                      log.status === 'created' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {log.status === 'created' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
