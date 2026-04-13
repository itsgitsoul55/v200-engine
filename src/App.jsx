import { useState } from 'react'
import V200DiscoveryEngine from './components/V200DiscoveryEngine'

const TABS = [
  { id: 'discovery', label: 'V200 Discovery' },
  { id: 'vs', label: 'Global Storm Victims' },
  { id: 'breakout', label: 'Technical Breakout' },
  { id: 'compounder', label: 'Quality Compounder' },
  { id: 'rotation', label: 'Sector Rotation' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('discovery')

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-emerald-400 font-bold text-lg">V200</span>
          <span className="text-slate-400 text-sm">Indian Stock Intelligence Dashboard</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="p-6">
        {activeTab === 'discovery' && <V200DiscoveryEngine />}
        {activeTab !== 'discovery' && (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <p>Coming soon — building next layer</p>
          </div>
        )}
      </main>
    </div>
  )
}
