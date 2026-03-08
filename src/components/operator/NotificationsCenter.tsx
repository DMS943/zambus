import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface NotificationsCenterProps {
  operatorId: string;
}

export const NotificationsCenter = ({ operatorId }: NotificationsCenterProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['operator-notifications', operatorId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operator_notifications')
        .select('*')
        .or(`operator_id.eq.${operatorId},user_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      const promises = unreadIds.map(id =>
        supabase.rpc('mark_notification_read', { p_notification_id: id })
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-notifications'] });
      toast({ title: 'Success', description: 'All notifications marked as read' });
    },
  });

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      booking: <CheckCircle className="h-5 w-5 text-green-600" />,
      cancellation: <XCircle className="h-5 w-5 text-red-600" />,
      payment: <CheckCircle className="h-5 w-5 text-blue-600" />,
      maintenance: <AlertCircle className="h-5 w-5 text-orange-600" />,
      system: <Info className="h-5 w-5 text-gray-600" />,
      alert: <AlertCircle className="h-5 w-5 text-red-600" />,
    };
    return icons[type] || icons.system;
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      low: { variant: 'secondary', label: 'Low' },
      normal: { variant: 'outline', label: 'Normal' },
      high: { variant: 'default', label: 'High' },
      urgent: { variant: 'destructive', label: 'Urgent' },
    };
    return config[priority] || config.normal;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return <div className="text-center py-8">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Notifications */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="booking">
            Bookings
          </TabsTrigger>
          <TabsTrigger value="alert">
            Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`hover:shadow-md transition-shadow cursor-pointer ${
                !notification.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
              }`}
              onClick={() => {
                if (!notification.is_read) {
                  markAsReadMutation.mutate(notification.id);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getTypeIcon(notification.type)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{notification.title}</h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {notification.priority !== 'normal' && (
                          <Badge variant={getPriorityBadge(notification.priority).variant} className="text-xs">
                            {getPriorityBadge(notification.priority).label}
                          </Badge>
                        )}
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {notification.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {notifications.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-3 mt-4">
          {notifications.filter(n => !n.is_read).map((notification) => (
            <Card
              key={notification.id}
              className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500 bg-blue-50/50"
              onClick={() => markAsReadMutation.mutate(notification.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getTypeIcon(notification.type)}</div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{notification.title}</h3>
                      {notification.priority !== 'normal' && (
                        <Badge variant={getPriorityBadge(notification.priority).variant} className="text-xs">
                          {getPriorityBadge(notification.priority).label}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {notifications.filter(n => !n.is_read).length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
                <p className="text-muted-foreground">All caught up!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="booking" className="space-y-3 mt-4">
          {notifications.filter(n => n.type === 'booking' || n.type === 'cancellation').map((notification) => (
            <Card
              key={notification.id}
              className={`hover:shadow-md transition-shadow ${
                !notification.is_read ? 'border-l-4 border-l-blue-500' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getTypeIcon(notification.type)}</div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">{notification.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="alert" className="space-y-3 mt-4">
          {notifications.filter(n => n.type === 'alert' || n.type === 'maintenance').map((notification) => (
            <Card
              key={notification.id}
              className={`hover:shadow-md transition-shadow ${
                !notification.is_read ? 'border-l-4 border-l-orange-500' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getTypeIcon(notification.type)}</div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{notification.title}</h3>
                      <Badge variant={getPriorityBadge(notification.priority).variant} className="text-xs">
                        {getPriorityBadge(notification.priority).label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
