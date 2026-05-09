import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ServiceAppointment, WorkingHours, BlockedTime } from '@/lib/types';

export function useWorkingHours() {
  return useQuery({
    queryKey: ['working_hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_working_hours')
        .select('*')
        .order('day_of_week');
      if (error) throw error;
      return (data ?? []) as WorkingHours[];
    },
  });
}

export function useUpdateWorkingHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<WorkingHours> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_working_hours')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();
      if (error) throw error;
      return data as WorkingHours;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working_hours'] });
    },
  });
}

export function useBlockedTimes(date?: string) {
  return useQuery({
    queryKey: ['blocked_times', date],
    queryFn: async () => {
      let query = supabase.from('service_blocked_times').select('*');
      if (date) {
        query = query.eq('block_date', date);
      }
      const { data, error } = await query.order('start_time');
      if (error) throw error;
      return (data ?? []) as BlockedTime[];
    },
  });
}

export function useCreateBlockedTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (block: Omit<BlockedTime, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('service_blocked_times')
        .insert(block)
        .select()
        .single();
      if (error) throw error;
      return data as BlockedTime;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked_times'] });
    },
  });
}

export function useDeleteBlockedTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_blocked_times')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked_times'] });
    },
  });
}

export function useAppointmentsByDate(date: string) {
  return useQuery({
    queryKey: ['appointments', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_appointments')
        .select('*')
        .eq('appointment_date', date)
        .neq('status', 'odrzucone')
        .order('arrival_time');
      if (error) throw error;
      return (data ?? []) as ServiceAppointment[];
    },
    enabled: !!date,
  });
}

export function usePendingAppointments() {
  return useQuery({
    queryKey: ['appointments', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_appointments')
        .select('*')
        .eq('status', 'zapytanie')
        .order('appointment_date')
        .order('arrival_time');
      if (error) throw error;
      return (data ?? []) as ServiceAppointment[];
    },
  });
}

export function useAppointmentsByRange(from: string, to: string) {
  return useQuery({
    queryKey: ['appointments', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_appointments')
        .select('*')
        .gte('appointment_date', from)
        .lte('appointment_date', to)
        .order('appointment_date')
        .order('arrival_time');
      if (error) throw error;
      return (data ?? []) as ServiceAppointment[];
    },
    enabled: !!from && !!to,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appointment: Omit<ServiceAppointment, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('service_appointments')
        .insert(appointment)
        .select()
        .single();
      if (error) throw error;
      return data as ServiceAppointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<ServiceAppointment> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_appointments')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();
      if (error) throw error;
      return data as ServiceAppointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
