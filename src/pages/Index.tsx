import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import RouteSearch from "@/components/RouteSearch";
import BusResults from "@/components/BusResults";
import BookingFlow from "@/components/BookingFlow";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Ticket, MapPin, MessageCircle, Calendar, ArrowRight, Bell, FileText, Info, Heart, Package } from "lucide-react";
import { useTranslations } from "@/hooks/useTranslations";
import { formatDistanceToNow } from "date-fns";

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loading, user, isAuthenticated } = useAuth();
  const { isAdminOrModerator, isOperator, loading: rolesLoading } = useUserRole();
  const { t } = useTranslations();
  const currentStep = searchParams.get("step") || "search";
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [preservedStep, setPreservedStep] = useState<string | null>(null);

  // Fetch travel updates from database - MUST be called before any conditional returns
  const { data: travelUpdates = [], isLoading: updatesLoading } = useQuery({
    queryKey: ['travel-updates'],
    queryFn: async () => {
      try {
        // Increased timeout to 10 seconds
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 10000)
        );

        const queryPromise = supabase
          .from('travel_updates')
          .select('*')
          .eq('is_active', true)
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5);

        const result = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as { data: any[]; error: any };

        if (result.error) {
          // If table doesn't exist, return empty array
          if (result.error.code === '42P01' || result.error.message?.includes('does not exist')) {
            console.warn('travel_updates table does not exist yet');
            return [];
          }
          // Don't throw timeout errors - just return empty array
          if (result.error.message?.includes('timeout') || result.error.message?.includes('Query timeout')) {
            console.warn('Travel updates query timed out');
            return [];
          }
          throw result.error;
        }

        // Transform database records to match component format
        return (result.data || []).map((update: any) => ({
          id: update.id,
          icon: Info,
          iconColor: update.icon_color || 'bg-blue-500',
          title: update.title,
          description: update.description,
          type: update.type,
          time: formatDistanceToNow(new Date(update.created_at), { addSuffix: true })
        }));
      } catch (error: any) {
        // Don't log timeout errors - they're expected in slow connections
        if (!error?.message?.includes('timeout') && !error?.message?.includes('Query timeout')) {
          console.error('Error fetching travel updates:', error);
        }
        // Return empty array on any error
        return [];
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 60000, // Cache for 1 minute
    throwOnError: false,
    refetchOnWindowFocus: false
  });

  // Timeout protection for auth loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 3000); // 3 second timeout
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Redirect admin users to admin dashboard if they land on home page
  useEffect(() => {
    if (isAuthenticated && !loading && !rolesLoading && currentStep === "search") {
      // Only redirect if we're on the home page (not in booking flow)
      const currentPath = window.location.pathname;
      
      if (isAdminOrModerator()) {
        // Redirect admins/moderators to admin dashboard
        if (currentPath !== "/admin" && !currentPath.startsWith("/admin")) {
          const timer = setTimeout(() => {
            navigate("/admin");
          }, 500);
          return () => clearTimeout(timer);
        }
      } else if (isOperator()) {
        // Redirect operators to operator dashboard
        if (currentPath !== "/operator" && !currentPath.startsWith("/operator")) {
          const timer = setTimeout(() => {
            navigate("/operator");
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isAuthenticated, loading, rolesLoading, isAdminOrModerator, isOperator, currentStep, navigate]);

  // Preserve step parameter during loading to prevent reset
  useEffect(() => {
    const step = searchParams.get("step");
    if (step && step !== "search") {
      setPreservedStep(step);
    } else if (preservedStep && !step) {
      // If step was lost but we have a preserved one, restore it
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const date = searchParams.get("date");
      if (from && to && date) {
        navigate(`/?step=${preservedStep}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`, { replace: true });
      }
    }
  }, [searchParams, preservedStep, navigate]);

  // Show loading spinner while auth is initializing (but not forever)
  // But don't show if we're on a results/booking step - show content instead
  if (loading && !loadingTimeout && currentStep === "search") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      icon: Ticket,
      title: t('index.bookTicket'),
      subtitle: t('index.searchBook'),
      color: "bg-blue-500",
      onClick: () => {
        const searchElement = document.getElementById("route-search");
        if (searchElement) {
          searchElement.scrollIntoView({ behavior: "smooth" });
        }
      }
    },
    {
      icon: Heart,
      title: "Lost & Found",
      subtitle: "Report or find items",
      color: "bg-green-500",
      onClick: () => navigate("/lost-and-found")
    },
    {
      icon: Package,
      title: "P2P Delivery",
      subtitle: "Send packages",
      color: "bg-cyan-500",
      onClick: () => navigate("/peer-delivery")
    },
    {
      icon: Calendar,
      title: t('index.myBookings'),
      subtitle: t('index.viewBookings'),
      color: "bg-indigo-500",
      onClick: () => navigate("/bookings"),
      requiresAuth: true
    }
  ];

  const renderCurrentStep = () => {
    // Use preserved step if current step is lost during loading
    const activeStep = currentStep === "search" && preservedStep ? preservedStep : currentStep;
    switch (activeStep) {
      case "search":
        return (
          <div className="space-y-0 pb-4">
            {/* Welcome Section */}
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {isAuthenticated && user ? (user.firstName?.[0] || user.email?.[0] || "U").toUpperCase() : "G"}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{t('index.welcome')}</p>
                    <h2 className="text-sm font-semibold text-gray-900">
                      {isAuthenticated && user 
                        ? `${user.firstName || "User"}` 
                        : `${t('index.guest')}`}
                    </h2>
                  </div>
                </div>
                <button className="relative p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                  <Bell className="h-4 w-4 text-gray-700" />
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  {quickActions
                    .filter(action => !action.requiresAuth || isAuthenticated)
                    .map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <Card 
                          key={index}
                          className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
                          onClick={action.onClick}
                        >
                          <CardContent className="p-3 flex items-center gap-2.5">
                            <div className={`${action.color} p-2 rounded-lg flex-shrink-0`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-xs mb-0.5">{action.title}</h3>
                              <p className="text-xs text-gray-600 leading-tight line-clamp-1">{action.subtitle}</p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>

                {/* Find Your Route Section */}
                <div id="route-search" className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5">{t('index.findRoute')}</h3>
              <RouteSearch />
                </div>

                {/* Travel Updates */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5">{t('index.travelUpdates')}</h3>
                  <div className="space-y-2">
                    {travelUpdates.map((update, index) => {
                      const Icon = update.icon;
                      return (
                        <Card key={index} className="border-0 shadow-sm">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2.5">
                              <div className={`${update.iconColor} p-1.5 rounded-lg flex-shrink-0`}>
                                <Icon className="h-3.5 w-3.5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-xs mb-0.5">{update.title}</h4>
                                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{update.description}</p>
                                <p className="text-xs text-gray-500 mt-1">{update.time}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "results":
        const resultsFrom = searchParams.get("from") || "";
        const resultsTo = searchParams.get("to") || "";
        const resultsDate = searchParams.get("date") || "";
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <button 
                onClick={() => navigate("/")}
                className="text-primary hover:underline mb-4"
              >
                ← Back to search
              </button>
            </div>
            <BusResults 
              onBookNow={(scheduleId, from, to, date) => {
                const params = new URLSearchParams({
                  step: "booking",
                  schedule: scheduleId,
                });
                if (from) params.append("from", from);
                if (to) params.append("to", to);
                if (date) params.append("date", date);
                navigate(`/?${params.toString()}`);
              }} 
            />
          </div>
        );
      case "booking":
        const scheduleId = searchParams.get("schedule") || undefined;
        const bookingFrom = searchParams.get("from") || undefined;
        const bookingTo = searchParams.get("to") || undefined;
        const bookingDate = searchParams.get("date") || undefined;
        return (
          <BookingFlow 
            onClose={() => navigate("/")}
            scheduleId={scheduleId}
            from={bookingFrom}
            to={bookingTo}
            bookingDate={bookingDate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />
      {renderCurrentStep()}
      <BottomNav />
    </div>
  );
};

export default Index;
