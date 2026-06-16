import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header';
import { formatZMW } from '@/utils/pricingUtils';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  Bus,
  MapPin,
  Search,
  Download,
  Filter,
  FileText,
  BarChart3,
  Wrench,
  UserCircle,
  Armchair,
  DollarSign,
  MessageSquare,
  Settings,
  Bell,
  QrCode,
  ClipboardList
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

// Import new operator components
import { FleetManagement } from '@/components/operator/FleetManagement';
import { RouteAnalytics } from '@/components/operator/RouteAnalytics';
import { DriverManagement } from '@/components/operator/DriverManagement';
import { SeatMapView } from '@/components/operator/SeatMapView';
import { FinancialReports } from '@/components/operator/FinancialReports';
import { PassengerCommunication } from '@/components/operator/PassengerCommunication';
import { ScheduleManagement } from '@/components/operator/ScheduleManagement';
import { NotificationsCenter } from '@/components/operator/NotificationsCenter';
import { QRScanner } from '@/components/operator/QRScanner';
import { PassengerManifest } from '@/components/operator/PassengerManifest';

interface BookingWithDetails {
  id: string;
  booking_reference: string;
  booking_date: string;
  total_passengers: number;
  total_price_zmw: number;
  baggage_weight_kg: number | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  contact_phone: string;
  contact_email: string | null;
  created_at: string;
  schedule: {
    departure_time: string;
    arrival_time: string | null;
    route: {
      origin: string;
      destination: string;
    };
    bus: {
      license_plate: string;
      bus_class: string;
    };
  };
  passengers: Array<{
    first_name: string;
    last_name: string;
    seat_number: string;
    phone: string | null;
    email: string | null;
  }>;
}

