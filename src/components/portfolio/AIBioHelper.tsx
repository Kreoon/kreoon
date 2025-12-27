import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, Loader2, Check, Copy } from 'lucide-react';
import { usePortfolioAI } from '@/hooks/usePortfolioAI';
import { toast } from 'sonner';

interface AIBioHelperProps {
  currentBio: string;
  profession?: string;
  skills?: string;
  onApply: (newBio: string) => void;
}

export function AIBioHelper({ currentBio, profession, skills, onApply }: AIBioHelperProps) {
  const [open, setOpen] = useState(false);
  const [improvedBio, setImprovedBio] = useState('');
  const [changes, setChanges] = useState<string[]>([]);
  const { improveBio, loading } = usePortfolioAI();

  const handleGenerate = async () => {
    const result = await improveBio(currentBio, profession, skills);
    if (result) {
      setImprovedBio(result.improved_bio);
      setChanges(result.key_changes || []);
    }
  };

  const handleApply = () => {
    onApply(improvedBio);
    setOpen(false);
    toast.success('Bio actualizada');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(improvedBio);
    toast.success('Copiado al portapapeles');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Mejorar con IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Asistente de Bio
          </DialogTitle>
          <DialogDescription>
            Mejora tu biografía con inteligencia artificial
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current bio */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Bio actual</label>
            <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
              {currentBio || <span className="text-muted-foreground italic">Sin biografía</span>}
            </div>
          </div>

          {/* Generate button */}
          {!improvedBio && (
            <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar Bio Mejorada
                </>
              )}
            </Button>
          )}

          {/* Result */}
          {improvedBio && (
            <>
              <div>
                <label className="text-sm font-medium">Bio mejorada</label>
                <Textarea
                  value={improvedBio}
                  onChange={(e) => setImprovedBio(e.target.value)}
                  className="mt-1 min-h-[100px]"
                />
              </div>

              {changes.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <span className="font-medium">Cambios realizados:</span>
                  <ul className="list-disc list-inside">
                    {changes.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleApply} className="flex-1 gap-2">
                  <Check className="h-4 w-4" />
                  Aplicar
                </Button>
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={handleGenerate} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regenerar'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
