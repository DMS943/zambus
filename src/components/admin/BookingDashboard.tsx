import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Eye, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Booking {
  id: string;
  booking_reference: string;
  booking_date: string;
  total_passengers: number;
  total_price_zmw: number;
  extra_luggage_count: number;
  status: string;
  contact_phone: string;
  contact_email: string;
  payment_method: string;
  created_at: string;
  passengers?: Array<{
    first_name: string;
    last_name: string;
    seat_number: string;
  }>;
}

const BookingDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          passengers (
            first_name,
            last_name,
            seat_number
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
        if (statusFilter !== "all" && (statusFilter as "pending" | "confirmed" | "cancelled" | "completed")) {
          query = query.eq('status', statusFilter as "pending" | "confirmed" | "cancelled" | "completed");
        }

      if (dateFilter) {
        query = query.eq('booking_date', dateFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];
      
      // Apply search filter
      if (searchTerm) {
        filteredData = filteredData.filter(booking => 
          booking.booking_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.contact_phone.includes(searchTerm) ||
          (booking.contact_email && booking.contact_email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      setBookings(filteredData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, dateFilter, searchTerm]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      pending: "secondary",
      confirmed: "default", 
      cancelled: "destructive",
      completed: "outline"
    };
    
    return (
      <Badge variant={variants[status] || "secondary"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const updateBookingStatus = async (bookingId: string, newStatus: "pending" | "confirmed" | "cancelled" | "completed") => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking status updated successfully"
      });
      
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive"
      });
    }
  };

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    totalRevenue: bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.total_price_zmw, 0)
  };

  if (loading) {
    return <div className="text-center py-8">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Booking Management</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-sm text-gray-600">Cancelled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">K{stats.totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Revenue</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by booking ref, phone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-[150px]"
        />
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-lg">{booking.booking_reference}</h3>
                    {getStatusBadge(booking.status)}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Booking Date: {format(new Date(booking.booking_date), 'MMM dd, yyyy')}</p>
                    <p>Created: {format(new Date(booking.created_at), 'MMM dd, yyyy HH:mm')}</p>
                    <p>Contact: {booking.contact_phone} {booking.contact_email && `• ${booking.contact_email}`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary">K{booking.total_price_zmw}</div>
                  <div className="text-sm text-gray-600">{booking.total_passengers} passenger(s)</div>
                  {booking.payment_method && (
                    <div className="text-sm text-gray-600 capitalize">{booking.payment_method}</div>
                  )}
                </div>
              </div>

              {booking.passengers && booking.passengers.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Passengers:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {booking.passengers.map((passenger, index) => (
                      <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium">{passenger.first_name} {passenger.last_name}</span>
                        <span className="text-gray-600"> - Seat {passenger.seat_number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {booking.extra_luggage_count > 0 && (
                <div className="mb-4 text-sm text-gray-600">
                  Extra Luggage: {booking.extra_luggage_count} bag(s)
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="space-x-2">
                  {booking.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {booking.status === 'confirmed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateBookingStatus(booking.id, 'completed')}
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
                <div className="space-x-2">
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {bookings.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">No bookings found matching your criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BookingDashboard;