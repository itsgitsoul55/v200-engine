import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function TechnicalBreakout() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sectorFilter, setSectorFilter] = useState('All');
  const [signalFilter, setSignalFilter] = useState('All');
  const [stage2Only, setStage2Only] = useState(false);
  const [delivOnly, setDelivOnly] = useState(false);
  const [sortBy, setSortBy] = useState('signal_score');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v200_stocks')
          .select('*')
          .or('stage2.eq.true,delivery_spike.eq.true,tech_path.eq.true');
        if (error) throw error;
        setStocks(data || []);
      } catch { setStocks([]); }
      setLoading(false);
    }
    load();
  }, []);

  const sectors = ['All', ...new Set(stocks.map(s => s.sector).filter(Boolean))];
  const filtered = stocks
    .filter(s => sectorFilter === 'All' || s.sector === sectorFilter)
    .filter(s => signalFilter === 'All' || s.signal === signalFilter)
    .filter(s => !stage2Only || s.stage2)
    .filter(s => !delivOnly || s.delivery_spike)
    .sort((a, b) => {
      if (sortBy === 'signal_score') return (b.signal_score ?? 0) - (a.signal_score ?? 0);
      if (sortBy === 'price') return (b.current_price ?? 0) - (a.current_price ?? 0);
      if (sortBy === 'gap') return (a.recovery_gap_pct ?? 0) - (b.recovery_gap_pct ?? 0);
      return 0;
    });

  const signalBadge = s => {
    const map = { BUY: 'bg-green-900/50 text-green-300', WATCH: 'bg-yellow-900/50 text-yellow-300', AVOID: 'bg-red-900/50 text-red-300' };
    return map[s] || 'bg-slate-700 text-slate-300';
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Stage 2 Stocks', val: stocks.filter(s => s.stage2).length, color: 'text-amber-400' },
          { label: 'Delivery Spike', val: stocks.filter(s => s.delivery_spike).length, color: 'text-blue-400' },
          { label: 'BUY Signals', val: stocks.filter(s => s.signal === 'BUY').length, color: 'text-green-400' },
          { label: 'Avg Signal Score', val: stocks.length ? Math.round(stocks.reduce((a, b) => a + (b.signal_score ?? 0), 0) / stocks.length) : 0, color: 'text-purple-400' }
        ].map(c => (
          <div key={c.label} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className={`text-2xl font-bold ${c.color}`}>{c.val}</div>
            <div className="text-xs text-slate-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded">
          {sectors.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={signalFilter} onChange={e => setSignalFilter(e.target.value)} className="bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded">
          {['All', 'BUY', 'WATCH', 'AVOID'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded">
          <option value="signal_score">Sort: Signal</option>
          <option value="price">Sort: Price</option>
          <option value="gap">Sort: vs Sep'24</option>
        </select>
        <label className="flex items-center gap-1 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={stage2Only} onChange={e => setStage2Only(e.target.checked)} /> Stage 2 Only
        </label>
        <label className="flex items-center gap-1 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={delivOnly} onChange={e => setDelivOnly(e.target.checked)} /> Delivery Spike Only
        </label>
      </div>
      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading technical breakouts...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-8">No technical breakout stocks found. Run the n8n pipeline first.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                <th className="text-left py-2 px-2">Symbol</th>
                <th className="text-left py-2 px-2">Sector</th>
                <th className="text-right py-2 px-2">Price</th>
                <th className="text-right py-2 px-2">vs Sep'24</th>
                <th className="text-center py-2 px-2">Flags</th>
                <th className="text-right py-2 px-2">Signal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.symbol} onClick={() => setSelected(selected?.symbol === s.symbol ? null : s)}
                  className={`border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors ${selected?.symbol === s.symbol ? 'bg-slate-800' : ''}`}>
                  <td className="py-2 px-2">
                    <div className="font-medium text-slate-100">{s.symbol}</div>
                    <div className="text-xs text-slate-400">{s.name}</div>
                  </td>
                  <td className="py-2 px-2 text-slate-300 text-xs">{s.sector}</td>
                  <td className="py-2 px-2 text-right text-slate-200">{s.current_price ? `₹${s.current_price.toLocaleString()}` : '—'}</td>
                  <td className={`py-2 px-2 text-right font-medium ${s.recovery_gap_pct < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {s.recovery_gap_pct != null ? `${s.recovery_gap_pct > 0 ? '+' : ''}${s.recovery_gap_pct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex gap-1 justify-center">
                      {s.stage2 && <span className="bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded text-xs">S2</span>}
                      {s.delivery_spike && <span className="bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded text-xs">DEL</span>}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${signalBadge(s.signal)}`}>{s.signal ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="bg-slate-800 border border-amber-800/50 rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-bold text-slate-100">{selected.symbol} — Technical Analysis</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-400">Signal Score:</span> <span className="text-amber-300 font-bold">{selected.signal_score ?? '—'}/100</span></div>
            <div><span className="text-slate-400">Signal:</span> <span className={selected.signal === 'BUY' ? 'text-green-400' : selected.signal === 'WATCH' ? 'text-yellow-400' : 'text-red-400'}>{selected.signal}</span></div>
            <div><span className="text-slate-400">Stage 2:</span> <span className={selected.stage2 ? 'text-green-400' : 'text-red-400'}>{selected.stage2 ? 'Yes' : 'No'}</span></div>
            <div><span className="text-slate-400">Delivery Spike:</span> <span className={selected.delivery_spike ? 'text-green-400' : 'text-red-400'}>{selected.delivery_spike ? 'Yes' : 'No'}</span></div>
            <div><span className="text-slate-400">Current Price:</span> <span className="text-slate-200">{selected.current_price ? `₹${selected.current_price.toLocaleString()}` : '—'}</span></div>
            <div><span className="text-slate-400">Sep'24 Target:</span> <span className="text-slate-200">{selected.sep24_price ? `₹${selected.sep24_price.toLocaleString()}` : '—'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
