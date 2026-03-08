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
import { User, Phone, Mail, Star, Plus, Edit, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DriverManagementProps {
  operatorId: string;
}

export const DriverManagement = ({ operatorId }: DriverManagementProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers', operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('operator_id', operatorId)
        .order('first_name');

      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (driver: any) => {
      if (driver.id) {
        const { error } = await supabase
          .from('drivers')
          .update(driver)
          .eq('id', driver.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('drivers')
          .insert({ ...driver, operator_id: operatorId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({ title: 'Success', description: 'Driver saved successfully' });
      setDialogOpen(false);
      setEditingDriver(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      inactive: { variant: 'secondary', label: 'Inactive' },
      on_leave: { variant: 'outline', label: 'On Leave' },
      suspended: { variant: 'destructive', label: 'Suspended' },
    };
    return config[status] || config.inactive;
  };

  const isLicenseExpiring = (expiryDate: string) => {
    const daysUntil = Math.floor(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil <= 30;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading drivers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Driver Management</h2>
          <p className="text-muted-foreground">Manage your driver roster</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingDriver(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                saveMutation.mutate({
                  id: editingDriver?.id,
                  first_name: formData.get('first_name'),
                  last_name: formData.get('last_name'),
                  phone: formData.get('phone'),
                  email: formData.get('email') || null,
                  license_number: formData.get('license_number'),
                  license_expiry_date: formData.get('license_expiry_date'),
                  date_of_birth: formData.get('date_of_birth'),
                  address: formData.get('address') || null,
                  emergency_contact_name: formData.get('emergency_contact_name') || null,
                  emergency_contact_phone: formData.get('emergency_contact_phone') || null,
                  status: formData.get('status'),
                  notes: formData.get('notes') || null,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input name="first_name" defaultValue={editingDriver?.first_name} required />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input name="last_name" defaultValue={editingDriver?.last_name} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone *</Label>
                  <Input name="phone" type="tel" defaultValue={editingDriver?.phone} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" defaultValue={editingDriver?.email} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>License Number *</Label>
                  <Input name="license_number" defaultValue={editingDriver?.license_number} required />
                </div>
                <div>
                  <Label>License Expiry *</Label>
                  <Input name="license_expiry_date" type="date" defaultValue={editingDriver?.license_expiry_date} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date of Birth *</Label>
                  <Input name="date_of_birth" type="date" defaultValue={editingDriver?.date_of_birth} required />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select name="status" defaultValue={editingDriver?.status || 'active'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Address</Label>
                <Input name="address" defaultValue={editingDriver?.address} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input name="emergency_contact_name" defaultValue={editingDriver?.emergency_contact_name} />
                </div>
                <div>
                  <Label>Emergency Contact Phone</Label>
                  <Input name="emergency_contact_phone" type="tel" defaultValue={editingDriver?.emergency_contact_phone} />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea name="notes" defaultValue={editingDriver?.notes} />
              </div>

              <Button type="submit" className="w-full">
                {editingDriver ? 'Update Driver' : 'Add Driver'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Drivers</p>
                <p className="text-2xl font-bold">{drivers.length}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {drivers.filter(d => d.status === 'active').length}
                </p>
              </div>
              <User className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {drivers.filter(d => d.status === 'on_leave').length}
                </p>
              </div>
              <User className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Licenses</p>
                <p className="text-2xl font-bold text-orange-600">
                  {drivers.filter(d => isLicenseExpiring(d.license_expiry_date)).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Driver List */}
      <Card>
        <CardHeader>
          <CardTitle>All Drivers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {drivers.map((driver) => (
              <Card key={driver.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold">
                          {driver.first_name} {driver.last_name}
                        </h3>
                        <Badge variant={getStatusBadge(driver.status).variant}>
                          {getStatusBadge(driver.status).label}
                        </Badge>
                        {isLicenseExpiring(driver.license_expiry_date) && (
                          <Badge variant="outline" className="text-orange-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            License Expiring
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">License</p>
                          <p className="font-medium">{driver.license_number}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expiry</p>
                          <p className="font-medium">
                            {format(new Date(driver.license_expiry_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Trips</p>
                          <p className="font-medium">{driver.total_trips}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Rating</p>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{driver.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span>{driver.phone}</span>
                        </div>
                        {driver.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span>{driver.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingDriver(driver);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {drivers.length === 0 && (
              <div className="text-center py-12">
                <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">No drivers added yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
