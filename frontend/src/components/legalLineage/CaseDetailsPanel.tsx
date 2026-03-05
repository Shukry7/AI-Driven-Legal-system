import React, { useState } from 'react';
import type { CaseNode } from '@/config/api';
import { 
  BookOpen, 
  ExternalLink, 
  Copy, 
  FileText, 
  Calendar, 
  Hash, 
  Globe, 
  TrendingUp,
  Download,
  Share2,
  Bookmark,
  ChevronRight,
  Clock,
  Award,
  Zap,
  Brain,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield
} from 'lucide-react';

interface Props {
  selected?: CaseNode | null;
}

export default function CaseDetailsPanel({ selected }: Props) {
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'treatments' | 'analysis'>('details');

  const getTreatmentIcon = (treatment: string) => {
    switch (treatment) {
      case 'FOLLOWED': return CheckCircle;
      case 'OVERRULED': return XCircle;
      case 'DISTINGUISHED': return AlertTriangle;
      case 'APPLIED': return Shield;
      default: return Award;
    }
  };

  const getTreatmentColor = (treatment: string) => {
    switch (treatment) {
      case 'FOLLOWED': return 'text-green-600 bg-green-100';
      case 'OVERRULED': return 'text-red-600 bg-red-100';
      case 'DISTINGUISHED': return 'text-amber-600 bg-amber-100';
      case 'APPLIED': return 'text-blue-600 bg-blue-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  if (!selected) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="p-4 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl mb-4">
          <BookOpen className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Act Selected</h3>
        <p className="text-slate-500 max-w-sm">
          Select an act from the search results or click on a node in the lineage map to view detailed treatment information
        </p>
      </div>
    );
  }

  const copyCitation = () => {
    navigator.clipboard.writeText(selected.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveSnapshot = () => {
    const data = {
      act: selected,
      timestamp: new Date().toISOString(),
      treatments: selected.acts
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `act-snapshot-${selected.id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white/10 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-sm text-slate-300">Legal Act</span>
            </div>
            <h3 className="text-xl font-bold leading-tight mb-2">{selected.title}</h3>
          </div>
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs text-slate-300 mb-1 flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Act ID
            </div>
            <div className="font-mono text-sm">{selected.id.split('-').slice(0,2).join('-')}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Year
            </div>
            <div className="font-semibold">{selected.year || '—'}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs text-slate-300 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Treatments
            </div>
            <div className="font-semibold">{selected.acts?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white">
        <div className="flex">
          {[
            { key: 'details', icon: FileText, label: 'Details' },
            { key: 'treatments', icon: Award, label: 'Treatments' },
            { key: 'analysis', icon: TrendingUp, label: 'AI Analysis' }
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Summary */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Act Summary
              </h4>
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <p className="text-slate-700 leading-relaxed">
                  {selected.summary || 'No summary available for this act. The summary provides an overview of the legal provisions and applications of this legislation.'}
                </p>
              </div>
            </div>

            {/* Key Provisions */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Key Provisions
              </h4>
              <div className="space-y-2">
                {[
                  'Section 3: Interpretation and definitions',
                  'Section 5: Application and scope',
                  'Section 12: Regulatory framework',
                  'Section 24: Enforcement mechanisms'
                ].map((provision, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-lg border border-blue-100"
                  >
                    <div className="p-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-slate-700">{provision}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Jurisdiction</div>
                <div className="font-medium text-slate-800">Sri Lanka</div>
              </div>
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Type</div>
                <div className="font-medium text-slate-800">Primary Legislation</div>
              </div>
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Last Amended</div>
                <div className="font-medium text-slate-800">2023</div>
              </div>
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Status</div>
                <div className="font-medium text-green-600 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  In Force
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'treatments' && selected.acts && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800">Treatment Analysis</h4>
              <span className="text-sm text-slate-500">{selected.acts.length} treatments</span>
            </div>
            
            <div className="space-y-3">
              {selected.acts.map((act, i) => {
                const Icon = getTreatmentIcon(act.treatment);
                const colorClass = getTreatmentColor(act.treatment);
                
                return (
                  <div key={i} className="p-4 bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 mb-1">{act.act}</div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`px-2 py-0.5 rounded-full ${colorClass} flex items-center gap-1`}>
                            <Icon className="w-3 h-3" />
                            {act.treatment}
                          </span>
                          <span className="text-slate-500">
                            Confidence: {(act.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ExternalLink className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                    
                    {/* Confidence bar */}
                    <div className="mt-3">
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-teal-500"
                          style={{ width: `${act.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-50/50 to-teal-50/50 border border-indigo-100 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-teal-500 rounded-xl">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">AI-Generated Insights</h4>
                  <p className="text-sm text-slate-600">Powered by Legal-BERT</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-white/80 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-500 mb-2">Treatment Pattern Analysis</div>
                  <div className="text-slate-800">
                    {selected.acts && selected.acts.length > 0 ? (
                      <>
                        This act has been {selected.acts[0].treatment.toLowerCase()} in {selected.acts.length} contexts.
                        Primary treatment: <span className="font-semibold">{selected.acts[0].treatment}</span> with 
                        {(selected.acts[0].confidence * 100).toFixed(1)}% confidence.
                      </>
                    ) : (
                      'No treatment patterns identified for this act.'
                    )}
                  </div>
                </div>
                
                <div className="p-4 bg-white/80 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-500 mb-2">Citation Impact</div>
                  <div className="text-slate-800">
                    This act has been referenced in {selected.citations || 0} cases and has
                    influenced {selected.citedBy || 0} subsequent judgments.
                  </div>
                </div>
                
                <div className="p-4 bg-white/80 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-500 mb-2">Similar Acts</div>
                  <div className="text-slate-800">
                    High similarity (89%) with related legislation in common law jurisdictions
                    based on textual analysis and treatment patterns.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="border-t border-slate-200 p-6 bg-gradient-to-r from-white to-slate-50">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={copyCitation}
            className="py-3 px-4 bg-gradient-to-r from-white to-slate-50 border border-slate-300 rounded-xl hover:border-indigo-400 hover:shadow-sm transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            <Copy className={`w-4 h-4 ${copied ? 'text-green-500' : 'text-slate-600 group-hover:text-indigo-600'}`} />
            <span className="font-medium text-slate-700">{copied ? 'Copied!' : 'Copy Citation'}</span>
          </button>
          
          <button
            onClick={saveSnapshot}
            className="py-3 px-4 bg-gradient-to-r from-white to-slate-50 border border-slate-300 rounded-xl hover:border-indigo-400 hover:shadow-sm transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            <Download className="w-4 h-4 text-slate-600 group-hover:text-indigo-600" />
            <span className="font-medium text-slate-700">Save Snapshot</span>
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200">
          <button className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 flex items-center justify-center gap-2 group">
            <FileText className="w-5 h-5" />
            <span>View Full Act Text</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}