const Operator = () => {
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState('bookings');
  const [operatorInfo, setOperatorInfo] = useState<any>(null);

  // Fetch operator's bookings
  const { data: bookings, isLoading, error, refetch } = useQuery({
    queryKey: ['operator-bookings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First, get the operator_id for this user
      const { data: operatorUsers, error: operatorError } = await supabase
        .from('operator_users')
        .select('operator_id')
        .eq('user_id', user.id)
        .limit(1);

      if (operatorError) {
        console.error('Error fetching operator info:', operatorError);
        return [];
      }

      // Check if user has an operator assignment
      if (!operatorUsers || operatorUsers.length === 0) {
        console.warn('User is not assigned to any operator');
        // Return null to distinguish from empty bookings array
        // This will trigger the "No Operator Assignment" message in the UI
        return null;
      }

      const operatorUser = operatorUsers[0];
      
      // Store operator info for use in other queries
      setOperatorInfo({ id: operatorUser.operator_id });

      // Get all buses for this operator
      const { data: buses, error: busesError } = await supabase
        .from('buses')
        .select('id')
        .eq('operator_id', operatorUser.operator_id);

      if (busesError || !buses) {
        console.error('Error fetching buses:', busesError);
        return [];
      }

      const busIds = buses.map(b => b.id);

      // Get all schedules for these buses
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select('id')
        .in('bus_id', busIds);

      if (schedulesError || !schedules) {
        console.error('Error fetching schedules:', schedulesError);
        return [];
      }

      const scheduleIds = schedules.map(s => s.id);

      // Get bookings for these schedules
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          booking_date,
          total_passengers,
          total_price_zmw,
          baggage_weight_kg,
          status,
          contact_phone,
          contact_email,
          created_at,
          schedules!inner (
            departure_time,
            arrival_time,
            routes (
              origin,
              destination
            ),
            buses (
              license_plate,
              bus_class
            )
          ),
          passengers (
            first_name,
            last_name,
            seat_number,
            phone,
            email
          )
        `)
        .in('schedule_id', scheduleIds)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      return (bookingsData || []) as BookingWithDetails[];
    },
    enabled: !!user?.id,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast({
      title: 'Refreshed',
      description: 'Bookings updated successfully',
    });
  };

  const filteredBookings = (bookings || []).filter(booking => {
    // Filter by status
    if (selectedStatus !== 'all' && booking.status !== selectedStatus) {
      return false;
    }
    
    // Filter by search term (booking reference, passenger names, route)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesReference = booking.booking_reference.toLowerCase().includes(searchLower);
      const schedule = (booking as any).schedules;
      const route = schedule?.routes;
      const matchesRoute = route ? `${route.origin} ${route.destination}`.toLowerCase().includes(searchLower) : false;
      const matchesPassenger = booking.passengers.some(p => 
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchLower)
      );
      const matchesPhone = booking.contact_phone.includes(searchTerm);
      
      if (!matchesReference && !matchesRoute && !matchesPassenger && !matchesPhone) {
        return false;
      }
    }
    
    // Filter by date
    if (selectedDate) {
      if (booking.booking_date !== selectedDate) {
        return false;
      }
    }
    
    return true;
  });

  // Calculate statistics
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = (bookings || []).filter(b => b.booking_date === today);
  const upcomingBookings = (bookings || []).filter(b => {
    const bookingDate = new Date(b.booking_date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return bookingDate >= todayDate && b.status !== 'cancelled';
  });
  
  const stats = {
    total: bookings?.length || 0,
    pending: (bookings || []).filter(b => b.status === 'pending').length || 0,
    confirmed: (bookings || []).filter(b => b.status === 'confirmed').length || 0,
    cancelled: (bookings || []).filter(b => b.status === 'cancelled').length || 0,
    completed: (bookings || []).filter(b => b.status === 'completed').length || 0,
    totalRevenue: (bookings || []).reduce((sum, b) => sum + (b.total_price_zmw || 0), 0) || 0,
    todayRevenue: todayBookings.reduce((sum, b) => sum + (b.total_price_zmw || 0), 0) || 0,
    totalPassengers: (bookings || []).reduce((sum, b) => sum + b.total_passengers, 0) || 0,
    todayBookings: todayBookings.length,
    upcomingBookings: upcomingBookings.length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      confirmed: 'default',
      pending: 'secondary',
      cancelled: 'destructive',
      completed: 'outline',
    };
    
    const icons: Record<string, React.ReactNode> = {
      confirmed: <CheckCircle className="h-3 w-3 mr-1" />,
      pending: <Clock className="h-3 w-3 mr-1" />,
      cancelled: <XCircle className="h-3 w-3 mr-1" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center w-fit">
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleExportBookings = () => {
    const csvContent = [
      ['Booking Reference', 'Date', 'Route', 'Passengers', 'Status', 'Total (ZMW)', 'Contact Phone', 'Contact Email'].join(','),
      ...filteredBookings.map(b => [
        b.booking_reference,
        b.booking_date,
        `${b.schedule.route.origin} → ${b.schedule.route.destination}`,
        b.total_passengers,
        b.status,
        (b.total_price_zmw / 100).toFixed(2),
        b.contact_phone,
        b.contact_email || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported',
      description: 'Bookings exported successfully'
    });
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Booking status updated to ${newStatus}`
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update booking status',
        variant: 'destructive'
      });
    }
  };

  // Check if user has operator assignment (null means no assignment, [] means no bookings)
  const noOperatorAssigned = !isLoading && bookings === null && !error;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">Error loading bookings. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show message if user is not assigned to any operator
  if (noOperatorAssigned) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Operator Assignment</h2>
              <p className="text-gray-600 mb-4">
                Your account is not currently assigned to any bus operator company.
              </p>
              <p className="text-sm text-gray-500">
                Please contact an administrator to assign you to an operator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      {/* Compact Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Operations Center</h1>
                <p className="text-xs text-gray-500">Real-time management</p>
              </div>
              {/* Quick Stats */}
              <div className="hidden lg:flex items-center gap-4 ml-8">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">{stats.total}</span>
                  <span className="text-xs text-blue-600">Total</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-900">{stats.pending}</span>
                  <span className="text-xs text-amber-600">Pending</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-900">{stats.confirmed}</span>
                  <span className="text-xs text-emerald-600">Confirmed</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">{formatZMW(stats.totalRevenue)}</span>
                  <span className="text-xs text-purple-600">Revenue</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleExportBookings} 
                variant="outline" 
                size="sm"
                disabled={filteredBookings.length === 0}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button 
                onClick={handleRefresh} 
                disabled={refreshing}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Bookings</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirmed</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.confirmed}</p>
                </div>
                <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">{formatZMW(stats.totalRevenue)}</p>
                </div>
                <div className="h-12 w-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Passengers</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.totalPassengers}</p>
                </div>
                <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Today</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.todayBookings}</p>
                </div>
                <div className="h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Today Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">{formatZMW(stats.todayRevenue)}</p>
                </div>
                <div className="h-12 w-12 bg-teal-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-200 px-6">
              <TabsList className="h-auto p-0 bg-transparent border-0 gap-1">
                <TabsTrigger 
                  value="bookings"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger 
                  value="today"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Today
                </TabsTrigger>
                <TabsTrigger 
                  value="upcoming"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Upcoming
                </TabsTrigger>
                <TabsTrigger 
                  value="fleet"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <Bus className="h-4 w-4 mr-2" />
                  Fleet
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="drivers"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <UserCircle className="h-4 w-4 mr-2" />
                  Drivers
                </TabsTrigger>
                <TabsTrigger 
                  value="seatmap"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <Armchair className="h-4 w-4 mr-2" />
                  Seats
                </TabsTrigger>
                <TabsTrigger 
                  value="financial"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Financial
                </TabsTrigger>
                <TabsTrigger 
                  value="communication"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </TabsTrigger>
                <TabsTrigger 
                  value="schedules"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Schedules
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Alerts
                </TabsTrigger>
                <TabsTrigger 
                  value="scanner"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Scanner
                </TabsTrigger>
                <TabsTrigger 
                  value="manifest"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Manifest
                </TabsTrigger>
              </TabsList>
            </div>

          <TabsContent value="bookings" className="p-6">
            <div className="space-y-4">
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by reference, route, passenger..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-48 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate('')}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Status Tabs */}
              <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
                <TabsList className="bg-gray-100 p-1">
                  <TabsTrigger value="all" className="data-[state=active]:bg-white">
                    All <span className="ml-1.5 text-xs text-gray-500">({stats.total})</span>
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="data-[state=active]:bg-white">
                    Pending <span className="ml-1.5 text-xs text-gray-500">({stats.pending})</span>
                  </TabsTrigger>
                  <TabsTrigger value="confirmed" className="data-[state=active]:bg-white">
                    Confirmed <span className="ml-1.5 text-xs text-gray-500">({stats.confirmed})</span>
                  </TabsTrigger>
                  <TabsTrigger value="cancelled" className="data-[state=active]:bg-white">
                    Cancelled <span className="ml-1.5 text-xs text-gray-500">({stats.cancelled})</span>
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="data-[state=active]:bg-white">
                    Completed <span className="ml-1.5 text-xs text-gray-500">({stats.completed})</span>
                  </TabsTrigger>
                </TabsList>

              <TabsContent value={selectedStatus} className="mt-6">
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No bookings found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => {
                      // Add null checks for nested properties
                      // Supabase returns the table name (schedules) not singular (schedule)
                      const schedule = (booking as any).schedules;
                      const route = schedule?.routes;
                      const bus = schedule?.buses;
                      const departureTime = schedule?.departure_time;
                      
                      return (
                      <Card key={booking.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">
                                  Booking #{booking.booking_reference}
                                </h3>
                                {getStatusBadge(booking.status)}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Route</p>
                                  <p className="font-medium">
                                    {route?.origin || 'N/A'} → {route?.destination || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Date & Time</p>
                                  <p className="font-medium">
                                    {booking.booking_date ? format(new Date(booking.booking_date), 'MMM dd, yyyy') : 'N/A'} at{' '}
                                    {departureTime?.substring(0, 5) || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Bus</p>
                                  <p className="font-medium">
                                    {bus?.license_plate || 'N/A'} ({bus?.bus_class || 'N/A'})
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Total</p>
                                  <p className="font-medium text-primary">
                                    {formatZMW(booking.total_price_zmw)}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Passengers</p>
                                  <p className="font-medium">{booking.total_passengers}</p>
                                </div>
                                {booking.baggage_weight_kg && booking.baggage_weight_kg > 0 && (
                                  <div>
                                    <p className="text-muted-foreground">Baggage Weight</p>
                                    <p className="font-medium">{booking.baggage_weight_kg} kg</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-muted-foreground">Contact</p>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3" />
                                    <span className="font-medium">{booking.contact_phone}</span>
                                  </div>
                                  {booking.contact_email && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Mail className="h-3 w-3" />
                                      <span className="text-xs">{booking.contact_email}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="pt-3 border-t">
                                <p className="text-sm font-medium mb-2">Passengers & Seats:</p>
                                <div className="flex flex-wrap gap-2">
                                  {booking.passengers.map((passenger, idx) => (
                                    <Badge key={idx} variant="secondary">
                                      {passenger.first_name} {passenger.last_name} - Seat {passenger.seat_number}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              {booking.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel
                                  </Button>
                                </>
                              )}
                              {booking.status === 'confirmed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )})}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          </TabsContent>

          <TabsContent value="today">
            <Card>
              <CardHeader>
                <CardTitle>Today's Trips ({todayBookings.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {todayBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No bookings scheduled for today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todayBookings.map((booking) => {
                      const schedule = (booking as any).schedules;
                      const route = schedule?.routes;
                      const bus = schedule?.buses;
                      
                      return (
                      <Card key={booking.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">
                                  Booking #{booking.booking_reference}
                                </h3>
                                {getStatusBadge(booking.status)}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Route</p>
                                  <p className="font-medium">
                                    {route?.origin || 'N/A'} → {route?.destination || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Departure</p>
                                  <p className="font-medium">{schedule?.departure_time?.substring(0, 5) || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Bus</p>
                                  <p className="font-medium">{bus?.license_plate || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Passengers</p>
                                  <p className="font-medium">{booking.total_passengers}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )})}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Trips ({upcomingBookings.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No upcoming trips scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => {
                      const schedule = (booking as any).schedules;
                      const route = schedule?.routes;
                      
                      return (
                      <Card key={booking.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">
                                  Booking #{booking.booking_reference}
                                </h3>
                                {getStatusBadge(booking.status)}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Route</p>
                                  <p className="font-medium">
                                    {route?.origin || 'N/A'} → {route?.destination || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Date</p>
                                  <p className="font-medium">
                                    {booking.booking_date ? format(new Date(booking.booking_date), 'MMM dd, yyyy') : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Time</p>
                                  <p className="font-medium">{schedule?.departure_time?.substring(0, 5) || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Passengers</p>
                                  <p className="font-medium">{booking.total_passengers}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )})}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fleet Management Tab */}
          <TabsContent value="fleet">
            <FleetManagement operatorId={operatorInfo?.id} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <RouteAnalytics operatorId={operatorInfo?.id} />
          </TabsContent>

          {/* Drivers Tab */}
          <TabsContent value="drivers">
            <DriverManagement operatorId={operatorInfo?.id} />
          </TabsContent>

          {/* Seat Map Tab */}
          <TabsContent value="seatmap">
            <SeatMapView operatorId={operatorInfo?.id} />
          </TabsContent>

          {/* Financial Reports Tab */}
          <TabsContent value="financial">
            <FinancialReports operatorId={operatorInfo?.id} />
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication">
            <PassengerCommunication operatorId={operatorInfo?.id} />
          </TabsContent>

          {/* Schedule Management Tab */}
          <TabsContent value="schedules">
            <ScheduleManagement operatorId={operatorInfo?.id} />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <NotificationsCenter operatorId={operatorInfo?.id} />
          </TabsContent>

          {/* QR Scanner Tab */}
          <TabsContent value="scanner">
            <QRScanner operatorId={operatorInfo?.id} />
          </TabsContent>

          {/* Passenger Manifest Tab */}
          <TabsContent value="manifest">
            <PassengerManifest operatorId={operatorInfo?.id} />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Operator;

