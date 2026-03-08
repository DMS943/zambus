import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Get Supabase URL for Edge Functions
const getSupabaseUrl = () => {
  if (import.meta.env.VITE_SUPABASE_URL) {
    return import.meta.env.VITE_SUPABASE_URL;
  }
  // Extract from the client (fallback)
  return "https://iqwynkrzzhzqeoulflzi.supabase.co";
};

export interface BookingData {
  scheduleId: string;
  bookingDate: string;
  passengers: Array<{
    firstName: string;
    lastName: string;
    seatNumber: string;
    phone?: string;
    email?: string;
  }>;
  totalPrice: number;
  extraLuggageCount: number;
  baggageWeightKg?: number;
  contactPhone: string;
  contactEmail?: string;
  paymentMethod?: string;
}

export const useBooking = () => {
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const createBooking = async (bookingData: BookingData, sessionId: string) => {
    setLoading(true);
    try {
      // Validate booking date is not in the past
      const bookingDate = new Date(bookingData.bookingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      bookingDate.setHours(0, 0, 0, 0);
      
      if (bookingDate < today) {
        throw new Error('Cannot book tickets for past dates. Please select a future date.');
      }

      // Use atomic transaction function
      const { data, error } = await supabase.rpc('create_booking_with_passengers', {
        p_user_id: user?.id || null,
        p_schedule_id: bookingData.scheduleId,
        p_booking_date: bookingData.bookingDate,
        p_total_passengers: bookingData.passengers.length,
        p_total_price_zmw: bookingData.totalPrice,
        p_contact_phone: bookingData.contactPhone,
        p_contact_email: bookingData.contactEmail || null,
        p_baggage_weight_kg: bookingData.baggageWeightKg || 0,
        p_extra_luggage_count: bookingData.extraLuggageCount,
        p_payment_method: bookingData.paymentMethod || 'mobile',
        p_passengers: bookingData.passengers,
        p_session_id: sessionId
      });

      if (error) {
        console.error('Booking creation error:', error);
        throw new Error(error.message || 'Failed to create booking');
      }

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to create booking');
      }

      // Send notifications after successful booking creation
      const bookingId = result.booking_id;
      const bookingRef = result.booking_reference;

      // Fetch booking details for notifications
      const { data: bookingDetails } = await supabase
        .from('bookings')
        .select(`
          *,
          schedules (
            departure_time,
            routes (
              origin,
              destination
            )
          )
        `)
        .eq('id', bookingId)
        .single();

      // Fetch user profile separately
      let profile = null;
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email_notifications, sms_notifications')
          .eq('id', user.id)
          .single();
        profile = profileData;
      }

      if (bookingDetails) {
        const schedule = bookingDetails.schedules;
        const route = schedule?.routes;

        const shouldSendEmail = profile?.email_notifications !== false;
        const shouldSendSMS = profile?.sms_notifications !== false;

        const supabaseUrl = getSupabaseUrl();
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token || '';

        if (shouldSendEmail && (bookingData.contactEmail || user?.email)) {
          fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              to: bookingData.contactEmail || user?.email,
              subject: `Booking Confirmation - ${bookingRef}`,
              template: 'created',
              booking: {
                reference: bookingRef,
                origin: route?.origin || '',
                destination: route?.destination || '',
                date: bookingData.bookingDate,
                time: schedule?.departure_time || '',
                price: bookingData.totalPrice,
                status: 'pending'
              }
            })
          }).catch(err => console.error('Failed to send email notification:', err));
        }

        if (shouldSendSMS && bookingData.contactPhone) {
          fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              to: bookingData.contactPhone,
              message: `Your booking ${bookingRef} from ${route?.origin || ''} to ${route?.destination || ''} on ${bookingData.bookingDate} has been created. Total: K${(bookingData.totalPrice / 100).toLocaleString()}`
            })
          }).catch(err => console.error('Failed to send SMS notification:', err));
        }
      }

      toast({
        title: "Booking Created",
        description: `Your booking reference is ${bookingRef}`,
      });

      return {
        success: true,
        bookingId: bookingId,
        bookingReference: bookingRef
      };

    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred"
      };
    } finally {
      setLoading(false);
    }
  };

  const updateBookingPayment = async (bookingId: string, paymentData: {
    paymentMethod: string;
    paymentReference?: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  }) => {
    try {
      // Use atomic transaction function
      const { data, error } = await supabase.rpc('update_booking_payment', {
        p_booking_id: bookingId,
        p_payment_reference: paymentData.paymentReference || `PAY_${Date.now()}`,
        p_payment_method: paymentData.paymentMethod,
        p_user_id: user?.id || null
      });

      if (error) {
        console.error('Payment update error:', error);
        return { success: false, error: error.message };
      }

      const result = data?.[0];
      if (!result?.success) {
        return { success: false, error: result?.message || 'Failed to update payment' };
      }

      // Send notifications when booking is confirmed
      if (paymentData.status === 'confirmed') {
        const { data: bookingDetails } = await supabase
          .from('bookings')
          .select(`
            *,
            schedules (
              departure_time,
              routes (
                origin,
                destination
              )
            )
          `)
          .eq('id', bookingId)
          .single();

        // Fetch user profile separately
        let profile = null;
        if (user?.id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email_notifications, sms_notifications')
            .eq('id', user.id)
            .single();
          profile = profileData;
        }

        if (bookingDetails) {
          const schedule = bookingDetails.schedules;
          const route = schedule?.routes;

          const shouldSendEmail = profile?.email_notifications !== false;
          const shouldSendSMS = profile?.sms_notifications !== false;

          const supabaseUrl = getSupabaseUrl();
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token || '';

          if (shouldSendEmail && bookingDetails.contact_email) {
            fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                to: bookingDetails.contact_email,
                subject: `Payment Confirmed - ${bookingDetails.booking_reference}`,
                template: 'confirmed',
                booking: {
                  reference: bookingDetails.booking_reference,
                  origin: route?.origin || '',
                  destination: route?.destination || '',
                  date: bookingDetails.booking_date,
                  time: schedule?.departure_time || '',
                  price: bookingDetails.total_price_zmw,
                  status: 'confirmed'
                }
              })
            }).catch(err => console.error('Failed to send email notification:', err));
          }

          if (shouldSendSMS && bookingDetails.contact_phone) {
            fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                to: bookingDetails.contact_phone,
                message: `Payment confirmed! Your booking ${bookingDetails.booking_reference} is confirmed. Travel date: ${bookingDetails.booking_date}`
              })
            }).catch(err => console.error('Failed to send SMS notification:', err));
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Payment update error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to update payment" 
      };
    }
  };

  const getBookingHistory = async () => {
    if (!isAuthenticated || !user) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          passengers (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Booking history error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, bookings };
    } catch (error) {
      console.error('Booking history error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch booking history" 
      };
    }
  };

  return {
    createBooking,
    updateBookingPayment,
    getBookingHistory,
    loading
  };
};