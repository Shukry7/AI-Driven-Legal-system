import { useState, useEffect } from 'react';
import { Plus, FileText, Download, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getTranslationHistory, exportTranslation } from '@/config/api';
import type { TranslationJobSummary } from '@/config/api';

interface TranslationEntryProps {
  onStartNew: () => void;
  onSelectJob: (jobId: string) => void;
}

export function TranslationEntry({ onStartNew, onSelectJob }: TranslationEntryProps) {
  const [jobs, setJobs] = useState<TranslationJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTranslationHistory();
      setJobs(data.jobs || []);
    } catch (err: any) {
      setError(err?.error || 'Failed to load translation history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent, jobId: string, fileName: string) => {
    e.stopPropagation();
    try {
      const blob = await exportTranslation(jobId, 'pdf');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.[^.]+$/, '')}_translated.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded successfully');
    } catch (err: any) {
      toast.error(err?.error || 'Download failed');
    }
  };

  // Compute stats from real data
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const totalTranslations = jobs.length;
  const thisMonth = jobs.filter(j => {
    const d = new Date(j.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const avgTime = completedJobs.length > 0
    ? (completedJobs.reduce((sum, j) => sum + (j.processing_time || 0), 0) / completedJobs.length).toFixed(1) + 's'
    : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Multilingual Translation</h2>
          <p className="text-muted-foreground mt-1">
            Translate legal documents across English, Sinhala, and Tamil using our fine-tuned AI model.
          </p>
        </div>
        <Button onClick={onStartNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Start New Translation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard label="Total Translations" value={String(totalTranslations)} />
        <StatsCard label="This Month" value={String(thisMonth)} />
        <StatsCard label="Avg. Processing Time" value={avgTime} />
        <StatsCard label="Languages Supported" value="3" />
      </div>

      {/* Recent Translations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Recent Translation Jobs</CardTitle>
          <CardDescription>View and manage your translation history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
              <Button variant="ghost" size="sm" onClick={fetchHistory}>Retry</Button>
            </div>
          )}

          {!loading && !error && jobs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No translations yet. Start your first one!</p>
            </div>
          )}

          {!loading && !error && jobs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Job ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">File Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Translation</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr 
                      key={job.job_id} 
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => onSelectJob(job.job_id)}
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium font-mono">{job.job_id.slice(0, 8)}...</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{job.filename}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {job.source_language} → {job.target_language}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {new Date(job.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {job.status === 'completed' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-1"
                            onClick={(e) => handleDownload(e, job.job_id, job.filename)}
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: TranslationJob['status'] }) {
  const config = {
    completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
    processing: { label: 'Processing', icon: Loader2, className: 'bg-accent/10 text-accent border-accent/20' },
    pending: { label: 'Pending', icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' }
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={className}>
      <Icon className={`w-3 h-3 mr-1 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {label}
    </Badge>
  );
}
