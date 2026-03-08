import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Armchair, User } from 'lucide-react';

interface SeatMapViewProps {
  operatorId: string;
}

export const SeatMapView = ({ operatorId }: SeatMapViewProps) => {
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

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
          bus:buses(license_plate, total_seats)
        `)
        .in('bus_id', buses.map(b => b.id))
        .eq('is_active', true)
        .order('departure_time');

      if (error) throw error;
      return data;
    },
  });

  // Fetch seat bookings
  const { data: seatData, isLoading } = useQuery({
    queryKey: ['seat-map', selectedSchedule, selectedDate],
    queryFn: async () => {
      if (!selectedSchedule) return null;

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          status,
          passengers(
            first_name,
            last_name,
            seat_number,
            phone
          )
        `)
        .eq('schedule_id', selectedSchedule)
        .eq('booking_date', selectedDate)
        .in('status', ['confirmed', 'pending', 'completed']);

      if (error) throw error;

      // Get bus info
      const schedule = schedules.find(s => s.id === selectedSchedule);
      const totalSeats = schedule?.bus?.total_seats || 50;

      // Create seat map
      const seatMap: Record<string, any> = {};
      bookings?.forEach(booking => {
        booking.passengers?.forEach((passenger: any) => {
          seatMap[passenger.seat_number] = {
            ...passenger,
            booking_reference: booking.booking_reference,
            status: booking.status,
          };
        });
      });

      return { seatMap, totalSeats };
    },
    enabled: !!selectedSchedule && !!selectedDate,
  });

  const generateSeatLayout = (totalSeats: number) => {
    const rows = Math.ceil(totalSeats / 4);
    const seats = [];
    
    for (let row = 0; row < rows; row++) {
      const rowSeats = [];
      for (let col = 0; col < 4; col++) {
        const seatNum = row * 4 + col + 1;
        if (seatNum <= totalSeats) {
          const seatLabel = `${String.fromCharCode(65 + col)}${row + 1}`;
          rowSeats.push(seatLabel);
        }
      }
      seats.push(rowSeats);
    }
    
    return seats;
  };

  const getSeatStatus = (seatLabel: string) => {
    if (!seatData?.seatMap) return 'available';
    return seatData.seatMap[seatLabel] ? 'occupied' : 'available';
  };

  const getSeatInfo = (seatLabel: string) => {
    return seatData?.seatMap?.[seatLabel];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Real-time Seat Map</h2>
        <p className="text-muted-foreground">View seat availability for your trips</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Schedule</label>
          <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a schedule" />
            </SelectTrigger>
            <SelectContent>
              {schedules.map((schedule: any) => (
                <SelectItem key={schedule.id} value={schedule.id}>
                  {schedule.route?.origin} → {schedule.route?.destination} ({schedule.departure_time?.slice(0, 5)}) - {schedule.bus?.license_plate}
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
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 border-2 border-green-500 rounded flex items-center justify-center">
                <Armchair className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 border-2 border-blue-500 rounded flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm">Occupied</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seat Map */}
      {selectedSchedule && seatData && (
        <Card>
          <CardHeader>
            <CardTitle>
              Seat Layout - {seatData.seatMap ? Object.keys(seatData.seatMap).length : 0} / {seatData.totalSeats} Occupied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-8 rounded-lg">
              {/* Driver Section */}
              <div className="mb-8 text-center">
                <div className="inline-block bg-gray-300 px-6 py-2 rounded">
                  <span className="text-sm font-medium">Driver</span>
                </div>
              </div>

              {/* Seats */}
              <div className="space-y-3">
                {generateSeatLayout(seatData.totalSeats).map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-center gap-3">
                    {row.map((seatLabel, colIndex) => {
                      const status = getSeatStatus(seatLabel);
                      const info = getSeatInfo(seatLabel);
                      const isAisle = colIndex === 1;

                      return (
                        <div key={seatLabel} className="flex items-center">
                          <div
                            className={`
                              w-12 h-12 rounded border-2 flex flex-col items-center justify-center cursor-pointer
                              transition-all hover:scale-105 relative group
                              ${status === 'available'
                                ? 'bg-green-50 border-green-500 hover:bg-green-100'
                                : 'bg-blue-50 border-blue-500 hover:bg-blue-100'
                              }
                            `}
                          >
                            {status === 'available' ? (
                              <Armchair className="h-5 w-5 text-green-600" />
                            ) : (
                              <User className="h-5 w-5 text-blue-600" />
                            )}
                            <span className="text-xs font-medium mt-0.5">{seatLabel}</span>

                            {/* Tooltip */}
                            {info && (
                              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                                  <p className="font-semibold">{info.first_name} {info.last_name}</p>
                                  <p className="text-gray-300">{info.booking_reference}</p>
                                  {info.phone && <p className="text-gray-300">{info.phone}</p>}
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {info.status}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                          {isAisle && <div className="w-8" />}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedSchedule && (
        <Card>
          <CardContent className="p-12 text-center">
            <Armchair className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground">Select a schedule and date to view seat map</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
