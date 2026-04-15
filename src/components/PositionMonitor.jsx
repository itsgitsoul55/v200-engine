import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SIGNAL_COLORS = { BUY: 'text-emerald-400', WATCH: 'text-amber-400', AVOID: 'text-red-400' };
const SIGNAL_BG = { BUY: 'bg-emerald-900/40 border-emerald-700', WATCH: 'bg-amber-900/40 border-amber-700', AVOID: 'bg-red-900/40 border-red-700' };

export default function PositionMonitor() {
  const [positions, setPositions] = useState([]);
  const [v200, setV200] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ symbol: '', entry_price: '', quantity: '', stop_loss: '', target_price: '', strategy: 'Quality Compounder' });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchPositions();
    fetchV200();
  }, []);

  async function fetchPositions() {
    try {
      const { data } = await supabase.from('positions').select('*').order('opened_at', { ascending: false });
      setPositions(data || []);
    } catch { setPositions([]); }
  }

  async function fetchV200() {
    try {
      const { data } = await supabase.from('v200_stocks').select('symbol,current_price,signal,signal_score,recovery_gap_pct');
      const map = {};
      (data || []).forEach(s => { map[s.symbol] = s; });
      setV200(map);
    } catch { setV200({}); }
  }

  async function addPosition() {
    const rec = {
      symbol: form.symbol.toUpperCase(),
      entry_price: parseFloat(form.entry_price),
      quantity: parseInt(form.quantity),
      stop_loss: parseFloat(form.stop_loss),
      target_price: parseFloat(form.target_price),
      strategy: form.strategy,
      opened_at: new Date().toISOString(),
      status: 'open'
    };
    try {
      await supabase.from('positions').insert([rec]);
      setShowAdd(false);
      setForm({ symbol: '', entry_price: '', quantity: '', stop_loss: '', target_price: '', strategy: 'Quality Compounder' });
      fetchPositions();
    } catch(e) { alert('Error: ' + e.message); }
  }

  function enriched(pos) {
    const live = v200[pos.symbol] || {};
    const cp = live.current_price || pos.entry_price;
    const pnlPct = ((cp - pos.entry_price) / pos.entry_price * 100).toFixed(2);
    const pnlAbs = ((cp - pos.entry_price) * pos.quantity).toFixed(0);
    const nearStop = pos.stop_loss && cp <= pos.stop_loss * 1.03;
    const nearTarget = pos.target_price && cp >= pos.target_price * 0.98;
    return { ...pos, current_price: cp, pnlPct, pnlAbs, nearStop, nearTarget, signal: live.signal, signal_score: live.signal_score, recovery_gap_pct: live.recovery_gap_pct };
  }

  const strategies = ['all', 'Quality Compounder', 'Global Storm Victims', 'Technical Breakout', 'Sector Rotation'];
  const filtered = positions.filter(p => filter === 'all' || p.strategy === filter).map(enriched);
  const totalPnl = filtered.reduce((s, p) => s + parseFloat(p.pnlAbs || 0), 0);
  const openCount = filtered.filter(p => p.status === 'open').length;
  const alerts = filtered.filter(p => p.nearStop || p.nearTarget).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Position Monitor</h2>
          <p className="text-gray-400 text-sm mt-1">Track active positions with live P&L and signal updates</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
          + Add Position
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[{ label: 'Open Positions', value: openCount, color: 'text-white' },
          { label: 'Total P&L', value: `₹${totalPnl >= 0 ? '+' : ''}${parseInt(totalPnl).toLocaleString()}`, color: totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Alerts', value: alerts, color: alerts > 0 ? 'text-amber-400' : 'text-white' },
          { label: 'Strategies', value: new Set(positions.map(p => p.strategy)).size, color: 'text-white' }]
          .map(c => (
          <div key={c.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-gray-400 text-xs mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {strategies.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <div className="text-gray-500 text-4xl mb-3">📊</div>
          <div className="text-gray-400">No positions yet. Add your first position to start tracking.</div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                {['Symbol', 'Entry', 'Current', 'P&L%', 'P&L₹', 'Stop', 'Target', 'Signal', 'Strategy', 'Alert'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-gray-400 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtered.map(pos => (
                <tr key={pos.id} className={`hover:bg-gray-750 ${
                  pos.nearStop ? 'bg-red-900/10' : pos.nearTarget ? 'bg-emerald-900/10' : ''
                }`}>
                  <td className="px-3 py-3 font-bold text-white">{pos.symbol}</td>
                  <td className="px-3 py-3 text-gray-300">₹{pos.entry_price?.toFixed(1)}</td>
                  <td className="px-3 py-3 text-white font-medium">₹{parseFloat(pos.current_price)?.toFixed(1)}</td>
                  <td className={`px-3 py-3 font-bold ${parseFloat(pos.pnlPct) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct}%
                  </td>
                  <td className={`px-3 py-3 font-medium ${parseFloat(pos.pnlAbs) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pos.pnlAbs >= 0 ? '+' : ''}₹{parseInt(pos.pnlAbs).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-gray-400">{pos.stop_loss ? `₹${pos.stop_loss}` : '—'}</td>
                  <td className="px-3 py-3 text-gray-400">{pos.target_price ? `₹${pos.target_price}` : '—'}</td>
                  <td className="px-3 py-3">
                    {pos.signal ? <span className={`font-bold text-xs ${SIGNAL_COLORS[pos.signal]}`}>{pos.signal}</span> : <span className="text-gray-500">—</span>}
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{pos.strategy}</td>
                  <td className="px-3 py-3">
                    {pos.nearStop && <span className="text-red-400 text-xs">⚠ Stop</span>}
                    {pos.nearTarget && <span className="text-emerald-400 text-xs">🎯 Target</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <h3 className="text-white font-bold text-lg">Add Position</h3>
            {[['Symbol (e.g. TITAN)', 'symbol', 'text'], ['Entry Price', 'entry_price', 'number'], ['Quantity', 'quantity', 'number'], ['Stop Loss', 'stop_loss', 'number'], ['Target Price', 'target_price', 'number']].map(([label, field, type]) => (
              <div key={field}>
                <label className="text-gray-400 text-xs mb-1 block">{label}</label>
                <input type={type} value={form[field]} onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
              </div>
            ))}
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Strategy</label>
              <select value={form.strategy} onChange={e => setForm(f => ({...f, strategy: e.target.value}))}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                {['Quality Compounder', 'Global Storm Victims', 'Technical Breakout', 'Sector Rotation'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Cancel</button>
              <button onClick={addPosition} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">Add Position</button>
            </div>
            <div className="text-gray-500 text-xs p-3 bg-gray-900 rounded-lg">
              Note: Create the positions table in Supabase first:<br/>
              <code className="text-green-400">create table positions (id bigserial primary key, symbol text, entry_price numeric, quantity integer, stop_loss numeric, target_price numeric, strategy text, opened_at timestamptz default now(), status text default 'open');</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
