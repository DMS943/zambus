import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SeatOccupancy {
  seat_number: string;
  booking_date: string;
  is_occupied: boolean;
}

export const useSeatAvailability = (scheduleId?: string, bookingDate?: string) => {
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalSeats, setTotalSeats] = useState(48); // Default bus capacity

  const fetchSeatAvailability = async () => {
    if (!scheduleId || !bookingDate) return;
    
    setLoading(true);
    try {
      // Use the new get_available_seats function
      const { data, error } = await supabase.rpc('get_available_seats', {
        p_schedule_id: scheduleId,
        p_booking_date: bookingDate
      });

      if (error) {
        console.error('Error fetching seat availability:', error);
        // Fallback to old method if function doesn't exist
        await fetchSeatAvailabilityFallback();
        return;
      }

      // Get bus capacity
      const { data: schedule } = await supabase
        .from('schedules')
        .select(`
          buses (total_seats)
        `)
        .eq('id', scheduleId)
        .single();

      if (schedule?.buses?.total_seats) {
        setTotalSeats(schedule.buses.total_seats);
      }

      // Extract occupied seat numbers from the result
      const occupied: string[] = [];
      if (data) {
        data.forEach((seat: { seat_number: string; is_available: boolean }) => {
          if (!seat.is_available) {
            occupied.push(seat.seat_number);
          }
        });
      }

      setOccupiedSeats(occupied);
    } catch (error) {
      console.error('Error fetching seat availability:', error);
      await fetchSeatAvailabilityFallback();
    } finally {
      setLoading(false);
    }
  };

  // Fallback method using old approach
  const fetchSeatAvailabilityFallback = async () => {
    if (!scheduleId || !bookingDate) return;
    
    try {
      // Get confirmed bookings and seat reservations
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          passengers (seat_number)
        `)
        .eq('schedule_id', scheduleId)
        .eq('booking_date', bookingDate)
        .in('status', ['confirmed', 'pending']);

      // Get bus capacity
      const { data: schedule } = await supabase
        .from('schedules')
        .select(`
          buses (total_seats)
        `)
        .eq('id', scheduleId)
        .single();

      if (schedule?.buses?.total_seats) {
        setTotalSeats(schedule.buses.total_seats);
      }

      // Extract occupied seat numbers
      const occupied: string[] = [];
      if (bookings) {
        bookings.forEach(booking => {
          if (booking.passengers) {
            (booking.passengers as any[]).forEach(passenger => {
              if (passenger.seat_number) {
                occupied.push(passenger.seat_number);
              }
            });
          }
        });
      }

      setOccupiedSeats(occupied);
    } catch (error) {
      console.error('Error in fallback seat availability:', error);
    }
  };

  // Set up real-time subscription for seat updates
  useEffect(() => {
    if (!scheduleId) return;

    fetchSeatAvailability();

    // Subscribe to seat reservation changes
    const channel = supabase
      .channel('seat-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seat_reservations',
          filter: `schedule_id=eq.${scheduleId}`
        },
        () => {
          fetchSeatAvailability();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `schedule_id=eq.${scheduleId}`
        },
        () => {
          fetchSeatAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scheduleId, bookingDate]);

  return {
    occupiedSeats,
    totalSeats,
    loading,
    refetch: fetchSeatAvailability
  };
};