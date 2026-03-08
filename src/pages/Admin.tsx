import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Bus, Route, Users, Calendar, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import RouteManagement from "@/components/admin/RouteManagement";
import ScheduleManagement from "@/components/admin/ScheduleManagement";
import BookingDashboard from "@/components/admin/BookingDashboard";
import BusManagement from "@/components/admin/BusManagement";
import TravelUpdatesManagement from "@/components/admin/TravelUpdatesManagement";
import OperatorManagement from "@/components/admin/OperatorManagement";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState([
    { title: "Total Bookings", value: "0", change: "+0%", icon: Calendar },
    { title: "Active Routes", value: "0", change: "+0", icon: Route },
    { title: "Fleet Size", value: "0", change: "+0", icon: Bus },
    { title: "Today's Revenue", value: "K0", change: "+0%", icon: BarChart3 },
  ]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    // Force loading to false after maximum wait time
    const maxTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      );

      // Fetch bookings with timeout
      const bookingsPromise = supabase
        .from('bookings')
        .select('*, schedules(routes(origin, destination))')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const { data: bookings } = await Promise.race([
        bookingsPromise,
        timeoutPromise
      ]) as { data: any; error: any } || { data: null };

      // Fetch routes with timeout
      const routesPromise = supabase
        .from('routes')
        .select('id')
        .eq('is_active', true);
      
      const { data: routes } = await Promise.race([
        routesPromise,
        timeoutPromise
      ]) as { data: any; error: any } || { data: null };

      // Fetch buses with timeout
      const busesPromise = supabase
        .from('buses')
        .select('id');
      
      const { data: buses } = await Promise.race([
        busesPromise,
        timeoutPromise
      ]) as { data: any; error: any } || { data: null };

      // Calculate today's revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayBookingsPromise = supabase
        .from('bookings')
        .select('total_price_zmw')
        .gte('created_at', today.toISOString())
        .in('status', ['confirmed', 'completed']);
      
      const { data: todayBookings } = await Promise.race([
        todayBookingsPromise,
        timeoutPromise
      ]) as { data: any; error: any } || { data: null };

      const todayRevenue = todayBookings?.reduce((sum, b) => sum + (b.total_price_zmw || 0), 0) || 0;

      // Get total bookings count
      const countPromise = supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });
      
      const { count: totalBookings } = await Promise.race([
        countPromise,
        timeoutPromise
      ]) as { count: number } || { count: 0 };

      setRecentBookings(bookings || []);
      setStats([
        { title: "Total Bookings", value: (totalBookings || 0).toLocaleString(), change: "+12%", icon: Calendar },
        { title: "Active Routes", value: (routes?.length || 0).toString(), change: "+2", icon: Route },
        { title: "Fleet Size", value: (buses?.length || 0).toString(), change: "+5", icon: Bus },
        { title: "Today's Revenue", value: `K${todayRevenue.toLocaleString()}`, change: "+8%", icon: BarChart3 },
      ]);
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      // Set defaults on error
      setRecentBookings([]);
      setStats([
        { title: "Total Bookings", value: "0", change: "+0%", icon: Calendar },
        { title: "Active Routes", value: "0", change: "+0", icon: Route },
        { title: "Fleet Size", value: "0", change: "+0", icon: Bus },
        { title: "Today's Revenue", value: "K0", change: "+0%", icon: BarChart3 },
      ]);
    } finally {
      clearTimeout(maxTimeout);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Settings className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs text-gray-600">System Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <div className="text-center">
                <div className="font-semibold text-gray-900">{stats[0].value}</div>
                <div className="text-gray-600">Bookings</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{stats[1].value}</div>
                <div className="text-gray-600">Routes</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{stats[3].value}</div>
                <div className="text-gray-600">Revenue</div>
              </div>
            </div>
            <Badge variant="secondary" className="px-2 py-1 text-xs">
              <Users className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-7 h-9 bg-gray-100">
            <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
            <TabsTrigger value="routes" className="text-xs">Routes</TabsTrigger>
            <TabsTrigger value="schedules" className="text-xs">Schedules</TabsTrigger>
            <TabsTrigger value="buses" className="text-xs">Buses</TabsTrigger>
            <TabsTrigger value="operators" className="text-xs">Operators</TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs">Bookings</TabsTrigger>
            <TabsTrigger value="updates" className="text-xs">Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600 mb-1">{stat.title}</p>
                          <p className="text-xl font-bold text-gray-900 mb-0.5">{stat.value}</p>
                          <p className="text-xs text-green-600">{stat.change}</p>
                        </div>
                        <div className="p-2.5 bg-blue-50 rounded-lg flex-shrink-0">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Bookings</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-md" />
                      ))}
                    </div>
                  ) : recentBookings.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-4">No recent bookings</p>
                  ) : (
                    <div className="space-y-2">
                      {recentBookings.map((booking) => (
                        <div key={booking.id} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-md">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">#{booking.booking_reference}</p>
                            <p className="text-xs text-gray-600 truncate">
                              {booking.schedules?.routes?.origin} → {booking.schedules?.routes?.destination}
                            </p>
                          </div>
                          <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5 flex-shrink-0 ml-2">K{booking.total_price_zmw}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">System Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50">
                      <span className="text-sm text-gray-700">Payment System</span>
                      <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5">Online</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50">
                      <span className="text-sm text-gray-700">Booking System</span>
                      <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5">Online</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50">
                      <span className="text-sm text-gray-700">SMS Service</span>
                      <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5">Online</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50">
                      <span className="text-sm text-gray-700">Database</span>
                      <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5">Online</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="routes">
            <RouteManagement />
          </TabsContent>

          <TabsContent value="schedules">
            <ScheduleManagement />
          </TabsContent>

          <TabsContent value="buses">
            <BusManagement />
          </TabsContent>

          <TabsContent value="operators">
            <OperatorManagement />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingDashboard />
          </TabsContent>

          <TabsContent value="updates">
            <TravelUpdatesManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;