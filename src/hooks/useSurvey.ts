import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SurveyRole, SurveyAnswers, SurveyResponse } from '@/lib/types';

export function useCheckRoleSubmitted(role: SurveyRole | null) {
  return useQuery({
    queryKey: ['survey_check', role],
    enabled: !!role,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('role', role as string)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useSubmitSurvey() {
  return useMutation({
    mutationFn: async ({
      role,
      answers,
    }: {
      role: SurveyRole;
      answers: SurveyAnswers;
    }) => {
      const { error } = await supabase
        .from('survey_responses')
        .insert({ role, answers });
      if (error) throw error;
    },
  });
}

export function useFetchAllSurveys() {
  return useQuery({
    queryKey: ['survey_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*');
      if (error) throw error;
      return (data ?? []) as SurveyResponse[];
    },
  });
}
