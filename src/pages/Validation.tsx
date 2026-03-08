import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Scan, Search } from "lucide-react";
import { verifyQRData } from "@/utils/qrUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

const Validation = () => {
  const [qrInput, setQrInput] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleQRVerify = async () => {
    setIsVerifying(true);
    
    try {
      const data = JSON.parse(qrInput);
      const isValid = verifyQRData(qrInput);
      
      if (isValid) {
        // Verify against database with timeout
        const queryPromise = supabase
          .from('bookings')
          .select(`
            *,
            passengers (*)
          `)
          .eq('booking_reference', data.bookingRef)
          .single();
        
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        );
        
        const result = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as { data: any; error: any };

        if (result.error || !result.data) {
          setVerificationResult({ isValid: false, data: null, error: "Booking not found" });
        } else {
          setVerificationResult({ 
            isValid: true, 
            data: { ...data, booking: result.data }, 
            verified: true 
          });
          toast({
            title: "Ticket Verified",
            description: "Valid ticket confirmed",
          });
        }
      } else {
        setVerificationResult({ isValid: false, data: null, error: "Invalid QR data" });
      }
    } catch (error: any) {
      if (error.message?.includes('timeout')) {
        setVerificationResult({ isValid: false, data: null, error: "Request timed out. Please try again." });
      } else {
        setVerificationResult({ isValid: false, data: null, error: "Invalid QR format" });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBookingSearch = async () => {
    if (!bookingRef.trim()) return;
    
    setIsVerifying(true);
    
    try {
      const queryPromise = supabase
        .from('bookings')
        .select(`
          *,
          passengers (*),
          schedules (
            *,
            routes (*),
            buses (*)
          )
        `)
        .eq('booking_reference', bookingRef.trim())
        .single();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      );
      
      const result = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as { data: any; error: any };

      if (result.error || !result.data) {
        setVerificationResult({ isValid: false, data: null, error: "Booking not found" });
        toast({
          title: "Not Found",
          description: "Booking reference not found",
          variant: "destructive"
        });
      } else {
        setVerificationResult({ 
          isValid: true, 
          data: { booking: result.data }, 
          verified: true 
        });
        toast({
          title: "Booking Found",
          description: "Valid booking confirmed",
        });
      }
    } catch (error: any) {
      console.error('Error searching booking:', error);
      if (error.message?.includes('timeout')) {
        setVerificationResult({ isValid: false, data: null, error: "Request timed out. Please try again." });
        toast({
          title: "Timeout",
          description: "Request took too long. Please try again.",
          variant: "destructive"
        });
      } else {
        setVerificationResult({ isValid: false, data: null, error: "Search failed" });
        toast({
          title: "Error",
          description: "Failed to search booking. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
    <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">Ticket Validation</h1>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* QR Code Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              QR Code Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Paste QR code data here..."
            />
            <Button 
              onClick={handleQRVerify} 
              disabled={!qrInput || isVerifying}
              className="w-full"
            >
              {isVerifying ? "Verifying..." : "Verify QR Code"}
            </Button>
          </CardContent>
        </Card>

        {/* Manual Booking Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Manual Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={bookingRef}
              onChange={(e) => setBookingRef(e.target.value)}
              placeholder="Enter booking reference..."
            />
            <Button 
              onClick={handleBookingSearch} 
              disabled={!bookingRef || isVerifying}
              className="w-full"
            >
              {isVerifying ? "Searching..." : "Search Booking"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Verification Results */}
      {verificationResult && (
        <Card className={`${
          verificationResult.isValid 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {verificationResult.isValid ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <Badge className="bg-green-100 text-green-800">Valid Ticket</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-600" />
                  <Badge className="bg-red-100 text-red-800">Invalid Ticket</Badge>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {verificationResult.isValid && verificationResult.data?.booking ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Booking Details</h3>
                    <p><strong>Reference:</strong> {verificationResult.data.booking.booking_reference}</p>
                    <p><strong>Date:</strong> {verificationResult.data.booking.booking_date}</p>
                    <p><strong>Status:</strong> {verificationResult.data.booking.status}</p>
                    <p><strong>Passengers:</strong> {verificationResult.data.booking.total_passengers}</p>
                    <p><strong>Total:</strong> K{verificationResult.data.booking.total_price_zmw}</p>
                  </div>
                  
                  {verificationResult.data.booking.schedules && (
                    <div>
                      <h3 className="font-semibold mb-2">Route Details</h3>
                      <p><strong>From:</strong> {verificationResult.data.booking.schedules.routes?.origin}</p>
                      <p><strong>To:</strong> {verificationResult.data.booking.schedules.routes?.destination}</p>
                      <p><strong>Departure:</strong> {verificationResult.data.booking.schedules.departure_time}</p>
                      <p><strong>Bus:</strong> {verificationResult.data.booking.schedules.buses?.license_plate}</p>
                    </div>
                  )}
                </div>
                
                {verificationResult.data.booking.passengers && (
                  <div>
                    <h3 className="font-semibold mb-2">Passengers</h3>
                    <div className="space-y-2">
                      {verificationResult.data.booking.passengers.map((passenger: any, index: number) => (
                        <div key={passenger.id} className="flex justify-between items-center p-2 bg-white rounded">
                          <span>{passenger.first_name} {passenger.last_name}</span>
                          <Badge variant="outline">Seat {passenger.seat_number}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-600">
                {verificationResult.error || "Ticket verification failed"}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default Validation;