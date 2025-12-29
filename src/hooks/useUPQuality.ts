import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QualityScore {
  user_id: string;
  overall_score: number;
  breakdown: {
    timeliness: number;       // Puntualidad en entregas
    content_quality: number;  // Calidad del contenido
    collaboration: number;    // Colaboración con el equipo
    consistency: number;      // Consistencia en el trabajo
    engagement: number;       // Engagement generado
  };
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
  recommendations: string[];
  risk_level: 'low' | 'medium' | 'high';
  analyzed_at: string;
}

export interface FraudAlert {
  id: string;
  user_id: string;
  alert_type: 'suspicious_activity' | 'point_manipulation' | 'fake_engagement' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface AntiFraudAnalysis {
  user_id: string;
  risk_score: number;
  alerts: FraudAlert[];
  patterns_detected: {
    pattern: string;
    confidence: number;
    description: string;
  }[];
  recommendation: string;
  analyzed_at: string;
}

export function useUPQuality(organizationId?: string) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [fraudAnalysis, setFraudAnalysis] = useState<AntiFraudAnalysis | null>(null);

  // Calculate quality score for a user
  const calculateQualityScore = useCallback(async (userId: string): Promise<QualityScore | null> => {
    if (!organizationId) {
      toast({ title: 'Error', description: 'Organización no encontrada', variant: 'destructive' });
      return null;
    }

    setLoading('quality');
    try {
      // Fetch user's content data for analysis
      const { data: contents } = await supabase
        .from('content')
        .select('id, status, deadline, delivered_at, created_at, likes_count, views_count')
        .eq('creator_id', userId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!contents || contents.length === 0) {
        const emptyScore: QualityScore = {
          user_id: userId,
          overall_score: 50,
          breakdown: {
            timeliness: 50,
            content_quality: 50,
            collaboration: 50,
            consistency: 50,
            engagement: 50
          },
          trend: 'stable',
          trend_percentage: 0,
          recommendations: ['Completa más contenidos para obtener un análisis más preciso'],
          risk_level: 'low',
          analyzed_at: new Date().toISOString()
        };
        setQualityScore(emptyScore);
        return emptyScore;
      }

      // Calculate timeliness score
      const deliveredContents = contents.filter(c => c.delivered_at && c.deadline);
      let timelinessScore = 70;
      if (deliveredContents.length > 0) {
        const onTimeCount = deliveredContents.filter(c => 
          new Date(c.delivered_at!) <= new Date(c.deadline!)
        ).length;
        timelinessScore = Math.round((onTimeCount / deliveredContents.length) * 100);
      }

      // Calculate engagement score
      const totalViews = contents.reduce((sum, c) => sum + (c.views_count || 0), 0);
      const totalLikes = contents.reduce((sum, c) => sum + (c.likes_count || 0), 0);
      const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
      const engagementScore = Math.min(100, Math.round(engagementRate * 10 + 50));

      // Calculate consistency (based on content frequency)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentContents = contents.filter(c => new Date(c.created_at) >= thirtyDaysAgo);
      const consistencyScore = Math.min(100, Math.round((recentContents.length / 4) * 100));

      // Calculate content quality (based on delivered rate)
      const approvedContents = contents.filter(c => 
        c.status === 'delivered' || c.status === 'paid'
      );
      const qualityScore = contents.length > 0 
        ? Math.round((approvedContents.length / contents.length) * 100)
        : 50;

      // Collaboration score (placeholder - would need more data)
      const collaborationScore = 75;

      // Calculate overall score
      const overall = Math.round(
        (timelinessScore * 0.25) +
        (qualityScore * 0.25) +
        (collaborationScore * 0.15) +
        (consistencyScore * 0.15) +
        (engagementScore * 0.20)
      );

      // Determine trend
      const trend = overall >= 70 ? 'up' : overall >= 50 ? 'stable' : 'down';
      const trendPercentage = Math.abs(overall - 65);

      // Generate recommendations
      const recommendations: string[] = [];
      if (timelinessScore < 70) {
        recommendations.push('Mejora la puntualidad en tus entregas para aumentar tu puntuación');
      }
      if (engagementScore < 60) {
        recommendations.push('Enfócate en crear contenido más engaging para tu audiencia');
      }
      if (consistencyScore < 50) {
        recommendations.push('Mantén una frecuencia de creación más constante');
      }
      if (qualityScore < 70) {
        recommendations.push('Revisa los lineamientos para mejorar la tasa de aprobación');
      }

      const score: QualityScore = {
        user_id: userId,
        overall_score: overall,
        breakdown: {
          timeliness: timelinessScore,
          content_quality: qualityScore,
          collaboration: collaborationScore,
          consistency: consistencyScore,
          engagement: engagementScore
        },
        trend,
        trend_percentage: trendPercentage,
        recommendations,
        risk_level: overall < 40 ? 'high' : overall < 60 ? 'medium' : 'low',
        analyzed_at: new Date().toISOString()
      };

      setQualityScore(score);
      return score;
    } catch (error) {
      console.error('Error calculating quality score:', error);
      toast({ 
        title: 'Error', 
        description: 'No se pudo calcular el quality score',
        variant: 'destructive' 
      });
      return null;
    } finally {
      setLoading(null);
    }
  }, [organizationId, toast]);

