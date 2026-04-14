import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const STORM_SECTORS = ['Information Technology', 'Consumer Discretionary', 'Chemicals', 'Electricals', 'Retail', 'Healthcare', 'Pharma'];

function computeStormScore(stock) {
  const gap = stock.recovery_gap_pct ?? 0;
  const qScore = stock.quality_score ?? 0;
  const sector = stock.sector || '';
  if (qScore < 67) return null;
  let score = 0;
  if (gap <= -30) score += 40;
  else if (gap <= -20) score += 25;
  else if (gap <= -15) score += 15;
  else return null;
  if (qScore === 100) score += 30;
  else if (qScore >= 83) score += 20;
  else if (qScore >= 67) score += 10;
  const hiSectors = ['Information Technology','Consumer Discretionary','Chemicals','Electricals','Retail'];
  const midSectors = ['Healthcare','Pharma','Finance','NBFC'];
  if (hiSectors.some(s => sector.includes(s))) score += 20;
  else if (midSectors.some(s => sector.includes(s))) score += 10;
  if (stock.stage2) score += 10;
  return score;
}

export default function GlobalStormVictims() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sectorFilter, setSectorFilter] = useState('All');
  const [minQuality, setMinQuality] = useState(0);
  const [sortBy, setSortBy] = useState('storm_score');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v200_stocks')
          .select('*')
          .lte('recovery_gap_pct', -15);
        if (error) throw error;
        const enriched = (data || []).map(s => ({
          ...s,
          storm_score: computeStormScore(s)
        })).filter(s => s.storm_score !== null);
        setStocks(enriched);
      } catch {
        setStocks([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const sectors = ['All', ...new Set(stocks.map(s => s.sector).filter(Boolean))];
  const filtered = stocks
    .filter(s => sectorFilter === 'All' || s.sector === sectorFilter)
    .filter(s => (s.quality_score ?? 0) >= minQuality)
    .sort((a, b) => {
      if (sortBy === 'storm_score') return (b.storm_score ?? 0) - (a.storm_score ?? 0);
      if (sortBy === 'gap') return (a.recovery_gap_pct ?? 0) - (b.recovery_gap_pct ?? 0);
      if (sortBy === 'quality') return (b.quality_score ?? 0) - (a.quality_score ?? 0);
      return 0;
    });

  const signalColor = s => s === 'BUY' ? 'text-green-400' : s === 'WATCH' ? 'text-yellow-400' : 'text-red-400';
  const gapColor = g => g <= -25 ? 'text-red-400' : g <= -15 ? 'text-orange-400' : 'text-yellow-400';

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{label:'Storm Victims',val:filtered.length,color:'text-red-400'},
          {label:'Deep Discount (>25%)',val:stocks.filter(s=>s.recovery_gap_pct<=-25).length,color:'text-orange-400'},
          {label:'BUY Signals',val:stocks.filter(s=>s.signal==='BUY').length,color:'text-green-400'},
          {label:'Avg Storm Score',val:stocks.length?Math.round(stocks.reduce((a,b)=>a+(b.storm_score??0),0)/stocks.length):0,color:'text-blue-400'}
        ].map(c => (
          <div key={c.label} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className={`text-2xl font-bold ${c.color}`}>{c.val}</div>
            <div className="text-xs text-slate-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
        <select value={sectorFilter} onChange={e=>setSectorFilter(e.target.value)} className="bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded">
          {sectors.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded">
          <option value="storm_score">Sort: Storm Score</option>
          <option value="gap">Sort: Drawdown</option>
          <option value="quality">Sort: Quality</option>
        </select>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span>Min Quality:</span>
          <input type="range" min="0" max="100" step="17" value={minQuality} onChange={e=>setMinQuality(+e.target.value)} className="w-24" />
          <span>{minQuality}%</span>
        </div>
      </div>
      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading storm victims...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-8">No storm victims found. Run the n8n pipeline first.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                <th className="text-left py-2 px-2">Symbol</th>
                <th className="text-left py-2 px-2">Sector</th>
                <th className="text-right py-2 px-2">Storm Score</th>
                <th className="text-right py-2 px-2">vs Sep'24</th>
                <th className="text-right py-2 px-2">Quality</th>
                <th className="text-right py-2 px-2">Signal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.symbol} onClick={() => setSelected(selected?.symbol===s.symbol?null:s)}
                  className={`border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors ${ selected?.symbol===s.symbol?'bg-slate-800':'' }`}>
                  <td className="py-2 px-2">
                    <div className="font-medium text-slate-100">{s.symbol}</div>
                    <div className="text-xs text-slate-400">{s.name}</div>
                  </td>
                  <td className="py-2 px-2 text-slate-300 text-xs">{s.sector}</td>
                  <td className="py-2 px-2 text-right">
                    <span className="bg-red-900/40 text-red-300 px-2 py-0.5 rounded text-xs font-bold">{s.storm_score}</span>
                  </td>
                  <td className={`py-2 px-2 text-right font-medium ${gapColor(s.recovery_gap_pct)}`}>
                    {s.recovery_gap_pct != null ? `${s.recovery_gap_pct > 0 ? '+' : ''}${s.recovery_gap_pct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-300">{s.quality_score ?? '—'}%</td>
                  <td className={`py-2 px-2 text-right font-bold ${signalColor(s.signal)}`}>{s.signal ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="bg-slate-800 border border-red-800/50 rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-bold text-slate-100">{selected.symbol} — Storm Analysis</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-400">Storm Score:</span> <span className="text-red-300 font-bold">{selected.storm_score}/100</span></div>
            <div><span className="text-slate-400">vs Sep'24:</span> <span className={gapColor(selected.recovery_gap_pct)}>{selected.recovery_gap_pct?.toFixed(1)}%</span></div>
            <div><span className="text-slate-400">Signal:</span> <span className={signalColor(selected.signal)}>{selected.signal}</span></div>
            <div><span className="text-slate-400">Quality Score:</span> <span className="text-slate-200">{selected.quality_score}%</span></div>
            <div><span className="text-slate-400">ROCE:</span> <span className="text-slate-200">{selected.roce ?? '—'}%</span></div>
            <div><span className="text-slate-400">D/E Ratio:</span> <span className="text-slate-200">{selected.de_ratio ?? '—'}</span></div>
          </div>
          <p className="text-xs text-slate-400">
            This stock is classified as a Global Storm Victim — a quality company sold off due to global risk-off sentiment, not fundamental deterioration.
            Recovery target: Sep'24 price of ₹{selected.sep24_price ?? '—'}.
          </p>
        </div>
      )}
    </div>
  );
}
