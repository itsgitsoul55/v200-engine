import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function computeStormScore(stock) {
  const gap = stock.recovery_gap_pct ?? 0;
  const qScore = stock.quality_score ?? 0;
  const sector = stock.sector || '';
  if (qScore < 4 && qScore > 0) return 0;
  if (qScore === 0) return 0;
  let score = 0;
  if (gap <= -30) score += 40;
  else if (gap <= -20) score += 25;
  else if (gap <= -15) score += 15;
  else if (gap <= -5) score += 8;
  else if (gap <= 0) score += 3;
  if (qScore >= 6 || qScore >= 100) score += 30;
  else if (qScore >= 5 || qScore >= 83) score += 20;
  else if (qScore >= 4 || qScore >= 67) score += 10;
  const hiSectors = ['Information Technology', 'Consumer Discretionary', 'Chemicals', 'Electricals', 'Retail'];
  if (hiSectors.some(s => sector.includes(s))) score += 20;
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
  const [lastUpdate, setLastUpdate] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('v200_stocks').select('*').order('quality_score', { ascending: false });
      if (error) throw error;
      const enriched = (data || []).map(s => ({
        ...s,
        storm_score: computeStormScore(s),
        status: getStatus(s.recovery_gap_pct)
      })).filter(s => (s.quality_score ?? 0) >= 4 || (s.quality_score ?? 0) >= 67);
      setStocks(enriched);
      setLastUpdate(new Date());
    } catch (e) {
      setStocks([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl font-bold text-white">Global Storm Victims</h2>
          {lastUpdate && <p className="text-[10px] text-slate-500 font-medium">Last Sync: {lastUpdate.toLocaleTimeString()}</p>}
        </div>
        <button onClick={load} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold">
          ↻ Sync Most Updated Data
        </button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{ label: 'Total Tracked', val: stocks.length, color: 'text-blue-400' }, { label: 'Victims', val: stocks.filter(s => (s.recovery_gap_pct ?? 0) <= -10).length, color: 'text-red-400' }, { label: 'Recovered', val: stocks.filter(s => (s.recovery_gap_pct ?? 0) > 0).length, color: 'text-green-400' }, { label: 'BUY Signals', val: stocks.filter(s => s.signal === 'BUY').length, color: 'text-emerald-400' }].map(c => (
          <div key={c.label} className="bg-slate-800/40 rounded-xl p-4 text-center border border-slate-700/50">
            <div className={`text-2xl font-black ${c.color}`}>{c.val}</div>
            <div className="text-slate-400 text-[10px] uppercase font-bold mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="bg-slate-800 text-slate-200 text-xs px-3 py-2.5 rounded-lg border border-slate-700">{sectors.map(s => <option key={s}>{s}</option>)}</select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-800 text-slate-200 text-xs px-3 py-2.5 rounded-lg border border-slate-700">{statusOptions.map(s => <option key={s}>{s}</option>)}</select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-slate-800 text-slate-200 text-xs px-3 py-2.5 rounded-lg border border-slate-700"><option value="storm_score">Storm Score</option><option value="gap">Gap vs Sep'24</option><option value="quality">Quality Score</option></select>
      </div>
      {loading ? <div className="text-center py-20 text-slate-400 font-bold">LOADING LATEST DATA...</div> : filtered.length === 0 ? <div className="text-center py-20 text-slate-400">No stocks matching quality/filters found.</div> : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/20">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50 text-slate-400 font-black text-[10px]">
              <tr><th className="text-left py-4 px-6 uppercase">Symbol</th><th className="text-left py-4 px-6 uppercase">Sector</th><th className="text-right py-4 px-6 uppercase">Score</th><th className="text-right py-4 px-6 uppercase">vs Sep'24</th><th className="text-left py-4 px-6 uppercase">Status</th><th className="text-right py-4 px-6 uppercase">Quality</th><th className="text-left py-4 px-6 uppercase">Signal</th></tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.symbol} onClick={() => setSelected(selected?.symbol === s.symbol ? null : s)} className={`border-b border-slate-800/50 cursor-pointer hover:bg-indigo-500/10 transition-colors ${selected?.symbol === s.symbol ? 'bg-indigo-500/20' : ''}`}>
                  <td className="py-4 px-6"><div className="font-bold text-white">{s.symbol}</div><div className="text-slate-500 text-[10px] font-medium">{s.name}</div></td>
                  <td className="py-4 px-6 text-slate-400 text-xs">{s.sector}</td>
                  <td className="py-4 px-6 text-right font-black text-blue-400">{s.storm_score}</td>
                  <td className={`py-4 px-6 text-right font-black ${ (s.recovery_gap_pct ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400' }`}>{s.recovery_gap_pct != null ? `${s.recovery_gap_pct > 0 ? '+' : ''}${s.recovery_gap_pct.toFixed(1)}%` : '—'}</td>
                  <td className="py-4 px-6"><span className={`px-2 py-1 rounded-md text-[9px] font-black border ${s.status.color}`}>{s.status.label.toUpperCase()}</span></td>
                  <td className="py-4 px-6 text-right text-slate-300 font-bold">{s.quality_score}</td>
                  <td className="py-4 px-6">{s.signal ? <span className="px-2 py-1 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400">{s.signal}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="bg-slate-800/90 rounded-2xl p-6 border border-indigo-500/40 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-start mb-6">
            <div><h3 className="font-black text-white text-2xl">{selected.symbol}</h3><p className="text-slate-400 text-xs mt-1">{selected.name} • {selected.sector}</p></div>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-lg">✕</button>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50"><div className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1">Storm Score</div><div className="text-blue-400 font-black text-2xl">{selected.storm_score}</div></div>
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50"><div className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1">vs Sep'24</div><div className={`font-black text-2xl ${selected.recovery_gap_pct < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{selected.recovery_gap_pct?.toFixed(1)}%</div></div>
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50"><div className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1">Status</div><div className={`font-black text-lg ${selected.status.color}`}>{selected.status.label}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
