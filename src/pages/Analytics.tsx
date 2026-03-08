import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Users, MapPin, CreditCard, Calendar, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");
  const [analytics, setAnalytics] = useState<any>({
    overview: {},
    bookingTrends: [],
    popularRoutes: [],
    revenueData: [],
    statusBreakdown: []
  });
  const { toast } = useToast();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    // Force loading to false after maximum wait time
    const maxTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);
    
    try {
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      );

      // Overview stats with timeout
      const bookingsPromise = supabase
        .from('bookings')
        .select(`
          *,
          passengers (count),
          schedules (
            routes (origin, destination)
          )
        `)
        .gte('created_at', startDate.toISOString());
      
      const { data: bookings } = await Promise.race([
        bookingsPromise,
        timeoutPromise
      ]) as { data: any; error: any } || { data: null };

      const routesPromise = supabase
        .from('routes')
        .select('*')
        .eq('is_active', true);
      
      const { data: allRoutes } = await Promise.race([
        routesPromise,
        timeoutPromise
      ]) as { data: any; error: any } || { data: null };

      const totalRevenue = bookings?.reduce((sum, booking) => sum + booking.total_price_zmw, 0) || 0;
      const totalBookings = bookings?.length || 0;
      const totalPassengers = bookings?.reduce((sum, booking) => sum + booking.total_passengers, 0) || 0;
      const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      // Booking trends by day
      const bookingTrends = Array.from({ length: Math.min(days, 30) }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayBookings = bookings?.filter(b => 
          b.created_at.split('T')[0] === dateStr
        ) || [];
        
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          bookings: dayBookings.length,
          revenue: dayBookings.reduce((sum, b) => sum + b.total_price_zmw, 0)
        };
      }).reverse();

      // Popular routes
      const routeStats: Record<string, number> = {};
      bookings?.forEach(booking => {
        if (booking.schedules?.routes) {
          const route = `${booking.schedules.routes.origin} → ${booking.schedules.routes.destination}`;
          routeStats[route] = (routeStats[route] || 0) + booking.total_passengers;
        }
      });

      const popularRoutes = Object.entries(routeStats)
        .map(([route, passengers]) => ({ route, passengers }))
        .sort((a, b) => b.passengers - a.passengers)
        .slice(0, 10);

      // Status breakdown
      const statusStats: Record<string, number> = {};
      bookings?.forEach(booking => {
        statusStats[booking.status] = (statusStats[booking.status] || 0) + 1;
      });

      const statusBreakdown = Object.entries(statusStats).map(([status, count]) => ({
        status,
        count,
        percentage: totalBookings > 0 ? ((count as number) / totalBookings * 100).toFixed(1) : "0"
      }));

      setAnalytics({
        overview: {
          totalRevenue,
          totalBookings,
          totalPassengers,
          avgBookingValue,
          activeRoutes: allRoutes?.length || 0
        },
        bookingTrends,
        popularRoutes,
        revenueData: bookingTrends,
        statusBreakdown
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Set default empty data on error so page still renders
      setAnalytics({
        overview: {},
        bookingTrends: [],
        popularRoutes: [],
        revenueData: [],
        statusBreakdown: []
      });
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      clearTimeout(maxTimeout);
      setLoading(false);
    }
  };

  const exportData = () => {
    const csvData = analytics.bookingTrends.map(item => 
      `${item.date},${item.bookings},${item.revenue}`
    ).join('\n');
    
    const blob = new Blob([`Date,Bookings,Revenue\n${csvData}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeRange}days.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading analytics...</div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Analytics Dashboard</h1>
            <p className="text-xs text-gray-600">Performance insights and metrics</p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportData} variant="outline" size="sm" className="h-8 text-xs">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-4">

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-gray-600">Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg font-bold text-gray-900">K{analytics.overview.totalRevenue?.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-0.5">
              K{Math.round(analytics.overview.avgBookingValue || 0)} avg
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-gray-600">Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg font-bold text-gray-900">{analytics.overview.totalBookings?.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-gray-600">Passengers</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg font-bold text-gray-900">{analytics.overview.totalPassengers?.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-gray-600">Routes</CardTitle>
            <MapPin className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg font-bold text-gray-900">{analytics.overview.activeRoutes}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-gray-600">Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg font-bold text-green-600">+12.5%</div>
            <p className="text-xs text-gray-600 mt-0.5">vs previous</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        {/* Booking Trends */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Booking Trends</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.bookingTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Popular Routes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Popular Routes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {analytics.popularRoutes.map((route, index) => (
                <div key={index} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50">
                  <span className="text-sm text-gray-700">{route.route}</span>
                  <Badge variant="secondary" className="text-xs">{route.passengers} pax</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Booking Status Breakdown */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Booking Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percentage }) => `${status} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default Analytics;