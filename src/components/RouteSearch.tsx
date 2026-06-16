import { useState, useEffect } from "react";
import { Calendar, MapPin, ArrowLeftRight, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useSearchParams } from "react-router-dom";

const RouteSearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState<string>("");

  const zambianCities = [
    "Lusaka", "Kitwe", "Ndola", "Kabwe", "Chingola", "Mufulira",
    "Livingstone", "Luanshya", "Kasama", "Chipata", "Mongu", "Solwezi",
    "Mazabuka", "Choma", "Kafue", "Mumbwa", "Kapiri Mposhi", "Kaoma",
    "Sesheke", "Mpika", "Mbala", "Nakonde", "Lundazi", "Petauke",
    "Mwinilunga", "Kansanshi", "Kasumbalesa", "Kazungula"
  ];

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
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (fromCity && toCity && departureDate) {
      const params = new URLSearchParams({ step: "results", from: fromCity, to: toCity, date: departureDate });
      if (departureTime) params.append("time", departureTime);
      navigate(`/?${params.toString()}`, { replace: false });
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* From city */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">From</label>
        <Select value={fromCity} onValueChange={setFromCity}>
          <SelectTrigger className="h-10 border-gray-200 bg-gray-50 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              <SelectValue placeholder="Select origin city" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {zambianCities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Swap button */}
      <div className="flex justify-center -my-1">
        <button
          type="button"
          onClick={handleSwapCities}
          className="h-7 w-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center hover:bg-blue-100 transition-colors"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500" />
        </button>
      </div>

      {/* To city */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">To</label>
        <Select value={toCity} onValueChange={setToCity}>
          <SelectTrigger className="h-10 border-gray-200 bg-gray-50 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
              <SelectValue placeholder="Select destination city" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {zambianCities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Date</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-3 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <Input
              type="date"
              value={departureDate}
              onChange={(e) => {
                const val = e.target.value;
                const today = new Date().toISOString().split('T')[0];
                if (val >= today) setDepartureDate(val);
              }}
              className="h-10 pl-8 border-gray-200 bg-gray-50 text-sm"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Time (optional)</label>
          <div className="relative">
            <Clock className="absolute left-2.5 top-3 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <Input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="h-10 pl-8 border-gray-200 bg-gray-50 text-sm"
            />
          </div>
        </div>
      </div>

      <Button
        type="button"
        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm"
        onClick={handleSearch}
        disabled={!fromCity || !toCity || !departureDate}
      >
        <Search className="h-4 w-4 mr-2" />
        Search Buses
      </Button>
    </div>
  );
};

export default RouteSearch;
