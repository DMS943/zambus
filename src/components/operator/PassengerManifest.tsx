import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, CheckCircle, XCircle, User, Phone, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PassengerManifestProps {
  operatorId: string;
}

export const PassengerManifest = ({ operatorId }: PassengerManifestProps) => {
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ['operator-schedules', operatorId],
    queryFn: async () => {
      const { data: buses } = await supabase
        .from('buses')
        .select('id')
        .eq('operator_id', operatorId);

      if (!buses || buses.length === 0) return [];

      const { data, error } = await supabase
        .from('schedules')
        .select(`
          id,
          departure_time,
          route:routes(origin, destination),
          bus:buses(license_plate)
        `)
        .in('bus_id', buses.map(b => b.id))
        .eq('is_active', true)
        .order('departure_time');

      if (error) throw error;
      return data;
    },
  });

  // Fetch manifest
  const { data: manifest, isLoading } = useQuery({
    queryKey: ['passenger-manifest', selectedSchedule, selectedDate],
    queryFn: async () => {
      if (!selectedSchedule) return null;

      const { data, error } = await supabase.rpc('get_passenger_manifest', {
        p_schedule_id: selectedSchedule,
        p_booking_date: selectedDate,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedSchedule && !!selectedDate,
  });

  const exportManifest = () => {
    if (!manifest || manifest.length === 0) {
      toast({
        title: 'No Data',
        description: 'No passengers to export',
        variant: 'destructive',
      });
      return;
    }

    const schedule = schedules.find(s => s.id === selectedSchedule);
    const csvContent = [
      ['Passenger Manifest'],
      [`Route: ${schedule?.route?.origin} → ${schedule?.route?.destination}`],
      [`Date: ${format(new Date(selectedDate), 'MMMM dd, yyyy')}`],
      [`Bus: ${schedule?.bus?.license_plate}`],
      [`Departure: ${schedule?.departure_time?.slice(0, 5)}`],
      [],
      ['Booking Ref', 'Passenger Name', 'Seat', 'Phone', 'Email', 'Checked In', 'Special Requirements'],
      ...manifest.map((p: any) => [
        p.booking_reference,
        p.passenger_name,
        p.seat_number,
        p.phone || '',
        p.email || '',
        p.checked_in ? 'Yes' : 'No',
        p.special_requirements || '',
      ]),
      [],
      [`Total Passengers: ${manifest.length}`],
      [`Checked In: ${manifest.filter((p: any) => p.checked_in).length}`],
      [`Not Checked In: ${manifest.filter((p: any) => !p.checked_in).length}`],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manifest-${selectedDate}-${schedule?.route?.origin}-${schedule?.route?.destination}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Manifest exported successfully',
    });
  };

  const printManifest = () => {
    if (!manifest || manifest.length === 0) return;

    const schedule = schedules.find(s => s.id === selectedSchedule);
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Passenger Manifest</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            .info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .checked-in { color: green; }
            .not-checked-in { color: orange; }
            .summary { margin-top: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Passenger Manifest</h1>
          <div class="info">
            <p><strong>Route:</strong> ${schedule?.route?.origin} → ${schedule?.route?.destination}</p>
            <p><strong>Date:</strong> ${format(new Date(selectedDate), 'MMMM dd, yyyy')}</p>
            <p><strong>Bus:</strong> ${schedule?.bus?.license_plate}</p>
            <p><strong>Departure:</strong> ${schedule?.departure_time?.slice(0, 5)}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Passenger Name</th>
                <th>Seat</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Special Requirements</th>
              </tr>
            </thead>
            <tbody>
              ${manifest.map((p: any) => `
                <tr>
                  <td>${p.booking_reference}</td>
                  <td>${p.passenger_name}</td>
                  <td>${p.seat_number}</td>
                  <td>${p.phone || '-'}</td>
                  <td>${p.email || '-'}</td>
                  <td class="${p.checked_in ? 'checked-in' : 'not-checked-in'}">
                    ${p.checked_in ? 'Checked In' : 'Not Checked In'}
                  </td>
                  <td>${p.special_requirements || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <p>Total Passengers: ${manifest.length}</p>
            <p>Checked In: ${manifest.filter((p: any) => p.checked_in).length}</p>
            <p>Not Checked In: ${manifest.filter((p: any) => !p.checked_in).length}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const checkedInCount = manifest?.filter((p: any) => p.checked_in).length || 0;
  const totalCount = manifest?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Passenger Manifest</h2>
        <p className="text-muted-foreground">View and print passenger lists for your trips</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Schedule</label>
              <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a schedule" />
                </SelectTrigger>
                <SelectContent>
                  {schedules.map((schedule: any) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {schedule.route?.origin} → {schedule.route?.destination} ({schedule.departure_time?.slice(0, 5)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={exportManifest}
                disabled={!manifest || manifest.length === 0}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={printManifest}
                disabled={!manifest || manifest.length === 0}
                variant="outline"
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {manifest && manifest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Passengers</p>
                  <p className="text-2xl font-bold">{totalCount}</p>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Checked In</p>
                  <p className="text-2xl font-bold text-green-600">{checkedInCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{totalCount - checkedInCount}</p>
                </div>
                <XCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manifest Table */}
      {manifest && manifest.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Passenger List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {manifest.map((passenger: any, index: number) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    passenger.checked_in ? 'bg-green-50 border-green-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <User className={`h-5 w-5 ${passenger.checked_in ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <h3 className="font-semibold">{passenger.passenger_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Booking: {passenger.booking_reference} • Seat: {passenger.seat_number}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        {passenger.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span>{passenger.phone}</span>
                          </div>
                        )}
                        {passenger.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span>{passenger.email}</span>
                          </div>
                        )}
                      </div>

                      {passenger.special_requirements && (
                        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <strong>Special Requirements:</strong> {passenger.special_requirements}
                        </div>
                      )}
                    </div>

                    <div>
                      {passenger.checked_in ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Checked In
                          {passenger.checked_in_at && (
                            <span className="ml-1 text-xs">
                              {format(new Date(passenger.checked_in_at), 'HH:mm')}
                            </span>
                          )}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                          <XCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : selectedSchedule && selectedDate ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground">No passengers for this trip</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground">Select a schedule and date to view the manifest</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
