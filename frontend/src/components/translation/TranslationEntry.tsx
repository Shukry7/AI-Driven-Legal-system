import { Plus, FileText, Download, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TranslationJob {
  id: string;
  caseId: string;
  fileName: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'completed' | 'processing' | 'pending';
  createdAt: string;
}

const mockJobs: TranslationJob[] = [
  {
    id: '1',
    caseId: 'CASE-2024-0341',
    fileName: 'Plaintiff_Statement.pdf',
    sourceLanguage: 'English',
    targetLanguage: 'Sinhala',
    status: 'completed',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    caseId: 'CASE-2024-0298',
    fileName: 'Contract_Agreement.docx',
    sourceLanguage: 'Tamil',
    targetLanguage: 'English',
    status: 'processing',
    createdAt: '2024-01-14'
  },
  {
    id: '3',
    caseId: 'CASE-2024-0312',
    fileName: 'Court_Order_Final.pdf',
    sourceLanguage: 'Sinhala',
    targetLanguage: 'English',
    status: 'completed',
    createdAt: '2024-01-13'
  },
  {
    id: '4',
    caseId: 'CASE-2024-0355',
    fileName: 'Witness_Testimony.pdf',
    sourceLanguage: 'English',
    targetLanguage: 'Tamil',
    status: 'pending',
    createdAt: '2024-01-12'
  }
];

interface TranslationEntryProps {
  onStartNew: () => void;
  onSelectJob: (jobId: string) => void;
}

export function TranslationEntry({ onStartNew, onSelectJob }: TranslationEntryProps) {
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
        <StatsCard label="Total Translations" value="156" />
        <StatsCard label="This Month" value="24" />
        <StatsCard label="Avg. Processing Time" value="2.3 min" />
        <StatsCard label="Languages Supported" value="3" />
      </div>

      {/* Recent Translations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Recent Translation Jobs</CardTitle>
          <CardDescription>View and manage your translation history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Case ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">File Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Translation</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockJobs.map((job) => (
                  <tr 
                    key={job.id} 
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onSelectJob(job.id)}
                  >
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium">{job.caseId}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{job.fileName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {job.sourceLanguage} → {job.targetLanguage}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">{job.createdAt}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {job.status === 'completed' && (
                        <Button variant="ghost" size="sm" className="gap-1">
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
