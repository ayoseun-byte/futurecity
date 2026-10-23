import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ExternalLink, FileText, ShieldCheck } from 'lucide-react'
import { getApiConfig, requestApi } from '../../services/apiConfig'

type TermsRecord = { id: string; entityName: string; version: string; status: string; token: string; legalBusinessName: string; documentLinks: { tos: string; privacyPolicy: string } }

export function HostedTosPage() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [terms, setTerms] = useState<TermsRecord | null>(null)
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [signerTitle, setSignerTitle] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    requestApi<TermsRecord>(getApiConfig(), 'GET', `/api/v1/tos/${encodeURIComponent(token)}`)
      .then(setTerms)
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load terms.'))
  }, [token])

  const acceptTerms = async () => {
    if (!agreed || !terms) return
    setBusy(true); setError('')
    try {
      const result = await requestApi<{ status: string; acceptedAt?: string; merchantId: string }>(getApiConfig(), 'POST', `/api/v1/tos/${encodeURIComponent(token)}`, {
        signerName, signerEmail, signerTitle, isAuthorisedSignatory: true,
      })
      setAccepted(result.status === 'accepted')
      if (window.opener && !window.opener.closed) window.opener.postMessage({ type: 'ORKI_TOS_ACCEPTED', merchantId: result.merchantId }, window.location.origin)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Terms acceptance failed.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-slate-950 p-4 sm:p-10 text-slate-100"><section className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-9 shadow-2xl">
    <div className="flex items-center gap-3 border-b border-slate-800 pb-5"><ShieldCheck className="h-6 w-6 text-emerald-400"/><div><p className="text-sm font-bold">Terms and privacy acceptance</p><p className="text-xs text-slate-400">Backend hosted acceptance · Version {terms?.version || '—'}</p></div></div>
    {error&&<p role="alert" className="mt-5 rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
    {accepted ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400"/><h1 className="mt-4 text-lg font-bold">Acceptance recorded</h1><p className="mt-2 text-sm text-slate-400">The backend has recorded the authorised signatory and audit details.</p><button onClick={()=>window.close()} className="mt-5 rounded-lg bg-slate-700 px-4 py-2 text-sm">Close</button></div> : terms ? <div className="mt-6 space-y-5">
      <div className="rounded-xl bg-slate-950 p-4 text-sm"><p><span className="text-slate-400">Issued by: </span>{terms.entityName}</p><p className="mt-2"><span className="text-slate-400">Merchant: </span>{terms.legalBusinessName}</p><p className="mt-2"><span className="text-slate-400">Status: </span>{terms.status}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{[['Terms of Service',terms.documentLinks.tos],['Privacy Policy',terms.documentLinks.privacyPolicy]].map(([label,url])=><a key={label} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-700 p-3 text-sm hover:bg-slate-800"><span className="flex items-center gap-2"><FileText size={16}/>{label}</span><ExternalLink size={14}/></a>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">{[[signerName,setSignerName,'Authorised signatory name','text'],[signerEmail,setSignerEmail,'Signatory email','email'],[signerTitle,setSignerTitle,'Signatory title','text']].map(([value,setValue,label,type])=><label key={label as string} className="text-xs font-semibold text-slate-300">{label as string}<input type={type as string} value={value as string} onChange={e=>(setValue as (v:string)=>void)(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm font-normal" required/></label>)}</div>
      <label className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} className="mt-0.5"/>I confirm I reviewed the Terms of Service and Privacy Policy and am authorised to accept for this merchant.</label>
      <button onClick={()=>void acceptTerms()} disabled={!agreed||!signerName||!signerEmail||!signerTitle||busy||terms.status==='accepted'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-onion-700 px-4 py-3 text-sm font-semibold disabled:opacity-50">{busy?'Recording acceptance…':terms.status==='accepted'?'Terms already accepted':'Accept terms and continue'}<ArrowRight size={15}/></button>
    </div> : !error ? <p className="py-10 text-center text-sm text-slate-400">Loading legal documents…</p> : <button onClick={()=>navigate('/login')} className="mt-5 rounded-lg bg-slate-700 px-4 py-2 text-sm">Return to portal</button>}
  </section></main>
}
