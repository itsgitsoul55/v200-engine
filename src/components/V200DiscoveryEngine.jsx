import { useState, useMemo, useEffect, useCallback } from 'react'
import { fetchV200Stocks, fetchLastPipelineRun } from '../lib/supabase.js'

// ─── Mock data — only used if Supabase fetch fails ──────────────────────────
const MOCK = [
  { symbol:'TITAN',     name:'Titan Company',        sector:'Consumer',    roce:26.8, de_ratio:0.10, rev_cagr_3yr:18.5, promoter_pct:52.9, pledge_pct:0, profitable_yrs:7, stage2:true,  delivery_spike:false, quality_path:true,  tech_path:true,  in_v200:true,  v200_reason:'both',     quality_score:100, sep24_price:3380,  current_price:3050, recovery_gap_pct:-9.8  },
  { symbol:'PIDILITIND',name:'Pidilite Industries',  sector:'Chemicals',   roce:31.2, de_ratio:0.05, rev_cagr_3yr:12.4, promoter_pct:69.9, pledge_pct:0, profitable_yrs:7, stage2:false, delivery_spike:false, quality_path:true,  tech_path:false, in_v200:true,  v200_reason:'quality',  quality_score:100, sep24_price:3100,  current_price:2890, recovery_gap_pct:-6.8  },
  { symbol:'ASTRAL',    name:'Astral Ltd',            sector:'Building Mat',roce:22.1, de_ratio:0.04, rev_cagr_3yr:19.8, promoter_pct:55.3, pledge_pct:0, profitable_yrs:7, stage2:true,  delivery_spike:true,  quality_path:true,  tech_path:true,  in_v200:true,  v200_reason:'both',     quality_score:100, sep24_price:2100,  current_price:1740, recovery_gap_pct:-17.1 },
  { symbol:'POLYCAB',   name:'Polycab India',         sector:'Electricals', roce:24.6, de_ratio:0.08, rev_cagr_3yr:21.3, promoter_pct:67.5, pledge_pct:0, profitable_yrs:7, stage2:true,  delivery_spike:false, quality_path:true,  tech_path:true,  in_v200:true,  v200_reason:'both',     quality_score:100, sep24_price:6800,  current_price:5900, recovery_gap_pct:-13.2 },
  { symbol:'TRENT',     name:'Trent Ltd',             sector:'Retail',      roce:23.8, de_ratio:0.20, rev_cagr_3yr:38.4, promoter_pct:37.0, pledge_pct:0, profitable_yrs:6, stage2:true,  delivery_spike:true,  quality_path:false, tech_path:true,  in_v200:true,  v200_reason:'technical',quality_score:67,  sep24_price:7200,  current_price:5100, recovery_gap_pct:-29.2 },
  { symbol:'DIXON',     name:'Dixon Technologies',    sector:'Electronics', roce:28.4, de_ratio:0.30, rev_cagr_3yr:34.2, promoter_pct:34.1, pledge_pct:0, profitable_yrs:7, stage2:true,  delivery_spike:true,  quality_path:false, tech_path:true,  in_v200:true,  v200_reason:'technical',quality_score:67,  sep24_price:14200, current_price:11800,recovery_gap_pct:-16.9 },
  { symbol:'CAMS',      name:'CAMS',                  sector:'Finance',     roce:35.8, de_ratio:0.00, rev_cagr_3yr:17.2, promoter_pct:43.7, pledge_pct:0, profitable_yrs:6, stage2:true,  delivery_spike:false, quality_path:true,  tech_path:true,  in_v200:true,  v200_reason:'both',     quality_score:83,  sep24_price:3900,  current_price:3300, recovery_gap_pct:-15.4 },
  { symbol:'HDFCAMC',   name:'HDFC AMC',              sector:'Finance',     roce:32.1, de_ratio:0.00, rev_cagr_3yr:14.8, promoter_pct:52.5, pledge_pct:0, profitable_yrs:7, stage2:false, delivery_spike:false, quality_path:true,  tech_path:false, in_v200:true,  v200_reason:'quality',  quality_score:100, sep24_price:4350,  current_price:3980, recovery_gap_pct:-8.5  },
  { symbol:'DMART',     name:'Avenue Supermarts',     sector:'Retail',      roce:19.4, de_ratio:0.03, rev_cagr_3yr:22.6, promoter_pct:74.7, pledge_pct:0, profitable_yrs:7, stage2:false, delivery_spike:false, quality_path:true,  tech_path:false, in_v200:true,  v200_reason:'quality',  quality_score:100, sep24_price:4700,  current_price:3780, recovery_gap_pct:-19.6 },
  { symbol:'KPRMILL',   name:'K.P.R. Mill',           sector:'Textiles',    roce:21.3, de_ratio:0.20, rev_cagr_3yr:16.7, promoter_pct:72.1, pledge_pct:0, profitable_yrs:6, stage2:true,  delivery_spike:true,  quality_path:true,  tech_path:true,  in_v200:true,  v200_reason:'both',     quality_score:83,  sep24_price:910,   current_price:720,  recovery_gap_pct:-20.9 },
  { symbol:'LALPATHLAB',name:'Dr Lal PathLabs',       sector:'Healthcare',  roce:20.8, de_ratio:0.00, rev_cagr_3yr:11.2, promoter_pct:54.8, pledge_pct:0, profitable_yrs:7, stage2:false, delivery_spike:false, quality_path:true,  tech_path:false, in_v200:true,  v200_reason:'quality',  quality_score:100, sep24_price:2700,  current_price:2450, recovery_gap_pct:-9.3  },
  { symbol:'SYNGENE',   name:'Syngene International', sector:'Pharma',      roce:18.7, de_ratio:0.30, rev_cagr_3yr:13.4, promoter_pct:70.4, pledge_pct:0, profitable_yrs:7, stage2:true,  delivery_spike:false, quality_path:true,  tech_path:true,  in_v200:true,  v200_reason:'both',     quality_score:100, sep24_price:860,   current_price:720,  recovery_gap_pct:-16.3 },
  { symbol:'RELAXO',    name:'Relaxo Footwears',      sector:'Consumer',    roce:14.2, de_ratio:0.10, rev_cagr_3yr:8.3,  promoter_pct:70.2, pledge_pct:0, profitable_yrs:5, stage2:false, delivery_spike:false, quality_path:false, tech_path:false, in_v200:false, v200_reason:null,       quality_score:33,  sep24_price:920,   current_price:760,  recovery_gap_pct:-17.4 },
  { symbol:'AAVAS',     name:'Aavas Financiers',       sector:'NBFC',        roce:13.2, de_ratio:0.80, rev_cagr_3yr:22.1, promoter_pct:50.1, pledge_pct:0, profitable_yrs:7, stage2:false, delivery_spike:false, quality_path:false, tech_path:false, in_v200:false, v200_reason:null,       quality_score:50,  sep24_price:1850,  current_price:1560, recovery_gap_pct:-15.7 },
]

