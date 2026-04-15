import { useState, useEffect, useRef } from 'react';

const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY || '';

export default function AIInsightPanel({ stock, onClose }) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState(null);
  const lastSymbol = useRef(null);

  useEffect(() => {
    if (stock && stock.symbol !== lastSymbol.current) {
      lastSymbol.current = stock.symbol;
      fetchInsight(stock);
    }
  }, [stock]);

  async function fetchInsight(s) {
    setLoading(true);
    setError(null);
    setInsight(null);
    try {
      const prompt = `You are an expert Indian equity analyst. Analyze this NSE stock and give a brief, actionable insight.\n\nStock: ${s.name} (${s.symbol})\nSector: ${s.sector || 'N/A'}\nROCE: ${s.roce ?? 'N/A'}%\nD/E Ratio: ${s.de_ratio ?? 'N/A'}\nRev CAGR 3yr: ${s.rev_cagr_3yr ?? 'N/A'}%\nPromoter: ${s.promoter_pct ?? 'N/A'}%\nPledge: ${s.pledge_pct ?? 'N/A'}%\nQuality Score: ${s.quality_score ?? 'N/A'}/100\nSignal: ${s.signal ?? 'N/A'} (${s.signal_score ?? 'N/A'}/100)\nvs Sep'24: ${s.recovery_gap_pct ?? 'N/A'}%\nStage 2: ${s.stage2 ? 'Yes' : 'No'}\n\nReturn a JSON object with exactly these fields:\n{\n  "thesis": "2-sentence investment thesis",\n  "risk": "1-sentence key risk",\n  "entry": "1-sentence entry suggestion based on Sep24 gap",\n  "verdict": "BUY | WATCH | AVOID",\n  "confidence": number from 1-5\n}`;

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 300, temperature: 0.3, messages: [{ role: 'user', content: prompt }] })
      });
      const data = await resp.json();
      const raw = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setInsight(parsed);
    } catch(e) {
      setError('Could not load AI insight. Check VITE_OPENAI_KEY in Netlify env vars.');
    }
    setLoading(false);
  }

  const VERDICT_COLORS = { BUY: 'text-emerald-400 bg-emerald-900/30 border-emerald-700', WATCH: 'text-amber-400 bg-amber-900/30 border-amber-700', AVOID: 'text-red-400 bg-red-900/30 border-red-700' };

  if (!stock) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-40 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <div className="text-white font-bold text-sm">{stock.symbol}</div>
          <div className="text-gray-400 text-xs">{stock.name}</div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Quality', value: stock.quality_score != null ? `${stock.quality_score}/100` : '—' },
            { label: 'Signal', value: stock.signal || '—', color: stock.signal === 'BUY' ? 'text-emerald-400' : stock.signal === 'WATCH' ? 'text-amber-400' : 'text-red-400' },
            { label: 'vs Sep24', value: stock.recovery_gap_pct != null ? `${stock.recovery_gap_pct > 0 ? '+' : ''}${stock.recovery_gap_pct}%` : '—', color: stock.recovery_gap_pct < 0 ? 'text-emerald-400' : 'text-red-400' },
            { label: 'ROCE', value: stock.roce != null ? `${stock.roce}%` : '—' },
          ].map(item => (
            <div key={item.label} className="bg-gray-800 rounded-lg p-3">
              <div className="text-gray-400 text-xs">{item.label}</div>
              <div className={`font-bold text-sm mt-1 ${item.color || 'text-white'}`}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-300 text-xs font-medium uppercase tracking-wider">AI Insight</span>
            <button onClick={() => fetchInsight(stock)} className="text-indigo-400 text-xs hover:text-indigo-300">Refresh</button>
          </div>

          {loading && (
            <div className="space-y-3">
              {[80, 60, 70].map((w, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-gray-700 rounded" style={{width: `${w}%`}}></div>
                  {i === 0 && <div className="h-3 bg-gray-700 rounded mt-1" style={{width: '50%'}}></div>}
                </div>
              ))}
            </div>
          )}

          {error && <div className="text-red-400 text-xs p-3 bg-red-900/20 rounded-lg">{error}</div>}

          {insight && !loading && (
            <div className="space-y-3">
              {insight.verdict && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${VERDICT_COLORS[insight.verdict] || 'text-gray-400 bg-gray-800 border-gray-600'}`}>
                  {insight.verdict}
                  {insight.confidence && (
                    <span className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className={`w-1.5 h-1.5 rounded-full ${n <= insight.confidence ? 'bg-current' : 'bg-gray-600'}`} />
                      ))}
                    </span>
                  )}
                </div>
              )}
              {insight.thesis && (
                <div>
                  <div className="text-gray-400 text-xs mb-1">Thesis</div>
                  <div className="text-gray-200 text-xs leading-relaxed">{insight.thesis}</div>
                </div>
              )}
              {insight.risk && (
                <div>
                  <div className="text-amber-400 text-xs mb-1">Key Risk</div>
                  <div className="text-gray-300 text-xs leading-relaxed">{insight.risk}</div>
                </div>
              )}
              {insight.entry && (
                <div>
                  <div className="text-emerald-400 text-xs mb-1">Entry Suggestion</div>
                  <div className="text-gray-300 text-xs leading-relaxed">{insight.entry}</div>
                </div>
              )}
            </div>
          )}

          {!loading && !insight && !error && (
            <div className="text-gray-500 text-xs text-center py-4">Select a stock row in any tab to load AI insight.</div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="text-gray-600 text-xs text-center">Powered by GPT-4o-mini &bull; Not financial advice</div>
      </div>
    </div>
  );
}

// Global bridge so any tab can open the panel
if (typeof window !== 'undefined') {
  window.openAIInsight = (stock) => {
    window.dispatchEvent(new CustomEvent('ai-insight-open', { detail: stock }));
  };
}
