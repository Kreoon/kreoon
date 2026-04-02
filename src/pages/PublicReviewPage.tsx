/**
 * Pagina publica para dejar resenas
 * URL: /review/:token
 *
 * Permite a clientes dejar resenas verificadas en perfiles de creadores
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Send, CheckCircle, XCircle, Clock, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useReviewRequestByToken, useSubmitReview } from '@/hooks/useCreatorReviews';

export default function PublicReviewPage() {
  const { token } = useParams<{ token: string }>();
  const { data: request, isLoading, error } = useReviewRequestByToken(token);
  const submitReview = useSubmitReview();

  const [formData, setFormData] = useState({
    reviewer_name: '',
    reviewer_email: '',
    reviewer_company: '',
    rating: 0,
    title: '',
    content: '',
  });
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Estados de la solicitud
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enlace no valido</h2>
            <p className="text-muted-foreground">
              Este enlace de resena no existe o ha sido eliminado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (request.status === 'expired') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enlace expirado</h2>
            <p className="text-muted-foreground">
              Este enlace de resena ha expirado. Por favor, contacta al creador para solicitar uno nuevo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (request.status === 'completed' || submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Gracias por tu resena!</h2>
            <p className="text-muted-foreground mb-4">
              Tu resena ha sido enviada y sera revisada pronto.
            </p>
            <Link to="/">
              <Button variant="outline">Volver al inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const creator = request.creator as any;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || formData.rating === 0 || !formData.content.trim()) {
      return;
    }

    try {
      await submitReview.mutateAsync({
        token,
        reviewer_name: formData.reviewer_name,
        reviewer_email: formData.reviewer_email || undefined,
        reviewer_company: formData.reviewer_company || undefined,
        rating: formData.rating,
        title: formData.title || undefined,
        content: formData.content,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  const isValid = formData.reviewer_name.trim() && formData.rating > 0 && formData.content.trim().length >= 10;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header con info del creador */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={creator?.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {creator?.display_name?.charAt(0) || 'C'}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle>{creator?.display_name || 'Creador'}</CardTitle>
            <CardDescription>
              {creator?.bio || 'Te ha invitado a dejar una resena'}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Formulario de resena */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deja tu resena</CardTitle>
            <CardDescription>
              Tu opinion ayuda a otros a conocer el trabajo de {creator?.display_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating con estrellas */}
              <div className="space-y-2">
                <Label>Calificacion general *</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          'h-8 w-8 transition-colors',
                          (hoveredRating || formData.rating) >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-muted-foreground/30'
                        )}
                      />
                    </button>
                  ))}
                </div>
                {formData.rating > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {formData.rating === 5 && 'Excelente!'}
                    {formData.rating === 4 && 'Muy bueno'}
                    {formData.rating === 3 && 'Bueno'}
                    {formData.rating === 2 && 'Regular'}
                    {formData.rating === 1 && 'Malo'}
                  </p>
                )}
              </div>

              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="name">Tu nombre *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.reviewer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, reviewer_name: e.target.value }))}
                    placeholder="Tu nombre completo"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Empresa (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="company">Empresa (opcional)</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    value={formData.reviewer_company}
                    onChange={(e) => setFormData(prev => ({ ...prev, reviewer_company: e.target.value }))}
                    placeholder="Nombre de tu empresa"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Email (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.reviewer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, reviewer_email: e.target.value }))}
                  placeholder="tu@email.com"
                />
                <p className="text-xs text-muted-foreground">
                  Solo para verificar tu identidad, no sera publicado
                </p>
              </div>

              {/* Titulo (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="title">Titulo de la resena (opcional)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Excelente experiencia trabajando juntos"
                  maxLength={100}
                />
              </div>

              {/* Contenido */}
              <div className="space-y-2">
                <Label htmlFor="content">Tu experiencia *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Cuentanos sobre tu experiencia trabajando con este creador..."
                  rows={4}
                  required
                  minLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  Minimo 10 caracteres ({formData.content.length}/10)
                </p>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={!isValid || submitReview.isPending}
              >
                {submitReview.isPending ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar resena
                  </>
                )}
              </Button>

              {submitReview.isError && (
                <p className="text-sm text-destructive text-center">
                  Error al enviar la resena. Por favor, intenta de nuevo.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by{' '}
          <Link to="/" className="text-primary hover:underline">
            Kreoon
          </Link>
        </p>
      </div>
    </div>
  );
}
