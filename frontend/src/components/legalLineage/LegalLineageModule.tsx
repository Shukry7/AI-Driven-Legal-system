import React, { useState } from 'react';
import LineageMap from './LineageMap';
import ErrorBoundary from './ErrorBoundry';
import CaseDetailsPanel from './CaseDetailsPanel';
import { analyzeAct } from '@/config/api';
import type { CaseNode } from '@/config/api';
import { 
  Brain,
  Cpu,
  FileText,
  Layers,
  Globe,
  Download,
  Share2,
  TrendingUp,
  Eye
} from 'lucide-react';

export default function LegalLineageModule() {
  const [selected, setSelected] = useState<CaseNode | null>(null);
  const [nodes, setNodes] = useState<CaseNode[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [view, setView] = useState<'map' | 'translations' | 'clauses'>('map');
  const [processedFilename, setProcessedFilename] = useState<string>('');

  // Function to process Faizal's PDF (hardcoded filename for now)
  async function handleProcessPDF() {
    const filename = 'SC_CHC APPEAL.pdf'; // Faizal's PDF filename
    
    setProcessing(true);
    try {
      const result = await analyzeAct(filename);
      setNodes(result.nodes);
      setEdges(result.edges);
      setProcessedFilename(result.filename);
      if (result.nodes.length) setSelected(result.nodes[0]);
      setView('map');
    } catch (error) {
      console.error('Error processing PDF:', error);
    } finally {
      setProcessing(false);
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
              <p className="text-slate-600 mt-1">Analyze act treatments from Faizal's uploaded PDF</p>
            </div>
          </div>

          {/* Process Button */}
          <div className="flex justify-center">
            <button
              onClick={handleProcessPDF}
              disabled={processing}
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 text-white font-medium rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
            >
              {processing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing Faizal's PDF...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Process SC_CHC APPEAL.pdf
                </>
              )}
            </button>
          </div>

          {processedFilename && !processing && (
            <div className="mt-4 text-center text-sm text-green-600">
              ✅ Successfully processed: {processedFilename}
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* View Toggle */}
            <div className="mb-6">
              <div className="inline-flex items-center bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl p-1 shadow-sm">
                {[
                  { key: 'map', icon: Layers, label: 'Lineage Map' },
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
                    <p className="text-sm text-slate-600">Extracting act treatments and building relationship network...</p>
                    <div className="mt-3 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-teal-500 animate-progress"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Act Network Summary */}
            {nodes.length > 0 && !processing && (
              <div className="mb-4 p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-slate-700">
                      Act Network ({nodes.length} acts, {edges.length} relationships)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Eye className="w-4 h-4" />
                    <span>Hover or click nodes for details</span>
                  </div>
                </div>
              </div>
            )}

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
                <p className="text-slate-500 mb-4">Coming soon...</p>
              </div>
            )}
            
            {view === 'clauses' && (
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-8 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">Clause Analysis</h3>
                <p className="text-slate-500 mb-4">Coming soon...</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-96 space-y-6">
            {/* Case Details */}
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <CaseDetailsPanel selected={selected} />
            </div>

            {/* Quick Actions */}
            {nodes.length > 0 && (
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
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
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
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