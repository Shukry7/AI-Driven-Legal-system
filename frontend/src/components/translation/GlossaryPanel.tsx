import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, BookOpen, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getGlossary } from '@/config/api';
import type { GlossaryTerm } from '@/config/api';

interface GlossaryPanelProps {
  onBack: () => void;
}

export function GlossaryPanel({ onBack }: GlossaryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGlossary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const category = selectedCategory === 'All' ? undefined : selectedCategory;
      const search = searchQuery.trim() || undefined;
      const data = await getGlossary(category, search);
      setTerms(data.terms || []);
      // Build category list from data
      if (data.categories) {
        setCategories(['All', ...data.categories]);
      }
    } catch (err: any) {
      setError(err?.error || 'Failed to load glossary');
      toast.error('Failed to load glossary');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  // Fetch on mount
  useEffect(() => {
    fetchGlossary();
  }, [fetchGlossary]);

  // Filter locally for instant feedback (API also filters but this avoids debounce delay)
  const filteredTerms = terms.filter(term => {
    const matchesSearch = !searchQuery.trim() ||
      term.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.si.includes(searchQuery) ||
      term.ta.includes(searchQuery);
    const matchesCategory = selectedCategory === 'All' || term.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = cat === 'All' 
      ? terms.length 
      : terms.filter(t => t.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Legal Glossary
          </h2>
          <p className="text-muted-foreground mt-1">
            Trilingual legal terminology database supporting accurate translations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Term
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">{terms.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Terms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">3</p>
            <p className="text-sm text-muted-foreground mt-1">Languages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">{categories.length - 1}</p>
            <p className="text-sm text-muted-foreground mt-1">Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">
              {loading ? '—' : '98%'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Coverage Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search terms in any language..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat} ({categoryCounts[cat]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Glossary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Terms Database</CardTitle>
          <CardDescription>
            Legal terminology recognized by the translation model
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading glossary...</span>
            </div>
          )}

          {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-1/4">
                    English
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-1/4">
                    Sinhala (සිංහල)
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-1/4">
                    Tamil (தமிழ்)
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-1/4">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTerms.map((term) => (
                  <tr 
                    key={term.id} 
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-foreground">{term.en}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-foreground">{term.si}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-foreground">{term.ta}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-xs">
                        {term.category}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {!loading && filteredTerms.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No terms found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Panel */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">How the Glossary Improves Translation Quality</p>
              <p className="text-sm text-muted-foreground mt-1">
                The mBART model references this glossary during translation to ensure legal terms are 
                translated consistently and accurately. Terms in this database are prioritized over 
                general translations, maintaining legal precision across all three languages.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
