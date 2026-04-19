import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// DB stores quality_score as 0-6 count; normalize to 0-100 for display
function normQ(raw) {
  if (raw == null) return 0;
  if (raw <= 6) return Math.round(raw / 6 * 100);
  return raw;
}

export default function SectorRotation() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minStocks, setMinStocks] = useState(2);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v200_stocks')
          .select('*')
          .eq('in_v200', true);
        if (error) throw error;
        setStocks((data || []).map(s => ({ ...s, quality_score: normQ(s.quality_score) })));
      } catch { setStocks([]); }
      setLoading(false);
    }
    load();
  }, []);

  const sectorMap = {};
  stocks.forEach(s => {
    const sec = s.sector || 'Unknown';
    if (!sectorMap[sec]) sectorMap[sec] = [];
    sectorMap[sec].push(s);
  });

  const sectorData = Object.entries(sectorMap)
    .filter(([, arr]) => arr.length >= minStocks)
    .map(([sector, arr]) => ({
      sector,
      count: arr.length,
      avgQuality: Math.round(arr.reduce((a, b) => a + (b.quality_score ?? 0), 0) / arr.length),
      avgGap: parseFloat((arr.reduce((a, b) => a + (b.recovery_gap_pct ?? 0), 0) / arr.length).toFixed(1)),
      avgSignal: Math.round(arr.reduce((a, b) => a + (b.signal_score ?? 0), 0) / arr.length),
      buyCount: arr.filter(s => s.signal === 'BUY').length,
      watchCount: arr.filter(s => s.signal === 'WAIT' || s.signal === 'HOLD' || s.signal === 'WATCH').length,
      avoidCount: arr.filter(s => s.signal === 'AVOID').length,
      top5: [...arr].sort((a, b) => (b.signal_score ?? 0) - (a.signal_score ?? 0)).slice(0, 5)
    }))
    .sort((a, b) => b.avgSignal - a.avgSignal);

  const qualColor = q => q >= 83 ? 'text-green-400' : q >= 67 ? 'text-yellow-400' : 'text-red-400';
  const gapColor = g => g <= -20 ? 'text-red-400' : g <= -5 ? 'text-orange-400' : g >= 5 ? 'text-green-400' : 'text-slate-300';
  const signalBg = sig => { if (sig === 'BUY') return 'bg-green-900/50 text-green-300'; if (sig === 'HOLD' || sig === 'WAIT' || sig === 'WATCH') return 'bg-yellow-900/50 text-yellow-300'; if (sig === 'AVOID') return 'bg-red-900/50 text-red-300'; return 'bg-slate-700 text-slate-300'; };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
        <span className="text-sm text-slate-300">Min stocks per sector:</span>
        <input type="range" min="1" max="10" step="1" value={minStocks} onChange={e => setMinStocks(+e.target.value)} className="w-32" />
        <span className="text-sm text-slate-200">{minStocks}</span>
        <span className="text-xs text-slate-400 ml-2">{sectorData.length} sectors shown</span>
      </div>
      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading sector data...</div>
      ) : sectorData.length === 0 ? (
        <div className="text-center text-slate-400 py-8">No sector data available. Run the n8n pipeline first.</div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2 text-xs text-slate-400 uppercase px-3 pb-1 border-b border-slate-700">
            <div className="col-span-2">Sector</div>
            <div className="text-center">Stocks</div>
            <div className="text-center">Quality</div>
            <div className="text-center">vs Sep'24</div>
            <div className="text-center">Signal</div>
            <div className="text-center">B/W/A</div>
          </div>
          {sectorData.map(sec => (
            <div key={sec.sector}>
              <div
                onClick={() => setExpanded(expanded === sec.sector ? null : sec.sector)}
                className={`grid grid-cols-7 gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  expanded === sec.sector ? 'bg-slate-700' : 'bg-slate-800 hover:bg-slate-750'
                } border border-slate-700`}
              >
                <div className="col-span-2">
                  <div className="font-medium text-slate-100 text-sm">{sec.sector}</div>
                </div>
                <div className="text-center text-slate-200">{sec.count}</div>
                <div className={`text-center font-medium ${qualColor(sec.avgQuality)}`}>{sec.avgQuality}%</div>
                <div className={`text-center font-medium ${gapColor(sec.avgGap)}`}>{sec.avgGap > 0 ? '+' : ''}{sec.avgGap}%</div>
                <div className="text-center">
                  <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded text-xs font-bold">{sec.avgSignal}</span>
                </div>
                <div className="text-center text-xs">
                  <span className="text-green-400">{sec.buyCount}</span>/
                  <span className="text-yellow-400">{sec.watchCount}</span>/
                  <span className="text-red-400">{sec.avoidCount}</span>
                </div>
              </div>
              {expanded === sec.sector && (
                <div className="ml-4 mt-1 space-y-1 pb-2">
                  {sec.top5.map(s => (
                    <div key={s.symbol} className="grid grid-cols-5 gap-2 px-3 py-2 rounded bg-slate-900 border border-slate-800 text-sm">
                      <div className="col-span-2">
                        <span className="font-medium text-slate-200">{s.symbol}</span>
                        <span className="text-xs text-slate-400 ml-2">{s.name}</span>
                      </div>
                      <div className="text-right text-slate-300">{s.quality_score ?? '—'}%</div>
                      <div className={`text-right ${(s.recovery_gap_pct ?? 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {s.recovery_gap_pct != null ? `${s.recovery_gap_pct > 0 ? '+' : ''}${s.recovery_gap_pct.toFixed(1)}%` : '—'}
                      </div>
                      <div className="text-right">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${signalBg(s.signal)}`}>{s.signal ?? '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
