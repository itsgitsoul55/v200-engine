import { useState, useEffect, useRef } from 'react';
const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY || '';

function signalColor(sig) {
  if (sig === 'BUY') return 'text-emerald-400';
  if (sig === 'HOLD' || sig === 'WAIT') return 'text-amber-400';
  return 'text-red-400';
}

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
    if (!OPENAI_KEY) {
      setError('No OpenAI key set. Add VITE_OPENAI_KEY to Vercel env vars.');
      setLoading(false);
      return;
    }
    try {
      const prompt = 'You are an expert Indian equity analyst. Analyze this NSE stock.\n\n' +
        'Stock: ' + s.name + ' (' + s.symbol + ')\n' +
        'Sector: ' + (s.sector || 'N/A') + '\n' +
        'ROCE: ' + (s.roce != null ? s.roce.toFixed(1) : 'N/A') + '%\n' +
        'D/E: ' + (s.de_ratio ?? 'N/A') + '\n' +
        'Rev CAGR 3yr: ' + (s.rev_cagr_3yr != null ? s.rev_cagr_3yr.toFixed(1) : 'N/A') + '%\n' +
        'Promoter: ' + (s.promoter_pct != null ? s.promoter_pct.toFixed(1) : 'N/A') + '%\n' +
        'Pledge: ' + (s.pledge_pct != null ? s.pledge_pct.toFixed(1) : 'N/A') + '%\n' +
        'Quality Score: ' + (s.quality_score ?? 'N/A') + '/100\n' +
        'Signal: ' + (s.signal ?? 'N/A') + ' (' + (s.signal_score ?? 'N/A') + '/100)\n' +
        'vs Sep 24: ' + (s.recovery_gap_pct != null ? s.recovery_gap_pct.toFixed(1) + '%' : 'N/A') + '\n' +
        'Stage 2: ' + (s.stage2 ? 'Yes' : 'No') + '\n\n' +
        'Return JSON: {"thesis":"2-sentence thesis","risk":"1-sentence risk","entry":"1-sentence entry based on gap","verdict":"BUY|WATCH|AVOID","confidence":1-5}';
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + OPENAI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 400, temperature: 0.3, messages: [{ role: 'user', content: prompt }] })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setInsight(parsed);
    } catch(e) {
      setError('AI insight failed: ' + (e.message || 'unknown error'));
    }
    setLoading(false);
  }

  const VERDICT_COLORS = {
    BUY: 'text-emerald-400 bg-emerald-900/30 border-emerald-700',
    WATCH: 'text-amber-400 bg-amber-900/30 border-amber-700',
    AVOID: 'text-red-400 bg-red-900/30 border-red-700'
  };

  if (!stock) return null;
  const gap = stock.recovery_gap_pct;
  const gapStr = gap != null ? (gap > 0 ? '+' : '') + gap.toFixed(1) + '%' : 'N/A';

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-40 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <div className="text-white font-bold text-sm">{stock.symbol}</div>
          <div className="text-gray-400 text-xs">{stock.name}{stock.sector ? ' - ' + stock.sector : ''}</div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">x</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Quality', value: stock.quality_score != null ? stock.quality_score + '%' : 'N/A', color: '' },
            { label: 'Signal', value: stock.signal || 'N/A', color: signalColor(stock.signal) },
            { label: 'vs Sep 24', value: gapStr, color: gap != null && gap < 0 ? 'text-emerald-400' : 'text-red-400' },
            { label: 'ROCE', value: stock.roce != null ? stock.roce.toFixed(1) + '%' : 'N/A', color: '' },
            { label: 'Signal Score', value: stock.signal_score != null ? stock.signal_score + '/100' : 'N/A', color: '' },
            { label: 'Stage 2', value: stock.stage2 ? 'Yes' : 'No', color: stock.stage2 ? 'text-amber-400' : 'text-gray-500' },
          ].map(item => (
            <div key={item.label} className="bg-gray-800 rounded-lg p-3">
              <div className="text-gray-400 text-xs">{item.label}</div>
              <div className={'font-bold text-sm mt-1 ' + (item.color || 'text-white')}>{item.value}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-300 text-xs font-medium uppercase tracking-wider">AI Insight</span>
            <button onClick={() => fetchInsight(stock)} className="text-indigo-400 text-xs hover:text-indigo-300">Refresh</button>
          </div>
          {loading && (
            <div className="space-y-2">
              {[80,60,70].map((w,i) => <div key={i} className="animate-pulse h-3 bg-gray-700 rounded" style={{width:w+'%'}}></div>)}
            </div>
          )}
          {error && <div className="text-red-400 text-xs p-3 bg-red-900/20 rounded-lg">{error}</div>}
          {insight && !loading && (
            <div className="space-y-3">
              {insight.verdict && (
                <div className={'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ' + (VERDICT_COLORS[insight.verdict] || 'text-gray-400 bg-gray-800 border-gray-600')}>
                  {insight.verdict}
                  {insight.confidence && (
                    <span className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => <span key={n} className={'w-1.5 h-1.5 rounded-full ' + (n <= insight.confidence ? 'bg-current' : 'bg-gray-600')} />)}
                    </span>
                  )}
                </div>
              )}
              {insight.thesis && <div><div className="text-gray-400 text-xs mb-1">Thesis</div><div className="text-gray-200 text-xs leading-relaxed">{insight.thesis}</div></div>}
              {insight.risk && <div><div className="text-amber-400 text-xs mb-1">Key Risk</div><div className="text-gray-300 text-xs leading-relaxed">{insight.risk}</div></div>}
              {insight.entry && <div><div className="text-emerald-400 text-xs mb-1">Entry Suggestion</div><div className="text-gray-300 text-xs leading-relaxed">{insight.entry}</div></div>}
            </div>
          )}
          {!loading && !insight && !error && <div className="text-gray-500 text-xs text-center py-4">Analyzing {stock.symbol}...</div>}
        </div>
      </div>
      <div className="p-4 border-t border-gray-700">
        <div className="text-gray-600 text-xs text-center">Powered by GPT-4o-mini - Not financial advice</div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.openAIInsight = (stock) => {
    window.dispatchEvent(new CustomEvent('ai-insight-open', { detail: stock }));
  };
}
