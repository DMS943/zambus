
import { useState, useEffect } from "react";
import { Calendar, MapPin, ArrowLeftRight, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useSearchParams } from "react-router-dom";

const RouteSearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [passengers, setPassengers] = useState("1");
  // Store an exact time value in HH:MM format (HTML time input)
  const [departureTime, setDepartureTime] = useState<string>("");

  const zambianCities = [
    "Lusaka", "Kitwe", "Ndola", "Kabwe", "Chingola", "Mufulira", 
    "Livingstone", "Luanshya", "Kasama", "Chipata", "Mongu", "Solwezi",
    "Mazabuka", "Choma", "Kafue", "Mumbwa", "Kapiri Mposhi", "Kaoma",
    "Sesheke", "Mpika", "Mbala", "Nakonde", "Lundazi", "Petauke",
    "Mwinilunga", "Kansanshi", "Kasumbalesa", "Kazungula"
  ];

  // Pre-fill form if coming from routes page
  useEffect(() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const timeParam = searchParams.get("time");
    
    if (fromParam) setFromCity(fromParam);
    if (toParam) setToCity(toParam);
    if (timeParam) setDepartureTime(timeParam);
  }, [searchParams]);

  const handleSwapCities = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  const handleSearch = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (fromCity && toCity && departureDate) {
      const params = new URLSearchParams({
        step: "results",
        from: fromCity,
        to: toCity,
        date: departureDate,
      });
      if (departureTime) {
        params.append("time", departureTime);
      }
      navigate(`/?${params.toString()}`, { replace: false });
    }
  };

  return (
    <Card className="w-full shadow-sm border-0">
      <CardContent className="p-3">
        <div className="space-y-2.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">From (Origin)</label>
            <Select value={fromCity} onValueChange={setFromCity}>
              <SelectTrigger className="h-9 border-gray-300 text-sm">
                <div className="flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-2 text-gray-400" />
                  <SelectValue placeholder="Select city" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {zambianCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center -my-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleSwapCities}
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">To (Destination)</label>
            <Select value={toCity} onValueChange={setToCity}>
              <SelectTrigger className="h-9 border-gray-300 text-sm">
                <div className="flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-2 text-gray-400" />
                  <SelectValue placeholder="Select city" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {zambianCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  type="date"
                  value={departureDate}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    const today = new Date().toISOString().split('T')[0];
                    
                    // Prevent selecting past dates
                    if (selectedDate < today) {
                      return;
                    }
                    
                    setDepartureDate(selectedDate);
                  }}
                  className="h-9 pl-9 border-gray-300 text-sm"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Time</label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="h-9 pl-9 border-gray-300 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <Button 
          type="button"
          className="w-full mt-3 h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm"
          onClick={handleSearch}
          disabled={!fromCity || !toCity || !departureDate}
        >
          <Search className="h-4 w-4 mr-1.5" />
          Search Routes
        </Button>
      </CardContent>
    </Card>
  );
};

export default RouteSearch;
