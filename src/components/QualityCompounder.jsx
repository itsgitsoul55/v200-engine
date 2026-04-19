import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// DB stores quality_score as 0-6 count; normalize to 0-100 for display
function normQ(raw) {
  if (raw == null) return 0;
  if (raw <= 6) return Math.round(raw / 6 * 100);
  return raw;
}

export default function QualityCompounder() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sectorFilter, setSectorFilter] = useState('All');
  const [minRoce, setMinRoce] = useState(18);
  const [sortBy, setSortBy] = useState('quality_score');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // quality_score is 0-6 in DB; >=5 means 83%+ quality
        const { data, error } = await supabase
          .from('v200_stocks')
          .select('*')
          .gte('quality_score', 5);
        if (error) throw error;
        setStocks((data || []).map(s => ({ ...s, quality_score: normQ(s.quality_score) })));
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
    .filter(s => (s.roce ?? 0) >= minRoce)
    .sort((a, b) => {
      if (sortBy === 'quality_score') return (b.quality_score ?? 0) - (a.quality_score ?? 0);
      if (sortBy === 'roce') return (b.roce ?? 0) - (a.roce ?? 0);
      if (sortBy === 'rev_cagr') return (b.rev_cagr_3yr ?? 0) - (a.rev_cagr_3yr ?? 0);
      if (sortBy === 'gap') return (a.recovery_gap_pct ?? 0) - (b.recovery_gap_pct ?? 0);
      return 0;
    });

  const criteria = [
    { key: 'qual_roce', label: 'ROCE >18%' },
    { key: 'qual_de', label: 'D/E <1' },
    { key: 'qual_rev_cagr', label: 'Rev CAGR >10%' },
    { key: 'qual_promoter', label: 'Promoter >40%' },
    { key: 'qual_pledge', label: 'Pledge <5%' },
    { key: 'qual_profit_yrs', label: 'Profitable 5/7 Yrs' }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Perfect Score (6/6)', val: stocks.filter(s => s.quality_score === 100).length, color: 'text-green-400' },
          { label: 'High Quality (5/6)', val: stocks.filter(s => s.quality_score >= 83 && s.quality_score < 100).length, color: 'text-emerald-400' },
          { label: 'Avg ROCE', val: stocks.length ? (stocks.reduce((a, b) => a + (b.roce ?? 0), 0) / stocks.length).toFixed(1) + '%' : '0%', color: 'text-blue-400' },
          { label: 'Deep Discount', val: stocks.filter(s => (s.recovery_gap_pct ?? 0) <= -15).length, color: 'text-orange-400' }
        ].map(c => (
          <div key={c.label} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className={'text-2xl font-bold ' + c.color}>{c.val}</div>
            <div className="text-xs text-slate-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded">
          {sectors.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded">
          <option value="quality_score">Sort: Quality</option>
          <option value="roce">Sort: ROCE</option>
          <option value="rev_cagr">Sort: Rev CAGR</option>
          <option value="gap">Sort: vs Sep 24</option>
        </select>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span>Min ROCE:</span>
          <input type="range" min="18" max="40" step="1" value={minRoce} onChange={e => setMinRoce(+e.target.value)} className="w-24" />
          <span>{minRoce}%</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading quality compounders...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-8">No quality compounders found. Run the n8n pipeline first.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                <th className="text-left py-2 px-2">Symbol</th>
                <th className="text-right py-2 px-2">Quality</th>
                <th className="text-right py-2 px-2">ROCE</th>
                <th className="text-right py-2 px-2">Rev CAGR</th>
                <th className="text-right py-2 px-2">Promoter</th>
                <th className="text-right py-2 px-2">vs Sep 24</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.symbol}
                  onClick={() => { const newSel = selected?.symbol === s.symbol ? null : s; setSelected(newSel); if(newSel) window.dispatchEvent(new CustomEvent('ai-insight-open', {detail: newSel})); }}
                  className={'border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors ' + (selected?.symbol === s.symbol ? 'bg-slate-800' : '')}>
                  <td className="py-2 px-2">
                    <div className="font-medium text-slate-100">{s.symbol}</div>
                    <div className="text-xs text-slate-400">{s.name}</div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="bg-green-900/40 text-green-300 px-2 py-0.5 rounded text-xs font-bold">{s.quality_score ?? 0}%</span>
                  </td>
                  <td className="py-2 px-2 text-right text-slate-200">{s.roce != null ? s.roce.toFixed(1) + '%' : '0%'}</td>
                  <td className="py-2 px-2 text-right text-slate-200">{s.rev_cagr_3yr != null ? s.rev_cagr_3yr.toFixed(1) + '%' : '0%'}</td>
                  <td className="py-2 px-2 text-right text-slate-200">{s.promoter_pct != null ? s.promoter_pct.toFixed(1) + '%' : '0%'}</td>
                  <td className={'py-2 px-2 text-right font-medium ' + ((s.recovery_gap_pct ?? 0) < 0 ? 'text-red-400' : 'text-green-400')}>
                    {s.recovery_gap_pct != null ? (s.recovery_gap_pct > 0 ? '+' : '') + s.recovery_gap_pct.toFixed(1) + '%' : '0%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="bg-slate-800 border border-green-800/50 rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-bold text-slate-100">{selected.symbol} Quality Scorecard</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {criteria.map(c => (
              <div key={c.key} className={'flex items-center gap-2 text-sm px-2 py-1.5 rounded ' + (selected[c.key] ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300')}>
                <span>{selected[c.key] ? 'v' : 'x'}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm mt-2">
            <div><span className="text-slate-400">ROCE:</span> <span className="text-slate-200">{selected.roce != null ? selected.roce.toFixed(1) + '%' : '0%'}</span></div>
            <div><span className="text-slate-400">D/E:</span> <span className="text-slate-200">{selected.de_ratio ?? 0}</span></div>
            <div><span className="text-slate-400">Rev CAGR:</span> <span className="text-slate-200">{selected.rev_cagr_3yr != null ? selected.rev_cagr_3yr.toFixed(1) + '%' : '0%'}</span></div>
            <div><span className="text-slate-400">Promoter:</span> <span className="text-slate-200">{selected.promoter_pct != null ? selected.promoter_pct.toFixed(1) + '%' : '0%'}</span></div>
            <div><span className="text-slate-400">Pledge:</span> <span className="text-slate-200">{selected.pledge_pct != null ? selected.pledge_pct.toFixed(1) + '%' : '0%'}</span></div>
            <div><span className="text-slate-400">Profit Yrs:</span> <span className="text-slate-200">{selected.profitable_yrs ?? 0} yrs</span></div>
            <div><span className="text-slate-400">Signal:</span> <span className={(selected.signal === 'BUY' ? 'text-green-400' : selected.signal === 'WAIT' || selected.signal === 'HOLD' ? 'text-amber-400' : 'text-red-400') + ' font-bold'}>{selected.signal || 'N/A'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
