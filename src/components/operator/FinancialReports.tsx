import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Download, CreditCard, Banknote } from 'lucide-react';
import { formatZMW } from '@/utils/pricingUtils';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

interface FinancialReportsProps {
  operatorId: string;
}

export const FinancialReports = ({ operatorId }: FinancialReportsProps) => {
  const [period, setPeriod] = useState('month');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial-reports', operatorId, period, paymentFilter],
    queryFn: async () => {
      const { start, end } = getDateRange();

      // Get buses for this operator
      const { data: buses } = await supabase
        .from('buses')
        .select('id')
        .eq('operator_id', operatorId);

      if (!buses || buses.length === 0) return null;

      // Get schedules
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id')
        .in('bus_id', buses.map(b => b.id));

      if (!schedules || schedules.length === 0) return null;

      // Build query
      let query = supabase
        .from('bookings')
        .select('*')
        .in('schedule_id', schedules.map(s => s.id))
        .gte('booking_date', start.toISOString().split('T')[0])
        .lte('booking_date', end.toISOString().split('T')[0]);

      if (paymentFilter !== 'all') {
        query = query.eq('payment_method', paymentFilter);
      }

      const { data: bookings, error } = await query;

      if (error) throw error;

      // Calculate metrics
      const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_price_zmw || 0), 0) || 0;
      const confirmedRevenue = bookings?.filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_price_zmw || 0), 0) || 0;
      const pendingRevenue = bookings?.filter(b => b.status === 'pending')
        .reduce((sum, b) => sum + (b.total_price_zmw || 0), 0) || 0;
      const refundedAmount = bookings?.filter(b => b.status === 'cancelled')
        .reduce((sum, b) => sum + (b.total_price_zmw || 0), 0) || 0;

      // Payment method breakdown
      const paymentMethods = bookings?.reduce((acc: any, b) => {
        const method = b.payment_method || 'unknown';
        acc[method] = (acc[method] || 0) + (b.total_price_zmw || 0);
        return acc;
      }, {});

      // Daily breakdown
      const dailyRevenue = bookings?.reduce((acc: any, b) => {
        const date = b.booking_date;
        if (!acc[date]) {
          acc[date] = { revenue: 0, bookings: 0 };
        }
        acc[date].revenue += b.total_price_zmw || 0;
        acc[date].bookings += 1;
        return acc;
      }, {});

      return {
        totalRevenue,
        confirmedRevenue,
        pendingRevenue,
        refundedAmount,
        paymentMethods,
        dailyRevenue,
        totalBookings: bookings?.length || 0,
      };
    },
  });

  const exportReport = () => {
    if (!financialData) return;

    const { start, end } = getDateRange();
    const csvContent = [
      ['Financial Report', `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`],
      [],
      ['Metric', 'Amount'],
      ['Total Revenue', formatZMW(financialData.totalRevenue)],
      ['Confirmed Revenue', formatZMW(financialData.confirmedRevenue)],
      ['Pending Revenue', formatZMW(financialData.pendingRevenue)],
      ['Refunded Amount', formatZMW(financialData.refundedAmount)],
      ['Total Bookings', financialData.totalBookings],
      [],
      ['Payment Method', 'Amount'],
      ...Object.entries(financialData.paymentMethods || {}).map(([method, amount]: any) => [
        method,
        formatZMW(amount),
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading financial data...</div>;
  }

  if (!financialData) {
    return <div className="text-center py-8">No financial data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Financial Reports</h2>
          <p className="text-muted-foreground">Track revenue and payments</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatZMW(financialData.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatZMW(financialData.confirmedRevenue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatZMW(financialData.pendingRevenue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Refunded</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatZMW(financialData.refundedAmount)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(financialData.paymentMethods || {}).map(([method, amount]: any) => {
              const percentage = (amount / financialData.totalRevenue) * 100;
              return (
                <div key={method} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {method === 'mobile_money' ? (
                        <CreditCard className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Banknote className="h-4 w-4 text-green-600" />
                      )}
                      <span className="font-medium capitalize">{method.replace('_', ' ')}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatZMW(amount)}</p>
                      <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(financialData.dailyRevenue || {})
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 14)
              .map(([date, data]: any) => (
                <div key={date} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{format(new Date(date), 'EEEE, MMM dd')}</p>
                    <p className="text-sm text-muted-foreground">{data.bookings} bookings</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">{formatZMW(data.revenue)}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
