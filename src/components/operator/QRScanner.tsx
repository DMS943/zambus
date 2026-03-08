import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QrCode, CheckCircle, XCircle, User, MapPin, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { formatZMW } from '@/utils/pricingUtils';

interface QRScannerProps {
  operatorId: string;
}

export const QRScanner = ({ operatorId }: QRScannerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bookingReference, setBookingReference] = useState('');
  const [verifiedBooking, setVerifiedBooking] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const checkInMutation = useMutation({
    mutationFn: async ({ bookingId, passengerId }: { bookingId: string; passengerId: string }) => {
      const { error } = await supabase
        .from('passenger_checkins')
        .insert({
          booking_id: bookingId,
          passenger_id: passengerId,
          checked_in_by: user?.id,
          boarding_pass_scanned: true,
        });

      if (error) {
        // If already checked in, that's okay
        if (error.code === '23505') {
          return { alreadyCheckedIn: true };
        }
        throw error;
      }

      return { alreadyCheckedIn: false };
    },
    onSuccess: (data, variables) => {
      if (data.alreadyCheckedIn) {
        toast({
          title: 'Already Checked In',
          description: 'This passenger has already been checked in',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Passenger checked in successfully',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['passenger-checkins'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const verifyBooking = async () => {
    if (!bookingReference.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a booking reference',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    setVerifiedBooking(null);

    try {
      // Fetch booking with all details
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          *,
          schedule:schedules(
            *,
            route:routes(*),
            bus:buses(*)
          ),
          passengers(*)
        `)
        .eq('booking_reference', bookingReference.toUpperCase())
        .single();

      if (error || !booking) {
        toast({
          title: 'Not Found',
          description: 'Booking not found',
          variant: 'destructive',
        });
        return;
      }

      // Verify this booking belongs to this operator
      const { data: buses } = await supabase
        .from('buses')
        .select('id')
        .eq('operator_id', operatorId);

      const operatorBusIds = buses?.map(b => b.id) || [];
      
      if (!operatorBusIds.includes(booking.schedule.bus_id)) {
        toast({
          title: 'Invalid Booking',
          description: 'This booking does not belong to your operator',
          variant: 'destructive',
        });
        return;
      }

      // Check if booking is valid
      if (booking.status === 'cancelled') {
        toast({
          title: 'Cancelled Booking',
          description: 'This booking has been cancelled',
          variant: 'destructive',
        });
        setVerifiedBooking({ ...booking, invalid: true, reason: 'cancelled' });
        return;
      }

      if (booking.status !== 'confirmed' && booking.status !== 'completed') {
        toast({
          title: 'Pending Payment',
          description: 'This booking payment is still pending',
          variant: 'destructive',
        });
        setVerifiedBooking({ ...booking, invalid: true, reason: 'pending' });
        return;
      }

      // Get check-in status
      const { data: checkins } = await supabase
        .from('passenger_checkins')
        .select('*')
        .eq('booking_id', booking.id);

      setVerifiedBooking({
        ...booking,
        checkins: checkins || [],
        invalid: false,
      });

      toast({
        title: 'Booking Verified',
        description: 'Booking is valid and ready for check-in',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCheckIn = (passengerId: string) => {
    if (!verifiedBooking) return;
    checkInMutation.mutate({
      bookingId: verifiedBooking.id,
      passengerId,
    });
  };

  const isPassengerCheckedIn = (passengerId: string) => {
    return verifiedBooking?.checkins?.some((c: any) => c.passenger_id === passengerId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">QR Code Scanner</h2>
        <p className="text-muted-foreground">Scan passenger tickets and verify bookings</p>
      </div>

      {/* Scanner Input */}
      <Card>
        <CardHeader>
          <CardTitle>Verify Booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter booking reference (e.g., BK-ABC12345)"
                value={bookingReference}
                onChange={(e) => setBookingReference(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    verifyBooking();
                  }
                }}
              />
            </div>
            <Button onClick={verifyBooking} disabled={isVerifying}>
              <QrCode className="h-4 w-4 mr-2" />
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>• Scan the QR code on the passenger's ticket</p>
            <p>• Or manually enter the booking reference</p>
          </div>
        </CardContent>
      </Card>

      {/* Verified Booking Details */}
      {verifiedBooking && (
        <Card className={verifiedBooking.invalid ? 'border-red-500' : 'border-green-500'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Booking Details</CardTitle>
              {verifiedBooking.invalid ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Invalid
                </Badge>
              ) : (
                <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Valid
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Booking Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Reference</p>
                <p className="font-semibold">{verifiedBooking.booking_reference}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={verifiedBooking.status === 'confirmed' ? 'default' : 'secondary'}>
                  {verifiedBooking.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(verifiedBooking.booking_date), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-semibold text-green-600">
                  {formatZMW(verifiedBooking.total_price_zmw)}
                </p>
              </div>
            </div>

            {/* Route Info */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold">
                  {verifiedBooking.schedule?.route?.origin} → {verifiedBooking.schedule?.route?.destination}
                </p>
                <p className="text-sm text-muted-foreground">
                  Departure: {verifiedBooking.schedule?.departure_time?.slice(0, 5)} • 
                  Bus: {verifiedBooking.schedule?.bus?.license_plate}
                </p>
              </div>
            </div>

            {/* Passengers */}
            {!verifiedBooking.invalid && (
              <div>
                <h3 className="font-semibold mb-3">Passengers ({verifiedBooking.passengers?.length})</h3>
                <div className="space-y-2">
                  {verifiedBooking.passengers?.map((passenger: any) => {
                    const checkedIn = isPassengerCheckedIn(passenger.id);
                    
                    return (
                      <div
                        key={passenger.id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          checkedIn ? 'bg-green-50 border-green-200' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <User className={`h-5 w-5 ${checkedIn ? 'text-green-600' : 'text-gray-400'}`} />
                          <div>
                            <p className="font-medium">
                              {passenger.first_name} {passenger.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Seat {passenger.seat_number}
                            </p>
                          </div>
                        </div>

                        {checkedIn ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Checked In
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleCheckIn(passenger.id)}
                            disabled={checkInMutation.isPending}
                          >
                            Check In
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Invalid Reason */}
            {verifiedBooking.invalid && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">
                  {verifiedBooking.reason === 'cancelled'
                    ? 'This booking has been cancelled and is no longer valid.'
                    : 'Payment for this booking is still pending.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!verifiedBooking && (
        <Card>
          <CardContent className="p-12 text-center">
            <QrCode className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
            <p className="text-muted-foreground">
              Enter a booking reference or scan a QR code to verify and check in passengers
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
