import React from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface FileSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  files: string[];
  onSelect: (filename: string) => void;
  title?: string;
}

export default function FileSelectionDialog({
  isOpen,
  onClose,
  files,
  onSelect,
  title = 'Select a file to process'
}: FileSelectionDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* File List */}
        {files.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map((file) => (
              <button
                key={file}
                onClick={() => {
                  onSelect(file);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200 group"
              >
                <div className="p-2 bg-gradient-to-r from-indigo-100 to-teal-100 rounded-lg group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="flex-1 text-left text-sm font-medium text-slate-700 group-hover:text-indigo-700">
                  {file}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No files available</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}