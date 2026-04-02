import { useState, useCallback } from 'react';
import { Hash, Plus, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface HashtagManagerProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
  maxHashtags?: number;
}

// Common hashtag suggestions by category
const SUGGESTED_GROUPS: Record<string, string[]> = {
  'Marketing': ['marketing', 'digitalmarketing', 'socialmedia', 'branding', 'contentmarketing'],
  'Creadores': ['creator', 'contentcreator', 'influencer', 'creatorlife', 'ugc'],
  'Crecimiento': ['growth', 'socialmediagrowth', 'engagement', 'viral', 'trending'],
};

export function HashtagManager({ hashtags, onChange, maxHashtags = 30 }: HashtagManagerProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addHashtag = useCallback((tag: string) => {
    const cleaned = tag.trim().replace(/^#/, '').toLowerCase();
    if (!cleaned) return;
    if (hashtags.includes(cleaned)) return;
    if (hashtags.length >= maxHashtags) return;
    onChange([...hashtags, cleaned]);
  }, [hashtags, onChange, maxHashtags]);

  const handleInputSubmit = () => {
    // Support comma/space separated tags
    const tags = input.split(/[,\s]+/).filter(Boolean);
    const newTags = [...hashtags];
    for (const tag of tags) {
      const cleaned = tag.replace(/^#/, '').toLowerCase();
      if (cleaned && !newTags.includes(cleaned) && newTags.length < maxHashtags) {
        newTags.push(cleaned);
      }
    }
    onChange(newTags);
    setInput('');
  };

  const removeHashtag = (tag: string) => {
    onChange(hashtags.filter(t => t !== tag));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-1">
          <Hash className="w-3.5 h-3.5" /> Hashtags
        </Label>
        <span className="text-[10px] text-muted-foreground">
          {hashtags.length}/{maxHashtags}
        </span>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleInputSubmit(); }
          }}
          placeholder="Agrega hashtags (separados por coma o espacio)..."
          className="flex-1"
        />
        <Button size="sm" variant="outline" onClick={handleInputSubmit} disabled={!input.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowSuggestions(!showSuggestions)}
          title="Sugerencias"
        >
          <Sparkles className="w-4 h-4" />
        </Button>
      </div>

      {/* Tags */}
      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1 text-xs">
              #{tag}
              <button onClick={() => removeHashtag(tag)} className="hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && (
        <div className="p-3 rounded-sm bg-muted/30 border space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sugerencias</p>
          {Object.entries(SUGGESTED_GROUPS).map(([group, tags]) => (
            <div key={group} className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">{group}</p>
              <div className="flex flex-wrap gap-1">
                {tags.map(tag => {
                  const isAdded = hashtags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => !isAdded && addHashtag(tag)}
                      disabled={isAdded}
                      className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                        isAdded
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
