import { useState, useEffect } from 'react';
import V200DiscoveryEngine from './components/V200DiscoveryEngine';
import GlobalStormVictims from './components/GlobalStormVictims';
import TechnicalBreakout from './components/TechnicalBreakout';
import QualityCompounder from './components/QualityCompounder';
import SectorRotation from './components/SectorRotation';
import PositionMonitor from './components/PositionMonitor';
import AIInsightPanel from './components/AIInsightPanel';

const TABS = [
  { id: 'discovery', label: 'V200 Discovery', color: 'text-emerald-400', borderColor: 'border-emerald-500' },
  { id: 'vs', label: 'Global Storm Victims', color: 'text-red-400', borderColor: 'border-red-500' },
  { id: 'breakout', label: 'Technical Breakout', color: 'text-amber-400', borderColor: 'border-amber-500' },
  { id: 'compounder', label: 'Quality Compounder', color: 'text-green-400', borderColor: 'border-green-500' },
  { id: 'rotation', label: 'Sector Rotation', color: 'text-blue-400', borderColor: 'border-blue-500' },
  { id: 'positions', label: 'Position Monitor', color: 'text-purple-400', borderColor: 'border-purple-500' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('discovery')
  const [aiStock, setAiStock] = useState(null)
  const [showAI, setShowAI] = useState(false)

  useEffect(() => {
    const handler = (e) => { setAiStock(e.detail); setShowAI(true); };
    window.addEventListener('ai-insight-open', handler);
    return () => window.removeEventListener('ai-insight-open', handler);
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'discovery': return <V200DiscoveryEngine />
      case 'vs': return <GlobalStormVictims />
      case 'breakout': return <TechnicalBreakout />
      case 'compounder': return <QualityCompounder />
      case 'rotation': return <SectorRotation />
      case 'positions': return <PositionMonitor />
      default: return <V200DiscoveryEngine />
    }
  }

  const activeTabData = TABS.find(t => t.id === activeTab)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black font-bold text-sm">V2</div>
              <div>
                <div className="text-white font-bold text-sm">V200 Engine</div>
                <div className="text-gray-500 text-xs">Indian Stock Intelligence</div>
              </div>
            </div>
            <button
              onClick={() => setShowAI(s => !s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showAI ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}>
              {showAI ? 'Close AI' : 'AI Insight'}
            </button>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? `${tab.color} ${tab.borderColor}`
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6" style={{ paddingRight: showAI ? '340px' : undefined }}>
        {renderTab()}
      </div>

      {showAI && (
        <AIInsightPanel stock={aiStock} onClose={() => setShowAI(false)} />
      )}

      {!showAI && (
        <div className="fixed bottom-4 right-4 text-gray-600 text-xs">
          Click any stock row → AI Insight
        </div>
      )}
    </div>
  )
}
