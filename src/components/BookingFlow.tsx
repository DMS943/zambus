import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SeatSelection from "./SeatSelection";
import PassengerDetails from "./PassengerDetails";
import Payment from "./Payment";
import BookingConfirmation from "./BookingConfirmation";
import { useBooking, BookingData } from "@/hooks/useBooking";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type BookingStep = "seats" | "passengers" | "payment" | "confirmation";

interface BookingFlowProps {
  onClose?: () => void;
  scheduleId?: string;
  from?: string;
  to?: string;
  bookingDate?: string;
}

const BookingFlow = ({ onClose, scheduleId, from, to, bookingDate }: BookingFlowProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { createBooking, updateBookingPayment, loading } = useBooking();
  const [currentStep, setCurrentStep] = useState<BookingStep>("seats");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookingData, setBookingData] = useState<any>(null);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [currentScheduleId, setCurrentScheduleId] = useState<string | undefined>(scheduleId);
  const [selectedBookingDate, setSelectedBookingDate] = useState<string>(
    bookingDate || new Date().toISOString().split('T')[0]
  );
  const [selectedDepartureTime, setSelectedDepartureTime] = useState<string>('');

  const handleSeatSelection = (seats: string[]) => {
    setSelectedSeats(seats);
    setCurrentStep("passengers");
  };

  const handlePassengerDetails = async (data: any) => {
    // If user is not authenticated, redirect to auth page
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete your booking",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    setBookingData(data);
    setCurrentStep("payment");
  };

  const handlePaymentComplete = async (paymentData: any) => {
    if (!bookingData || !currentScheduleId) {
      toast({
        title: "Error",
        description: "Missing schedule information. Please start over.",
        variant: "destructive"
      });
      return;
    }

    // Validate scheduleId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(currentScheduleId)) {
      toast({
        title: "Invalid Schedule",
        description: "Please select a valid bus schedule to continue with your booking.",
        variant: "destructive"
      });
      console.error('Invalid scheduleId:', currentScheduleId);
      return;
    }

    try {
      // Validate booking date is not in the past
      const today = new Date().toISOString().split('T')[0];
      
      if (selectedBookingDate < today) {
        toast({
          title: "Invalid Date",
          description: "Cannot book tickets for past dates. Please select a future date.",
          variant: "destructive"
        });
        return;
      }
      
      // Create booking in database
      const bookingPayload: BookingData = {
        scheduleId: currentScheduleId,
        bookingDate: selectedBookingDate,
        passengers: bookingData.passengers,
        totalPrice: bookingData.totalPrice,
        extraLuggageCount: bookingData.luggage || bookingData.luggageCount || 0,
        baggageWeightKg: bookingData.baggageWeightKg || 0,
        contactPhone: bookingData.passengers[0]?.phone || "",
        contactEmail: bookingData.passengers[0]?.email,
        paymentMethod: paymentData.method || "mobile_money"
      };

      const result = await createBooking(bookingPayload);
      
      if (result.success) {
        setCurrentBookingId(result.bookingId);
        
        // Update payment status if payment was successful
        if (paymentData.success && result.bookingId) {
          await updateBookingPayment(result.bookingId, {
            paymentMethod: paymentData.method || "mobile_money",
            paymentReference: paymentData.reference,
            status: "confirmed"
          });
        }
        
        setCurrentStep("confirmation");
        toast({
          title: "Booking Successful",
          description: `Your booking reference is ${result.bookingReference}`,
        });
      } else {
        toast({
          title: "Booking Failed",
          description: result.error || "Failed to create booking",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Payment completion error:", error);
      toast({
        title: "Error",
        description: "An error occurred while processing your booking",
        variant: "destructive"
      });
    }
  };

  const handleStartOver = () => {
    setCurrentStep("seats");
    setSelectedSeats([]);
    setBookingData(null);
    setCurrentBookingId(null);
  };

  const handleBack = () => {
    switch (currentStep) {
      case "passengers":
        setCurrentStep("seats");
        break;
      case "payment":
        setCurrentStep("passengers");
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {["seats", "passengers", "payment", "confirmation"].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === step 
                    ? "bg-primary text-white" 
                    : index < ["seats", "passengers", "payment", "confirmation"].indexOf(currentStep)
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
                  }`}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={`w-12 h-1 mx-2 
                    ${index < ["seats", "passengers", "payment", "confirmation"].indexOf(currentStep)
                      ? "bg-green-500"
                      : "bg-gray-300"
                    }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        {currentStep === "seats" && (
          <SeatSelection
            scheduleId={currentScheduleId}
            bookingDate={selectedBookingDate}
            from={from}
            to={to}
            onDateChange={setSelectedBookingDate}
            onTimeChange={(time: string, newScheduleId?: string) => {
              setSelectedDepartureTime(time);
              if (newScheduleId) {
                setCurrentScheduleId(newScheduleId);
              }
            }}
            onContinue={handleSeatSelection}
            onBack={onClose}
          />
        )}

        {currentStep === "passengers" && (
          <PassengerDetails
            selectedSeats={selectedSeats}
            scheduleId={currentScheduleId}
            from={from}
            to={to}
            bookingDate={selectedBookingDate}
            onContinue={handlePassengerDetails}
            onBack={handleBack}
          />
        )}

        {currentStep === "payment" && (
          <Payment
            bookingData={bookingData}
            from={from}
            to={to}
            onComplete={handlePaymentComplete}
            onBack={handleBack}
          />
        )}

        {currentStep === "confirmation" && (
          <BookingConfirmation
            onStartOver={handleStartOver}
            bookingData={bookingData}
            bookingId={currentBookingId}
            scheduleId={currentScheduleId}
            from={from}
            to={to}
            bookingDate={selectedBookingDate}
          />
        )}
      </div>
    </div>
  );
};

export default BookingFlow;