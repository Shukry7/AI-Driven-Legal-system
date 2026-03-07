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
  Shield,
  FileJson,
  Scale,
  Database
} from 'lucide-react';
import { Button } from '../ui/button';

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

  // Get the primary treatment for this act (first one)
  const primaryTreatment = selected.acts?.[0];
  
  // Get rich data if available - from the node's acts[0] which contains all the rich data from search results
  const richData = primaryTreatment && {
    act_id: primaryTreatment.act_id,
    context_preview: primaryTreatment.context_preview,
    case_title: primaryTreatment.case_title || selected.case_title,
    filename: primaryTreatment.filename || selected.filename,
    file_id: primaryTreatment.file_id || selected.file_id
  };

  const isFromDatabase = selected.source === 'database' || richData?.file_id;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white/10 rounded-lg">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-sm text-slate-300">
                {isFromDatabase ? 'Database Record' : 'Current Act'} • {selected.id}
              </span>
            </div>
            <h3 className="text-xl font-bold leading-tight mb-2">
              {selected.title}  {/* This shows the case title or act name */}
            </h3>
          </div>
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Quick stats - Using real data */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs text-slate-300 mb-1 flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Node ID
            </div>
            <div className="font-mono text-sm truncate" title={selected.id}>
              {selected.id}  {/* This shows act-0, act-1, etc. */}
            </div>
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
              <Award className="w-3 h-3" />
              Treatment
            </div>
            <div className="font-semibold">{primaryTreatment?.treatment || '—'}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white">
        <div className="flex">
          {[
            { key: 'details', icon: FileText, label: 'Case Details' },
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
            {/* Case Information */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                Case Information
              </h4>
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Case Title</div>
                  <div className="text-slate-700 font-medium">
                    {richData?.case_title || selected.title || 'Unknown Case'}
                  </div>
                </div>
                {richData?.filename && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Filename</div>
                    <div className="text-sm text-slate-600 font-mono">{richData.filename}</div>
                  </div>
                )}
                {richData?.act_id && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Act ID</div>
                    <div className="text-sm text-slate-600 font-mono">{richData.act_id}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Context Preview - Only show if available */}
            {richData?.context_preview && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  Context Preview
                </h4>
                <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {richData.context_preview}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Confidence Score</div>
                <div className="font-medium text-slate-800 flex items-center gap-2">
                  <div className="flex-1">
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-teal-500"
                        style={{ width: `${(primaryTreatment?.confidence || 0) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold">
                    {((primaryTreatment?.confidence || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Treatment</div>
                {primaryTreatment && (
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getTreatmentColor(primaryTreatment.treatment)}`}>
                    {React.createElement(getTreatmentIcon(primaryTreatment.treatment), { className: "w-4 h-4" })}
                    {primaryTreatment.treatment}
                  </div>
                )}
              </div>
            </div>

            {/* Source Badge */}
            {isFromDatabase && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm text-purple-700">
                  <Database className="w-4 h-4" />
                  <span>Retrieved from database</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'treatments' && selected.acts && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800">All Treatments</h4>
              <span className="text-sm text-slate-500">{selected.acts.length} occurrences</span>
            </div>
            
            <div className="space-y-3">
              {selected.acts.map((act, i) => {
                const Icon = getTreatmentIcon(act.treatment);
                const colorClass = getTreatmentColor(act.treatment);
                
                return (
                  <div key={i} className="p-4 bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
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
                        {act.act_id && (
                          <div className="mt-1 text-xs text-slate-400">
                            ID: {act.act_id}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Confidence bar */}
                    <div className="mt-2">
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-teal-500"
                          style={{ width: `${act.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Context preview - Only show if available */}
                    {act.context_preview && (
                      <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                        {act.context_preview}
                      </p>
                    )}
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
                  <div className="text-sm text-slate-500 mb-2">Treatment Analysis</div>
                  <div className="text-slate-800">
                    {selected.acts && selected.acts.length > 0 ? (
                      <>
                        This act appears in {selected.acts.length} contexts with 
                        treatment <span className="font-semibold">{selected.acts[0].treatment}</span> 
                        ({(selected.acts[0].confidence * 100).toFixed(1)}% confidence).
                        {selected.acts.length > 1 && ` ${selected.acts.length - 1} additional contexts show varying treatments.`}
                      </>
                    ) : (
                      'No treatment patterns identified for this act.'
                    )}
                  </div>
                </div>
                
                <div className="p-4 bg-white/80 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-500 mb-2">Case Context</div>
                  <div className="text-slate-800">
                    Found in case <span className="font-medium">{richData?.case_title || selected.case_title || 'Unknown'}</span>
                    {selected.year && ` (${selected.year})`}
                  </div>
                </div>
                
                {richData?.context_preview && (
                  <div className="p-4 bg-white/80 rounded-lg border border-slate-200">
                    <div className="text-sm text-slate-500 mb-2">Context Preview</div>
                    <div className="text-sm text-slate-700 italic">
                      "{richData.context_preview}"
                    </div>
                  </div>
                )}
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
            <span className="font-medium text-slate-700">{copied ? 'Copied!' : 'Copy Act ID'}</span>
          </button>
          
          <button
            onClick={saveSnapshot}
            className="py-3 px-4 bg-gradient-to-r from-white to-slate-50 border border-slate-300 rounded-xl hover:border-indigo-400 hover:shadow-sm transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            <Download className="w-4 h-4 text-slate-600 group-hover:text-indigo-600" />
            <span className="font-medium text-slate-700">Save Data</span>
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200">
          <Button className="w-full py-3 px-4 font-medium rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 flex items-center justify-center gap-2 group">
            <FileJson className="w-5 h-5" />
            <span>View Raw JSON</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}