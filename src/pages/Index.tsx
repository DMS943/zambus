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
import {
  Ticket, MapPin, MessageCircle, Calendar, ArrowRight,
  Bell, Info, Package, Search, Bus, ChevronRight
} from "lucide-react";
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

  const { data: travelUpdates = [], isLoading: updatesLoading } = useQuery({
    queryKey: ['travel-updates'],
    queryFn: async () => {
      try {
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

        const result = await Promise.race([queryPromise, timeoutPromise]) as { data: any[]; error: any };
        if (result.error) {
          if (result.error.code === '42P01' || result.error.message?.includes('does not exist')) return [];
          if (result.error.message?.includes('timeout')) return [];
          throw result.error;
        }
        return (result.data || []).map((update: any) => ({
          id: update.id,
          icon: Info,
          iconColor: update.icon_color || 'bg-blue-500',
          title: update.title,
          description: update.description,
          type: update.type,
          time: formatDistanceToNow(new Date(update.created_at), { addSuffix: true })
        }));
      } catch {
        return [];
      }
    },
    retry: 2,
    staleTime: 60000,
    throwOnError: false,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => setLoadingTimeout(true), 3000);
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  useEffect(() => {
    if (isAuthenticated && !loading && !rolesLoading && currentStep === "search") {
      const currentPath = window.location.pathname;
      if (isAdminOrModerator()) {
        if (currentPath !== "/admin" && !currentPath.startsWith("/admin")) {
          const timer = setTimeout(() => navigate("/admin"), 500);
          return () => clearTimeout(timer);
        }
      } else if (isOperator()) {
        if (currentPath !== "/operator" && !currentPath.startsWith("/operator")) {
          const timer = setTimeout(() => navigate("/operator"), 500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isAuthenticated, loading, rolesLoading, isAdminOrModerator, isOperator, currentStep, navigate]);

  useEffect(() => {
    const step = searchParams.get("step");
    if (step && step !== "search") {
      setPreservedStep(step);
    } else if (preservedStep && !step) {
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const date = searchParams.get("date");
      if (from && to && date) {
        navigate(`/?step=${preservedStep}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`, { replace: true });
      }
    }
  }, [searchParams, preservedStep, navigate]);

  if (loading && !loadingTimeout && currentStep === "search") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Bus className="h-7 w-7 text-white" />
          </div>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      icon: Ticket,
      title: t('index.bookTicket'),
      subtitle: t('index.searchBook'),
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-400/30",
      onClick: () => {
        const el = document.getElementById("route-search");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
    },
    {
      icon: Calendar,
      title: t('index.myBookings'),
      subtitle: t('index.viewBookings'),
      gradient: "from-emerald-500 to-green-600",
      iconBg: "bg-emerald-400/30",
      onClick: () => navigate("/bookings"),
      requiresAuth: true
    },
    {
      icon: MapPin,
      title: t('index.viewRoutes'),
      subtitle: t('index.exploreRoutes'),
      gradient: "from-violet-500 to-purple-600",
      iconBg: "bg-violet-400/30",
      onClick: () => navigate("/routes")
    },
    {
      icon: MessageCircle,
      title: t('index.contactSupport'),
      subtitle: t('index.getHelp'),
      gradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-400/30",
      onClick: () => navigate("/contact")
    }
  ];

  const extraServices = [
    {
      icon: Search,
      title: "Lost & Found",
      description: "Report or find lost items on your journey",
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-100",
      path: "/lost-and-found"
    },
    {
      icon: Package,
      title: "Package Delivery",
      description: "Send packages with travelers heading your way",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-100",
      path: "/package-delivery"
    }
  ];

  const renderCurrentStep = () => {
    const activeStep = currentStep === "search" && preservedStep ? preservedStep : currentStep;
    switch (activeStep) {
      case "search":
        return (
          <div className="pb-4">
            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white px-4 pt-6 pb-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
              <div className="max-w-7xl mx-auto relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-sm border border-white/30 flex-shrink-0">
                      {isAuthenticated && user ? (user.firstName?.[0] || user.email?.[0] || "U").toUpperCase() : "G"}
                    </div>
                    <div>
                      <p className="text-blue-200 text-xs">{t('index.welcome')}</p>
                      <h2 className="text-white font-semibold">
                        {isAuthenticated && user ? (user.firstName || "User") : t('index.guest')}
                      </h2>
                    </div>
                  </div>
                  <button className="relative p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/20">
                    <Bell className="h-4 w-4 text-white" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  </button>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">Where are you going?</h1>
                  <p className="text-blue-200 text-sm">Book tickets across Zambia, fast & easy</p>
                </div>
              </div>
            </div>

            <div className="px-4 -mt-4 space-y-5 max-w-7xl mx-auto">
              {/* Route Search Card — elevated over hero */}
              <div id="route-search" className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Bus className="h-4 w-4 text-blue-600" />
                  {t('index.findRoute')}
                </h3>
                <RouteSearch />
              </div>

              {/* Quick Actions Grid */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2.5">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {quickActions
                    .filter(action => !action.requiresAuth || isAuthenticated)
                    .map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={index}
                          onClick={action.onClick}
                          className={`bg-gradient-to-br ${action.gradient} rounded-xl p-3.5 text-left hover:opacity-90 active:scale-95 transition-all shadow-sm`}
                        >
                          <div className={`${action.iconBg} w-8 h-8 rounded-lg flex items-center justify-center mb-2`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <h4 className="text-white font-semibold text-xs leading-tight">{action.title}</h4>
                          <p className="text-white/70 text-[10px] mt-0.5 leading-tight line-clamp-1">{action.subtitle}</p>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Extra Services */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2.5">More Services</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {extraServices.map((service) => {
                    const Icon = service.icon;
                    return (
                      <button
                        key={service.path}
                        onClick={() => navigate(service.path)}
                        className={`flex items-center gap-3 ${service.bgColor} border ${service.borderColor} rounded-xl p-3.5 text-left hover:shadow-md active:scale-95 transition-all w-full`}
                      >
                        <div className={`w-10 h-10 rounded-xl ${service.bgColor} border ${service.borderColor} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`h-5 w-5 ${service.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold text-sm ${service.color}`}>{service.title}</h4>
                          <p className="text-gray-500 text-xs leading-snug mt-0.5 line-clamp-1">{service.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Travel Updates */}
              {travelUpdates.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2.5">{t('index.travelUpdates')}</h3>
                  <div className="space-y-2">
                    {travelUpdates.map((update, index) => {
                      const Icon = update.icon;
                      return (
                        <Card key={index} className="border border-gray-100 shadow-sm rounded-xl">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2.5">
                              <div className={`${update.iconColor} p-1.5 rounded-lg flex-shrink-0`}>
                                <Icon className="h-3.5 w-3.5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-xs mb-0.5">{update.title}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{update.description}</p>
                                <p className="text-xs text-gray-400 mt-1">{update.time}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "results":
        const resultsFrom = searchParams.get("from") || "";
        const resultsTo = searchParams.get("to") || "";
        const resultsDate = searchParams.get("date") || "";
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm mb-4"
            >
              ← Back to search
            </button>
            <BusResults
              onBookNow={(scheduleId, from, to, date) => {
                const params = new URLSearchParams({ step: "booking", schedule: scheduleId });
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
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-16">
      <Header />
      {renderCurrentStep()}
      <BottomNav />
    </div>
  );
};

export default Index;
