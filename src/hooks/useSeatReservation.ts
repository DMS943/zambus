import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Generate or retrieve session ID for seat reservations
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('seat_reservation_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem('seat_reservation_session_id', sessionId);
  }
  return sessionId;
};

export const useSeatReservation = (scheduleId: string, bookingDate: string) => {
  const { user } = useAuth();
  const [reservedSeats, setReservedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(getSessionId());

  // Reserve seats
  const reserveSeats = useCallback(async (seatNumbers: string[]) => {
    if (!scheduleId || !bookingDate || seatNumbers.length === 0) {
      return { success: false, message: 'Invalid parameters' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('reserve_seats', {
        p_schedule_id: scheduleId,
        p_booking_date: bookingDate,
        p_seat_numbers: seatNumbers,
        p_session_id: sessionId,
        p_user_id: user?.id || null
      });

      if (error) {
        console.error('Error reserving seats:', error);
        toast({
          title: 'Reservation Failed',
          description: error.message || 'Failed to reserve seats',
          variant: 'destructive'
        });
        return { success: false, message: error.message };
      }

      const result = data?.[0];
      if (result?.success) {
        setReservedSeats(result.reserved_seats || []);
        return { success: true, message: result.message, seats: result.reserved_seats };
      } else {
        toast({
          title: 'Reservation Failed',
          description: result?.message || 'Some seats are already taken',
          variant: 'destructive'
        });
        return { success: false, message: result?.message || 'Reservation failed' };
      }
    } catch (error: any) {
      console.error('Error reserving seats:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, [scheduleId, bookingDate, sessionId, user?.id]);

  // Release seats (when user navigates away or cancels)
  const releaseSeats = useCallback(async () => {
    try {
      const { error } = await supabase.rpc('release_seat_reservations', {
        p_session_id: sessionId
      });

      if (error) {
        console.error('Error releasing seats:', error);
      } else {
        setReservedSeats([]);
      }
    } catch (error) {
      console.error('Error releasing seats:', error);
    }
  }, [sessionId]);

  // Confirm seats (when booking is completed)
  const confirmSeats = useCallback(async (bookingId: string) => {
    try {
      const { data, error } = await supabase.rpc('confirm_seat_reservations', {
        p_session_id: sessionId,
        p_booking_id: bookingId
      });

      if (error) {
        console.error('Error confirming seats:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error confirming seats:', error);
      return false;
    }
  }, [sessionId]);

  // Auto-release seats when component unmounts
  useEffect(() => {
    return () => {
      // Only release if we have reserved seats
      if (reservedSeats.length > 0) {
        releaseSeats();
      }
    };
  }, [reservedSeats.length]); // Don't include releaseSeats to avoid infinite loop

  // Extend reservation (refresh expiry time)
  const extendReservation = useCallback(async () => {
    if (reservedSeats.length === 0) return;
    
    // Re-reserve the same seats to extend the expiry
    return await reserveSeats(reservedSeats);
  }, [reservedSeats, reserveSeats]);

  return {
    sessionId,
    reservedSeats,
    loading,
    reserveSeats,
    releaseSeats,
    confirmSeats,
    extendReservation
  };
};
