import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Download, Share, Home } from "lucide-react";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { generateQRData } from "@/utils/qrUtils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatZMW } from "@/utils/pricingUtils";
import { format } from "date-fns";

interface BookingConfirmationProps {
  onStartOver: () => void;
  bookingData?: any;
  bookingId?: string | null;
  scheduleId?: string;
  from?: string;
  to?: string;
  bookingDate?: string;
}

const BookingConfirmation = ({ 
  onStartOver, 
  bookingData, 
  bookingId,
  scheduleId,
  from,
  to,
  bookingDate 
}: BookingConfirmationProps) => {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      if (bookingId) {
        try {
          const { data, error } = await supabase
            .from('bookings')
            .select(`
              *,
              baggage_weight_kg,
              extra_luggage_count,
              schedules (
                departure_time,
                arrival_time,
                routes (
                  origin,
                  destination
                ),
                buses (
                  license_plate,
                  bus_class,
                  operator:bus_operators (name)
                )
              ),
              passengers (
                first_name,
                last_name,
                seat_number
              )
            `)
            .eq('id', bookingId)
            .single();

          if (error) throw error;
          setBooking(data);
        } catch (error) {
          console.error('Error fetching booking:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  // Use booking data from database or fallback to props/bookingData
  const bookingRef = booking?.booking_reference || `ZB${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  const totalPrice = booking?.total_price_zmw || bookingData?.totalPrice || 0;
  const passengers = booking?.passengers || bookingData?.passengers || [];
  const origin = booking?.schedules?.routes?.origin || from || bookingData?.from || "N/A";
  const destination = booking?.schedules?.routes?.destination || to || bookingData?.to || "N/A";
  const departureTime = booking?.schedules?.departure_time || bookingData?.departureTime || "N/A";
  const bookingDateFormatted = booking?.booking_date || bookingDate || new Date().toISOString().split('T')[0];
  const operatorName = booking?.schedules?.buses?.operator?.name || bookingData?.operatorName || "Bus Operator";
  const busClass = booking?.schedules?.buses?.bus_class || bookingData?.busClass || "economy";
  const passengerName = passengers[0] ? `${passengers[0].first_name} ${passengers[0].last_name}` : "Passenger";
  const route = `${origin} - ${destination}`;
  const date = bookingDateFormatted === new Date().toISOString().split('T')[0] ? "Today" : format(new Date(bookingDateFormatted), 'MMM dd, yyyy');
  const seatNumbers = passengers.map((p: any) => p.seat_number).join(", ");
  
  const qrData = generateQRData(bookingRef, passengerName, route, date);
  
  const handleDownload = () => {
    // This will be handled by QRCodeDisplay component
    // But we can trigger it programmatically if needed
    toast({
      title: "Download Ticket",
      description: "Use the download buttons on the QR code card to download your ticket"
    });
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ZamBus E-Ticket',
          text: `My bus ticket - ${bookingRef}\nRoute: ${route}\nDate: ${date}`,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `ZamBus E-Ticket\nBooking: ${bookingRef}\nRoute: ${route}\nDate: ${date}\nPassenger: ${passengerName}`
        );
        toast({
          title: "Copied!",
          description: "Booking details copied to clipboard"
        });
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      toast({
        title: "Error", 
        description: "Failed to share booking details",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 african-gradient rounded-full">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h1>
        <p className="text-gray-600">
          Your bus ticket has been booked successfully. You will receive a confirmation 
          SMS and email shortly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">E-Ticket</CardTitle>
            <p className="text-center text-sm text-gray-600">Booking Reference: {bookingRef}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading booking details...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-gray-900">From</p>
                    <p className="text-lg">{origin}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">To</p>
                    <p className="text-lg">{destination}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-gray-900">Date</p>
                    <p>{date}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Departure</p>
                    <p>{departureTime.slice(0, 5)}</p>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-gray-900 mb-2">Bus Operator</p>
                  <p>{operatorName} - {busClass.charAt(0).toUpperCase() + busClass.slice(1)} Coach</p>
                </div>

                <div>
                  <p className="font-medium text-gray-900 mb-2">Passengers & Seats</p>
                  <div className="space-y-2 mb-2">
                    {passengers.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{p.first_name} {p.last_name}</span>
                        <Badge>{p.seat_number}</Badge>
                      </div>
                    ))}
                  </div>
                  {booking?.baggage_weight_kg && booking.baggage_weight_kg > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      🛄 Total Baggage: {booking.baggage_weight_kg}kg
                    </div>
                  )}
                  {booking?.extra_luggage_count && booking.extra_luggage_count > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      🛄 Extra Bags: {booking.extra_luggage_count}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Paid</span>
                    <span className="text-primary">{formatZMW(Math.round(totalPrice))}</span>
                  </div>
                </div>
              </>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">Important Notes:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Please arrive at the station 30 minutes before departure</li>
                <li>• Bring a valid ID for verification</li>
                <li>• Keep this e-ticket for boarding</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleShare}>
                <Share className="h-4 w-4 mr-2" />
                Share Ticket
              </Button>
            </div>

            <Button onClick={onStartOver} className="w-full african-gradient">
              <Home className="h-4 w-4 mr-2" />
              Book Another Trip
            </Button>
          </CardContent>
        </Card>

        <div>
          <QRCodeDisplay 
            qrData={qrData} 
            bookingRef={bookingRef}
            bookingData={{
              origin,
              destination,
              date: date,
              time: departureTime.slice(0, 5),
              passengerName,
              seatNumber: seatNumbers,
              price: Math.round(totalPrice)
            }}
          />
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-semibold text-amber-800 mb-2">Verification Instructions</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Show this QR code to the conductor for verification</li>
              <li>• QR code contains encrypted booking information</li>
              <li>• Keep your phone charged for digital verification</li>
              <li>• Download ticket as backup (HTML/PDF format)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
