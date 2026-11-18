import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  Landmark,
  Copy,
  Check,
  ShieldCheck,
  Share2,
  Coins,
} from 'lucide-react'
import { getApiConfig, requestApi } from '../../services/apiConfig'
import {
  createBridgeLiquidationAddresses,
  createBridgeTosLink,
  fetchOfframpStatus,
  shareOfframpKyb,
  type OfframpProvider,
  type OfframpStatusResponse,
} from '../../services/offrampService'

interface OffRampModalProps {
  isOpen: boolean
  onClose: () => void
  initialStatus?: OfframpStatusResponse | null
  onStatusUpdated?: (status: OfframpStatusResponse) => void
}

interface QuoteData {
  rate: string
  destinationAmount: string
  feeAmount: string
  quoteId: string
  expiresAt?: string
}

const statusTone = (status: string): string => {
  const normalized = status.toLowerCase()
  if (normalized === 'approved' || normalized === 'active') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
  if (normalized === 'rejected' || normalized === 'failed') {
    return 'bg-red-50 text-red-700 border-red-200'
  }
  if (normalized === 'pending' || normalized === 'in_review' || normalized === 'under_review' || normalized === 'awaiting_tos') {
    return 'bg-amber-50 text-amber-800 border-amber-200'
  }
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

export const OffRampModal: React.FC<OffRampModalProps> = ({
  isOpen,
  onClose,
  initialStatus = null,
  onStatusUpdated,
}) => {
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [statusData, setStatusData] = useState<OfframpStatusResponse | null>(initialStatus)
  const [dueSessionUrl, setDueSessionUrl] = useState<string | null>(null)
  const [signedAgreementId, setSignedAgreementId] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Bridge Liquidation Address setup form
  const [bankCurrency, setBankCurrency] = useState<'usd' | 'eur' | 'mxn' | 'brl'>('usd')
  const [paymentRail, setPaymentRail] = useState('ach')
  const [accountOwnerName, setAccountOwnerName] = useState('')
  const [bankName, setBankName] = useState('')
  const [routingNumber, setRoutingNumber] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [iban, setIban] = useState('')
  const [bic, setBic] = useState('')
  const [country, setCountry] = useState('USA')
  const [selectedChains, setSelectedChains] = useState<string[]>(['base', 'solana'])

  // Due Quote / Payout State
  const [amount, setAmount] = useState('100.00')
  const [sourceCurrency] = useState('USDC')
  const [destinationCurrency, setDestinationCurrency] = useState('USD')
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [ibanOrAcct, setIbanOrAcct] = useState('')
  const [transferResult, setTransferResult] = useState<{ status: string; id: string } | null>(null)

  useEffect(() => {
    if (initialStatus) {
      setStatusData(initialStatus)
    }
  }, [initialStatus])

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const config = getApiConfig()
      const fresh = await fetchOfframpStatus(config)
      setStatusData(fresh)
      onStatusUpdated?.(fresh)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load off-ramp status.')
    } finally {
      setLoading(false)
    }
  }, [onStatusUpdated])

  useEffect(() => {
    if (isOpen) {
      void loadStatus()
      setQuote(null)
      setTransferResult(null)
      setNotice(null)
    }
  }, [isOpen, loadStatus])

  const handleCopy = (value: string, id: string) => {
    void navigator.clipboard.writeText(value)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId(null), 1800)
  }

  const handleShareKyb = async (provider?: OfframpProvider, agreementOverride?: string) => {
    setBusyAction(provider ? `share:${provider}` : 'share:all')
    setError(null)
    setNotice(null)
    try {
      const config = getApiConfig()
      const redirectUri = `${window.location.origin}${window.location.pathname}`
      const res = await shareOfframpKyb(config, {
        provider,
        signedAgreementId: agreementOverride?.trim() || signedAgreementId.trim() || undefined,
        redirectUri,
      })
      setStatusData(res.status)
      onStatusUpdated?.(res.status)
      setNotice(
        provider
          ? `${provider === 'bridge' ? 'Bridge' : 'Due'} KYB sharing triggered cleanly.`
          : 'KYB sharing triggered for active off-ramp providers.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share Sumsub KYB data.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleCreateBridgeTos = async () => {
    setBusyAction('bridge:tos')
    setError(null)
    setNotice(null)
    try {
      const config = getApiConfig()
      const redirectUri = `${window.location.origin}${window.location.pathname}`
      const res = await createBridgeTosLink(config, redirectUri)
      await loadStatus()
      if (res.tosUrl) {
        window.open(res.tosUrl, '_blank', 'noopener,noreferrer')
        setNotice('Bridge Terms of Service opened in a new tab. After accepting, paste signed_agreement_id or return to complete KYB sync.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create Bridge Terms of Service link.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleStartDueVerification = async () => {
    setBusyAction('due:session')
    setError(null)
    try {
      const config = getApiConfig()
      const res = await requestApi<{ redirectUrl?: string; url?: string }>(
        config,
        'POST',
        '/api/v1/merchant/settlement/due-session',
        undefined,
        'merchant',
      )
      const url = res.redirectUrl || res.url || statusData?.due.completionUrl
      if (url) {
        setDueSessionUrl(url)
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not initiate Due KYB session.')
    } finally {
      setBusyAction(null)
    }
  }

  const toggleChain = (chain: string) => {
    setSelectedChains((prev) =>
      prev.includes(chain)
        ? (prev.length > 1 ? prev.filter((item) => item !== chain) : prev)
        : [...prev, chain],
    )
  }

  const handleCreateLiquidationAddresses = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusyAction('bridge:liquidation')
    setError(null)
    setNotice(null)
    try {
      const config = getApiConfig()
      const res = await createBridgeLiquidationAddresses(config, {
        currency: bankCurrency,
        destinationPaymentRail: paymentRail,
        accountOwnerName: accountOwnerName.trim(),
        bankName: bankName.trim() || undefined,
        routingNumber: bankCurrency === 'usd' ? routingNumber.trim() : undefined,
        accountNumber: bankCurrency === 'usd' ? accountNumber.trim() : undefined,
        iban: bankCurrency === 'eur' ? iban.trim() : undefined,
        bic: bankCurrency === 'eur' ? bic.trim() : undefined,
        country: country.trim() || 'USA',
        accountClassification: 'checking',
        chains: selectedChains,
        currencies: ['usdc'],
      })
      const createdCount = Array.isArray(res.created) ? res.created.length : 0
      setNotice(`Provisioned ${createdCount} Bridge liquidation address(es) routed to your bank account.`)
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Bridge liquidation addresses.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleFetchQuote = async () => {
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid positive numeric amount.')
      return
    }
    setBusyAction('due:quote')
    setError(null)
    try {
      const config = getApiConfig()
      const res = await requestApi<QuoteData>(
        config,
        'POST',
        '/api/v1/merchant/conversions/quote',
        {
          amount: Number(amount),
          sourceCurrency,
          destinationCurrency,
          rail: destinationCurrency === 'EUR' ? 'SEPA' : 'ACH',
        },
        'merchant',
      )
      setQuote(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute FX conversion quote.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleExecuteOffRamp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quote || !ibanOrAcct.trim()) return

    setBusyAction('due:transfer')
    setError(null)
    try {
      const config = getApiConfig()
      const res = await requestApi<{ id: string; status: string }>(
        config,
        'POST',
        '/api/v1/merchant/conversions',
        {
          quoteId: quote.quoteId,
          amount: Number(amount),
          sourceCurrency,
          destinationCurrency,
          destinationAccount: ibanOrAcct.trim(),
        },
        'merchant',
      )
      setTransferResult(res)
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Off-ramp settlement execution failed.')
    } finally {
      setBusyAction(null)
    }
  }

  if (!isOpen) return null

  const bridgeEnabled = Boolean(statusData?.providersEnabled.bridge)
  const dueEnabled = Boolean(statusData?.providersEnabled.due)
  const liquidationAddresses = statusData?.liquidationAddresses || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-onion/10 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-onion" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Auto-Offramp KYB & Fiat Settlement</h3>
              <p className="text-[11px] text-slate-500">
                Config-driven Layer-2 rails (`USE_BRIDGE={String(bridgeEnabled)}` • `USE_DUE={String(dueEnabled)}`)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadStatus()}
              disabled={loading || busyAction !== null}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition"
              title="Refresh off-ramp state"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {/* Top Summary & One-Click Sumsub Sharing */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-onion" />
                  <span>Auto-Offramp Eligibility</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    statusData?.offrampEligible
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {statusData?.offrampEligible ? 'Eligible' : 'KYB Sharing / Review Needed'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Shares your verified Sumsub KYB profile with active settlement partners before switching `auto_offramp`.
              </p>
            </div>
            {(bridgeEnabled || dueEnabled) && (
              <button
                type="button"
                onClick={() => void handleShareKyb()}
                disabled={busyAction !== null || loading}
                className="px-3.5 py-2 rounded-xl bg-onion text-white text-xs font-semibold hover:bg-onion-700 transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {busyAction === 'share:all' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                <span>Share Sumsub KYB</span>
              </button>
            )}
          </div>

          {!bridgeEnabled && !dueEnabled && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800">
              Both `USE_BRIDGE` and `USE_DUE` are currently disabled on the backend configuration. Enable at least one off-ramp rail to provision fiat settlement.
            </div>
          )}

          {/* BRIDGE SECTION (Shown only when USE_BRIDGE=true) */}
          {bridgeEnabled && statusData && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Bridge Off-Ramp & Liquidation Addresses
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusTone(statusData.bridge.status)}`}>
                      {statusData.bridge.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {statusData.bridge.customerId
                      ? `Customer ID: ${statusData.bridge.customerId}`
                      : 'Accept Bridge Terms of Service, share Sumsub KYB applicant, and provision per-chain liquidation addresses.'}
                  </p>
                </div>
                {statusData.bridge.kycUrl && !statusData.bridge.eligible && (
                  <a
                    href={statusData.bridge.kycUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                  >
                    <span>Bridge KYC Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {statusData.bridge.lastError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">
                  {statusData.bridge.lastError}
                </div>
              )}

              {/* Step 1: ToS & Sumsub Push */}
              {!statusData.bridge.eligible && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-700">
                      <span className="font-semibold">1. Bridge ToS & KYB Sync:</span>{' '}
                      {statusData.bridge.signedAgreementId
                        ? `ToS Accepted (${statusData.bridge.signedAgreementId.slice(0, 14)}...)`
                        : 'Generate and accept the Bridge Terms of Service first.'}
                    </div>
                    <div className="flex items-center gap-2">
                      {statusData.bridge.tosUrl && (
                        <a
                          href={statusData.bridge.tosUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1"
                        >
                          <span>Open ToS</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleCreateBridgeTos()}
                        disabled={busyAction !== null}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                      >
                        {busyAction === 'bridge:tos' ? 'Opening…' : 'Generate ToS Link'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={signedAgreementId}
                      onChange={(e) => setSignedAgreementId(e.target.value)}
                      placeholder={statusData.bridge.signedAgreementId || 'Paste Bridge signed_agreement_id to push Sumsub KYB'}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-onion focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleShareKyb('bridge', signedAgreementId)}
                      disabled={busyAction !== null}
                      className="px-3.5 py-1.5 rounded-lg bg-onion text-white text-xs font-semibold hover:bg-onion-700 transition disabled:opacity-50"
                    >
                      {busyAction === 'share:bridge' ? 'Syncing…' : 'Sync Sumsub → Bridge'}
                    </button>
                  </div>
                </div>
              )}

              {/* Active Liquidation Addresses */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-onion" />
                    <span>Provisioned Liquidation Addresses ({liquidationAddresses.length})</span>
                  </span>
                </div>

                {liquidationAddresses.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {liquidationAddresses.map((liq) => (
                      <div key={liq.id} className="px-3 py-2.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold uppercase text-slate-900">{liq.chain}</span>
                            <span className="text-[11px] font-mono uppercase text-slate-500">
                              {liq.currency} → {liq.destinationCurrency} ({liq.destinationPaymentRail || 'fiat'})
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${statusTone(liq.status)}`}>
                              {liq.status}
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-slate-600 truncate">{liq.address}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(liq.address, `modal-liq-${liq.id}`)}
                          className="self-start sm:self-center px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 shrink-0"
                        >
                          {copiedId === `modal-liq-${liq.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    No Bridge liquidation addresses provisioned yet.
                  </p>
                )}

                {/* Provision Bank + Liquidation Addresses Form */}
                {statusData.bridge.eligible && (
                  <form onSubmit={handleCreateLiquidationAddresses} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="text-xs font-bold text-slate-800">
                      Link Bank Account & Provision Liquidation Addresses
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Fiat Currency</label>
                        <select
                          value={bankCurrency}
                          onChange={(e) => {
                            const next = e.target.value as 'usd' | 'eur' | 'mxn' | 'brl'
                            setBankCurrency(next)
                            setPaymentRail(next === 'eur' ? 'sepa' : 'ach')
                            setCountry(next === 'eur' ? 'DEU' : 'USA')
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        >
                          <option value="usd">USD</option>
                          <option value="eur">EUR</option>
                          <option value="mxn">MXN</option>
                          <option value="brl">BRL</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Payout Rail</label>
                        <select
                          value={paymentRail}
                          onChange={(e) => setPaymentRail(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        >
                          {bankCurrency === 'usd' && <option value="ach">ACH</option>}
                          {bankCurrency === 'usd' && <option value="wire">Wire</option>}
                          {bankCurrency === 'eur' && <option value="sepa">SEPA</option>}
                          {bankCurrency === 'mxn' && <option value="spei">SPEI</option>}
                          {bankCurrency === 'brl' && <option value="pix">PIX</option>}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Account Owner Name</label>
                        <input
                          type="text"
                          required
                          value={accountOwnerName}
                          onChange={(e) => setAccountOwnerName(e.target.value)}
                          placeholder="Acme Global Ltd"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Bank Name (optional)"
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      {bankCurrency === 'eur' ? (
                        <>
                          <input
                            type="text"
                            required
                            value={iban}
                            onChange={(e) => setIban(e.target.value)}
                            placeholder="IBAN"
                            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                          />
                          <input
                            type="text"
                            value={bic}
                            onChange={(e) => setBic(e.target.value)}
                            placeholder="BIC / SWIFT"
                            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                          />
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            required={bankCurrency === 'usd'}
                            value={routingNumber}
                            onChange={(e) => setRoutingNumber(e.target.value)}
                            placeholder="Routing Number (021000021)"
                            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                          />
                          <input
                            type="text"
                            required={bankCurrency === 'usd'}
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="Account Number"
                            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                          />
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="text-slate-500 font-medium">Chains:</span>
                        {['base', 'solana', 'ethereum', 'arbitrum'].map((chain) => {
                          const active = selectedChains.includes(chain)
                          return (
                            <button
                              key={chain}
                              type="button"
                              onClick={() => toggleChain(chain)}
                              className={`px-2 py-0.5 rounded-md border font-semibold uppercase ${
                                active
                                  ? 'bg-onion/10 border-onion text-onion'
                                  : 'bg-white border-slate-300 text-slate-500'
                              }`}
                            >
                              {chain}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        type="submit"
                        disabled={busyAction !== null}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                      >
                        {busyAction === 'bridge:liquidation' ? 'Provisioning…' : 'Create Liquidation Addresses'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* DUE SECTION (Shown only when USE_DUE=true) */}
          {dueEnabled && statusData && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Due KYB Sharing & Fiat Settlement
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusTone(statusData.due.status)}`}>
                      {statusData.due.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {statusData.due.accountId
                      ? `Due Account: ${statusData.due.accountId}${statusData.due.sharingStatus ? ` • Sumsub Share: ${statusData.due.sharingStatus}` : ''}`
                      : 'Shares your reusable Sumsub token directly with Due (/v1/kyc/sharing/sumsub).'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(dueSessionUrl || statusData.due.completionUrl) && (
                    <a
                      href={dueSessionUrl || statusData.due.completionUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                    >
                      <span>Open Due</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {!statusData.due.eligible && (
                    <button
                      type="button"
                      onClick={() => void handleShareKyb('due')}
                      disabled={busyAction !== null}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      {busyAction === 'share:due' ? 'Sharing…' : 'Share → Due'}
                    </button>
                  )}
                </div>
              </div>

              {statusData.due.lastError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">
                  {statusData.due.lastError}
                </div>
              )}

              {!statusData.due.eligible ? (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="text-slate-600">
                    Need hosted completion or Terms acceptance in Due?
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleStartDueVerification()}
                    disabled={busyAction !== null}
                    className="px-3 py-1.5 rounded-lg bg-onion text-white text-xs font-semibold hover:bg-onion-700 transition inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>{busyAction === 'due:session' ? 'Opening…' : 'Start Due Hosted Session'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : transferResult ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Off-Ramp Payout Initiated</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Transfer <span className="font-mono font-bold text-slate-800">{transferResult.id}</span> submitted for {amount} {sourceCurrency} → {quote?.destinationAmount} {destinationCurrency}.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleExecuteOffRamp} className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Amount ({sourceCurrency})</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value)
                          setQuote(null)
                        }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Fiat</label>
                      <select
                        value={destinationCurrency}
                        onChange={(e) => {
                          setDestinationCurrency(e.target.value)
                          setQuote(null)
                        }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold"
                      >
                        <option value="USD">USD (ACH / Wire)</option>
                        <option value="EUR">EUR (SEPA)</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleFetchQuote()}
                      disabled={busyAction !== null}
                      className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      {busyAction === 'due:quote' ? 'Quoting…' : quote ? 'Refresh Quote' : 'Get FX Quote'}
                    </button>
                  </div>

                  {quote && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rate / Fee</span>
                        <span className="font-mono font-semibold text-slate-800">
                          1 {sourceCurrency} = {quote.rate} {destinationCurrency} (Fee: {quote.feeAmount})
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700 font-semibold">You Receive</span>
                        <span className="text-sm font-bold font-mono text-onion">
                          {quote.destinationAmount} {destinationCurrency}
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={ibanOrAcct}
                        onChange={(e) => setIbanOrAcct(e.target.value)}
                        placeholder={destinationCurrency === 'EUR' ? 'Recipient IBAN' : 'ACH Account / Routing Reference'}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                      <button
                        type="submit"
                        disabled={busyAction !== null || !ibanOrAcct.trim()}
                        className="w-full py-2 bg-onion text-white rounded-lg text-xs font-bold hover:bg-onion-700 transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <span>{busyAction === 'due:transfer' ? 'Submitting…' : 'Confirm Due Off-Ramp'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
