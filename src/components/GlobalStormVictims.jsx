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

  if (qScore === 100) score += 30;
  else if (qScore >= 83) score += 20;
  else if (qScore >= 67) score += 10;

  const hiSectors = ['Information Technology', 'Consumer Discretionary', 'Chemicals', 'Electricals', 'Retail'];
  const midSectors = ['Healthcare', 'Pharma', 'Finance', 'NBFC'];
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
      
      setStocks(enriched);
    } catch {
      setStocks([]);
    }
    setLoading(false);
  }

  useEffect(() => {
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
    <div className=\"space-y-4\">
      <div className=\"flex justify-between items-center\">
        <h2 className=\"text-xl font-bold text-white\">Global Storm Victims</h2>
        <button 
          onClick={load}
          className=\"text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-700 transition-colors\"
        >
          ↻ Refresh Live Data
        </button>
      </div>

      <div className=\"grid grid-cols-4 gap-4\">
        {[
          { label: 'Total Tracked', val: stocks.length, color: 'text-blue-400' },
          { label: 'Still Victims (<-10%)', val: victims.length, color: 'text-red-400' },
          { label: 'Recovered (>0%)', val: recovered.length, color: 'text-green-400' },
          { label: 'BUY Signals', val: buySignals.length, color: 'text-emerald-400' }
        ].map(c => (
          <div key={c.label} className=\"bg-slate-800 rounded-lg p-4 text-center border border-slate-700/50\">
            <div className={`text-2xl font-bold ${c.color}`}>{c.val}</div>
            <div className=\"text-slate-400 text-xs mt-1\">{c.label}</div>
          </div>
        ))}
      </div>

      <div className=\"flex gap-3 flex-wrap bg-slate-900/50 p-3 rounded-lg border border-slate-800\">
        <div className=\"flex flex-col gap-1\">
          <label className=\"text-[10px] text-slate-500 uppercase font-bold px-1\">Sector</label>
          <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className=\"bg-slate-800 text-slate-200 text-sm px-2 py-1.5 rounded border border-slate-700 outline-none focus:border-blue-500\">
            {sectors.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className=\"flex flex-col gap-1\">
          <label className=\"text-[10px] text-slate-500 uppercase font-bold px-1\">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className=\"bg-slate-800 text-slate-200 text-sm px-2 py-1.5 rounded border border-slate-700 outline-none focus:border-blue-500\">
            {statusOptions.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className=\"flex flex-col gap-1\">
          <label className=\"text-[10px] text-slate-500 uppercase font-bold px-1\">Sort By</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className=\"bg-slate-800 text-slate-200 text-sm px-2 py-1.5 rounded border border-slate-700 outline-none focus:border-blue-500\">
            <option value=\"storm_score\">Storm Score</option>
            <option value=\"gap\">Gap vs Sep'24</option>
            <option value=\"quality\">Quality Score</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className=\"text-center text-slate-400 py-12 bg-slate-800/20 rounded-lg border border-dashed border-slate-700\">
          <div className=\"animate-pulse mb-2\">⚡ Fetching latest market data...</div>
          <div className=\"text-[10px] text-slate-500\">Checking Supabase v200_stocks table</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className=\"text-center text-slate-400 py-12 bg-slate-800/20 rounded-lg border border-dashed border-slate-700\">
          No stocks found. Ensure n8n pipeline has populated the database.
        </div>
      ) : (
        <div className=\"overflow-x-auto rounded-lg border border-slate-800\">
          <table className=\"w-full text-sm\">
            <thead>
              <tr className=\"text-slate-400 border-b border-slate-800 bg-slate-800/30\">
                <th className=\"text-left py-3 px-4\">Symbol</th>
                <th className=\"text-left py-3 px-4\">Sector</th>
                <th className=\"text-right py-3 px-4\">Storm Score</th>
                <th className=\"text-right py-3 px-4\">vs Sep'24</th>
                <th className=\"text-left py-3 px-4\">Status</th>
                <th className=\"text-right py-3 px-4\">Quality</th>
                <th className=\"text-left py-3 px-4\">Signal</th>
              </tr>
            </thead>
            <tbody className=\"bg-slate-900/20\">
              {filtered.map(s => (
                <tr key={s.symbol} onClick={() => setSelected(selected?.symbol === s.symbol ? null : s)}
                    className={`border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                      selected?.symbol === s.symbol ? 'bg-slate-800/80' : ''
                    }`}>
                  <td className=\"py-3 px-4\">
                    <div className=\"font-medium text-white\">{s.symbol}</div>
                    <div className=\"text-slate-500 text-[10px] font-medium\">{s.name}</div>
                  </td>
                  <td className=\"py-3 px-4 text-slate-400 text-xs\">{s.sector}</td>
                  <td className=\"py-3 px-4 text-right font-bold text-blue-400\">{s.storm_score}</td>
                  <td className={`py-3 px-4 text-right font-bold ${
                    (s.recovery_gap_pct ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {s.recovery_gap_pct != null ? `${s.recovery_gap_pct > 0 ? '+' : ''}${s.recovery_gap_pct.toFixed(1)}%` : '—'}
                  </td>
                  <td className=\"py-3 px-4\">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.status.color.replace('text-', 'border-').replace('400', '400/30')} ${s.status.color.replace('text-', 'bg-').replace('400', '400/10')} ${s.status.color}`}>
                      {s.status.label.toUpperCase()}
                    </span>
                  </td>
                  <td className=\"py-3 px-4 text-right text-slate-300 font-mono\">{s.quality_score ?? '—'}%</td>
                  <td className=\"py-3 px-4\">
                    {s.signal ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.signal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : s.signal === 'WATCH' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {s.signal}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className=\"bg-slate-800 rounded-lg p-5 border border-blue-500/30 shadow-xl shadow-blue-500/5\">
          <div className=\"flex justify-between items-start mb-4\">
            <div>
              <h3 className=\"font-bold text-white text-lg leading-none\">{selected.symbol}</h3>
              <p className=\"text-slate-400 text-xs mt-1\">{selected.name} • {selected.sector}</p>
            </div>
            <button onClick={() => setSelected(null)} className=\"text-slate-500 hover:text-white\">✕</button>
          </div>
          <div className=\"grid grid-cols-3 gap-6 text-sm\">
            <div className=\"space-y-1\">
              <div className=\"text-slate-500 text-[10px] uppercase font-bold tracking-wider\">Storm Score</div>
              <div className=\"text-blue-400 font-bold text-xl\">{selected.storm_score}/100</div>
            </div>
            <div className=\"space-y-1\">
              <div className=\"text-slate-500 text-[10px] uppercase font-bold tracking-wider\">vs Sep'24</div>
              <div className={`font-bold text-xl ${selected.recovery_gap_pct < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {selected.recovery_gap_pct?.toFixed(1)}%
              </div>
            </div>
            <div className=\"space-y-1\">
              <div className=\"text-slate-500 text-[10px] uppercase font-bold tracking-wider\">Status</div>
              <div className={`font-bold text-lg ${selected.status.color}`}>{selected.status.label}</div>
            </div>
          </div>
          <div className=\"mt-4 pt-4 border-t border-slate-700 flex gap-4 text-xs\">
            <div className=\"text-slate-400\">Quality: <span className=\"text-white\">{selected.quality_score}%</span></div>
            <div className=\"text-slate-400\">ROCE: <span className=\"text-white\">{selected.roce ?? '—'}%</span></div>
            <div className=\"text-slate-400\">Sep'24 Ref: <span className=\"text-white font-mono\">₹{selected.sep24_price ?? '—'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
