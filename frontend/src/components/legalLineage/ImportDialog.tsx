import React, { useRef } from 'react';
import { X, Upload, FolderOpen, Link as LinkIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
  onDriveImport?: () => void;
  onLinkImport?: () => void;
}

export default function ImportDialog({
  isOpen,
  onClose,
  onFileSelect,
  onDriveImport,
  onLinkImport
}: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Invalid file type', {
        description: 'Please select a PDF file',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 10MB',
      });
      return;
    }

    onFileSelect(file);
    onClose();
  };

  const handleLocalFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Import PDF File</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Import Options */}
        <div className="space-y-3">
          {/* Local File Option */}
          <button
            onClick={handleLocalFileClick}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200 group"
          >
            <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-medium text-slate-800 group-hover:text-indigo-700">Local File</h4>
              <p className="text-sm text-slate-500">Upload from your computer</p>
            </div>
          </button>

          {/* Google Drive Option */}
          {onDriveImport && (
            <button
              onClick={onDriveImport}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200 group"
            >
              <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl group-hover:scale-110 transition-transform">
                <FolderOpen className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-medium text-slate-800 group-hover:text-indigo-700">Google Drive</h4>
                <p className="text-sm text-slate-500">Import from Google Drive</p>
              </div>
            </button>
          )}

          {/* Link Option */}
          {onLinkImport && (
            <button
              onClick={onLinkImport}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200 group"
            >
              <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl group-hover:scale-110 transition-transform">
                <LinkIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-medium text-slate-800 group-hover:text-indigo-700">Shareable Link</h4>
                <p className="text-sm text-slate-500">Import from URL</p>
              </div>
            </button>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />

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