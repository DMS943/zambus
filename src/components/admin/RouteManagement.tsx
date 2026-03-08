import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Route {
  id: string;
  origin: string;
  destination: string;
  distance_km: number;
  estimated_duration_hours: number;
  is_active: boolean;
  created_at: string;
}

const RouteManagement = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    distance_km: "",
    estimated_duration_hours: ""
  });

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch routes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const routeData = {
        origin: formData.origin,
        destination: formData.destination,
        distance_km: parseInt(formData.distance_km),
        estimated_duration_hours: parseFloat(formData.estimated_duration_hours),
        is_active: true
      };

      if (editingRoute) {
        const { error } = await supabase
          .from('routes')
          .update(routeData)
          .eq('id', editingRoute.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Route updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('routes')
          .insert([routeData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Route created successfully"
        });
      }

      setFormData({ origin: "", destination: "", distance_km: "", estimated_duration_hours: "" });
      setIsAddDialogOpen(false);
      setEditingRoute(null);
      fetchRoutes();
    } catch (error) {
      console.error('Error saving route:', error);
      toast({
        title: "Error",
        description: "Failed to save route",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      origin: route.origin,
      destination: route.destination,
      distance_km: route.distance_km.toString(),
      estimated_duration_hours: route.estimated_duration_hours.toString()
    });
    setIsAddDialogOpen(true);
  };

  const handleToggleActive = async (routeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('routes')
        .update({ is_active: !currentStatus })
        .eq('id', routeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Route ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });
      
      fetchRoutes();
    } catch (error) {
      console.error('Error updating route:', error);
      toast({
        title: "Error",
        description: "Failed to update route status",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading routes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Route Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="african-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Edit Route' : 'Add New Route'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin">Origin</Label>
                  <Input
                    id="origin"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    value={formData.distance_km}
                    onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    step="0.5"
                    value={formData.estimated_duration_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_duration_hours: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingRoute(null);
                  setFormData({ origin: "", destination: "", distance_km: "", estimated_duration_hours: "" });
                }}>
                  Cancel
                </Button>
                <Button type="submit" className="african-gradient">
                  {editingRoute ? 'Update' : 'Create'} Route
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {routes.map((route) => (
          <Card key={route.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="text-lg font-semibold">
                      {route.origin} → {route.destination}
                    </span>
                    <Badge variant={route.is_active ? "default" : "secondary"}>
                      {route.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Distance: {route.distance_km} km</p>
                    <p>Duration: {route.estimated_duration_hours} hours</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(route)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={route.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleActive(route.id, route.is_active)}
                  >
                    {route.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {routes.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">No routes found. Add your first route to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RouteManagement;