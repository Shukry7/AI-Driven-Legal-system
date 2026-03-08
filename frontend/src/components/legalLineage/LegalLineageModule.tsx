import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import LineageMap from './LineageMap';
import ErrorBoundary from './ErrorBoundry';
import CaseDetailsPanel from './CaseDetailsPanel';
import FileSelectionDialog from './FileSelectionDialog';
import ImportDialog from './ImportDialog';
import { 
  analyzeAct, 
  uploadAndAnalyzeLineage,
  convertSearchResultsToCaseNodes,
  createEdgesFromSearchResults,
  type ActSearchResultItem,
  searchExactAct,
  listUploadedFiles
} from '@/config/api';
import type { CaseNode, ActTreatment } from '@/config/api';
import { 
  FileText,
  Layers,
  Download,
  Share2,
  TrendingUp,
  Eye,
  Upload,
  CircleCheckBig,
  Table as TableIcon,
  Scale,
  ChartNetwork,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
  FolderOpen,
  FileUp
} from 'lucide-react';
import { Button } from '../ui/button';

export default function LegalLineageModule() {
  const [selectedAct, setSelectedAct] = useState<CaseNode | null>(null);
  const [actsList, setActsList] = useState<CaseNode[]>([]);
  const [graphNodes, setGraphNodes] = useState<CaseNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [view, setView] = useState<'table' | 'map' | 'translations' | 'clauses'>('table');
  const [processedFilename, setProcessedFilename] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [searchResults, setSearchResults] = useState<ActSearchResultItem[]>([]);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  
  // Dialog states
  const [showFileSelection, setShowFileSelection] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Check for available files in uploads folder on component mount
  useEffect(() => {
    checkAvailableFiles();
  }, []);

  // Function to check available files
  const checkAvailableFiles = async () => {
    try {
      const files = await listUploadedFiles();
      setAvailableFiles(files);
    } catch (error) {
      console.error('Error checking available files:', error);
    }
  };

  // Function to handle Process button click
  const handleProcessClick = async () => {
    const files = await listUploadedFiles();
    setAvailableFiles(files);
    
    if (files.length === 0) {
      toast.warning('No files available', {
        position: 'top-right',
        description: 'Please import a file first',
        icon: <Info className="h-4 w-4" />,
      });
      return;
    }
    
    if (files.length === 1) {
      // Auto-process the single file
      await handleProcessPDF(files[0]);
    } else {
      // Show selection dialog for multiple files
      setShowFileSelection(true);
    }
  };

  // Function to process selected PDF
  async function handleProcessPDF(filename: string) {
    setProcessing(true);
    setView('table');
    
    const toastId = toast.loading('Processing PDF file...', {
      description: `Analyzing ${filename}`,
    });
    
    try {
      const result = await analyzeAct(filename);
      setActsList(result.nodes);
      setProcessedFilename(result.filename);
      setSelectedAct(null);
      setGraphNodes([]);
      setGraphEdges([]);
      setSearchResults([]);
      
      toast.success('PDF processed successfully!', {
        position: 'top-right',
        id: toastId,
        description: `Found ${result.nodes.length} acts in ${result.filename}`,
        icon: <CheckCircle2 className="text-green-500 h-4 w-4" />,
      });
    } catch (error: any) {
      console.error('Error processing PDF:', error);
      toast.error('Failed to process PDF', {
        position: 'top-right',
        id: toastId,
        description: error.message || 'An unexpected error occurred',
        icon: <XCircle className="text-red-500 h-4 w-4" />,
      });
    } finally {
      setProcessing(false);
    }
  }

  // Function to handle file upload
  async function handleFileUpload(file: File) {
    setUploadedFile(file);
    setProcessing(true);
    setView('table');

    const toastId = toast.loading('Uploading and analyzing file...', {
      description: file.name,
    });

    try {
      const result = await uploadAndAnalyzeLineage(file);
      setActsList(result.nodes);
      setProcessedFilename(result.filename);
      setSelectedAct(null);
      setGraphNodes([]);
      setGraphEdges([]);
      setSearchResults([]);
      
      // Refresh available files list
      await checkAvailableFiles();
      
      toast.success('File uploaded and analyzed successfully!', {
        position: 'top-right',
        id: toastId,
        description: `Found ${result.nodes.length} acts in ${result.filename}`,
        icon: <CheckCircle2 className="text-green-500 h-4 w-4" />,
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload and analyze file', {
        position: 'top-right',
        id: toastId,
        description: error.message || 'An unexpected error occurred',
        icon: <XCircle className="text-red-500 h-4 w-4" />,
      });
    } finally {
      setProcessing(false);
    }
  }

  // Handle Google Drive import (placeholder)
  const handleDriveImport = () => {
    toast.info('Google Drive integration coming soon', {
      position: 'top-right',
      description: 'This feature will be available in the next update',
    });
    setShowImportDialog(false);
  };

  // Handle link import (placeholder)
  const handleLinkImport = () => {
    toast.info('Link import coming soon', {
      position: 'top-right',
      description: 'This feature will be available in the next update',
    });
    setShowImportDialog(false);
  };

  // Handle viewing a specific act in the graph
  async function handleViewAct(act: CaseNode) {
    setSelectedAct(act);
    setSearchLoading(true);
    
    const toastId = toast.loading('Searching for similar acts...', {
      position: 'top-right',
      description: `Looking for "${act.title}" in database`,
    });
    
    try {
      // Use EXACT search only - no fuzzy matching
      const searchResponse = await searchExactAct(act.title);
      setSearchResults(searchResponse.results);
      
      // Convert search results to graph nodes and edges
      const nodes = convertSearchResultsToCaseNodes(searchResponse.results, act.title);
      const edges = createEdgesFromSearchResults(act.title, searchResponse.results, nodes);
      
      setGraphNodes(nodes);
      setGraphEdges(edges);
      setView('map');
      
      if (searchResponse.results.length > 0) {
        toast.success(`Found ${searchResponse.results.length} similar acts`, {
          position: 'top-right',
          id: toastId,
          description: `Displaying lineage map with ${nodes.length - 1} related cases`,
          icon: <CheckCircle2 className="text-green-500 h-4 w-4" />,
        });
      } else {
        toast.info('No similar acts found', {
          position: 'top-right',
          id: toastId,
          description: 'Displaying single act view',
          icon: <Info className="h-4 w-4" />,
        });
      }
    } catch (error: any) {
      console.error('Error searching for exact act:', error);
      
      // Fallback to single node view if search fails
      setGraphNodes([act]);
      setGraphEdges([]);
      setView('map');
      
      toast.error('Failed to search for similar acts', {
        position: 'top-right',
        id: toastId,
        description: error.message || 'Displaying single act view',
        icon: <XCircle className="text-red-500 h-4 w-4" />,
      });
    } finally {
      setSearchLoading(false);
    }
  }

  // Handle clicking on a graph node
  function handleNodeSelect(node: CaseNode) {
    setSelectedAct(node);
    toast.info(`Selected: ${node.title}`, {
      position: 'top-right',
      description: `Node ID: ${node.id}`,
      duration: 2000,
    });
  }

  // Handle export graph
  function handleExportGraph() {
    try {
      const evt = new CustomEvent('exportGraph');
      window.dispatchEvent(evt);
      toast.success('Exporting graph...', {
        position: 'top-right',
        description: 'Your download will start shortly',
      });
    } catch (error: any) {
      toast.error('Failed to export graph', {
        position: 'top-right',
        description: error.message || 'An unexpected error occurred',
      });
    }
  }

  // Get treatment color class
  const getTreatmentColor = (treatment?: string) => {
    switch (treatment) {
      case 'FOLLOWED': return 'bg-green-100 text-green-700';
      case 'OVERRULED': return 'bg-red-100 text-red-700';
      case 'DISTINGUISHED': return 'bg-amber-100 text-amber-700';
      case 'APPLIED': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Dialogs */}
      <FileSelectionDialog
        isOpen={showFileSelection}
        onClose={() => setShowFileSelection(false)}
        files={availableFiles}
        onSelect={handleProcessPDF}
        title="Select a PDF file to process"
      />

      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onFileSelect={handleFileUpload}
        onDriveImport={handleDriveImport}
        onLinkImport={handleLinkImport}
      />

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Hero Section */}
        <div className="mb-8 p-8 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg shadow-blue-100/30">
          <div className="flex items-center gap-3 mb-4">
            <Button className="p-3 rounded-xl">
              <ChartNetwork className="w-5 text-white" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                Legal Lineage Visualization
              </h1>
              <p className="text-slate-600 mt-1">Analyze act treatments and find similar cases</p>
            </div>
          </div>

          {/* Buttons Row */}
          <div className="flex justify-center gap-4">
            {/* Process uploaded file button */}
            <Button
              onClick={handleProcessClick}
              disabled={processing}
              className="min-w-[200px]"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FolderOpen className="w-5 h-5 mr-2" />
                  Process uploaded file
                </>
              )}
            </Button>

            {/* Import file button */}
            <Button
              onClick={() => setShowImportDialog(true)}
              disabled={processing}
              variant="secondary"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp className="w-5 h-5 mr-2" />
                  Import file
                </>
              )}
            </Button>
          </div>

          {processedFilename && !processing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-primary">
              <CircleCheckBig className="h-5 w-5 text-primary" />
              <span>
                Processed: {processedFilename}
                {uploadedFile && ` (uploaded: ${uploadedFile.name})`}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* View Toggle */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl p-1 shadow-sm">
                {[
                  { key: 'table', icon: Scale, label: 'Acts' },
                  { key: 'map', icon: Layers, label: 'Lineage Map' },
                ].map(({ key, icon: Icon, label }) => (
                  <Button
                    key={key}
                    onClick={() => setView(key as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                      view === key
                        ? ''
                        : 'text-gray-400 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Processing Indicator */}
            {processing && (
              <div className="mb-6 p-6 bg-gradient-to-r from-indigo-50 to-teal-50/50 backdrop-blur-sm border border-indigo-100 rounded-2xl shadow-sm animate-pulse-subtle">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-950 to-cyan-500 animate-spin-slow">
                      <div className="absolute inset-2 bg-white rounded-full"></div>
                    </div>
                    <Scale className="w-6 h-6 text-purple-950 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-primary">AI Processing Active</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">
                      {uploadedFile 
                        ? `Uploading and analyzing: ${uploadedFile.name}...` 
                        : 'Processing file...'}
                    </p>
                    <div className="mt-3 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-950 to-cyan-500" 
                        style={{ 
                          width: '100%',
                          animation: 'right 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Acts Table View */}
            {view === 'table' && (
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-slate-700">
                      Acts Found ({actsList.length})
                    </h3>
                  </div>
                  {actsList.length > 0 && (
                    <span className="text-xs text-slate-500">
                      Click View to see lineage
                    </span>
                  )}
                </div>
                
                {actsList.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                          <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">ID</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">Act</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">Treatment</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">Confidence</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {actsList.map((act) => {
                          const mainTreatment = act.acts?.[0];
                          const isLoading = searchLoading && selectedAct?.id === act.id;
                          
                          return (
                            <tr
                              key={act.id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                selectedAct?.id === act.id ? 'bg-gradient-to-r from-indigo-50/50 to-teal-50/50' : ''
                              }`}
                            >
                              <td className="py-3 px-4">
                                <span className="font-mono text-sm bg-slate-100 text-slate-600 px-2 py-1 rounded whitespace-nowrap">
                                  {act.id.split('-').slice(0,2).join('-')}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-800">{act.title}</td>
                              <td className="py-3 px-4">
                                {mainTreatment && (
                                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getTreatmentColor(mainTreatment.treatment)}`}>
                                    {mainTreatment.treatment}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {mainTreatment && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-primary to-cyan-800"
                                        style={{ width: `${mainTreatment.confidence * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-sm text-slate-600">
                                      {(mainTreatment.confidence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  onClick={() => handleViewAct(act)}
                                  size="sm"
                                  className="font-light min-w-[70px]"
                                  disabled={searchLoading}
                                >
                                  {isLoading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      ...
                                    </>
                                  ) : (
                                    'View'
                                  )}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    {processing ? 'Processing...' : 'No acts found. Please process a file first.'}
                  </div>
                )}
              </div>
            )}

            {/* Lineage Map View */}
            {view === 'map' && graphNodes.length > 0 && (
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-500" />
                      Act Lineage: {selectedAct?.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Eye className="w-4 h-4" />
                      <span>{graphNodes.length - 1} similar acts found</span>
                    </div>
                  </div>
                  {searchResults.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Found {searchResults.length} similar acts in the database
                    </p>
                  )}
                </div>
                <ErrorBoundary>
                  <LineageMap 
                    nodes={graphNodes} 
                    edges={graphEdges} 
                    onSelectNode={handleNodeSelect} 
                  />
                </ErrorBoundary>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-96 space-y-6">
            {/* Act Details */}
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <CaseDetailsPanel selected={selectedAct} />
            </div>

            {/* Quick Actions */}
            {actsList.length > 0 && (
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={handleExportGraph}
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
                  
                  <button 
                    onClick={() => {
                      toast.info('Share feature coming soon', {
                        position: 'top-right',
                        description: 'This feature will be available in the next update',
                      });
                    }}
                    className="w-full p-4 bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-lg transition-all duration-300 group"
                  >
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