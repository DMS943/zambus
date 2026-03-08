import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Bell, AlertCircle, Info, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface TravelUpdate {
  id: string;
  title: string;
  description: string;
  type: 'alert' | 'info' | 'announcement' | 'warning';
  icon_color: string;
  priority: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const TravelUpdatesManagement = () => {
  const [updates, setUpdates] = useState<TravelUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<TravelUpdate | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "info" as 'alert' | 'info' | 'announcement' | 'warning',
    icon_color: "bg-blue-500",
    priority: "0",
    expires_at: ""
  });

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('travel_updates')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          toast({
            title: "Table Not Found",
            description: "Please run the travel_updates migration first.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching travel updates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch travel updates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        icon_color: formData.icon_color,
        priority: parseInt(formData.priority) || 0,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
      };

      if (editingUpdate) {
        const { error } = await supabase
          .from('travel_updates')
          .update(updateData)
          .eq('id', editingUpdate.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Travel update updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('travel_updates')
          .insert(updateData);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Travel update created successfully"
        });
      }

      setIsAddDialogOpen(false);
      setEditingUpdate(null);
      setFormData({
        title: "",
        description: "",
        type: "info",
        icon_color: "bg-blue-500",
        priority: "0",
        expires_at: ""
      });
      fetchUpdates();
    } catch (error: any) {
      console.error('Error saving travel update:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save travel update",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (update: TravelUpdate) => {
    setEditingUpdate(update);
    setFormData({
      title: update.title,
      description: update.description,
      type: update.type,
      icon_color: update.icon_color,
      priority: update.priority.toString(),
      expires_at: update.expires_at ? new Date(update.expires_at).toISOString().slice(0, 16) : ""
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this travel update?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('travel_updates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Travel update deleted successfully"
      });
      fetchUpdates();
    } catch (error: any) {
      console.error('Error deleting travel update:', error);
      toast({
        title: "Error",
        description: "Failed to delete travel update",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('travel_updates')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Success",
        description: `Travel update ${!currentStatus ? 'activated' : 'deactivated'}`
      });
      fetchUpdates();
    } catch (error: any) {
      console.error('Error toggling travel update:', error);
      toast({
        title: "Error",
        description: "Failed to update travel update",
        variant: "destructive"
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'announcement':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      alert: "destructive",
      warning: "outline",
      info: "default",
      announcement: "secondary"
    };
    return (
      <Badge variant={colors[type] as any || "default"} className="capitalize">
        {type}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Loading travel updates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Travel Updates</h2>
          <p className="text-gray-600">Manage travel alerts and announcements</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingUpdate(null);
            setFormData({
              title: "",
              description: "",
              type: "info",
              icon_color: "bg-blue-500",
              priority: "0",
              expires_at: ""
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Update
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUpdate ? 'Edit Travel Update' : 'Add Travel Update'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Road Closure Alert"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the update..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => {
                      setFormData({...formData, type: value});
                      // Auto-set icon color based on type
                      const colorMap: Record<string, string> = {
                        alert: 'bg-red-500',
                        warning: 'bg-yellow-500',
                        info: 'bg-blue-500',
                        announcement: 'bg-green-500'
                      };
                      setFormData(prev => ({...prev, icon_color: colorMap[value] || 'bg-blue-500'}));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="icon_color">Icon Color</Label>
                  <Select
                    value={formData.icon_color}
                    onValueChange={(value) => setFormData({...formData, icon_color: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bg-red-500">Red</SelectItem>
                      <SelectItem value="bg-yellow-500">Yellow</SelectItem>
                      <SelectItem value="bg-blue-500">Blue</SelectItem>
                      <SelectItem value="bg-green-500">Green</SelectItem>
                      <SelectItem value="bg-purple-500">Purple</SelectItem>
                      <SelectItem value="bg-orange-500">Orange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Higher number = shows first</p>
                </div>

                <div>
                  <Label htmlFor="expires_at">Expires At (Optional)</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingUpdate(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUpdate ? 'Update' : 'Create'} Update
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {updates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">No travel updates found. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          updates.map((update) => (
            <Card key={update.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`${update.icon_color} p-2 rounded-full flex-shrink-0`}>
                      {getTypeIcon(update.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{update.title}</h3>
                        {getTypeBadge(update.type)}
                        {!update.is_active && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                        {update.expires_at && new Date(update.expires_at) < new Date() && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{update.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Priority: {update.priority}</span>
                        <span>Created: {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}</span>
                        {update.expires_at && (
                          <span>Expires: {new Date(update.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(update.id, update.is_active)}
                    >
                      {update.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(update)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(update.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TravelUpdatesManagement;

