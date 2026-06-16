import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { CalendarIcon, MapPin, Users, Clock, Phone, Mail, ArrowRight, X, Luggage, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { formatZMW } from '@/utils/pricingUtils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BookingWithDetails {
  id: string;
  booking_reference: string;
  booking_date: string;
  total_passengers: number;
  total_price_zmw: number;
  baggage_weight_kg?: number | null;
  extra_luggage_count?: number | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  contact_phone: string;
  contact_email: string;
  payment_method: string;
  created_at: string;
  schedules: {
    departure_time: string;
    arrival_time: string;
    price_zmw: number;
    routes: {
      origin: string;
      destination: string;
    };
    buses: {
      license_plate: string;
      bus_class: string;
      amenities: string[];
    };
  };
  passengers: {
    first_name: string;
    last_name: string;
    seat_number: string;
  }[];
}

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      // If no user, stop loading immediately
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const queryPromise = supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          booking_date,
          total_passengers,
          total_price_zmw,
          baggage_weight_kg,
          extra_luggage_count,
          status,
          contact_phone,
          contact_email,
          payment_method,
          created_at,
          schedules (
            departure_time,
            arrival_time,
            price_zmw,
            routes (
              origin,
              destination
            ),
            buses (
              license_plate,
              bus_class,
              amenities
            )
          ),
          passengers (
            first_name,
            last_name,
            seat_number
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      );
      
      const result = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as { data: any; error: any };
      
      const { data, error } = result;

      if (error) {
        // Handle specific errors
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Bookings table does not exist yet');
          setBookings([]);
          return;
        }
        throw error;
      }
      
      // Filter out bookings with missing essential data
      const validBookings = (data || []).filter((booking: any) => 
        booking && booking.id && booking.booking_reference
      );
      
      setBookings(validBookings);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      // Set empty array on error so page still renders
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const generateQRData = (booking: BookingWithDetails) => {
    const origin = booking.schedules?.routes?.origin || 'N/A';
    const destination = booking.schedules?.routes?.destination || 'N/A';
    return JSON.stringify({
      bookingRef: booking.booking_reference,
      passengers: (booking.passengers || []).map(p => ({
        name: `${p.first_name} ${p.last_name}`,
        seat: p.seat_number
      })),
      route: `${origin} → ${destination}`,
      date: booking.booking_date,
      departure: booking.schedules?.departure_time || 'N/A'
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-16 md:pb-0">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please log in to view your bookings.
              </p>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-16 md:pb-0">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-48 bg-gray-200" />
              ))}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      case 'pending':
        return 'bg-orange-100 text-orange-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm text-gray-600 mt-0.5">
              View and manage your bus ticket bookings
            </p>
        </div>

        {/* Date Filter */}
        <Card className="mb-4 border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="travel-date" className="text-xs font-medium text-gray-700 mb-1.5 block">
                  Filter by Travel Date
                </Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    id="travel-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      const date = e.target.value;
                      setSelectedDate(date);
                    }}
                    className="pl-9 h-8 text-sm"
                    placeholder="Select travel date"
                  />
                </div>
              </div>
              {selectedDate && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate('')}
                    className="h-10"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filter
                  </Button>
                  <span className="text-sm text-gray-600">
                    Showing bookings for {format(new Date(selectedDate), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

          {bookings.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-8 text-center">
                <CalendarIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-1.5">
                  No bookings yet
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Start by searching for bus routes and making your first booking.
                </p>
                <Button className="h-8 text-sm" onClick={() => window.location.href = '/'}>
                  Search Buses
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {bookings
                .filter(booking => {
                  // Filter out invalid bookings
                  if (!booking || !booking.id) return false;
                  
                  // Filter by selected date if one is chosen
                  if (selectedDate) {
                    return booking.booking_date === selectedDate;
                  }
                  
                  return true;
                })
                .map((booking) => {
                
                const firstPassenger = booking.passengers?.[0];
                const seatNumber = firstPassenger?.seat_number || 'N/A';
                const origin = booking.schedules?.routes?.origin || 'N/A';
                const destination = booking.schedules?.routes?.destination || 'N/A';
                const bookingRef = booking.booking_reference?.startsWith('ZB') 
                  ? booking.booking_reference 
                  : `ZB-${booking.booking_reference || 'N/A'}`;
                
                return (
                  <Card key={booking.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                          {origin} → {destination}
                          </h3>
                          <p className="text-sm text-gray-600">{bookingRef}</p>
                      </div>
                        <Badge className={`${getStatusBadgeColor(booking.status)} text-xs font-medium px-2.5 py-1 rounded-md`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </div>

                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CalendarIcon className="h-4 w-4 text-gray-500" />
                          <span>{format(new Date(booking.booking_date), 'dd/MM/yyyy')}</span>
                            </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{booking.schedules?.departure_time || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{booking.total_passengers} passenger(s) - Seat {seatNumber}</span>
                      </div>
                      {(booking.baggage_weight_kg && booking.baggage_weight_kg > 0) && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Luggage className="h-4 w-4 text-gray-500" />
                          <span>Baggage: {booking.baggage_weight_kg}kg</span>
                        </div>
                      )}
                      {(booking.extra_luggage_count && booking.extra_luggage_count > 0) && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Luggage className="h-4 w-4 text-gray-500" />
                          <span>Extra bags: {booking.extra_luggage_count}</span>
                        </div>
                      )}
                    </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div className="text-lg font-bold text-gray-900">
                          {formatZMW(booking.total_price_zmw)}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-blue-600 border-blue-600 hover:bg-blue-50 text-xs px-3 py-1.5 h-8"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <Ticket className="h-3.5 w-3.5 mr-1" />
                            View Ticket
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-600 hover:bg-gray-50 text-xs px-2 py-1.5 h-8"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            Details <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
              
              {/* Show message if no bookings match the date filter */}
              {selectedDate && bookings.filter(booking => {
                if (!booking || !booking.id) return false;
                return booking.booking_date === selectedDate;
              }).length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No bookings found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      No bookings found for {format(new Date(selectedDate), 'MMM dd, yyyy')}
                    </p>
                    <Button variant="outline" onClick={() => setSelectedDate('')}>
                      Show All Bookings
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
      </div>

      {/* QR Code Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Your Ticket</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBooking(null)}
              >
                ×
              </Button>
            </div>
            <QRCodeDisplay
              qrData={generateQRData(selectedBooking)}
              bookingRef={selectedBooking.booking_reference}
              bookingData={{
                origin: selectedBooking.schedules?.routes?.origin,
                destination: selectedBooking.schedules?.routes?.destination,
                date: format(new Date(selectedBooking.booking_date), 'MMM dd, yyyy'),
                time: selectedBooking.schedules?.departure_time,
                passengerName: selectedBooking.passengers?.[0] 
                  ? `${selectedBooking.passengers[0].first_name} ${selectedBooking.passengers[0].last_name}`
                  : undefined,
                seatNumber: selectedBooking.passengers?.[0]?.seat_number,
                price: selectedBooking.total_price_zmw
              }}
            />
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                {selectedBooking.schedules?.routes?.origin || 'N/A'} → {selectedBooking.schedules?.routes?.destination || 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(selectedBooking.booking_date), 'MMM dd, yyyy')} at {selectedBooking.schedules?.departure_time || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
};

export default Bookings;