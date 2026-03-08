import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, Edit, Copy, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { formatZMW } from '@/utils/pricingUtils';

interface ScheduleManagementProps {
  operatorId: string;
}

export const ScheduleManagement = ({ operatorId }: ScheduleManagementProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);

  // Fetch buses
  const { data: buses = [] } = useQuery({
    queryKey: ['operator-buses', operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .eq('operator_id', operatorId)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
  });

  // Fetch routes
  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .order('origin');

      if (error) throw error;
      return data;
    },
  });

  // Fetch schedules
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['operator-schedules', operatorId],
    queryFn: async () => {
      const busIds = buses.map(b => b.id);
      if (busIds.length === 0) return [];

      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          route:routes(*),
          bus:buses(*)
        `)
        .in('bus_id', busIds)
        .order('departure_time');

      if (error) throw error;
      return data;
    },
    enabled: buses.length > 0,
  });

  // Fetch special pricing
  const { data: specialPricing = [] } = useQuery({
    queryKey: ['special-pricing', operatorId],
    queryFn: async () => {
      const scheduleIds = schedules.map(s => s.id);
      if (scheduleIds.length === 0) return [];

      const { data, error } = await supabase
        .from('special_pricing')
        .select('*')
        .in('schedule_id', scheduleIds)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
    enabled: schedules.length > 0,
  });

  // Save schedule mutation
  const saveScheduleMutation = useMutation({
    mutationFn: async (schedule: any) => {
      if (schedule.id) {
        const { error } = await supabase
          .from('schedules')
          .update(schedule)
          .eq('id', schedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert(schedule);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-schedules'] });
      toast({ title: 'Success', description: 'Schedule saved successfully' });
      setDialogOpen(false);
      setEditingSchedule(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Add special pricing mutation
  const addPricingMutation = useMutation({
    mutationFn: async (pricing: any) => {
      const { error } = await supabase
        .from('special_pricing')
        .insert(pricing);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-pricing'] });
      toast({ title: 'Success', description: 'Special pricing added' });
      setPricingDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const duplicateSchedule = (schedule: any) => {
    setEditingSchedule({
      ...schedule,
      id: null,
      departure_time: '',
      arrival_time: '',
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading schedules...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Schedule Management</h2>
          <p className="text-muted-foreground">Manage your bus schedules and pricing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingSchedule(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSchedule?.id ? 'Edit Schedule' : 'Add New Schedule'}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                saveScheduleMutation.mutate({
                  id: editingSchedule?.id,
                  route_id: formData.get('route_id'),
                  bus_id: formData.get('bus_id'),
                  departure_time: formData.get('departure_time'),
                  arrival_time: formData.get('arrival_time'),
                  price_zmw: parseFloat(formData.get('price_zmw') as string),
                  is_active: formData.get('is_active') === 'true',
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label>Route *</Label>
                <Select name="route_id" defaultValue={editingSchedule?.route_id} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route: any) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.origin} → {route.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Bus *</Label>
                <Select name="bus_id" defaultValue={editingSchedule?.bus_id} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bus" />
                  </SelectTrigger>
                  <SelectContent>
                    {buses.map((bus: any) => (
                      <SelectItem key={bus.id} value={bus.id}>
                        {bus.license_plate} ({bus.bus_class})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Departure Time *</Label>
                  <Input
                    name="departure_time"
                    type="time"
                    defaultValue={editingSchedule?.departure_time}
                    required
                  />
                </div>
                <div>
                  <Label>Arrival Time</Label>
                  <Input
                    name="arrival_time"
                    type="time"
                    defaultValue={editingSchedule?.arrival_time}
                  />
                </div>
              </div>

              <div>
                <Label>Price (ZMW) *</Label>
                <Input
                  name="price_zmw"
                  type="number"
                  step="0.01"
                  defaultValue={editingSchedule?.price_zmw}
                  required
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select name="is_active" defaultValue={editingSchedule?.is_active?.toString() || 'true'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">
                {editingSchedule?.id ? 'Update Schedule' : 'Add Schedule'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Schedules List */}
      <Card>
        <CardHeader>
          <CardTitle>All Schedules ({schedules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedules.map((schedule: any) => {
              const pricing = specialPricing.filter(p => p.schedule_id === schedule.id);
              
              return (
                <Card key={schedule.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">
                            {schedule.route?.origin} → {schedule.route?.destination}
                          </h3>
                          <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                            {schedule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Bus</p>
                            <p className="font-medium">{schedule.bus?.license_plate}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Departure</p>
                            <p className="font-medium">{schedule.departure_time?.slice(0, 5)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Arrival</p>
                            <p className="font-medium">{schedule.arrival_time?.slice(0, 5) || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Price</p>
                            <p className="font-medium">{formatZMW(schedule.price_zmw || 0)}</p>
                          </div>
                        </div>

                        {pricing.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {pricing.map((p: any) => (
                              <Badge key={p.id} variant="outline" className="text-xs">
                                {format(new Date(p.start_date), 'MMM dd')} - {format(new Date(p.end_date), 'MMM dd')}: {formatZMW(p.price_zmw)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingSchedule(schedule);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => duplicateSchedule(schedule)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setPricingDialogOpen(true);
                          }}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {schedules.length === 0 && (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">No schedules created yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Special Pricing Dialog */}
      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Special Pricing</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addPricingMutation.mutate({
                schedule_id: selectedSchedule?.id,
                start_date: formData.get('start_date'),
                end_date: formData.get('end_date'),
                price_zmw: parseFloat(formData.get('price_zmw') as string),
                discount_percentage: parseFloat(formData.get('discount_percentage') as string) || 0,
                reason: formData.get('reason'),
                is_active: true,
              });
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input name="start_date" type="date" required />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input name="end_date" type="date" required />
              </div>
            </div>

            <div>
              <Label>Special Price (ZMW) *</Label>
              <Input name="price_zmw" type="number" step="0.01" required />
            </div>

            <div>
              <Label>Discount % (optional)</Label>
              <Input name="discount_percentage" type="number" step="0.01" min="0" max="100" />
            </div>

            <div>
              <Label>Reason</Label>
              <Input name="reason" placeholder="e.g., Holiday Special, Off-Peak Discount" />
            </div>

            <Button type="submit" className="w-full">
              Add Special Pricing
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
