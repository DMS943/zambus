
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSeatAvailability } from "@/hooks/useSeatAvailability";
import { useSchedule, useSchedules } from "@/hooks/useSchedules";
import { formatZMW } from "@/utils/pricingUtils";
import { Clock, MapPin, Calendar } from "lucide-react";

interface SeatSelectionProps {
  scheduleId?: string;
  bookingDate?: string;
  from?: string;
  to?: string;
  onDateChange?: (date: string) => void;
  onTimeChange?: (time: string, newScheduleId?: string) => void;
  onBack?: () => void;
  onContinue: (selectedSeats: string[]) => void;
}

const SeatSelection = ({ scheduleId, bookingDate, from, to, onDateChange, onTimeChange, onBack, onContinue }: SeatSelectionProps) => {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [localBookingDate, setLocalBookingDate] = useState<string>(
    bookingDate || new Date().toISOString().split('T')[0]
  );
  const [localScheduleId, setLocalScheduleId] = useState<string | undefined>(scheduleId);
  
  // Fetch current schedule
  const { data: schedule, isLoading: scheduleLoading } = useSchedule(localScheduleId);
  
  // Fetch all available schedules for this route to show time options
  const { data: availableSchedules = [] } = useSchedules(from, to, localBookingDate);
  
  const { occupiedSeats, totalSeats, loading } = useSeatAvailability(
    localScheduleId || "default-schedule-id",
    localBookingDate
  );
  
  // Update local date when prop changes
  useEffect(() => {
    if (bookingDate && bookingDate !== localBookingDate) {
      setLocalBookingDate(bookingDate);
    }
  }, [bookingDate]);
  
  // Update local schedule ID when prop changes
  useEffect(() => {
    if (scheduleId && scheduleId !== localScheduleId) {
      setLocalScheduleId(scheduleId);
    }
  }, [scheduleId]);
  
  // Get available departure times from schedules (standard times: 05:00, 12:00, 15:00, 18:00, 20:00)
  const standardTimes = ['05:00', '12:00', '15:00', '18:00', '20:00'];
  const availableTimes = availableSchedules
    .map(s => s.departure_time?.slice(0, 5) || '')
    .filter((time, index, self) => time && self.indexOf(time) === index)
    .sort();
  
  // Use standard times if available, otherwise use times from schedules
  const timeOptions = standardTimes.filter(time => 
    availableSchedules.some(s => s.departure_time?.slice(0, 5) === time)
  ).length > 0 ? standardTimes.filter(time => 
    availableSchedules.some(s => s.departure_time?.slice(0, 5) === time)
  ) : availableTimes;
  
  // Get current departure time from schedule or use first available option
  const scheduleTime = schedule?.departure_time?.slice(0, 5) || '';
  const currentDepartureTime = scheduleTime || timeOptions[0] || '';
  
  // Ensure we have a valid schedule ID when schedules are loaded
  useEffect(() => {
    if (availableSchedules.length > 0 && !localScheduleId) {
      // If no schedule ID, use the first available schedule
      const firstSchedule = availableSchedules[0];
      if (firstSchedule?.id) {
        setLocalScheduleId(firstSchedule.id);
      }
    } else if (availableSchedules.length > 0 && localScheduleId) {
      // Verify the current schedule ID is still valid
      const currentScheduleExists = availableSchedules.some(s => s.id === localScheduleId);
      if (!currentScheduleExists && scheduleId) {
        // If current schedule doesn't exist in available schedules, try to find one matching the original scheduleId
        const originalSchedule = availableSchedules.find(s => s.id === scheduleId);
        if (originalSchedule) {
          setLocalScheduleId(scheduleId);
        } else {
          // Use first available schedule
          setLocalScheduleId(availableSchedules[0]?.id);
        }
      }
    }
  }, [availableSchedules, localScheduleId, scheduleId]);
  
  const handleDateChange = (newDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (newDate < today) {
      return; // Don't allow past dates
    }
    setLocalBookingDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
    // Clear selected seats when date changes (seats may be occupied on different date)
    setSelectedSeats([]);
  };
  
  const handleTimeChange = (newTime: string) => {
    // Find schedule with matching departure time
    const matchingSchedule = availableSchedules.find(s => 
      s.departure_time?.slice(0, 5) === newTime
    );
    
    if (matchingSchedule) {
      setLocalScheduleId(matchingSchedule.id);
      if (onTimeChange) {
        onTimeChange(newTime, matchingSchedule.id);
      }
      // Clear selected seats when schedule changes (different bus may have different seat layout)
      setSelectedSeats([]);
    } else {
      console.warn('No schedule found for departure time:', newTime);
    }
  };
  
  // Generate seat layout based on bus capacity
  const generateSeatLayout = () => {
    const layout = [];
    const seatsPerRow = 4;
    const totalRows = Math.ceil(totalSeats / seatsPerRow);
    
    for (let row = 1; row <= totalRows; row++) {
      const rowSeats = [`${row}A`, `${row}B`, `${row}C`, `${row}D`];
      layout.push(rowSeats);
    }
    
    return layout;
  };

  const layout = generateSeatLayout();

  const getSeatClass = (seatId: string) => {
    if (occupiedSeats.includes(seatId)) return "seat-occupied";
    if (selectedSeats.includes(seatId)) return "seat-selected";
    return "seat-available";
  };

  const handleSeatClick = (seatId: string) => {
    if (occupiedSeats.includes(seatId)) return;
    
    setSelectedSeats(prev => 
      prev.includes(seatId) 
        ? prev.filter(id => id !== seatId)
        : [...prev, seatId]
    );
  };

  // Calculate price from schedule or use fallback
  const pricePerSeat = schedule?.price_zmw || 350;
  // Handle price if stored in ngwee (divide by 100 if > 1000)
  // Prices in database should be in ZMW, but some might be stored incorrectly
  const adjustedPrice = pricePerSeat > 1000 ? pricePerSeat / 100 : pricePerSeat;
  const totalPrice = Math.round(selectedSeats.length * adjustedPrice);

  const handleContinue = () => {
    if (onContinue) {
      onContinue(selectedSeats);
    }
  };

  // Format departure time
  const formatTime = (time: string | null | undefined) => {
    if (!time) return 'N/A';
    const match = time.match(/(\d{1,2}):(\d{2})/);
    if (!match) return time;
    const hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes} ${period}`;
  };

  const route = schedule?.route;
  const bus = schedule?.bus;
  const origin = route?.origin || 'N/A';
  const destination = route?.destination || 'N/A';
  const operatorName = bus?.operator?.name || 'Bus Operator';
  const departureTime = formatTime(schedule?.departure_time);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Select Your Seats</CardTitle>
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded seat-available"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded seat-selected"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded seat-occupied"></div>
                <span>Occupied</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm mx-auto">
              {/* Bus Front */}
              <div className="mb-4 p-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-t-3xl text-center border-2 border-gray-400">
                <p className="text-sm font-medium text-gray-700">Driver</p>
              </div>
              
              {/* Bus Body */}
              <div className="border-2 border-gray-400 rounded-lg bg-gradient-to-b from-blue-50 to-white p-4">
                {/* Seat layout */}
                <div className="space-y-3">
                  {layout.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex justify-center items-center gap-2">
                      {/* Left side seats */}
                      <div className="flex gap-2">
                        {row.slice(0, 2).map((seatId) => (
                          <button
                            key={seatId}
                            onClick={() => handleSeatClick(seatId)}
                            className={`w-10 h-10 rounded-lg border-2 text-xs font-bold transition-all duration-200 transform hover:scale-105 ${getSeatClass(seatId)}`}
                            disabled={occupiedSeats.includes(seatId)}
                            title={`Seat ${seatId}`}
                          >
                            {seatId}
                          </button>
                        ))}
                      </div>
                      
                      {/* Aisle */}
                      <div className="w-8 flex justify-center">
                        <div className="w-1 h-8 bg-gradient-to-b from-gray-200 to-gray-300 rounded-full"></div>
                      </div>
                      
                      {/* Right side seats */}
                      <div className="flex gap-2">
                        {row.slice(2, 4).map((seatId) => (
                          <button
                            key={seatId}
                            onClick={() => handleSeatClick(seatId)}
                            className={`w-10 h-10 rounded-lg border-2 text-xs font-bold transition-all duration-200 transform hover:scale-105 ${getSeatClass(seatId)}`}
                            disabled={occupiedSeats.includes(seatId)}
                            title={`Seat ${seatId}`}
                          >
                            {seatId}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bus Rear */}
              <div className="mt-2 p-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-b-lg border-2 border-t-0 border-gray-400">
                <div className="h-4 bg-gradient-to-r from-red-400 to-red-500 rounded"></div>
              </div>
            </div>

            {selectedSeats.length > 0 && (
              <div className="mt-6 p-4 bg-primary/5 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-2">Selected Seats:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {selectedSeats.map(seat => (
                    <Badge key={seat} className="african-gradient text-white">{seat}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Route
              </p>
              <p className="text-sm text-gray-600">{origin} → {destination}</p>
              {route?.distance_km && (
                <p className="text-xs text-gray-500">({route.distance_km} km)</p>
              )}
            </div>
            
            <div>
              <p className="font-medium">Bus Operator</p>
              <p className="text-sm text-gray-600">{operatorName}</p>
              {bus?.bus_class && (
                <p className="text-xs text-gray-500 capitalize">{bus.bus_class}</p>
              )}
            </div>
            
            <div>
              <p className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Departure Time
              </p>
              <div className="mt-1">
                <Select 
                  value={currentDepartureTime} 
                  onValueChange={handleTimeChange}
                >
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => {
                      const timeSchedule = availableSchedules.find(s => 
                        s.departure_time?.slice(0, 5) === time
                      );
                      const price = timeSchedule?.price_zmw || 0;
                      const adjustedPrice = price > 1000 ? price / 100 : price;
                      return (
                        <SelectItem key={time} value={time}>
                          {time} - {formatZMW(Math.round(adjustedPrice))}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2">
                <Label htmlFor="travel-date-select" className="text-xs text-gray-500 mb-1 block">
                  Travel Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input
                    id="travel-date-select"
                    type="date"
                    value={localBookingDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="h-8 pl-7 text-xs"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
            
            {selectedSeats.length > 0 && (
              <div>
                <p className="font-medium">Selected Seats</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedSeats.map(seat => (
                    <Badge key={seat} variant="secondary">{seat}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-primary">{formatZMW(Math.round(totalPrice))}</span>
              </div>
              {selectedSeats.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {selectedSeats.length} seat(s) × {formatZMW(Math.round(adjustedPrice))}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              {onBack && (
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={onBack}
                >
                  Back to Bus Selection
                </Button>
              )}
              <Button 
                className="w-full african-gradient"
                disabled={selectedSeats.length === 0}
                onClick={handleContinue}
              >
                Continue to Passenger Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SeatSelection;
