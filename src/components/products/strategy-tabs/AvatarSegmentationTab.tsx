import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, User, Briefcase, Heart, Target } from 'lucide-react';

interface BriefData {
  targetGender?: string;
  targetAgeRange?: string;
  targetOccupation?: string;
  targetInterests?: string[];
  targetHabits?: string;
  idealScenario?: string;
}

interface AvatarSegmentationTabProps {
  briefData?: BriefData | null;
}

export function AvatarSegmentationTab({ briefData }: AvatarSegmentationTabProps) {
  if (!briefData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Completa el Brief IA para ver la segmentación de avatares</p>
      </div>
    );
  }

  const demographics = [
    { label: 'Género', value: briefData.targetGender },
    { label: 'Rango de Edad', value: briefData.targetAgeRange },
    { label: 'Ocupación', value: briefData.targetOccupation },
  ].filter(d => d.value);

  const interests = briefData.targetInterests || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Perfil Demográfico
          </CardTitle>
          <CardDescription>Características básicas del cliente ideal</CardDescription>
        </CardHeader>
        <CardContent>
          {demographics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {demographics.map(({ label, value }) => (
                <div key={label} className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="font-medium text-sm">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay datos demográficos definidos</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            Intereses
          </CardTitle>
          <CardDescription>Temas y actividades que le interesan</CardDescription>
        </CardHeader>
        <CardContent>
          {interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Badge key={interest} variant="secondary">{interest}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay intereses definidos</p>
          )}
        </CardContent>
      </Card>

      {briefData.targetHabits && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-amber-500" />
              Hábitos y Comportamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{briefData.targetHabits}</p>
          </CardContent>
        </Card>
      )}

      {briefData.idealScenario && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Escenario Ideal de Uso
            </CardTitle>
            <CardDescription>Cuándo y cómo el cliente usaría el producto</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{briefData.idealScenario}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
