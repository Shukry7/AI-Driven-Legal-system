import React, { useState, useRef, useEffect } from 'react';
import LineageMap from './LineageMap';
import ErrorBoundary from './ErrorBoundry';
import CaseDetailsPanel from './CaseDetailsPanel';
import { searchCases, fetchLineage, setUseMock, analyzeAct } from './api';
import type { CaseNode } from './types';
import { 
  Search, 
  Zap, 
  Download, 
  Share2, 
  Map, 
  FileText, 
  Layers, 
  Globe,
  Sparkles,
  Cpu,
  Brain,
  Network,
  TrendingUp,
  Eye,
  Clock,
  Filter
} from 'lucide-react';

export default function LegalLineageModule() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CaseNode[]>([]);
  const [selected, setSelected] = useState<CaseNode | null>(null);
  const [nodes, setNodes] = useState<CaseNode[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [view, setView] = useState<'map' | 'translations' | 'clauses'>('map');
  const [useMock, setUseMockState] = useState<boolean>(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Glass morphism effect for background
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.querySelector('.glass-hero');
      if (hero) {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setUseMock(useMock);
  }, [useMock]);

  async function doSearch() {
    setSearchLoading(true);
    try {
      const r = await searchCases(query);
      setResults(r);
      if (r.length) setSelected(r[0]);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleActClick(act: string) {
    setProcessing(true);
    try {
      const out = await analyzeAct(act);
      setResults(out.cases);
      setNodes(out.nodes);
      setEdges(out.edges);
      if (out.nodes.length) setSelected(out.nodes[0]);
      setView('map');
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  }

  async function loadLineage(caseId: string) {
    try {
      const data = await fetchLineage(caseId);
      setNodes(data.nodes);
      setEdges(data.edges);
      if (data.nodes.length) setSelected(data.nodes[0]);
    } catch (err) {
      console.error(err);
      setNodes([]);
      setEdges([]);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-indigo-200/20 to-teal-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-gradient-to-r from-blue-100/20 to-purple-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Hero Section */}
        <div className="glass-hero mb-8 p-8 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg shadow-blue-100/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-teal-500 rounded-xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-teal-600 bg-clip-text text-transparent">
                Legal Lineage Explorer
              </h1>
              <p className="text-slate-600 mt-1">Visualize case law evolution with AI-powered citation analysis</p>
            </div>
          </div>

          {/* Main Search */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-teal-400/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative flex gap-3 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl p-1 shadow-lg">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && doSearch()}
                  placeholder="Search cases by name, citation, or keywords..."
                  className="w-full pl-12 pr-4 py-4 bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 placeholder-slate-400"
                />
              </div>
              <button
                onClick={doSearch}
                disabled={searchLoading}
                className="px-8 bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 text-white font-medium rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {searchLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Actions & Filters */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => selected && loadLineage(selected.id)}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 flex items-center gap-2 group"
              >
                <Network className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Generate Lineage
              </button>
              
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-4">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <label className="text-sm font-medium text-slate-700">AI Mode</label>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={useMock}
                    onChange={(e) => setUseMockState(e.target.checked)}
                    className="sr-only peer"
                    id="ai-toggle"
                  />
                  <label
                    htmlFor="ai-toggle"
                    className="relative w-12 h-6 bg-slate-300 peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-teal-500 rounded-full cursor-pointer transition-all duration-300 after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all after:duration-300 peer-checked:after:translate-x-6"
                  ></label>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-1">
              {['all', 'precedent', 'landmark', 'recent'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-300 ${
                    activeFilter === filter
                      ? 'bg-gradient-to-r from-indigo-500 to-teal-500 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* View Toggle */}
            <div className="mb-6">
              <div className="inline-flex items-center bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl p-1 shadow-sm">
                {[
                  { key: 'map', icon: Map, label: 'Lineage Map' },
                  { key: 'translations', icon: Globe, label: 'Translations' },
                  { key: 'clauses', icon: FileText, label: 'Clause Analysis' }
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setView(key as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                      view === key
                        ? 'bg-gradient-to-r from-indigo-500 to-teal-500 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Processing Indicator */}
            {processing && (
              <div className="mb-6 p-6 bg-gradient-to-r from-indigo-50 to-teal-50/50 backdrop-blur-sm border border-indigo-100 rounded-2xl shadow-sm animate-pulse-subtle">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-teal-400 animate-spin-slow">
                      <div className="absolute inset-2 bg-white rounded-full"></div>
                    </div>
                    <Cpu className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-indigo-700">AI Processing Active</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">Extracting legal patterns and building citation network...</p>
                    <div className="mt-3 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-teal-500 animate-progress"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Popular Acts */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-700">Popular Legal Acts</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {['Property Act', 'Evidence Act', 'Contract Act', 'Constitution', 'IPC', 'CPC'].map((act) => (
                  <button
                    key={act}
                    onClick={() => handleActClick(act)}
                    className="group relative overflow-hidden px-5 py-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-teal-500/0 group-hover:from-indigo-500/5 group-hover:to-teal-500/5 transition-all duration-300"></div>
                    <span className="relative font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                      {act}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cases Table & Quick Actions */}
            <div className="mb-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-500" />
                      Case Network ({nodes.length} nodes)
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Eye className="w-4 h-4" />
                      <span>Hover or click nodes for details</span>
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-auto max-h-80">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                            <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">ID</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">Case</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">Year</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">Citations</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {nodes.map((n) => (
                            <tr
                              key={n.id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                selected?.id === n.id ? 'bg-gradient-to-r from-indigo-50/50 to-teal-50/50' : ''
                              }`}
                            >
                              <td className="py-3 px-4">
                                <span className="font-mono text-sm bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                  {n.id}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-800">{n.title}</td>
                              <td className="py-3 px-4">
                                {n.year ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                    <Clock className="w-3 h-3" />
                                    {n.year}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs flex items-center justify-center">
                                    {Math.min(99, (n.citations || 0))}
                                  </div>
                                  <span className="text-sm text-slate-600">cites</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => { setSelected(n); loadLineage(n.id); }}
                                  className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 text-white text-sm rounded-lg transition-all duration-300 hover:shadow-md"
                                >
                                  Explore
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        const evt = new CustomEvent('exportGraph');
                        window.dispatchEvent(evt);
                      }}
                      className="w-full p-4 bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-lg transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-indigo-100 to-teal-100 rounded-lg group-hover:scale-110 transition-transform">
                          <Download className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-slate-800">Export Graph</div>
                          <div className="text-sm text-slate-500">PNG, SVG, or JSON</div>
                        </div>
                      </div>
                    </button>
                    
                    <button className="w-full p-4 bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-lg transition-all duration-300 group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg group-hover:scale-110 transition-transform">
                          <Share2 className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-slate-800">Share Analysis</div>
                          <div className="text-sm text-slate-500">Generate shareable link</div>
                        </div>
                      </div>
                    </button>
                    
                    <button className="w-full p-4 bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-lg transition-all duration-300 group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg group-hover:scale-110 transition-transform">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-slate-800">AI Insights</div>
                          <div className="text-sm text-slate-500">Generate report</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Visualization */}
            {view === 'map' && (
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
                <ErrorBoundary>
                  <LineageMap nodes={nodes} edges={edges} onSelectNode={(n) => setSelected(n)} />
                </ErrorBoundary>
              </div>
            )}
            
            {view === 'translations' && (
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-8 text-center">
                <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">Translation Workspace</h3>
                <p className="text-slate-500 mb-4">AI-powered translation and localization of legal texts</p>
                <button className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all duration-300">
                  Open Translation Tools
                </button>
              </div>
            )}
            
            {view === 'clauses' && (
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-8 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">Clause Analysis</h3>
                <p className="text-slate-500 mb-4">Deep analysis of legal clauses and provisions</p>
                <button className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all duration-300">
                  Analyze Clauses
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-96 space-y-6">
            {/* Search Results */}
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-500" />
                  Search Results ({results.length})
                </h3>
                <Filter className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                      selected?.id === r.id
                        ? 'bg-gradient-to-r from-indigo-50 to-teal-50/50 border-indigo-200 shadow-sm'
                        : 'bg-white/50 border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80'
                    }`}
                    onClick={() => setSelected(r)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-800 mb-1">{r.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          {r.year && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {r.year}
                            </span>
                          )}
                          <span className="text-indigo-500 font-medium">#{r.id}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadLineage(r.id);
                        }}
                        className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm rounded-lg hover:shadow-md transition-all duration-300"
                      >
                        Map
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Case Details */}
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <CaseDetailsPanel selected={selected} />
            </div>
          </aside>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
}