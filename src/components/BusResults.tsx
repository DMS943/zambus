import { Clock, MapPin, Star, Wifi, Tv, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { calculatePrice, formatZMW } from "@/utils/pricingUtils";
import { useSchedules } from "@/hooks/useSchedules";

interface BusResultsProps {
  onBookNow?: (scheduleId: string, from?: string, to?: string, date?: string) => void;
}

const BusResults = ({ onBookNow }: BusResultsProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const date = searchParams.get("date") || "";
  // Now represents an exact preferred departure time in HH:MM format (if provided)
  const preferredTime = searchParams.get("time") || "";
  
  const { data: schedules = [], isLoading: loading } = useSchedules(from, to, date, preferredTime);

  // Use real data from database only - no mock data to avoid UUID issues
  const busResults = schedules.length > 0 ? schedules.map(schedule => ({
    id: schedule.id,
    operator: schedule.bus?.operator?.name || "Bus Operator",
    busType: schedule.bus?.bus_class || "economy",
    departureTime: schedule.departure_time,
    arrivalTime: schedule.arrival_time || "TBD",
    duration: schedule.route?.estimated_duration_hours ? `${schedule.route.estimated_duration_hours}h` : "8h 30m",
    rating: 4.5, // Mock rating
    seatsAvailable: schedule.bus?.total_seats || 48,
    amenities: schedule.bus?.amenities || ["wifi"],
    route: `${schedule.route?.origin} → ${schedule.route?.destination}`,
    price: schedule.price_zmw
  })) : [];
  
  // Removed mock data to prevent UUID validation errors
  // If no schedules are available, show a message instead
  /*
  const mockBusResults = [
    {
      id: "1",
      operator: "Zambia Express",
      busType: "luxury" as const,
      departureTime: "06:00",
      arrivalTime: "14:30",
      duration: "8h 30m",
      rating: 4.5,
      seatsAvailable: 12,
      amenities: ["wifi", "tv", "food"],
      route: "Lusaka → Kitwe",
      price: 350
    },
    {
      id: "2",
      operator: "Copperbelt Express",
      busType: "economy" as const,
      departureTime: "08:15",
      arrivalTime: "16:45",
      duration: "8h 30m",
      rating: 4.2,
      seatsAvailable: 8,
      amenities: ["wifi"],
      route: "Lusaka → Kitwe",
      price: 280
    }
  ];
  */

  if (loading) {
    return <div className="text-center py-8">Loading available buses...</div>;
  }

  const getAmenityIcon = (amenity: string) => {
    switch (amenity) {
      case "wifi": return <Wifi className="h-4 w-4" />;
      case "tv": return <Tv className="h-4 w-4" />;
      case "food": return <Utensils className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleSelectSeats = (busId: string) => {
    // Validate that busId is a valid UUID before proceeding
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(busId)) {
      console.error('Invalid schedule ID:', busId);
      alert('Invalid schedule selected. Please try again.');
      return;
    }
    
    if (onBookNow) {
      onBookNow(busId, from, to, date);
    } else {
      navigate(`/?step=booking&schedule=${busId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`);
    }
  };

  if (busResults.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No buses available for this route and date.</p>
        <p className="text-sm text-gray-500">Please try a different route or date.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-gray-900">Available Buses</h2>
        <div className="flex items-center gap-3">
          {preferredTime && (
            <Badge variant="secondary" className="text-sm">
              <Clock className="h-3 w-3 mr-1" />
              Preferred: {preferredTime}
            </Badge>
          )}
          <p className="text-gray-600">{busResults.length} buses found</p>
        </div>
      </div>

      {busResults.map((bus) => {
        // Handle price - if > 1000, likely stored in ngwee (divide by 100)
        let price = bus.price || calculatePrice(from, to, bus.busType);
        if (price > 1000) {
          price = price / 100;
        }
        
        return (
          <Card key={bus.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{bus.operator}</h3>
                    <p className="text-sm text-gray-600 capitalize">{bus.busType.replace('-', ' ')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{bus.rating}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">{bus.departureTime}</p>
                      <p className="text-xs text-gray-600">Departure</p>
                    </div>
                    <div className="flex-1 px-4">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div className="flex-1 h-px bg-gray-300 mx-2"></div>
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div className="flex-1 h-px bg-gray-300 mx-2"></div>
                        <div className="w-2 h-2 bg-accent rounded-full"></div>
                      </div>
                      <p className="text-xs text-center text-gray-600 mt-1">{bus.duration}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">{bus.arrivalTime}</p>
                      <p className="text-xs text-gray-600">Arrival</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {bus.amenities.map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                        {getAmenityIcon(amenity)}
                        <span className="capitalize">{amenity}</span>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    {bus.seatsAvailable} seats available
                  </p>
                </div>

                <div className="text-center lg:text-right space-y-3">
                  <div>
                    <p className="text-2xl font-bold text-primary">{formatZMW(price)}</p>
                    <p className="text-sm text-gray-600">per person</p>
                  </div>
                  <Button 
                    className="w-full lg:w-auto african-gradient"
                    onClick={() => handleSelectSeats(bus.id)}
                  >
                    Select Seats
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BusResults;
