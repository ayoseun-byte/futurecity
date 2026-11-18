import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  Landmark,
  ShieldCheck,
  Share2,
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
  const [hostedSessionUrl, setHostedSessionUrl] = useState<string | null>(null)
  const [signedAgreementId, setSignedAgreementId] = useState('')

  // Orki Bank Settlement Payout Account setup form
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

  // Orki Instant Quote / Payout State
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
      setError(err instanceof Error ? err.message : 'Failed to load Orki fiat settlement status.')
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
      setNotice('Orki settlement verification sync initiated cleanly.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync Orki settlement verification.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleCreateSettlementTos = async () => {
    setBusyAction('tos')
    setError(null)
    setNotice(null)
    try {
      const config = getApiConfig()
      const redirectUri = `${window.location.origin}${window.location.pathname}`
      const res = await createBridgeTosLink(config, redirectUri)
      await loadStatus()
      if (res.tosUrl) {
        window.open(res.tosUrl, '_blank', 'noopener,noreferrer')
        setNotice('Orki Settlement Terms opened in a new tab. After accepting, return or paste your agreement token to complete sync.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create Orki Settlement Terms link.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleStartHostedVerification = async () => {
    setBusyAction('hosted:session')
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
        setHostedSessionUrl(url)
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not initiate Orki verification session.')
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

  const handleLinkBankPayoutAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusyAction('bank:link')
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
      setNotice(`Bank payout account linked across ${createdCount || selectedChains.length} settlement rail(s).`)
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link fiat settlement bank account.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleFetchQuote = async () => {
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid positive numeric amount.')
      return
    }
    setBusyAction('quote')
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
      setError(err instanceof Error ? err.message : 'Failed to compute Orki FX conversion quote.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleExecuteOffRamp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quote || !ibanOrAcct.trim()) return

    setBusyAction('transfer')
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
      setError(err instanceof Error ? err.message : 'Orki off-ramp settlement execution failed.')
    } finally {
      setBusyAction(null)
    }
  }

  if (!isOpen) return null

  const bankRailEnabled = Boolean(statusData?.providersEnabled.bridge)
  const instantRailEnabled = Boolean(statusData?.providersEnabled.due)
  const linkedPayoutRails = statusData?.liquidationAddresses || []

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
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Orki Fiat Settlement &amp; Off-Ramp</h3>
              <p className="text-[11px] text-slate-500">
                Automated USDC-to-fiat bank payout configuration and instant conversion
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadStatus()}
              disabled={loading || busyAction !== null}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition"
              title="Refresh Orki settlement status"
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

          {/* Orki Fiat Settlement Verification Summary */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-onion" />
                  <span>Orki Settlement Verification</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    statusData?.offrampEligible
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {statusData?.offrampEligible ? 'Eligible' : 'Verification Needed'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Complete Orki settlement verification before enabling automated fiat bank payouts.
              </p>
            </div>
            {(bankRailEnabled || instantRailEnabled) && (
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
                <span>Sync Orki Verification</span>
              </button>
            )}
          </div>

          {!bankRailEnabled && !instantRailEnabled && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800">
              Automated fiat settlement is not yet enabled on your account. Contact Orki support to enable fiat off-ramp payouts.
            </div>
          )}

          {/* Automated Bank Payout Setup */}
          {bankRailEnabled && statusData && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Orki Bank Payout Account
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusTone(statusData.bridge.status)}`}>
                      {statusData.bridge.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {statusData.bridge.eligible
                      ? 'Your Orki automated bank payout verification is approved.'
                      : 'Accept Orki Settlement Terms and sync verification to link a payout bank account.'}
                  </p>
                </div>
                {statusData.bridge.kycUrl && !statusData.bridge.eligible && (
                  <a
                    href={statusData.bridge.kycUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                  >
                    <span>Orki Verification Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {statusData.bridge.lastError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">
                  Orki verification attention required. Please retry verification sync or contact support.
                </div>
              )}

              {!statusData.bridge.eligible && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-700">
                      <span className="font-semibold">1. Orki Settlement Terms:</span>{' '}
                      {statusData.bridge.signedAgreementId
                        ? 'Terms accepted'
                        : 'Accept Orki Settlement Terms to enable bank account linking.'}
                    </div>
                    <div className="flex items-center gap-2">
                      {statusData.bridge.tosUrl && (
                        <a
                          href={statusData.bridge.tosUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1"
                        >
                          <span>Open Terms</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleCreateSettlementTos()}
                        disabled={busyAction !== null}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                      >
                        {busyAction === 'tos' ? 'Opening…' : 'Review Settlement Terms'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={signedAgreementId}
                      onChange={(e) => setSignedAgreementId(e.target.value)}
                      placeholder="Optional agreement confirmation ID"
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-onion focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleShareKyb('bridge', signedAgreementId)}
                      disabled={busyAction !== null}
                      className="px-3.5 py-1.5 rounded-lg bg-onion text-white text-xs font-semibold hover:bg-onion-700 transition disabled:opacity-50"
                    >
                      {busyAction === 'share:bridge' ? 'Syncing…' : 'Sync Verification'}
                    </button>
                  </div>
                </div>
              )}

              {linkedPayoutRails.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Connected Bank Payout Rails ({linkedPayoutRails.length})
                  </span>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {linkedPayoutRails.map((rail) => (
                      <div key={rail.id} className="px-3 py-2.5 bg-white flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase text-slate-900">{rail.chain}</span>
                          <span className="text-[11px] font-mono uppercase text-slate-500">
                            {rail.currency} → {rail.destinationCurrency} ({rail.destinationPaymentRail || 'fiat'})
                          </span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${statusTone(rail.status)}`}>
                          {rail.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {statusData.bridge.eligible && (
                <form onSubmit={handleLinkBankPayoutAccount} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Link Fiat Settlement Bank Account
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
                      {busyAction === 'bank:link' ? 'Linking…' : 'Link Bank Account'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Orki Instant Off-Ramp & Verification */}
          {instantRailEnabled && statusData && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Orki Instant Fiat Off-Ramp
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusTone(statusData.due.status)}`}>
                      {statusData.due.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {statusData.due.eligible
                      ? 'Orki instant fiat payout is verified and ready.'
                      : 'Complete Orki verification to convert USDC balances directly into fiat payouts.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(hostedSessionUrl || statusData.due.completionUrl) && (
                    <a
                      href={hostedSessionUrl || statusData.due.completionUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                    >
                      <span>Open Orki Verification</span>
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
                      {busyAction === 'share:due' ? 'Syncing…' : 'Sync Verification'}
                    </button>
                  )}
                </div>
              </div>

              {statusData.due.lastError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">
                  Orki verification requires attention. Please start hosted verification or retry sync.
                </div>
              )}

              {!statusData.due.eligible ? (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="text-slate-600">
                    Complete hosted Orki fiat verification to activate instant payouts.
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleStartHostedVerification()}
                    disabled={busyAction !== null}
                    className="px-3 py-1.5 rounded-lg bg-onion text-white text-xs font-semibold hover:bg-onion-700 transition inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>{busyAction === 'hosted:session' ? 'Opening…' : 'Start Orki Verification'}</span>
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
                      {busyAction === 'quote' ? 'Quoting…' : quote ? 'Refresh Quote' : 'Get FX Quote'}
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
                        <span>{busyAction === 'transfer' ? 'Submitting…' : 'Confirm Orki Off-Ramp'}</span>
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
