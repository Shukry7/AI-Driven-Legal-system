import { useState } from 'react';
import { Search, Plus, BookOpen, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const glossaryTerms = [
  { id: 1, en: 'Plaintiff', si: 'පැමිණිලිකරු', ta: 'வாதி', category: 'Civil Law' },
  { id: 2, en: 'Defendant', si: 'විත්තිකරු', ta: 'பிரதிவாதி', category: 'Civil Law' },
  { id: 3, en: 'District Court', si: 'දිසා අධිකරණය', ta: 'மாவட்ட நீதிமன்றம்', category: 'Courts' },
  { id: 4, en: 'Supreme Court', si: 'ශ්‍රේෂ්ඨාධිකරණය', ta: 'உச்ச நீதிமன்றம்', category: 'Courts' },
  { id: 5, en: 'Appeal', si: 'අභියාචනය', ta: 'மேல்முறையீடு', category: 'Civil Law' },
  { id: 6, en: 'Judgment', si: 'තීන්දුව', ta: 'தீர்ப்பு', category: 'General Legal' },
  { id: 7, en: 'Contract', si: 'ගිවිසුම', ta: 'ஒப்பந்தம்', category: 'Contract Law' },
  { id: 8, en: 'Agreement', si: 'එකඟතාවය', ta: 'உடன்படிக்கை', category: 'Contract Law' },
  { id: 9, en: 'Breach', si: 'කඩකිරීම', ta: 'மீறல்', category: 'Contract Law' },
  { id: 10, en: 'Damages', si: 'වන්දි', ta: 'சேதங்கள்', category: 'Civil Law' },
  { id: 11, en: 'Injunction', si: 'විනිවිද බලපත්‍ර', ta: 'தடை உத்தரவு', category: 'Civil Law' },
  { id: 12, en: 'Affidavit', si: 'දිවුරුම් ප්‍රකාශය', ta: 'சத்தியப் பிரமாணம்', category: 'General Legal' },
  { id: 13, en: 'Petition', si: 'පෙත්සම', ta: 'மனு', category: 'General Legal' },
  { id: 14, en: 'Statute', si: 'පනත', ta: 'சட்டம்', category: 'General Legal' },
  { id: 15, en: 'Liability', si: 'වගකීම', ta: 'பொறுப்பு', category: 'Civil Law' }
];

const categories = ['All', 'Civil Law', 'Contract Law', 'Courts', 'General Legal'];

interface GlossaryPanelProps {
  onBack: () => void;
}

export function GlossaryPanel({ onBack }: GlossaryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredTerms = glossaryTerms.filter(term => {
    const matchesSearch = 
      term.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.si.includes(searchQuery) ||
      term.ta.includes(searchQuery);
    const matchesCategory = selectedCategory === 'All' || term.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = cat === 'All' 
      ? glossaryTerms.length 
      : glossaryTerms.filter(t => t.category === cat).length;
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
            <p className="text-2xl font-bold text-foreground">{glossaryTerms.length}</p>
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
            <p className="text-2xl font-bold text-foreground">4</p>
            <p className="text-sm text-muted-foreground mt-1">Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">98%</p>
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

          {filteredTerms.length === 0 && (
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
