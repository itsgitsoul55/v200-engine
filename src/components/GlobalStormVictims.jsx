import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function computeStormScore(stock) {
  const gap = stock.recovery_gap_pct ?? 0;
  const qScore = stock.quality_score ?? 0;
  const sector = stock.sector || '';
  if (qScore < 67) return 0;
  let score = 0;
  // Gap scoring — negative = still below Sep'24 (true victim), positive = recovered
  if (gap <= -30) score += 40;
  else if (gap <= -20) score += 25;
  else if (gap <= -15) score += 15;
  else if (gap <= -5) score += 8;
  else if (gap <= 0) score += 3;
  // positive gap = recovered, still show but lower score
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

function getStatus(gap) {
  if (gap == null) return { label: 'Unknown', color: 'text-slate-400' };
  if (gap <= -20) return { label: 'Deep Victim', color: 'text-red-400' };
  if (gap <= -10) return { label: 'Victim', color: 'text-orange-400' };
  if (gap <= 0) return { label: 'Near Recovery', color: 'text-yellow-400' };
  if (gap <= 15) return { label: 'Recovered', color: 'text-green-400' };
  return { label: 'Full Recovery', color: 'text-emerald-400' };
}

export default function GlobalStormVictims() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sectorFilter, setSectorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('storm_score');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v200_stocks')
          .select('*')
          .order('quality_score', { ascending: false });
        if (error) throw error;
        const enriched = (data || []).map(s => ({
          ...s,
          storm_score: computeStormScore(s),
          status: getStatus(s.recovery_gap_pct)
        })).filter(s => (s.quality_score ?? 0) >= 67);
        enriched.sort((a, b) => (b.storm_score ?? 0) - (a.storm_score ?? 0));
        setStocks(enriched);
      } catch {
        setStocks([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const sectors = ['All', ...new Set(stocks.map(s => s.sector).filter(Boolean))];
  const statusOptions = ['All', 'Deep Victim', 'Victim', 'Near Recovery', 'Recovered', 'Full Recovery'];

  const filtered = stocks
    .filter(s => sectorFilter === 'All' || s.sector === sectorFilter)
    .filter(s => statusFilter === 'All' || s.status.label === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'storm_score') return (b.storm_score ?? 0) - (a.storm_score ?? 0);
      if (sortBy === 'gap') return (a.recovery_gap_pct ?? 0) - (b.recovery_gap_pct ?? 0);
      if (sortBy === 'quality') return (b.quality_score ?? 0) - (a.quality_score ?? 0);
      return 0;
    });

  const victims = stocks.filter(s => (s.recovery_gap_pct ?? 0) <= -10);
  const recovered = stocks.filter(s => (s.recovery_gap_pct ?? 0) > 0);
  const buySignals = stocks.filter(s => s.signal === 'BUY');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Tracked', val: stocks.length, color: 'text-blue-400' },
          { label: 'Still Victims (<-10%)', val: victims.length, color: 'text-red-400' },
          { label: 'Recovered (>0%)', val: recovered.length, color: 'text-green-400' },
          { label: 'BUY Signals', val: buySignals.length, color: 'text-emerald-400' }
        ].map(c => (
          <div key={c.label} className="bg-slate-800 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${c.color}`}>{c.val}</div>
            <div className="text-slate-400 text-xs mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded">
          {sectors.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded">
          {statusOptions.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded">
          <option value="storm_score">Sort: Storm Score</option>
          <option value="gap">Sort: Gap vs Sep'24</option>
          <option value="quality">Sort: Quality</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading storm victims...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-12">No stocks found. Run the n8n pipeline first.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left py-2 px-2">Symbol</th>
                <th className="text-left py-2 px-2">Sector</th>
                <th className="text-right py-2 px-2">Storm Score</th>
                <th className="text-right py-2 px-2">vs Sep'24</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-right py-2 px-2">Quality</th>
                <th className="text-left py-2 px-2">Signal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.symbol} onClick={() => setSelected(selected?.symbol === s.symbol ? null : s)}
                  className={`border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors ${
                    selected?.symbol === s.symbol ? 'bg-slate-800' : ''
                  }`}>
                  <td className="py-2 px-2">
                    <div className="font-medium text-white">{s.symbol}</div>
                    <div className="text-slate-400 text-xs">{s.name}</div>
                  </td>
                  <td className="py-2 px-2 text-slate-300 text-xs">{s.sector}</td>
                  <td className="py-2 px-2 text-right font-bold text-blue-400">{s.storm_score}</td>
                  <td className={`py-2 px-2 text-right font-medium ${
                    (s.recovery_gap_pct ?? 0) < 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {s.recovery_gap_pct != null ? `${s.recovery_gap_pct > 0 ? '+' : ''}${s.recovery_gap_pct.toFixed(1)}%` : '—'}
                  </td>
                  <td className={`py-2 px-2 text-xs ${s.status.color}`}>{s.status.label}</td>
                  <td className="py-2 px-2 text-right text-slate-300">{s.quality_score ?? '—'}%</td>
                  <td className={`py-2 px-2 text-xs font-medium ${
                    s.signal === 'BUY' ? 'text-green-400' : s.signal === 'WATCH' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{s.signal ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <h3 className="font-bold text-white text-lg mb-3">{selected.symbol} — Storm Analysis</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-400">Storm Score: </span><span className="text-blue-400 font-bold">{selected.storm_score}/100</span></div>
            <div><span className="text-slate-400">vs Sep'24: </span><span className={selected.recovery_gap_pct < 0 ? 'text-red-400' : 'text-green-400'}>{selected.recovery_gap_pct?.toFixed(1)}%</span></div>
            <div><span className="text-slate-400">Status: </span><span className={selected.status.color}>{selected.status.label}</span></div>
            <div><span className="text-slate-400">Signal: </span><span className="text-white">{selected.signal}</span></div>
            <div><span className="text-slate-400">Quality: </span><span className="text-white">{selected.quality_score}%</span></div>
            <div><span className="text-slate-400">ROCE: </span><span className="text-white">{selected.roce ?? '—'}%</span></div>
          </div>
          <p className="text-slate-400 text-xs mt-3">Sep'24 reference price: ₹{selected.sep24_price ?? '—'}. Current status reflects recovery from global storm selloff.</p>
        </div>
      )}
    </div>
  );
}
