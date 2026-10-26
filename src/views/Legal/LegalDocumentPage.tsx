import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FileText,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Printer,
} from 'lucide-react'

interface LegalDocumentPageProps {
  documentType?: 'terms' | 'privacy'
}

export const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({ documentType: propType }) => {
  const { doc } = useParams<{ doc?: string }>()
  const initialType = propType || (doc === 'privacy' ? 'privacy' : 'terms')
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialType)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/merchant"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center space-x-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Portal</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-onion-500/20 text-onion-400 border border-onion-500/30 flex items-center justify-center font-bold text-sm">
                O
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-tight">Orki Protocol Legal Repository</p>
                <p className="text-[10px] text-slate-400 font-mono">Document Version 2026.5 · Official Legal Record</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-medium inline-flex items-center space-x-1.5"
              title="Print document"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex space-x-1 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('terms')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'terms'
                ? 'border-onion-400 text-onion-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Merchant Terms of Service</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'privacy'
                ? 'border-onion-400 text-onion-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Corporate Privacy Policy</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {activeTab === 'terms' ? (
          <article className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-slate-300 text-sm leading-relaxed">
            {/* Header */}
            <div className="border-b border-slate-800 pb-6 space-y-3">
              <div className="inline-flex items-center space-x-2 text-[11px] font-mono uppercase tracking-wider text-onion-400 bg-onion-500/10 border border-onion-500/20 px-3 py-1 rounded-full">
                <FileText className="w-3.5 h-3.5" />
                <span>Standard Merchant Agreement · Tri-Wallet Split Core</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Orki Protocol Merchant Service Agreement & Terms of Service
              </h1>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-mono pt-1">
                <span>Effective Date: 1 January 2026</span>
                <span>•</span>
                <span>Jurisdiction: International Financial Center & VARA Standard</span>
                <span>•</span>
                <span>Issuing Entity: Orki Protocol Ltd</span>
              </div>
            </div>

            {/* Executive Summary Box */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <p className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Executive Architectural Summary</span>
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                This Agreement governs your organization’s integration with the Orki non-custodial stablecoin processing core. Neither Orki nor your partner Payment Service Provider (PSP) acts as a custodial escrow at any point. Payouts and transaction fees partition atomically on-chain to designated protocol, partner, and merchant smart vaults.
              </p>
            </div>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="text-onion-400 font-mono">1.</span>
                <span>Non-Custodial Multi-Chain Float</span>
              </h2>
              <p>
                Orki provides non-custodial smart contract infrastructure across EVM networks (Base) and SVM networks (Solana). Merchant funds never deposit into pooled custodial corporate accounts. Customer checkouts settle directly to your verified corporate smart account or route automatically via licensed virtual asset service providers (VASPs) to approved local banking rails.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="text-onion-400 font-mono">2.</span>
                <span>Tri-Wallet Split Settlement Architecture</span>
              </h2>
              <p>
                On every completed checkout, customer payments are partitioned atomically at the blockchain smart contract level:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <p className="text-xs font-bold text-onion-300">Orki Protocol Vault</p>
                  <p className="text-[11px] text-slate-400">Strictly capped at 1.00% (100 bps) processing protocol fee.</p>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <p className="text-xs font-bold text-purple-300">PSP Markup Vault</p>
                  <p className="text-[11px] text-slate-400">Approved commission markup, strictly capped under 1.00% ceiling.</p>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <p className="text-xs font-bold text-emerald-300">Merchant Smart Account</p>
                  <p className="text-[11px] text-slate-400">100% of net settlement proceeds deposited directly without delay.</p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="text-onion-400 font-mono">3.</span>
                <span>30-Day Mandatory Rate Lock Guarantee</span>
              </h2>
              <p>
                All agreed protocol fees and PSP markups are subject to an immutable 30-day rate lock. Neither Orki nor the partner PSP can increase processing fees without 30 days’ advance notification and verified Orki administrative governance approval.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="text-onion-400 font-mono">4.</span>
                <span>Authorised Signatories & WebAuthn Passkey Credentials</span>
              </h2>
              <p>
                Only documented, legally authorised corporate signatories may bind cryptographic credentials. The merchant agrees that smart account execution keys are controlled exclusively via WebAuthn FIDO2 biometric passkeys (ZeroDev / ERC-4337). No custodial recovery passwords exist; signatories must maintain hardware-bound credential security.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="text-onion-400 font-mono">5.</span>
                <span>Fiat Off-Ramping & Exclusivity</span>
              </h2>
              <p>
                Automated liquidation into fiat bank accounts (e.g. AED, USD, EUR) executes solely through licensed partners. Partner PSPs are strictly barred from levying ancillary foreign exchange or conversion markups upon off-ramped funds.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="text-onion-400 font-mono">6.</span>
                <span>Regulatory Compliance & KYB Invariants</span>
              </h2>
              <p>
                Merchant onboarding is contingent upon successful verification by Sumsub, sanction screening, and ultimate beneficial owner (UBO) documentation. Material misstatements in business registration data entitle Orki and the sponsoring PSP to immediately disable payment routing.
              </p>
            </section>

            <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 font-mono flex items-center justify-between">
              <span>Orki Protocol Ltd · Corporate Legal Council</span>
              <span>DocRef: TOS-2026-v5-RELEASE</span>
            </div>
          </article>
        ) : (
          <article className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-slate-300 text-sm leading-relaxed">
            {/* Header */}
            <div className="border-b border-slate-800 pb-6 space-y-3">
              <div className="inline-flex items-center space-x-2 text-[11px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Global Privacy & Data Governance Standard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Orki Protocol Corporate Privacy & Data Protection Policy
              </h1>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-mono pt-1">
                <span>Effective Date: 1 January 2026</span>
                <span>•</span>
                <span>Compliance: GDPR, DIFC Data Protection Law & UAE Federal Decree-Law No. 45</span>
                <span>•</span>
                <span>Controller: Orki Protocol Governance Board</span>
              </div>
            </div>

            {/* Executive Summary Box */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <p className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-2">
                <Lock className="w-4 h-4 text-onion-400" />
                <span>Privacy by Design & Cryptographic Segregation</span>
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Orki processes merchant corporate and representative data strictly for regulatory compliance, transaction execution, and identity verification. Private cryptographic keys never leave your device. Personal data is encrypted at rest using AES-256 and never sold or shared with commercial advertisers.
              </p>
            </div>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="text-emerald-400 font-mono">1.</span>
                <span>Information Collected from Merchants & Signatories</span>
              </h2>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
                <li><strong className="text-slate-200">Corporate Details:</strong> Legal business name, commercial trade license, jurisdiction, tax identification numbers, and registered physical address.</li>
                <li><strong className="text-slate-200">Authorised Signatory Data:</strong> Signatory full name, verified business email, corporate title, and digital signature records.</li>
                <li><strong className="text-slate-200">KYB & Identity Records:</strong> Identity documents, liveness verification, and corporate registry filings collected securely via Sumsub WebSDK.</li>
                <li><strong className="text-slate-200">Technical Audit Logs:</strong> IP address, browser user-agent, timestamp, and cryptographic challenge signatures collected upon Terms acceptance.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="text-emerald-400 font-mono">2.</span>
                <span>Use of Sumsub Verification Services</span>
              </h2>
              <p>
                Sumsub acts as a specialized data processor for Know-Your-Business (KYB) and Anti-Money Laundering (AML) verification. Video liveness data and identity documents are transmitted directly to Sumsub under strict end-to-end encryption and evaluated against global sanctions and politically exposed person (PEP) databases.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="text-emerald-400 font-mono">3.</span>
                <span>Blockchain Public Ledger Visibility</span>
              </h2>
              <p>
                Transactions settled on the Base (EVM) and Solana (SVM) blockchains are public by nature. Smart account addresses, transaction hashes, and on-chain fee splits are permanently recorded on public ledgers. Personal identifiable information (such as signatory names and trade license copies) is never stored on-chain.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="text-emerald-400 font-mono">4.</span>
                <span>Data Security & Cryptographic Storage</span>
              </h2>
              <p>
                All sensitive legal and corporate verification payloads stored in Orki databases are encrypted using AES-256-GCM authenticated encryption. WebAuthn passkey private keys are generated inside the merchant’s hardware security module (Secure Enclave / TPM) and are mathematically impossible for Orki to read or extract.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span className="text-emerald-400 font-mono">5.</span>
                <span>Data Subject Rights & Compliance Inquiries</span>
              </h2>
              <p>
                Authorised signatories and beneficial owners have the right to inspect, correct, and request deletion of personal information where not superseded by mandatory financial recordkeeping regulations (minimum 5-year anti-money laundering audit requirements). For data inquiries, contact <code className="text-onion-300 font-mono bg-slate-950 px-2 py-0.5 rounded">compliance@orki.network</code>.
              </p>
            </section>

            <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 font-mono flex items-center justify-between">
              <span>Orki Global Data Protection Office</span>
              <span>DocRef: PRIV-2026-v5-RELEASE</span>
            </div>
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-6 text-center text-xs text-slate-500">
        <p>Orki Protocol Legal Repository · Licensed Non-Custodial Multi-Chain Infrastructure</p>
      </footer>
    </div>
  )
}
