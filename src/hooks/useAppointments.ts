import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBlockedTime,
  createManualAppointment,
  deleteBlockedTime,
  getAppointmentsByDate,
  getBlockedTimes,
  getPendingAppointments,
  getWorkingHours,
  updateAppointment,
  updateWorkingHours,
} from '@/lib/calendarAdminApi';
import { ApiClientError } from '@/lib/types';
import type {
  AppointmentUpdate,
  BlockedTimeInput,
  ManualAppointmentInput,
  WorkingHoursUpdate,
} from '@/lib/types';
import {
  expireCalendarAdminSession,
  getCalendarAdminPassword,
} from '@/hooks/useSession';

const CALENDAR_QUERY_KEY = ['calendar-admin'] as const;
const APPOINTMENTS_QUERY_KEY = [...CALENDAR_QUERY_KEY, 'appointments'] as const;
const BLOCKED_TIMES_QUERY_KEY = [...CALENDAR_QUERY_KEY, 'blocked-times'] as const;
const WORKING_HOURS_QUERY_KEY = [...CALENDAR_QUERY_KEY, 'working-hours'] as const;

function requireCalendarPassword(): string {
  const password = getCalendarAdminPassword();
  if (!password) {
    throw new Error('Calendar admin session is required');
  }
  return password;
}

async function runProtectedRequest<T>(
  request: () => Promise<T>,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      expireCalendarAdminSession();
    }
    throw error;
  }
}

export function useWorkingHours(authenticated = false) {
  return useQuery({
    queryKey: WORKING_HOURS_QUERY_KEY,
    queryFn: () => runProtectedRequest(
      () => getWorkingHours(requireCalendarPassword()),
    ),
    enabled: authenticated,
  });
}

export function useUpdateWorkingHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...update
    }: WorkingHoursUpdate & { id: string }) => (
      runProtectedRequest(
        () => updateWorkingHours(id, update, requireCalendarPassword()),
      )
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKING_HOURS_QUERY_KEY });
    },
  });
}

export function useBlockedTimes(date: string, authenticated = false) {
  return useQuery({
    queryKey: [...BLOCKED_TIMES_QUERY_KEY, date],
    queryFn: () => runProtectedRequest(
      () => getBlockedTimes(date, requireCalendarPassword()),
    ),
    enabled: authenticated && Boolean(date),
  });
}

export function useCreateBlockedTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (block: BlockedTimeInput) => (
      runProtectedRequest(
        () => createBlockedTime(block, requireCalendarPassword()),
      )
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKED_TIMES_QUERY_KEY });
    },
  });
}

export function useDeleteBlockedTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (
      runProtectedRequest(
        () => deleteBlockedTime(id, requireCalendarPassword()),
      )
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKED_TIMES_QUERY_KEY });
    },
  });
}

export function useAppointmentsByDate(
  date: string,
  authenticated = false,
) {
  return useQuery({
    queryKey: [...APPOINTMENTS_QUERY_KEY, 'date', date],
    queryFn: () => runProtectedRequest(
      () => getAppointmentsByDate(date, requireCalendarPassword()),
    ),
    enabled: authenticated && Boolean(date),
  });
}

export function usePendingAppointments(authenticated = false) {
  return useQuery({
    queryKey: [...APPOINTMENTS_QUERY_KEY, 'pending'],
    queryFn: () => runProtectedRequest(
      () => getPendingAppointments(requireCalendarPassword()),
    ),
    enabled: authenticated,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointment: ManualAppointmentInput) => (
      runProtectedRequest(
        () => createManualAppointment(
          appointment,
          requireCalendarPassword(),
        ),
      )
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...update
    }: AppointmentUpdate & { id: string }) => (
      runProtectedRequest(
        () => updateAppointment(id, update, requireCalendarPassword()),
      )
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
    },
  });
}
