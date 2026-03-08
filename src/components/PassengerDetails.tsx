
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Users, Info, Clock, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculatePrice, getLuggagePrice, getLuggagePriceByWeight, formatZMW } from "@/utils/pricingUtils";
import LuggageInfo from "./LuggageInfo";
import { useSchedule } from "@/hooks/useSchedules";

interface PassengerDetailsProps {
  selectedSeats: string[];
  scheduleId?: string;
  from?: string;
  to?: string;
  bookingDate?: string;
  onBack: () => void;
  onContinue: (data: any) => void;
}

const PassengerDetails = ({ selectedSeats, scheduleId, from, to, bookingDate, onBack, onContinue }: PassengerDetailsProps) => {
  const [searchParams] = useSearchParams();
  const { data: schedule, isLoading: scheduleLoading } = useSchedule(scheduleId);
  
  // Get actual departure time from schedule
  const scheduleDepartureTime = schedule?.departure_time || "";
  const initialTime = scheduleDepartureTime ? scheduleDepartureTime.slice(0, 5) : searchParams.get("time") || "06:00";
  
  const departureOptions = [
    { value: "06:00", label: "Morning - 06:00" },
    { value: "09:00", label: "Mid-morning - 09:00" },
    { value: "12:00", label: "Afternoon - 12:00" },
    { value: "15:00", label: "Late Afternoon - 15:00" },
    { value: "18:00", label: "Evening - 18:00" },
  ];

  const [passengers, setPassengers] = useState(
    selectedSeats.map(seat => ({
      seatNumber: seat,
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
    }))
  );
  
  const [luggage, setLuggage] = useState(0);
  const [baggageWeightKg, setBaggageWeightKg] = useState(0);
  const [useWeightBased, setUseWeightBased] = useState(true);
  const [showLuggageInfo, setShowLuggageInfo] = useState(false);
  const [departureTime, setDepartureTime] = useState(initialTime);
  
  const handlePassengerChange = (index: number, field: string, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  // Calculate base price from schedule or use route calculation
  const basePrice = useMemo(() => {
    if (schedule?.price_zmw) {
      // Use schedule price
      const pricePerSeat = schedule.price_zmw > 1000 ? schedule.price_zmw / 100 : schedule.price_zmw;
      return selectedSeats.length * pricePerSeat;
    } else if (from && to && schedule?.bus?.bus_class) {
      // Calculate from route and bus class
      return selectedSeats.length * calculatePrice(from, to, schedule.bus.bus_class);
    } else if (from && to) {
      // Default to luxury if bus class not available
      return selectedSeats.length * calculatePrice(from, to, "luxury");
    }
    // Fallback
    return selectedSeats.length * 350;
  }, [selectedSeats.length, schedule?.price_zmw, schedule?.bus?.bus_class, from, to]);

  const luggagePrice = useMemo(() => {
    if (useWeightBased) {
      // Ensure we have valid numbers
      const weight = Number(baggageWeightKg) || 0;
      const passengers = Number(selectedSeats.length) || 0;
      return getLuggagePriceByWeight(weight, passengers);
    } else {
      return getLuggagePrice(luggage);
    }
  }, [useWeightBased, baggageWeightKg, selectedSeats.length, luggage]);

  const totalPrice = useMemo(() => basePrice + luggagePrice, [basePrice, luggagePrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Get route information from schedule or props
    const routeFrom = from || schedule?.route?.origin || '';
    const routeTo = to || schedule?.route?.destination || '';
    
    onContinue({
      passengers,
      luggage,
      baggageWeightKg: useWeightBased ? baggageWeightKg * selectedSeats.length : 0,
      totalPrice,
      useWeightBased,
      departureTime,
      from: routeFrom,
      to: routeTo,
      route: routeFrom && routeTo ? `${routeFrom} → ${routeTo}` : undefined,
    });
  };

  const isFormValid = passengers.every(p => p.firstName && p.lastName && p.phone);

  return (
    <div className="space-y-6">
      {showLuggageInfo && (
        <LuggageInfo />
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Passenger Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {passengers.map((passenger, index) => (
                  <div key={passenger.seatNumber} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary">Seat {passenger.seatNumber}</Badge>
                      <span className="font-medium">Passenger {index + 1}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`firstName-${index}`}>First Name *</Label>
                        <Input
                          id={`firstName-${index}`}
                          value={passenger.firstName}
                          onChange={(e) => handlePassengerChange(index, 'firstName', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`lastName-${index}`}>Last Name *</Label>
                        <Input
                          id={`lastName-${index}`}
                          value={passenger.lastName}
                          onChange={(e) => handlePassengerChange(index, 'lastName', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`phone-${index}`}>Phone Number *</Label>
                        <Input
                          id={`phone-${index}`}
                          value={passenger.phone}
                          onChange={(e) => handlePassengerChange(index, 'phone', e.target.value)}
                          placeholder="+260..."
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`email-${index}`}>Email (Optional)</Label>
                        <Input
                          id={`email-${index}`}
                          type="email"
                          value={passenger.email}
                          onChange={(e) => handlePassengerChange(index, 'email', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Baggage</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLuggageInfo(!showLuggageInfo)}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={useWeightBased ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setUseWeightBased(true);
                          // Reset bag count when switching to weight
                          setLuggage(0);
                        }}
                      >
                        By Weight (kg)
                      </Button>
                      <Button
                        type="button"
                        variant={!useWeightBased ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setUseWeightBased(false);
                          // Reset weight when switching to bags
                          setBaggageWeightKg(0);
                        }}
                      >
                        By Bags
                      </Button>
                    </div>
                  </div>
                  
                  {useWeightBased ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="baggage-weight">Baggage Weight Per Passenger (kg)</Label>
                        <div className="flex items-center gap-4 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setBaggageWeightKg(Math.max(0, baggageWeightKg - 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            id="baggage-weight"
                            type="number"
                            min="0"
                            max="200"
                            step="1"
                            value={baggageWeightKg || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || val === null) {
                                setBaggageWeightKg(0);
                              } else {
                                const numVal = parseFloat(val);
                                if (!isNaN(numVal)) {
                                  setBaggageWeightKg(Math.max(0, Math.min(200, numVal)));
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (isNaN(val) || val < 0) {
                                setBaggageWeightKg(0);
                              }
                            }}
                            className="w-24 text-center"
                          />
                          <span className="text-sm text-gray-600">kg</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setBaggageWeightKg(Math.min(200, baggageWeightKg + 1))}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Free: 20kg per passenger. Extra: K5/kg above free allowance
                        </p>
                        {baggageWeightKg > 20 && (
                          <p className="text-sm text-blue-600 mt-1">
                            Per passenger: {baggageWeightKg}kg (Free: 20kg) = {baggageWeightKg - 20}kg extra per passenger
                          </p>
                        )}
                        {selectedSeats.length > 1 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Total: {baggageWeightKg * selectedSeats.length}kg across {selectedSeats.length} passenger(s)
                            {baggageWeightKg > 20 && (
                              <span> (Total free: {20 * selectedSeats.length}kg, Extra: {(baggageWeightKg - 20) * selectedSeats.length}kg)</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setLuggage(Math.max(0, luggage - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-lg font-medium w-8 text-center">{luggage}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setLuggage(Math.min(9, luggage + 1))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-600 ml-4">
                        {luggage === 0 ? "1 bag included free" : `ZMW 50 per extra bag`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                    Back to Seat Selection
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 african-gradient"
                    disabled={!isFormValid}
                  >
                    Continue to Payment
                  </Button>
                </div>
              </form>
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
                {from && to ? (
                  <>
                    <p className="text-sm text-gray-600">{from} → {to}</p>
                    {schedule?.route?.distance_km && (
                      <p className="text-xs text-gray-500">({schedule.route.distance_km} km)</p>
                    )}
                  </>
                ) : schedule?.route ? (
                  <>
                    <p className="text-sm text-gray-600">{schedule.route.origin} → {schedule.route.destination}</p>
                    {schedule.route.distance_km && (
                      <p className="text-xs text-gray-500">({schedule.route.distance_km} km)</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-600">Route information not available</p>
                )}
              </div>
              
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Departure Time
                </p>
                <div className="mt-1">
                  {scheduleDepartureTime ? (
                    <>
                      <p className="text-sm text-gray-900 font-medium">
                        {scheduleDepartureTime.slice(0, 5)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Scheduled departure time
                      </p>
                    </>
                  ) : (
                    <>
                      <Select value={departureTime} onValueChange={setDepartureTime}>
                        <SelectTrigger className="h-9 w-full border-gray-300 text-sm">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                            <SelectValue placeholder="Choose departure time" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {departureOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Preferred departure time
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <p className="font-medium">Selected Seats</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedSeats.map(seat => (
                    <Badge key={seat} variant="secondary">{seat}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span>Tickets ({selectedSeats.length})</span>
                  <span>{formatZMW(basePrice)}</span>
                </div>
                {useWeightBased ? (
                  <>
                    {baggageWeightKg > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Baggage: {baggageWeightKg}kg × {selectedSeats.length} passenger(s) = {baggageWeightKg * selectedSeats.length}kg total</span>
                        <span className="text-xs">
                          (Free: {20 * selectedSeats.length}kg)
                        </span>
                      </div>
                    )}
                    {luggagePrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-primary font-medium">
                          Extra Baggage ({(baggageWeightKg - 20) * selectedSeats.length}kg excess @ K5/kg)
                        </span>
                        <span className="text-primary font-medium">{formatZMW(luggagePrice)}</span>
                      </div>
                    )}
                    {baggageWeightKg > 0 && luggagePrice === 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>✓ Within free allowance</span>
                        <span>{formatZMW(0)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {luggage > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Extra Luggage ({luggage} bags @ K50 each)</span>
                        <span className="text-primary font-medium">{formatZMW(luggagePrice)}</span>
                      </div>
                    )}
                    {luggage === 0 && (
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Luggage (1 bag free included)</span>
                        <span>{formatZMW(0)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between items-center pt-2 border-t font-bold">
                  <span>Total</span>
                  <span className="text-xl text-primary">{formatZMW(totalPrice)}</span>
                </div>
                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-400 pt-1 border-t">
                    Debug: Base={basePrice}, Luggage={luggagePrice}, Total={totalPrice}, 
                    Weight={baggageWeightKg}kg, Passengers={selectedSeats.length}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PassengerDetails;
