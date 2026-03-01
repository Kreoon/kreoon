// Hook para gestionar preguntas personalizadas por tipo de evento

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CustomQuestion, CustomQuestionInput, QuestionAnswer } from '../types';

export function useCustomQuestions(eventTypeId: string | undefined) {
  const queryClient = useQueryClient();

  const questionsQuery = useQuery({
    queryKey: ['booking-custom-questions', eventTypeId],
    queryFn: async () => {
      if (!eventTypeId) return [];

      const { data, error } = await supabase
        .from('booking_custom_questions')
        .select('*')
        .eq('event_type_id', eventTypeId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as CustomQuestion[];
    },
    enabled: !!eventTypeId,
  });

  const addQuestion = useMutation({
    mutationFn: async (input: CustomQuestionInput) => {
      if (!eventTypeId) throw new Error('Event type ID required');

      // Get max sort_order
      const { data: existing } = await supabase
        .from('booking_custom_questions')
        .select('sort_order')
        .eq('event_type_id', eventTypeId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { data, error } = await supabase
        .from('booking_custom_questions')
        .insert({
          event_type_id: eventTypeId,
          question: input.question,
          question_type: input.question_type || 'text',
          options: input.options || null,
          required: input.required || false,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CustomQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-custom-questions', eventTypeId] });
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CustomQuestionInput>) => {
      const { data, error } = await supabase
        .from('booking_custom_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-custom-questions', eventTypeId] });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_custom_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-custom-questions', eventTypeId] });
    },
  });

  const reorderQuestions = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update sort_order for each question
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('booking_custom_questions')
          .update({ sort_order: index })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-custom-questions', eventTypeId] });
    },
  });

  return {
    questions: questionsQuery.data || [],
    isLoading: questionsQuery.isLoading,
    error: questionsQuery.error,
    addQuestion: addQuestion.mutateAsync,
    updateQuestion: updateQuestion.mutateAsync,
    deleteQuestion: deleteQuestion.mutateAsync,
    reorderQuestions: reorderQuestions.mutateAsync,
    isAdding: addQuestion.isPending,
    isUpdating: updateQuestion.isPending,
    isDeleting: deleteQuestion.isPending,
  };
}

// Hook para obtener preguntas en página pública (sin auth)
export function usePublicQuestions(eventTypeId: string | undefined) {
  return useQuery({
    queryKey: ['public-booking-questions', eventTypeId],
    queryFn: async () => {
      if (!eventTypeId) return [];

      const { data, error } = await supabase
        .from('booking_custom_questions')
        .select('id, question, question_type, options, required, sort_order')
        .eq('event_type_id', eventTypeId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as CustomQuestion[];
    },
    enabled: !!eventTypeId,
  });
}

// Hook para guardar respuestas de preguntas
export function useSaveQuestionAnswers() {
  return useMutation({
    mutationFn: async ({
      bookingId,
      answers,
    }: {
      bookingId: string;
      answers: Array<{ questionId: string; questionText: string; answer: string }>;
    }) => {
      const { error } = await supabase.from('booking_question_answers').insert(
        answers.map((a) => ({
          booking_id: bookingId,
          question_id: a.questionId,
          question_text: a.questionText,
          answer: a.answer,
        }))
      );

      if (error) throw error;
    },
  });
}

// Hook para obtener respuestas de una reserva
export function useQuestionAnswers(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['booking-question-answers', bookingId],
    queryFn: async () => {
      if (!bookingId) return [];

      const { data, error } = await supabase
        .from('booking_question_answers')
        .select('*')
        .eq('booking_id', bookingId);

      if (error) throw error;
      return data as QuestionAnswer[];
    },
    enabled: !!bookingId,
  });
}