// ─── Criteria definitions ────────────────────────────────────────────────────
const CRITERIA = [
  { key:'roce',          label:'ROCE > 18%',        check:s=>(s.roce||0)>18,           fmt:s=>`${(s.roce||0).toFixed(1)}%` },
  { key:'de_ratio',      label:'D/E < 1',            check:s=>(s.de_ratio??99)<1,       fmt:s=>s.de_ratio!=null?s.de_ratio.toFixed(2):'—' },
  { key:'rev_cagr_3yr',  label:'Rev CAGR > 10%',    check:s=>(s.rev_cagr_3yr||0)>10,   fmt:s=>`${(s.rev_cagr_3yr||0).toFixed(1)}%` },
  { key:'promoter_pct',  label:'Promoter > 40%',    check:s=>(s.promoter_pct||0)>40,   fmt:s=>`${(s.promoter_pct||0).toFixed(1)}%` },
  { key:'pledge_pct',    label:'Pledge < 5%',        check:s=>(s.pledge_pct??99)<5,     fmt:s=>`${(s.pledge_pct||0).toFixed(1)}%` },
  { key:'profitable_yrs',label:'Profitable 5/7 yrs', check:s=>(s.profitable_yrs||0)>=5, fmt:s=>`${s.profitable_yrs||0}/7` },
]

