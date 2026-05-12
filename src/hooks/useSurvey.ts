import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SurveyAnswers, SurveyResponse } from '@/lib/types';

export function useSubmitSurvey() {
  return useMutation({
    mutationFn: async ({ answers }: { answers: SurveyAnswers }) => {
      const { error } = await supabase
        .from('survey_responses')
        .insert({ answers });
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
        .select('*')
        .order('submitted_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SurveyResponse[];
    },
  });
}
