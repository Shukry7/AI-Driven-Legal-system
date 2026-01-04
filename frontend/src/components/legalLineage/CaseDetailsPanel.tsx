import React, { useState } from 'react';
import type { CaseNode } from './types';
import { 
  BookOpen, 
  ExternalLink, 
  Copy, 
  Star, 
  FileText, 
  Users, 
  Calendar, 
  Hash, 
  Globe, 
  TrendingUp,
  Download,
  Share2,
  Bookmark,
  AlertCircle,
  ChevronRight,
  Link as LinkIcon,
  Clock,
  Award,
  Zap
} from 'lucide-react';

interface Props {
  selected?: CaseNode | null;
}

export default function CaseDetailsPanel({ selected }: Props) {
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'citations' | 'analysis'>('details');

  if (!selected) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="p-4 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl mb-4">
          <BookOpen className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Case Selected</h3>
        <p className="text-slate-500 max-w-sm">
          Select a case from the search results or click on a node in the lineage map to view detailed information
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
      case: selected,
      timestamp: new Date().toISOString(),
      analysis: 'Legal lineage snapshot'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case-snapshot-${selected.id}-${new Date().toISOString().split('T')[0]}.json`;
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
              <span className="text-sm text-slate-300">Legal Case</span>
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
              Citation
            </div>
            <div className="font-mono text-sm">{selected.id}</div>
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
              Impact
            </div>
            <div className="font-semibold flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              High
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white">
        <div className="flex">
          {[
            { key: 'details', icon: FileText, label: 'Details' },
            { key: 'citations', icon: Users, label: 'Citations' },
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
                Summary
              </h4>
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <p className="text-slate-700 leading-relaxed">
                  {selected.summary || 'No summary available for this case. The summary provides a concise overview of the legal principles, facts, and decisions involved in this landmark judgment.'}
                </p>
              </div>
            </div>

            {/* Key Facts */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Key Legal Principles
              </h4>
              <div className="space-y-2">
                {[
                  'Principle of stare decisis application',
                  'Interpretation of statutory provisions',
                  'Constitutional validity considerations',
                  'Precedent analysis methodology'
                ].map((principle, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-lg border border-blue-100"
                  >
                    <div className="p-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-slate-700">{principle}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Court</div>
                <div className="font-medium text-slate-800">Supreme Court</div>
              </div>
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Bench Strength</div>
                <div className="font-medium text-slate-800">3 Judges</div>
              </div>
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Citations Count</div>
                <div className="font-medium text-slate-800">{selected.citations || 42}</div>
              </div>
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Status</div>
                <div className="font-medium text-green-600 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Good Law
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'citations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800">Citation Network</h4>
              <span className="text-sm text-slate-500">Cited by {selected.citedBy || 24} cases</span>
            </div>
            
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-slate-800 mb-1">Related Case #{i}</div>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          202{3 - i}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {['High', 'Medium', 'Low'][i - 1]} Impact
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ExternalLink className="w-4 h-4 text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <LinkIcon className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      i === 1 ? 'bg-green-100 text-green-700' :
                      i === 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {['Followed', 'Distinguished', 'Overruled'][i - 1]}
                    </div>
                    <span className="text-sm text-slate-500">Citation relationship</span>
                  </div>
                </div>
              ))}
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
                  <p className="text-sm text-slate-600">Powered by legal language models</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-white/80 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-500 mb-2">Legal Significance</div>
                  <div className="text-slate-800">
                    This case established important precedents in contractual interpretation and has been cited extensively in subsequent judgments.
                  </div>
                </div>
                
                <div className="p-4 bg-white/80 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-500 mb-2">Pattern Analysis</div>
                  <div className="text-slate-800">
                    Shows strong citation patterns with 85% of citations occurring within the first 5 years after the decision.
                  </div>
                </div>
                
                <div className="p-4 bg-white/80 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-500 mb-2">Similar Cases</div>
                  <div className="text-slate-800">
                    High similarity (92%) with landmark cases in related jurisdictions based on textual analysis.
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
          
          <button
            onClick={() => window.alert('Open Translation workspace for ' + selected.id)}
            className="py-3 px-4 bg-gradient-to-r from-white to-slate-50 border border-slate-300 rounded-xl hover:border-indigo-400 hover:shadow-sm transition-all duration-300 flex items-center justify-center gap-2 group col-span-2"
          >
            <Globe className="w-4 h-4 text-slate-600 group-hover:text-indigo-600" />
            <span className="font-medium text-slate-700">Open Translation Workspace</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200">
          <button
            onClick={() => window.alert('Open Clause analysis for ' + selected.id)}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            <FileText className="w-5 h-5" />
            <span>Launch AI Clause Analysis</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}