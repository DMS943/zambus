
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, MapPin, Users, Wifi, Snowflake, Monitor, Zap, Coffee, Bus, ArrowRight } from "lucide-react";
import { useTranslations } from "@/hooks/useTranslations";
import { formatZMW } from "@/utils/pricingUtils";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const Routes = () => {
  const navigate = useNavigate();
  const { t } = useTranslations();
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedOperator, setSelectedOperator] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Fetch routes with schedules from database
  const { data: routes = [], isLoading, error: routesError } = useQuery({
    queryKey: ['routes-with-schedules'],
    queryFn: async () => {
      try {
        const queryPromise = supabase
          .from('schedules')
          .select(`
            id,
            departure_time,
            arrival_time,
            price_zmw,
            available_dates,
            route:routes (
              id,
              origin,
              destination,
              distance_km,
              estimated_duration_hours
            ),
            bus:buses (
              id,
              license_plate,
              bus_class,
              total_seats,
              amenities,
              operator:bus_operators (
                id,
                name
              )
            )
          `)
          .eq('is_active', true)
          .order('departure_time');
        
        // Increased timeout to 10 seconds and handle it more gracefully
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 10000)
        );
        
        const result = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as { data: any; error: any };

        if (result.error) {
          // Don't show toast for missing tables or timeouts - just return empty array
          if (result.error.code === '42P01' || result.error.message?.includes('does not exist')) {
            console.warn('Routes table does not exist yet');
            return [];
          }
          // Don't show toast for timeout - just return empty array
          if (result.error.message?.includes('timeout') || result.error.message?.includes('Query timeout')) {
            console.warn('Query timed out, returning empty results');
            return [];
          }
          // Only show toast for other errors
          console.error('Error fetching routes:', result.error);
          toast.error('Failed to load routes. Please try again.');
          return [];
        }

        return result.data || [];
      } catch (error: any) {
        // Don't log timeout errors as errors - they're expected in slow connections
        if (!error?.message?.includes('timeout') && !error?.message?.includes('Query timeout')) {
          console.error('Non-timeout error in routes query:', error);
        }
        // Return empty array on any error so page still renders
        return [];
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000,
    gcTime: 60000, // Keep data in cache for 60 seconds
    // Don't treat empty results as errors
    throwOnError: false,
    // Continue to show old data while refetching
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });

  // Fetch seat availability for all schedules
  const { data: seatAvailability = {} } = useQuery({
    queryKey: ['seat-availability'],
    queryFn: async () => {
      try {
        // Get all bookings for today and future dates
        const today = new Date().toISOString().split('T')[0];
        const queryPromise = supabase
          .from('bookings')
          .select(`
            schedule_id,
            booking_date,
            passengers (seat_number)
          `)
          .gte('booking_date', today)
          .in('status', ['confirmed', 'pending']);

        // Add timeout for seat availability query
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 8000)
        );

        const result = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as { data: any; error: any };

        if (result.error) {
          if (!result.error.message?.includes('timeout')) {
            console.error('Error fetching seat availability:', result.error);
          }
          return {};
        }

        const bookings = result.data;

        // Count occupied seats per schedule_id and booking_date
        const availability: Record<string, number> = {};
        if (bookings) {
          bookings.forEach((booking: any) => {
            const key = `${booking.schedule_id}-${booking.booking_date}`;
            const seatCount = booking.passengers?.length || 0;
            availability[key] = (availability[key] || 0) + seatCount;
          });
        }
        return availability;
      } catch (error: any) {
        // Don't log timeout errors
        if (!error?.message?.includes('timeout') && !error?.message?.includes('Query timeout')) {
          console.error('Error in seat availability query:', error);
        }
        return {};
      }
    },
    retry: 1,
    staleTime: 15000, // Cache for 15 seconds
    throwOnError: false,
    refetchOnWindowFocus: false
  });

  // Fetch bus operators for the filter dropdown
  const { data: operators = [] } = useQuery({
    queryKey: ['bus-operators'],
    queryFn: async () => {
      try {
        const queryPromise = supabase
          .from('bus_operators')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        
        // Increased timeout to 10 seconds
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 10000)
        );
        
        const result = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as { data: any; error: any };

        if (result.error) {
          // Don't log timeout errors as errors
          if (!result.error.message?.includes('timeout') && !result.error.message?.includes('Query timeout')) {
            console.error('Error fetching operators:', result.error);
          }
          return [];
        }

        return result.data || [];
      } catch (error: any) {
        // Don't log timeout errors
        if (!error?.message?.includes('timeout') && !error?.message?.includes('Query timeout')) {
          console.error('Error in operators query:', error);
        }
        return [];
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 60000, // Cache operators longer as they change less frequently
    throwOnError: false,
    refetchOnWindowFocus: false
  });

  const zambianCities = [
    "All Cities", "Lusaka", "Kitwe", "Ndola", "Kabwe", "Chingola", "Mufulira", 
    "Livingstone", "Luanshya", "Kasama", "Chipata", "Mongu", "Solwezi",
    "Mazabuka", "Choma", "Kafue", "Mumbwa", "Kapiri Mposhi", "Kaoma",
    "Sesheke", "Mpika", "Mbala", "Nakonde", "Lundazi", "Petauke",
    "Mwinilunga", "Kansanshi", "Kasumbalesa", "Kazungula", "Harare", "Lilongwe"
  ];

  const filteredRoutes = routes.filter(route => {
    // Skip routes with missing data
    if (!route.route || !route.bus) return false;
    
    const origin = route.route?.origin || '';
    const destination = route.route?.destination || '';
    const operatorName = route.bus?.operator?.name || '';
    const operatorId = route.bus?.operator?.id || '';
    
    const matchesCity = !selectedCity || selectedCity === "all" || selectedCity === "All Cities" || 
                       origin === selectedCity || destination === selectedCity;
    const matchesOperator = !selectedOperator || selectedOperator === "all" || selectedOperator === "All Operators" ||
                           operatorId === selectedOperator;
    const matchesSearch = !searchTerm || searchTerm === "" || 
                         origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operatorName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCity && matchesOperator && matchesSearch;
  });


  const handleBookRoute = (route: any) => {
    // Navigate to booking flow with schedule ID and route info
    if (!route || !route.id || !route.route) {
      toast.error('Invalid route data. Please try again.');
      return;
    }
    
    // Validate that route.id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(route.id)) {
      console.error('Invalid schedule ID:', route.id);
      toast.error('Invalid schedule selected. Please try selecting a different route.');
      return;
    }
    
    const from = route.route?.origin || '';
    const to = route.route?.destination || '';
    const today = new Date().toISOString().split('T')[0];
    
    navigate(`/?step=booking&schedule=${route.id}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${today}`);
  };

  const getBusClassBadge = (busClass: 'economy' | 'luxury' | 'vip') => {
    const classConfig = {
      economy: { label: t('busClass.economy'), variant: 'secondary' as const },
      luxury: { label: t('busClass.luxury'), variant: 'default' as const },
      vip: { label: t('busClass.vip'), variant: 'destructive' as const }
    };
    return classConfig[busClass] || classConfig.economy;
  };

  const getAmenityIcon = (amenity: string) => {
    const amenityConfig: { [key: string]: { icon: React.ElementType; label: string } } = {
      wifi: { icon: Wifi, label: t('amenities.wifi') },
      ac: { icon: Snowflake, label: t('amenities.ac') },
      entertainment: { icon: Monitor, label: t('amenities.entertainment') },
      charging: { icon: Zap, label: t('amenities.charging') },
      refreshments: { icon: Coffee, label: t('amenities.refreshments') }
    };
    return amenityConfig[amenity] || { icon: Bus, label: amenity };
  };

  // Apply filter type to routes
  const typeFilteredRoutes = filterType === "all" 
    ? filteredRoutes 
    : filteredRoutes.filter(route => {
        const isExpress = route.bus?.bus_class === 'luxury' || route.bus?.bus_class === 'express';
        return filterType === "express" ? isExpress : !isExpress;
      });

  // Timeout protection - don't show loading forever
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 8000); // 8 second timeout - give it time for slow connections
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  if (isLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading routes...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Show empty state if no routes (whether from error or empty database)
  // Don't show error message - just show that no routes are available

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-lg font-bold text-gray-900 mb-1">Available Routes</h1>
          <p className="text-sm text-gray-600">Choose your destination and travel in comfort</p>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-4 space-y-3">
          {/* Search Input */}
          <Input
            placeholder="Search by city, route, or bus operator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 text-sm"
          />
          
          {/* City and Operator Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Filter by city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {zambianCities.filter(city => city !== "All Cities").map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedOperator} onValueChange={setSelectedOperator}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Filter by bus operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operators</SelectItem>
                {operators.map((operator) => (
                  <SelectItem key={operator.id} value={operator.id}>
                    {operator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Active Filters Display */}
          {(selectedCity !== "all" || selectedOperator !== "all" || searchTerm) && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600">Active filters:</span>
              {selectedCity !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  City: {selectedCity}
                  <button onClick={() => setSelectedCity("all")} className="ml-1 hover:text-red-600">×</button>
                </Badge>
              )}
              {selectedOperator !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Operator: {operators.find(op => op.id === selectedOperator)?.name}
                  <button onClick={() => setSelectedOperator("all")} className="ml-1 hover:text-red-600">×</button>
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")} className="ml-1 hover:text-red-600">×</button>
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedCity("all");
                  setSelectedOperator("all");
                  setSearchTerm("");
                }}
                className="text-xs h-6"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === "all"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("express")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === "express"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            Express
          </button>
          <button
            onClick={() => setFilterType("standard")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === "standard"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            Standard
          </button>
        </div>

        {/* Routes List */}
        <div className="mb-4">
          {typeFilteredRoutes.length > 0 ? (
            <div className="space-y-2.5">
              {typeFilteredRoutes
                .filter(route => route && route.route && route.bus) // Filter out invalid routes
                .map((route) => {
              
              const isExpress = route.bus?.bus_class === 'luxury' || route.bus?.bus_class === 'express';
              const hours = route.route?.estimated_duration_hours || Math.round((route.route?.distance_km || 0) / 80);
              const minutes = Math.round(((route.route?.estimated_duration_hours || 0) % 1) * 60);
              const duration = hours > 0 ? `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`.trim() : 'N/A';
              // Calculate actual seats left
              const totalSeats = route.bus?.total_seats || 50;
              const today = new Date().toISOString().split('T')[0];
              // Get first available date from available_dates or use today
              const availableDate = route.available_dates?.[0] || today;
              const availabilityKey = `${route.id}-${availableDate}`;
              const occupiedSeats = seatAvailability[availabilityKey] || 0;
              const seatsLeft = Math.max(0, totalSeats - occupiedSeats);
              const origin = route.route?.origin || 'N/A';
              const destination = route.route?.destination || 'N/A';
              const operatorName = route.bus?.operator?.name || 'Unknown Operator';
              // Handle prices - if price seems too high (stored in ngwee/cents), divide by 100
              // Prices over 1000 are likely stored incorrectly (should be ZMW, not ngwee)
              // For now, if price > 1000, assume it's in ngwee (100 ngwee = 1 ZMW) or needs correction
              let price = route.price_zmw || 0;
              if (price > 1000) {
                // Likely stored in ngwee (100 ngwee = 1 ZMW) or incorrectly high values
                // Divide by 100 to convert to ZMW
                price = price / 100;
              }
              
              return (
              <Card key={route.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-900 text-base">
                          {origin} → {destination}
                        </span>
                      </div>
                      
                      {/* Operator Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <Bus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <Badge variant="outline" className="text-xs">
                          {operatorName}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {route.bus?.bus_class || 'economy'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1.5">
                        <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span>{duration} {isExpress ? 'Express' : 'Standard'}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Departs: {route.departure_time?.slice(0, 5) || 'N/A'}
                      </div>
                      
                      {/* Amenities */}
                      {route.bus?.amenities && route.bus.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {route.bus.amenities.slice(0, 3).map((amenity: string) => {
                            const { icon: Icon, label } = getAmenityIcon(amenity);
                            return (
                              <div key={amenity} className="flex items-center gap-1 text-xs text-gray-500">
                                <Icon className="h-3 w-3" />
                                <span>{label}</span>
                              </div>
                            );
                          })}
                          {route.bus.amenities.length > 3 && (
                            <span className="text-xs text-gray-500">+{route.bus.amenities.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-bold text-gray-900 mb-1">
                        {formatZMW(Math.round(price))}
                      </div>
                      <div className="text-sm text-gray-600 mb-2.5">
                        {seatsLeft} seats left
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 h-8"
                        onClick={() => handleBookRoute(route)}
                      >
                        Book Now <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )})}
          </div>
          ) : (
            <div className="text-center py-12">
              <Bus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No routes found</h3>
              <p className="text-gray-400">Try adjusting your filters or check back later</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setSelectedCity("");
                setSelectedOperator("");
                setSearchTerm("");
                  setFilterType("all");
              }}
            >
                Clear Filters
            </Button>
            </div>
        )}
      </div>
            </div>
      <BottomNav />
    </div>
  );
};

export default Routes;
