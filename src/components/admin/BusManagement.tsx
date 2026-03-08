import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bus, Plus, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BusData {
  id: string;
  license_plate: string;
  bus_class: 'economy' | 'luxury' | 'vip';
  total_seats: number;
  amenities: string[];
  is_active: boolean;
  bus_operators?: {
    name: string;
  };
}

const BusManagement = () => {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('buses')
        .select(`
          *,
          bus_operators (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch buses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  const getClassBadge = (busClass: string) => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      economy: "secondary",
      luxury: "default", 
      vip: "outline"
    };
    
    return (
      <Badge variant={colors[busClass] || "secondary"} className="capitalize">
        {busClass}
      </Badge>
    );
  };

  const handleToggleActive = async (busId: string, currentStatus: boolean) => {
    try {
      // Check if is_active column exists, if not, skip the update
      // For now, we'll just show a message that this feature requires the column
      toast({
        title: "Info",
        description: "Bus status toggle requires 'is_active' column in buses table. Please add it to your database.",
        variant: "default"
      });
      
      // Uncomment below once is_active column is added to buses table:
      // const { error } = await supabase
      //   .from('buses')
      //   .update({ is_active: !currentStatus })
      //   .eq('id', busId);
      // if (error) throw error;
      // fetchBuses();
    } catch (error) {
      console.error('Error updating bus:', error);
      toast({
        title: "Error",
        description: "Failed to update bus status",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading buses...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bus Fleet Management</h2>
        <Button className="african-gradient">
          <Plus className="h-4 w-4 mr-2" />
          Add Bus
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buses.map((bus) => (
          <Card key={bus.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <Bus className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">{bus.license_plate}</h3>
                </div>
                <div className="flex space-x-2">
                  {getClassBadge(bus.bus_class)}
                  <Badge variant={bus.is_active ? "default" : "secondary"}>
                    {bus.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Operator:</span> {bus.bus_operators?.name || 'N/A'}</p>
                <p><span className="font-medium">Seats:</span> {bus.total_seats}</p>
                <p><span className="font-medium">Class:</span> {bus.bus_class.charAt(0).toUpperCase() + bus.bus_class.slice(1)}</p>
                
                {bus.amenities && bus.amenities.length > 0 && (
                  <div>
                    <span className="font-medium">Amenities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {bus.amenities.map((amenity, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant={bus.is_active ? "destructive" : "default"}
                  size="sm"
                  onClick={() => handleToggleActive(bus.id, bus.is_active)}
                >
                  {bus.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {buses.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center">
                <Bus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No buses found. Add your first bus to get started.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusManagement;