import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Clock, Route } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Schedule {
  id: string;
  bus_id: string;
  route_id: string;
  departure_time: string;
  arrival_time: string;
  price_zmw: number;
  is_active: boolean;
  buses?: {
    license_plate: string;
    bus_operators?: {
      name: string;
    };
  };
  routes?: {
    origin: string;
    destination: string;
  };
}

interface Bus {
  id: string;
  license_plate: string;
  bus_operators?: {
    name: string;
  };
}

interface RouteData {
  id: string;
  origin: string;
  destination: string;
}

const ScheduleManagement = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    bus_id: "",
    route_id: "",
    departure_time: "",
    arrival_time: "",
    price_zmw: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          *,
          buses (
            license_plate,
            bus_operators (name)
          ),
          routes (
            origin,
            destination
          )
        `)
        .order('departure_time');

      if (schedulesError) throw schedulesError;

      // Fetch buses for dropdown
      const { data: busesData, error: busesError } = await supabase
        .from('buses')
        .select(`
          id,
          license_plate,
          bus_operators (name)
        `);

      if (busesError) throw busesError;

      // Fetch routes for dropdown
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('id, origin, destination')
        .eq('is_active', true);

      if (routesError) throw routesError;

      setSchedules(schedulesData || []);
      setBuses(busesData || []);
      setRoutes(routesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const scheduleData = {
        bus_id: formData.bus_id,
        route_id: formData.route_id,
        departure_time: formData.departure_time,
        arrival_time: formData.arrival_time,
        price_zmw: parseInt(formData.price_zmw),
        is_active: true
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Schedule updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert([scheduleData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Schedule created successfully"
        });
      }

      setFormData({ bus_id: "", route_id: "", departure_time: "", arrival_time: "", price_zmw: "" });
      setIsAddDialogOpen(false);
      setEditingSchedule(null);
      fetchData();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Error",
        description: "Failed to save schedule",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      bus_id: schedule.bus_id,
      route_id: schedule.route_id,
      departure_time: schedule.departure_time,
      arrival_time: schedule.arrival_time || "",
      price_zmw: schedule.price_zmw.toString()
    });
    setIsAddDialogOpen(true);
  };

  const handleToggleActive = async (scheduleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ is_active: !currentStatus })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Schedule ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });
      
      fetchData();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: "Error",
        description: "Failed to update schedule status",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading schedules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Schedule Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="african-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="route">Route</Label>
                <Select value={formData.route_id} onValueChange={(value) => setFormData({ ...formData, route_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.origin} → {route.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="bus">Bus</Label>
                <Select value={formData.bus_id} onValueChange={(value) => setFormData({ ...formData, bus_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bus" />
                  </SelectTrigger>
                  <SelectContent>
                    {buses.map((bus) => (
                      <SelectItem key={bus.id} value={bus.id}>
                        {bus.license_plate} - {bus.bus_operators?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="departure">Departure Time</Label>
                  <Input
                    id="departure"
                    type="time"
                    value={formData.departure_time}
                    onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="arrival">Arrival Time</Label>
                  <Input
                    id="arrival"
                    type="time"
                    value={formData.arrival_time}
                    onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="price">Price (ZMW)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price_zmw}
                  onChange={(e) => setFormData({ ...formData, price_zmw: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingSchedule(null);
                  setFormData({ bus_id: "", route_id: "", departure_time: "", arrival_time: "", price_zmw: "" });
                }}>
                  Cancel
                </Button>
                <Button type="submit" className="african-gradient">
                  {editingSchedule ? 'Update' : 'Create'} Schedule
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {schedules.map((schedule) => (
          <Card key={schedule.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Route className="h-5 w-5 text-primary" />
                    <span className="text-lg font-semibold">
                      {schedule.routes?.origin} → {schedule.routes?.destination}
                    </span>
                    <Badge variant={schedule.is_active ? "default" : "secondary"}>
                      {schedule.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Bus: {schedule.buses?.license_plate} ({schedule.buses?.bus_operators?.name})</p>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Departure: {schedule.departure_time}</span>
                      </div>
                      {schedule.arrival_time && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Arrival: {schedule.arrival_time}</span>
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-primary">Price: K{schedule.price_zmw > 1000 ? (schedule.price_zmw / 100).toLocaleString() : schedule.price_zmw.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(schedule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={schedule.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleActive(schedule.id, schedule.is_active)}
                  >
                    {schedule.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {schedules.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">No schedules found. Add your first schedule to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ScheduleManagement;