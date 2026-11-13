import React, { useState } from 'react'
import { X, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { Merchant } from '../../types'
import { getApiConfig, requestApi } from '../../services/apiConfig'

interface BatchRow {
  merchantExternalId: string
  legalBusinessName: string
  tradeLicenseNumber: string
  jurisdiction: string
  representativeName: string
  representativeEmail: string
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        cell += character
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true
    } else if (character === ',') {
      row.push(cell)
      cell = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some((value) => value.trim() !== '')) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  if (quoted) throw new Error('The CSV contains an unterminated quoted field.')
  row.push(cell)
  if (row.some((value) => value.trim() !== '')) rows.push(row)
  return rows
}

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
  const [file, setFile] = useState<File | null>(null)

  if (!isOpen) return null

  const handleRunBatch = async () => {
    setIsProcessing(true)
    setLogs([])
    try {
      if (!file) throw new Error('Choose a CSV file first.')
      const csvRows = parseCsv((await file.text()).replace(/^\uFEFF/, ''))
      if (csvRows.length < 2) throw new Error('The CSV must include a header row and at least one merchant.')

      const headers = csvRows[0].map((header) => header.trim())
      const indexes = new Map(headers.map((header, index) => [header, index] as const))
      const requiredHeaders = ['merchantExternalId', 'legalBusinessName', 'tradeLicenseNumber', 'jurisdiction']
      const missingHeaders = requiredHeaders.filter((header) => !indexes.has(header))
      if (missingHeaders.length) throw new Error(`Missing CSV headers: ${missingHeaders.join(', ')}`)

      const rows: BatchRow[] = csvRows.slice(1).map((cells, index) => {
        const get = (name: string) => cells[indexes.get(name) ?? -1]?.trim() || ''
        const row = {
          merchantExternalId: get('merchantExternalId'),
          legalBusinessName: get('legalBusinessName'),
          tradeLicenseNumber: get('tradeLicenseNumber'),
          jurisdiction: get('jurisdiction'),
          representativeName: get('representativeName'),
          representativeEmail: get('representativeEmail'),
        }
        const missing = requiredHeaders.filter((header) => !row[header as keyof BatchRow])
        if (missing.length) {
          throw new Error(`CSV row ${index + 2} is missing: ${missing.join(', ')}`)
        }
        return row
      })
      if (rows.length > 100) throw new Error('The backend accepts at most 100 merchants per batch.')

      const response = await requestApi<{
        results: Array<{
          merchantExternalId: string
          status: string
          orkiMerchantId?: string
          error?: string
          field?: string
          message?: string
        }>
      }>(getApiConfig(), 'POST', '/api/v1/psp/merchants/batch', {
        merchants: rows.map((row) => ({
          ...row,
          consent: {},
        })),
      }, 'psp')

      const rowByExternalId = new Map(rows.map((row) => [row.merchantExternalId, row]))
      const created: Merchant[] = []
      const newLogs = response.results.map((result) => {
        const row = rowByExternalId.get(result.merchantExternalId)
        if (result.status !== 'REJECTED' && row && result.orkiMerchantId) {
          created.push({
            id: result.orkiMerchantId,
            organizationId: '',
            externalId: row.merchantExternalId,
            legalBusinessName: row.legalBusinessName,
            tradeLicenseNumber: row.tradeLicenseNumber,
            jurisdiction: row.jurisdiction,
            representativeName: row.representativeName,
            representativeEmail: row.representativeEmail,
            status: 'invited',
            settlementMode: 'hold_as_received',
            nextStep: 'NOTICE',
            createdAt: new Date().toISOString(),
          })
          return { id: result.merchantExternalId, status: 'created' as const, text: `${result.merchantExternalId}: Registered (${result.orkiMerchantId})` }
        }
        return {
          id: result.merchantExternalId,
          status: 'rejected' as const,
          text: `${result.merchantExternalId}: ${result.error || result.field || result.message || 'Rejected by backend'}`,
        }
      })
      setLogs(newLogs)
      onBatchCreated(created)
    } catch (reason) {
      setLogs([{
        id: 'batch',
        status: 'rejected',
        text: reason instanceof Error ? reason.message : 'Batch registration failed.',
      }])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-onion-200 overflow-hidden">
        {/* Header */}
        <div className="bg-onion p-5 text-white flex items-center justify-between border-b border-onion-700">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-onion-200" />
            <h2 className="font-bold text-base">Bulk Merchant Registration</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-onion-700/60 transition text-onion-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600">
            Submit merchant records to the authenticated PSP batch API. Each row is processed independently; no sample merchants are created.
          </p>

          <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50">
            <UploadCloud className="w-8 h-8 text-onion mx-auto mb-1.5" />
            <label className="font-semibold text-slate-800 block">
              Choose a merchant CSV file
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={isProcessing}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="block mx-auto mt-2 text-[10px] font-normal text-slate-500"
              />
            </label>
            <p className="text-[10px] text-slate-400 mt-2">
              Required headers: merchantExternalId, legalBusinessName, tradeLicenseNumber, jurisdiction. Optional: representativeName, representativeEmail.
            </p>
            {file && <p className="text-[10px] text-slate-600 mt-1">{file.name}</p>}
          </div>

          <button
            disabled={isProcessing}
            onClick={handleRunBatch}
            className="w-full py-2.5 bg-onion hover:bg-onion-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center space-x-2"
          >
            {isProcessing ? 'Registering with backend…' : 'Register CSV merchants'}
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
