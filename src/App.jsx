import { useState } from 'react';
import V200DiscoveryEngine from './components/V200DiscoveryEngine';
import GlobalStormVictims from './components/GlobalStormVictims';
import TechnicalBreakout from './components/TechnicalBreakout';
import QualityCompounder from './components/QualityCompounder';
import SectorRotation from './components/SectorRotation';

const TABS = [
  { id: 'discovery', label: 'V200 Discovery', color: 'text-emerald-400', borderColor: 'border-emerald-500' },
  { id: 'vs', label: 'Global Storm Victims', color: 'text-red-400', borderColor: 'border-red-500' },
  { id: 'breakout', label: 'Technical Breakout', color: 'text-amber-400', borderColor: 'border-amber-500' },
  { id: 'compounder', label: 'Quality Compounder', color: 'text-green-400', borderColor: 'border-green-500' },
  { id: 'rotation', label: 'Sector Rotation', color: 'text-blue-400', borderColor: 'border-blue-500' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('discovery')

  const renderTab = () => {
    switch (activeTab) {
      case 'discovery': return <V200DiscoveryEngine />
      case 'vs': return <GlobalStormVictims />
      case 'breakout': return <TechnicalBreakout />
      case 'compounder': return <QualityCompounder />
      case 'rotation': return <SectorRotation />
      default: return <V200DiscoveryEngine />
    }
  }

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
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors border ${
                activeTab === tab.id
                  ? `${tab.color} ${tab.borderColor} bg-slate-700`
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {renderTab()}
      </main>
    </div>
  )
}
