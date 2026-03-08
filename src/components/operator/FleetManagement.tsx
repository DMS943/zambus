import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bus, Wrench, Calendar, MapPin, Plus, Edit, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FleetManagementProps {
  operatorId: string;
}

export const FleetManagement = ({ operatorId }: FleetManagementProps) => {
  const queryClient = useQueryClient();
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch buses
  const { data: buses = [], isLoading } = useQuery({
    queryKey: ['operator-buses', operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .eq('operator_id', operatorId)
        .order('license_plate');

      if (error) throw error;
      return data;
    },
  });

  // Fetch maintenance records
  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['bus-maintenance', operatorId],
    queryFn: async () => {
      const busIds = buses.map(b => b.id);
      if (busIds.length === 0) return [];

      const { data, error } = await supabase
        .from('bus_maintenance')
        .select('*')
        .in('bus_id', busIds)
        .order('performed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: buses.length > 0,
  });

  // Update bus status
  const updateBusMutation = useMutation({
    mutationFn: async ({ busId, updates }: { busId: string; updates: any }) => {
      const { error } = await supabase
        .from('buses')
        .update(updates)
        .eq('id', busId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-buses'] });
      toast({ title: 'Success', description: 'Bus updated successfully' });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Add maintenance record
  const addMaintenanceMutation = useMutation({
    mutationFn: async (maintenance: any) => {
      const { error } = await supabase
        .from('bus_maintenance')
        .insert(maintenance);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-maintenance'] });
      toast({ title: 'Success', description: 'Maintenance record added' });
      setMaintenanceDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      maintenance: { variant: 'secondary', label: 'Maintenance' },
      inactive: { variant: 'outline', label: 'Inactive' },
      retired: { variant: 'destructive', label: 'Retired' },
    };
    return config[status] || config.inactive;
  };

  const needsMaintenance = (bus: any) => {
    if (!bus.next_maintenance_date) return false;
    const daysUntil = Math.floor(
      (new Date(bus.next_maintenance_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil <= 7;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading fleet...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Fleet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Buses</p>
                <p className="text-2xl font-bold">{buses.length}</p>
              </div>
              <Bus className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {buses.filter(b => b.status === 'active').length}
                </p>
              </div>
              <Bus className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maintenance</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {buses.filter(b => b.status === 'maintenance').length}
                </p>
              </div>
              <Wrench className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Service</p>
                <p className="text-2xl font-bold text-orange-600">
                  {buses.filter(needsMaintenance).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bus List */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {buses.map((bus) => (
              <Card key={bus.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Bus className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold">{bus.license_plate}</h3>
                        <Badge variant={getStatusBadge(bus.status).variant}>
                          {getStatusBadge(bus.status).label}
                        </Badge>
                        {needsMaintenance(bus) && (
                          <Badge variant="outline" className="text-orange-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Service Due
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Class</p>
                          <p className="font-medium capitalize">{bus.bus_class}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Seats</p>
                          <p className="font-medium">{bus.total_seats}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Mileage</p>
                          <p className="font-medium">{bus.mileage_km?.toLocaleString() || 0} km</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Next Service</p>
                          <p className="font-medium">
                            {bus.next_maintenance_date
                              ? format(new Date(bus.next_maintenance_date), 'MMM dd, yyyy')
                              : 'Not scheduled'}
                          </p>
                        </div>
                      </div>

                      {bus.amenities && bus.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {bus.amenities.map((amenity: string) => (
                            <Badge key={amenity} variant="secondary" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Dialog open={editDialogOpen && selectedBus?.id === bus.id} onOpenChange={setEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBus(bus)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Bus Status</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Status</Label>
                              <Select
                                defaultValue={bus.status}
                                onValueChange={(value) => {
                                  updateBusMutation.mutate({
                                    busId: bus.id,
                                    updates: { status: value },
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="maintenance">Maintenance</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                  <SelectItem value="retired">Retired</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={maintenanceDialogOpen && selectedBus?.id === bus.id}
                        onOpenChange={setMaintenanceDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBus(bus)}
                          >
                            <Wrench className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Maintenance Record</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              addMaintenanceMutation.mutate({
                                bus_id: bus.id,
                                maintenance_type: formData.get('type'),
                                description: formData.get('description'),
                                cost_zmw: parseFloat(formData.get('cost') as string) || 0,
                                performed_by: formData.get('performed_by'),
                                performed_at: new Date().toISOString(),
                                next_maintenance_due: formData.get('next_due') || null,
                                notes: formData.get('notes'),
                              });
                            }}
                            className="space-y-4"
                          >
                            <div>
                              <Label>Type</Label>
                              <Select name="type" required>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="routine">Routine</SelectItem>
                                  <SelectItem value="repair">Repair</SelectItem>
                                  <SelectItem value="inspection">Inspection</SelectItem>
                                  <SelectItem value="emergency">Emergency</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Input name="description" required />
                            </div>
                            <div>
                              <Label>Cost (ZMW)</Label>
                              <Input name="cost" type="number" step="0.01" />
                            </div>
                            <div>
                              <Label>Performed By</Label>
                              <Input name="performed_by" />
                            </div>
                            <div>
                              <Label>Next Service Due</Label>
                              <Input name="next_due" type="date" />
                            </div>
                            <div>
                              <Label>Notes</Label>
                              <Textarea name="notes" />
                            </div>
                            <Button type="submit" className="w-full">
                              Add Record
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {maintenanceRecords.slice(0, 10).map((record) => {
              const bus = buses.find(b => b.id === record.bus_id);
              return (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{bus?.license_plate}</Badge>
                      <Badge variant="secondary">{record.maintenance_type}</Badge>
                    </div>
                    <p className="text-sm mt-1">{record.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(record.performed_at), 'MMM dd, yyyy')}
                      {record.performed_by && ` • ${record.performed_by}`}
                    </p>
                  </div>
                  {record.cost_zmw > 0 && (
                    <div className="text-right">
                      <p className="font-semibold">K{record.cost_zmw.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