  // Analyze for potential fraud
  const analyzeFraud = useCallback(async (userId: string): Promise<AntiFraudAnalysis | null> => {
    if (!organizationId) {
      toast({ title: 'Error', description: 'Organización no encontrada', variant: 'destructive' });
      return null;
    }

    setLoading('fraud');
    try {
      // Fetch UP events for analysis
      const { data: upEvents } = await supabase
        .from('up_events')
        .select('id, user_id, event_type, points, created_at')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);

      const alerts: FraudAlert[] = [];
      const patterns: { pattern: string; confidence: number; description: string }[] = [];
      let riskScore = 0;

      if (upEvents && upEvents.length > 0) {
        // Check for unusual point spikes
        const dailyPoints = new Map<string, number>();
        upEvents.forEach((event: any) => {
          const date = new Date(event.created_at).toISOString().split('T')[0];
          dailyPoints.set(date, (dailyPoints.get(date) || 0) + (event.points || 0));
        });

        const avgDaily = Array.from(dailyPoints.values()).reduce((a, b) => a + b, 0) / dailyPoints.size;
        const maxDaily = Math.max(...dailyPoints.values());
        
        if (maxDaily > avgDaily * 5 && avgDaily > 10) {
          patterns.push({
            pattern: 'Pico de puntos inusual',
            confidence: 0.7,
            description: `Se detectó un día con ${maxDaily} puntos, muy por encima del promedio de ${avgDaily.toFixed(0)}`
          });
          riskScore += 20;
        }

        // Check for rapid successive events
        const sortedEvents = [...upEvents].sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        let rapidCount = 0;
        for (let i = 1; i < sortedEvents.length; i++) {
          const diff = new Date((sortedEvents[i] as any).created_at).getTime() - 
                       new Date((sortedEvents[i-1] as any).created_at).getTime();
          if (diff < 60000) rapidCount++; // Less than 1 minute apart
        }

        if (rapidCount > 10) {
          patterns.push({
            pattern: 'Eventos muy rápidos',
            confidence: 0.6,
            description: `${rapidCount} eventos ocurrieron con menos de 1 minuto de diferencia`
          });
          riskScore += 15;
        }
      }

      const analysis: AntiFraudAnalysis = {
        user_id: userId,
        risk_score: Math.min(100, riskScore),
        alerts,
        patterns_detected: patterns,
        recommendation: riskScore > 50 
          ? 'Se recomienda revisar la actividad del usuario manualmente'
          : riskScore > 25 
            ? 'Monitorear la actividad del usuario'
            : 'Sin actividad sospechosa detectada',
        analyzed_at: new Date().toISOString()
      };

      setFraudAnalysis(analysis);
      return analysis;
    } catch (error) {
      console.error('Error analyzing fraud:', error);
      toast({ 
        title: 'Error', 
        description: 'No se pudo analizar fraude',
        variant: 'destructive' 
      });
      return null;
    } finally {
      setLoading(null);
    }
  }, [organizationId, toast]);

  const clearAnalysis = useCallback(() => {
    setQualityScore(null);
    setFraudAnalysis(null);
  }, []);

  return {
    loading,
    qualityScore,
    fraudAnalysis,
    calculateQualityScore,
    analyzeFraud,
    clearAnalysis
  };
}