// ─── Style helpers ────────────────────────────────────────────────────────────
const s = {
  card: { background:'var(--bg-card)', borderRadius:10, border:'1px solid var(--border)', padding:'14px 16px' },
  pill: (color) => ({
    fontSize:11, padding:'2px 7px', borderRadius:4, fontWeight:500,
    background: color==='green'?'var(--green-bg)':color==='amber'?'var(--amber-bg)':color==='blue'?'var(--blue-bg)':'rgba(255,255,255,0.06)',
    color:      color==='green'?'var(--green)':color==='amber'?'var(--amber)':color==='blue'?'var(--blue)':'var(--text-muted)',
  }),
  scoreChip: (score) => ({
    fontSize:12, fontWeight:600, padding:'2px 9px', borderRadius:4,
    background: score>=100?'var(--green-bg)':score>=67?'var(--amber-bg)':'var(--red-bg)',
    color:      score>=100?'var(--green)':score>=67?'var(--amber)':'var(--red)',
  }),
  gapColor: (g) => g==null?'var(--text-faint)':g>=0?'var(--green)':g<-15?'var(--red)':'var(--amber)',
  cell: { padding:'9px 10px', fontSize:13 },
  passColor: (p) => p?'var(--green)':'var(--red)',
  passBg:    (p) => p?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)',
  passBd:    (p) => p?'rgba(34,197,94,0.25)':'rgba(239,68,68,0.25)',
}

function Spinner() {
  return (
    <div style={{padding:60,textAlign:'center'}}>
      <div style={{width:28,height:28,border:'2px solid var(--border)',borderTop:'2px solid var(--accent)',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px'}}/>
      <div style={{fontSize:13,color:'var(--text-muted)'}}>Loading from Supabase…</div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{...s.card}}>
      <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:6}}>{label}</div>
      <div style={{fontSize:24,fontWeight:600,color:accent||'var(--text-primary)',lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:11,color:'var(--text-faint)',marginTop:4}}>{sub}</div>}
    </div>
  )
}

