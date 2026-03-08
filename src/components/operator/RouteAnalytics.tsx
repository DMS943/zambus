import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Users, DollarSign, MapPin } from 'lucide-react';
import { formatZMW } from '@/utils/pricingUtils';

interface RouteAnalyticsProps {
  operatorId: string;
}

export const RouteAnalytics = ({ operatorId }: RouteAnalyticsProps) => {
  const [period, setPeriod] = useState('30');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['operator-analytics', operatorId, period],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const { data, error } = await supabase.rpc('get_operator_analytics', {
        p_operator_id: operatorId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  const stats = analytics || {
    total_revenue: 0,
    total_bookings: 0,
    total_passengers: 0,
    avg_occupancy_rate: 0,
    top_routes: [],
    daily_revenue: [],
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Route Performance</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatZMW(stats.total_revenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.total_bookings}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Passengers</p>
                <p className="text-2xl font-bold">{stats.total_passengers}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Occupancy</p>
                <p className="text-2xl font-bold">{stats.avg_occupancy_rate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Routes */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.top_routes && stats.top_routes.length > 0 ? (
              stats.top_routes.map((route: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <p className="font-semibold">{route.route}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {route.bookings} bookings • {route.passengers} passengers
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{formatZMW(route.revenue)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No route data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.daily_revenue && stats.daily_revenue.length > 0 ? (
            <div className="space-y-2">
              {stats.daily_revenue.slice(-14).map((day: any) => {
                const maxRevenue = Math.max(...stats.daily_revenue.map((d: any) => d.revenue));
                const percentage = (day.revenue / maxRevenue) * 100;
                
                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1">
                      <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center px-3"
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        >
                          <span className="text-xs text-white font-medium">
                            {formatZMW(day.revenue)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-sm text-right text-muted-foreground">
                      {day.bookings} trips
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No revenue data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
