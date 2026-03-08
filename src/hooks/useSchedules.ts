
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Schedule {
  id: string;
  departure_time: string;
  arrival_time: string | null;
  price_zmw: number;
  available_dates: string[];
  route: {
    id: string;
    origin: string;
    destination: string;
    distance_km: number;
    estimated_duration_hours: number;
  };
  bus: {
    id: string;
    license_plate: string;
    bus_class: 'economy' | 'luxury' | 'vip';
    total_seats: number;
    amenities: string[];
    operator: {
      name: string;
    };
  };
}

// Check if a schedule's departure_time is within a window of the preferred time.
// Both values are expected as strings in HH:MM or HH:MM:SS format.
const isWithinTimeWindow = (scheduleTime: string, preferredTime: string, windowMinutes = 60): boolean => {
  if (!scheduleTime || !preferredTime) return false;

  const scheduleMatch = scheduleTime.match(/(\d{1,2}):(\d{2})/);
  const preferredMatch = preferredTime.match(/(\d{1,2}):(\d{2})/);

  if (!scheduleMatch || !preferredMatch) return false;

  const scheduleTotal = parseInt(scheduleMatch[1], 10) * 60 + parseInt(scheduleMatch[2], 10);
  const preferredTotal = parseInt(preferredMatch[1], 10) * 60 + parseInt(preferredMatch[2], 10);

  const diff = Math.abs(scheduleTotal - preferredTotal);
  return diff <= windowMinutes;
};

export const useSchedules = (from?: string, to?: string, date?: string, preferredTime?: string) => {
  return useQuery({
    queryKey: ['schedules', from, to, date, preferredTime],
    queryFn: async () => {
      let query = supabase
        .from('schedules')
        .select(`
          id,
          departure_time,
          arrival_time,
          price_zmw,
          available_dates,
          route:routes (
            id,
            origin,
            destination,
            distance_km,
            estimated_duration_hours
          ),
          bus:buses (
            id,
            license_plate,
            bus_class,
            total_seats,
            amenities,
            operator:bus_operators (
              name
            )
          )
        `)
        .eq('is_active', true);

      const { data, error } = await query.order('departure_time');

      if (error) {
        console.error('Error fetching schedules:', error);
        throw error;
      }

      let schedules = data || [];

      // Filter by route if provided
      if (from && to && schedules.length > 0) {
        schedules = schedules.filter(schedule => 
          schedule.route?.origin === from && schedule.route?.destination === to
        );
      }

      // Filter by available date if provided
      // Allow booking for any future date, not just dates in available_dates array
      if (date && schedules.length > 0) {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        
        // Only filter if date is in the past (shouldn't happen due to UI validation, but safety check)
        if (selectedDate < today) {
          return [];
        }
        
        // For future dates, show all active schedules (they operate on a recurring basis)
        // Only filter out if the schedule explicitly doesn't have the date in available_dates
        // AND the date is beyond the last available date (meaning it's a one-time schedule)
        schedules = schedules.filter(schedule => {
          if (!schedule.available_dates || schedule.available_dates.length === 0) {
            // If no available_dates specified, assume it's a recurring schedule - allow any future date
            return true;
          }
          
          // Check if date is in the available_dates array
          if (schedule.available_dates.includes(date)) {
            return true;
          }
          
          // If date is after the last available date, it might be a one-time schedule that's expired
          const sortedDates = schedule.available_dates.sort();
          const lastDate = new Date(sortedDates[sortedDates.length - 1]);
          lastDate.setHours(0, 0, 0, 0);
          
          // If selected date is before or equal to last available date, allow it (recurring schedule)
          // If selected date is after last available date, it's beyond the schedule's validity
          return selectedDate <= lastDate;
        });
      }

      // Filter by preferred exact time if provided (within +/- 60 minutes)
      if (preferredTime && schedules.length > 0) {
        schedules = schedules.filter(schedule => 
          isWithinTimeWindow(schedule.departure_time, preferredTime, 60)
        );
      }

      return schedules as Schedule[];
    },
    enabled: true, // Always enabled, but can be filtered
  });
};

export const useRoute = (from: string, to: string) => {
  return useQuery({
    queryKey: ['route', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .or(`and(origin.eq.${from},destination.eq.${to}),and(origin.eq.${to},destination.eq.${from})`)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching route:', error);
        throw error;
      }

      return data;
    },
    enabled: !!(from && to),
  });
};

// Hook to fetch a single schedule by ID with all related data
export const useSchedule = (scheduleId?: string) => {
  return useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: async () => {
      if (!scheduleId) return null;

      const { data, error } = await supabase
        .from('schedules')
        .select(`
          id,
          departure_time,
          arrival_time,
          price_zmw,
          available_dates,
          route:routes (
            id,
            origin,
            destination,
            distance_km,
            estimated_duration_hours
          ),
          bus:buses (
            id,
            license_plate,
            bus_class,
            total_seats,
            amenities,
            operator:bus_operators (
              name
            )
          )
        `)
        .eq('id', scheduleId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching schedule:', error);
        throw error;
      }

      return data as Schedule | null;
    },
    enabled: !!scheduleId,
  });
};