export default function V200DiscoveryEngine() {
  const [stocks,      setStocks]      = useState([])
  const [lastRun,     setLastRun]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [preview,     setPreview]     = useState(false)
  const [refreshing,  setRefreshing]  = useState(false)
  const [tab,         setTab]         = useState('all')
  const [sector,      setSector]      = useState('All')
  const [sortBy,      setSortBy]      = useState('quality_score')
  const [sortDir,     setSortDir]     = useState('desc')
  const [selected,    setSelected]    = useState(null)
  const [onlyV200,    setOnlyV200]    = useState(false)
  const [onlyS2,      setOnlyS2]      = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([fetchV200Stocks(), fetchLastPipelineRun()])
      setStocks(s.length > 0 ? s : [])
      setLastRun(r)
      setPreview(false)
    } catch {
      setStocks(MOCK)
      setPreview(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sectors = useMemo(() =>
    ['All', ...Array.from(new Set(stocks.map(s=>s.sector).filter(Boolean))).sort()]
  , [stocks])

  const filtered = useMemo(() => {
    let list = stocks.filter(s => {
      if (tab==='quality'   && !s.quality_path) return false
      if (tab==='technical' && !s.tech_path)    return false
      if (sector!=='All'    && s.sector!==sector) return false
      if (onlyV200 && !s.in_v200)  return false
      if (onlyS2   && !s.stage2)   return false
      return true
    })
    return [...list].sort((a,b) => {
      const d = sortDir==='desc' ? -1 : 1
      return d * ((a[sortBy]??-999) - (b[sortBy]??-999))
    })
  }, [stocks, tab, sector, sortBy, sortDir, onlyV200, onlyS2])

  const stats = useMemo(() => ({
    total:    stocks.length,
    v200:     stocks.filter(s=>s.in_v200).length,
    quality:  stocks.filter(s=>s.quality_path).length,
    discount: stocks.filter(s=>(s.recovery_gap_pct??0)<-15).length,
  }), [stocks])

  function toggleSort(col) {
    if (sortBy===col) setSortDir(d=>d==='desc'?'asc':'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const Arr = ({col}) => (
    <span style={{opacity:sortBy===col?0.9:0.2,fontSize:9,marginLeft:3}}>
      {sortBy===col&&sortDir==='asc'?'▲':'▼'}
    </span>
  )

  if (loading) return <Spinner />

  return (
    <div style={{color:'var(--text-primary)'}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <h1 style={{fontSize:20,fontWeight:600,margin:0}}>V200 Discovery Engine</h1>
            <span style={s.pill(preview?'amber':'green')}>
              {preview ? '⚡ Preview · mock data' : '● Live · Supabase'}
            </span>
          </div>
          <p style={{fontSize:12,color:'var(--text-muted)',marginTop:6}}>
            {preview
              ? 'Deploy to Netlify for live Supabase data — mock data showing'
              : lastRun
                ? `Pipeline last ran ${new Date(lastRun.run_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})}`
                : 'Tables live · trigger n8n first run to populate'}
          </p>
        </div>
        <button
          onClick={()=>{setRefreshing(true);load()}}
          disabled={refreshing}
          style={{
            padding:'8px 16px', fontSize:13, borderRadius:8,
            background:'var(--bg-card)', border:'1px solid var(--border)',
            color:'var(--text-primary)', opacity:refreshing?0.5:1,
            transition:'opacity 0.15s',
          }}>
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        <StatCard label="In Database"    value={stats.total}    sub="from n8n pipeline" />
        <StatCard label="V200 Qualified" value={stats.v200}     sub="quality + technical" accent="var(--accent)" />
        <StatCard label="Quality Path"   value={stats.quality}  sub="all 6 criteria"     accent="var(--green)" />
        <StatCard label="Deep Discount"  value={stats.discount} sub="> 15% below Sep'24"  accent="var(--amber)" />
      </div>

      {/* Empty — pipeline not run */}
      {!preview && stocks.length===0 && (
        <div style={{...s.card, textAlign:'center', padding:'48px 24px', marginBottom:24}}>
          <div style={{fontSize:28,marginBottom:12}}>🚀</div>
          <div style={{fontSize:16,fontWeight:500,marginBottom:8}}>Pipeline hasn't run yet</div>
          <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:4}}>Tables are live in Supabase.</div>
          <div style={{fontSize:13,color:'var(--text-muted)'}}>
            Go to <strong style={{color:'var(--accent)'}}>n8n → V200 Discovery Engine → Test workflow</strong>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        {[['all','All Stocks'],['quality','Quality Path'],['technical','Technical Path']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'7px 14px', fontSize:13, borderRadius:6, border:'none',
            background: tab===t?'var(--accent-bg)':'var(--bg-card)',
            color: tab===t?'var(--accent)':'var(--text-muted)',
            fontWeight: tab===t?500:400,
            outline: tab===t?'1px solid rgba(0,212,170,0.3)':'1px solid var(--border)',
          }}>{l}</button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <select
            value={sector}
            onChange={e=>setSector(e.target.value)}
            style={{fontSize:12,padding:'6px 10px',background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-primary)',borderRadius:6}}>
            {sectors.map(s=><option key={s} style={{background:'var(--bg-secondary)'}}>{s}</option>)}
          </select>
          {[['onlyV200','V200 only',onlyV200,setOnlyV200],['onlyS2','Stage 2',onlyS2,setOnlyS2]].map(([key,label,val,setter])=>(
            <label key={key} style={{fontSize:12,color:'var(--text-muted)',display:'flex',gap:5,alignItems:'center',cursor:'pointer'}}>
              <input type="checkbox" checked={val} onChange={e=>setter(e.target.checked)} style={{accentColor:'var(--accent)'}}/>
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{...s.card, padding:0, overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)',background:'var(--bg-secondary)'}}>
                {[
                  ['Symbol',null],['Name',null],['Sector',null],
                  ['Score','quality_score'],['ROCE','roce'],['D/E','de_ratio'],
                  ['Rev CAGR','rev_cagr_3yr'],['Promoter','promoter_pct'],
                  ['Pledge','pledge_pct'],['Prof Yrs','profitable_yrs'],
                  ["vs Sep'24",'recovery_gap_pct'],['Tags',null],
                ].map(([label,col])=>(
                  <th key={label} onClick={col?()=>toggleSort(col):undefined} style={{
                    ...s.cell, fontWeight:500, fontSize:11,
                    color:'var(--text-muted)', cursor:col?'pointer':'default',
                    userSelect:'none', whiteSpace:'nowrap',
                    borderBottom:'1px solid var(--border)',
                  }}>
                    {label}{col&&<Arr col={col}/>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0
                ? <tr><td colSpan={12} style={{padding:40,textAlign:'center',fontSize:13,color:'var(--text-faint)'}}>No stocks match current filters</td></tr>
                : filtered.map((stock,i)=>{
                  const gap = stock.recovery_gap_pct
                  const isSel = selected?.symbol===stock.symbol
                  return (
                    <tr key={stock.symbol}
                      onClick={()=>setSelected(sel=>sel?.symbol===stock.symbol?null:stock)}
                      style={{
                        borderBottom:'1px solid var(--border)', cursor:'pointer',
                        background: isSel?'rgba(0,212,170,0.06)':i%2===0?'transparent':'rgba(255,255,255,0.015)',
                        transition:'background 0.1s',
                      }}>
                      <td style={{...s.cell,fontWeight:600,color:'var(--text-primary)',whiteSpace:'nowrap'}}>{stock.symbol}</td>
                      <td style={{...s.cell,color:'var(--text-muted)',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{stock.name||'—'}</td>
                      <td style={s.cell}>
                        {stock.sector
                          ? <span style={{fontSize:11,padding:'2px 6px',borderRadius:4,background:'rgba(255,255,255,0.05)',color:'var(--text-muted)'}}>{stock.sector}</span>
                          : '—'}
                      </td>
                      <td style={s.cell}>
                        {stock.quality_score!=null
                          ? <span style={s.scoreChip(stock.quality_score)}>{stock.quality_score}%</span>
                          : '—'}
                      </td>
                      <td style={{...s.cell,color:(stock.roce||0)>18?'var(--green)':'var(--red)'}}>{stock.roce!=null?`${stock.roce.toFixed(1)}%`:'—'}</td>
                      <td style={{...s.cell,color:(stock.de_ratio??99)<1?'var(--green)':'var(--red)'}}>{stock.de_ratio!=null?stock.de_ratio.toFixed(2):'—'}</td>
                      <td style={{...s.cell,color:(stock.rev_cagr_3yr||0)>10?'var(--green)':'var(--red)'}}>{stock.rev_cagr_3yr!=null?`${stock.rev_cagr_3yr.toFixed(1)}%`:'—'}</td>
                      <td style={{...s.cell,color:(stock.promoter_pct||0)>40?'var(--green)':'var(--red)'}}>{stock.promoter_pct!=null?`${stock.promoter_pct.toFixed(1)}%`:'—'}</td>
                      <td style={{...s.cell,color:(stock.pledge_pct??99)<5?'var(--green)':'var(--red)'}}>{stock.pledge_pct!=null?`${stock.pledge_pct.toFixed(1)}%`:'—'}</td>
                      <td style={{...s.cell,color:(stock.profitable_yrs||0)>=5?'var(--green)':'var(--red)'}}>{stock.profitable_yrs!=null?`${stock.profitable_yrs}/7`:'—'}</td>
                      <td style={{...s.cell,fontWeight:600,color:s.gapColor(gap),whiteSpace:'nowrap'}}>
                        {gap!=null?`${gap>=0?'+':''}${gap.toFixed(1)}%`:'—'}
                      </td>
                      <td style={s.cell}>
                        <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                          {stock.in_v200       && <span style={s.pill('green')}>V200</span>}
                          {stock.stage2        && <span style={s.pill('amber')}>S2</span>}
                          {stock.delivery_spike && <span style={s.pill('blue')}>DEL</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:8,fontSize:11,color:'var(--text-faint)'}}>
        {filtered.length} of {stocks.length} stocks · click row for breakdown · n8n populates daily at 6:30 AM IST
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{...s.card, marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:16,fontWeight:600}}>{selected.symbol}</span>
              <span style={{fontSize:13,color:'var(--text-muted)'}}>{selected.name}</span>
              {selected.v200_reason && <span style={s.pill('green')}>V200 · {selected.v200_reason}</span>}
            </div>
            <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:18,lineHeight:1,cursor:'pointer'}}>×</button>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
            {CRITERIA.map(c=>{
              const pass = c.check(selected)
              return (
                <div key={c.key} style={{
                  padding:'10px 12px', borderRadius:8,
                  background:s.passBg(pass), border:`1px solid ${s.passBd(pass)}`,
                  display:'flex', gap:10, alignItems:'center',
                }}>
                  <span style={{fontSize:16,color:s.passColor(pass)}}>{pass?'✓':'✗'}</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:500,color:s.passColor(pass)}}>{c.label}</div>
                    <div style={{fontSize:13,color:'var(--text-primary)',marginTop:1}}>{c.fmt(selected)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{display:'flex',gap:24,flexWrap:'wrap',borderTop:'1px solid var(--border)',paddingTop:14}}>
            {[
              ['Sep\'24 target', selected.sep24_price?`₹${selected.sep24_price.toLocaleString('en-IN')}`:'—', null],
              ['Current price',  selected.current_price?`₹${selected.current_price.toLocaleString('en-IN')}`:'—', null],
              ['Recovery gap',
                selected.recovery_gap_pct!=null?`${selected.recovery_gap_pct>=0?'+':''}${selected.recovery_gap_pct.toFixed(1)}%`:'—',
                s.gapColor(selected.recovery_gap_pct)],
              ['Quality score',  `${selected.quality_score??0}%`, null],
              ['Profitable yrs', `${selected.profitable_yrs??0}/7`, null],
            ].map(([label,val,color])=>(
              <div key={label}>
                <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:3}}>{label}</div>
                <div style={{fontSize:15,fontWeight:600,color:color||'var(--text-primary)'}}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline footer */}
      {!preview && lastRun && (
        <div style={{
          marginTop:16, padding:'10px 14px',
          background:'var(--bg-secondary)', borderRadius:8,
          border:'1px solid var(--border)',
          display:'flex', gap:20, flexWrap:'wrap',
          fontSize:12, color:'var(--text-muted)',
        }}>
          <span>Last run: <strong style={{color:'var(--text-primary)'}}>{new Date(lastRun.run_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})}</strong></span>
          {lastRun.stocks_scanned && <span>Scanned: <strong style={{color:'var(--text-primary)'}}>{lastRun.stocks_scanned}</strong></span>}
          {lastRun.v200_count     && <span>V200: <strong style={{color:'var(--accent)'}}>{lastRun.v200_count}</strong></span>}
          <span style={{color:lastRun.status==='success'?'var(--green)':'var(--red)'}}>
            {lastRun.status==='success'?'✓ success':'✗ '+lastRun.status}
          </span>
        </div>
      )}
    </div>
  )
}
