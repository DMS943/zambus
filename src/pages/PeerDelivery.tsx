import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, DollarSign, Package, Truck, CheckCircle, AlertCircle } from 'lucide-react';
import { formatZMW } from '@/utils/pricingUtils';
import { format } from 'date-fns';

interface BusRoute {
  id: string;
  origin: string;
  destination: string;
  distance_km: number;
}

interface Schedule {
  id: string;
  route_id: string;
  departure_time: string;
  arrival_time: string;
  price_zmw: number;
  available_seats: number;
  routes: BusRoute;
  buses: {
    license_plate: string;
    bus_class: string;
    operator: {
      name: string;
    };
  };
}

interface PeerDelivery {
  id: string;
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  origin: string;
  destination: string;
  package_description: string;
  package_weight_kg: number;
  delivery_date: string;
  schedule_id: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  price_zmw: number;
  created_at: string;
}

const PeerDelivery = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'track'>('send');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [packageDesc, setPackageDesc] = useState('');
  const [packageWeight, setPackageWeight] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Fetch available schedules based on origin and destination
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', origin, destination, deliveryDate],
    queryFn: async () => {
      if (!origin || !destination || !deliveryDate) return [];
      
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          id,
          route_id,
          departure_time,
          arrival_time,
          price_zmw,
          available_seats,
          routes (
            id,
            origin,
            destination,
            distance_km
          ),
          buses (
            license_plate,
            bus_class,
            operator:operators(name)
          )
        `)
        .eq('routes.origin', origin)
        .eq('routes.destination', destination)
        .gte('departure_date', deliveryDate)
        .lte('departure_date', deliveryDate)
        .order('departure_time', { ascending: true });

      if (error) {
        console.error('Error fetching schedules:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!(origin && destination && deliveryDate),
  });

  // Fetch user's deliveries (mock data for now)
  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      // Mock deliveries - in production this would fetch from Supabase
      return [
        {
          id: '1',
          sender_name: 'John Doe',
          sender_phone: '260123456789',
          recipient_name: 'Jane Smith',
          recipient_phone: '260987654321',
          origin: 'Lusaka',
          destination: 'Kitwe',
          package_description: 'Electronics - Laptop',
          package_weight_kg: 2.5,
          delivery_date: new Date().toISOString().split('T')[0],
          schedule_id: 'sch-1',
          status: 'in_transit' as const,
          price_zmw: 50000,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          sender_name: 'Alice Johnson',
          sender_phone: '260111222333',
          recipient_name: 'Bob Wilson',
          recipient_phone: '260444555666',
          origin: 'Lusaka',
          destination: 'Ndola',
          package_description: 'Documents - Business Reports',
          package_weight_kg: 0.5,
          delivery_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          schedule_id: 'sch-2',
          status: 'delivered' as const,
          price_zmw: 30000,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
    },
  });

  const calculatePrice = () => {
    if (!selectedSchedule || !packageWeight) return 0;
    const basePrice = selectedSchedule.price_zmw;
    const weightCharge = Math.ceil(parseFloat(packageWeight) * 5000); // 5000 per kg
    return basePrice + weightCharge;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || !senderName || !recipientName || !packageDesc || !packageWeight) {
      alert('Please fill all fields and select a schedule');
      return;
    }
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setOrigin('');
      setDestination('');
      setSenderName('');
      setRecipientName('');
      setPackageDesc('');
      setPackageWeight('');
      setDeliveryDate('');
      setSelectedSchedule(null);
    }, 3000);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'delivered':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-700`}>
            <CheckCircle className="h-3 w-3" />
            Delivered
          </span>
        );
      case 'in_transit':
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-700`}>
            <Truck className="h-3 w-3" />
            In Transit
          </span>
        );
      case 'pending':
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-700`}>
            <AlertCircle className="h-3 w-3" />
            Pending
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-700`}>
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('send')}
            className={`pb-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'send'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Send Package
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`pb-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'track'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Track Deliveries
          </button>
        </div>

        {/* Send Package Tab */}
        {activeTab === 'send' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Send a Package via Bus
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Send packages safely using available bus routes. Your package travels with the bus and is delivered to your recipient.
                </p>
              </CardHeader>
              <CardContent>
                {submitted && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Package Request Submitted!</p>
                      <p className="text-sm text-green-800">Your delivery request has been received. The bus operator will contact you shortly.</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Route Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origin" className="text-sm font-medium mb-2 block">From</Label>
                      <Input
                        id="origin"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder="e.g., Lusaka"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="destination" className="text-sm font-medium mb-2 block">To</Label>
                      <Input
                        id="destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g., Kitwe"
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* Date Selection */}
                  <div>
                    <Label htmlFor="delivery-date" className="text-sm font-medium mb-2 block">Delivery Date</Label>
                    <Input
                      id="delivery-date"
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="h-10"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  {/* Schedule Selection */}
                  {origin && destination && deliveryDate && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Select Bus Schedule</Label>
                      {schedulesLoading && <p className="text-sm text-gray-600">Loading schedules...</p>}
                      {!schedulesLoading && schedules.length === 0 && (
                        <p className="text-sm text-gray-600">No schedules available for this route</p>
                      )}
                      <div className="space-y-2">
                        {schedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            onClick={() => setSelectedSchedule(schedule)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedSchedule?.id === schedule.id
                                ? 'border-accent bg-accent/5'
                                : 'border-gray-200 hover:border-accent/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">{schedule.buses?.operator?.name || 'Bus Operator'}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {schedule.departure_time}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {schedule.buses?.bus_class || 'Standard'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{formatZMW(schedule.price_zmw)}</p>
                                <p className="text-xs text-gray-600">+ weight charge</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sender Details */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Sender Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sender-name" className="text-sm font-medium mb-2 block">Your Name</Label>
                        <Input
                          id="sender-name"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="Full name"
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sender-phone" className="text-sm font-medium mb-2 block">Your Phone</Label>
                        <Input
                          id="sender-phone"
                          value={senderPhone}
                          onChange={(e) => setSenderPhone(e.target.value)}
                          placeholder="+260 ..."
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recipient Details */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Recipient Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="recipient-name" className="text-sm font-medium mb-2 block">Recipient Name</Label>
                        <Input
                          id="recipient-name"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Full name"
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="recipient-phone" className="text-sm font-medium mb-2 block">Recipient Phone</Label>
                        <Input
                          id="recipient-phone"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="+260 ..."
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Package Details */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Package Details</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="package-desc" className="text-sm font-medium mb-2 block">Package Description</Label>
                        <Input
                          id="package-desc"
                          value={packageDesc}
                          onChange={(e) => setPackageDesc(e.target.value)}
                          placeholder="e.g., Electronics, Documents, Clothing"
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="package-weight" className="text-sm font-medium mb-2 block">Weight (kg)</Label>
                        <Input
                          id="package-weight"
                          type="number"
                          value={packageWeight}
                          onChange={(e) => setPackageWeight(e.target.value)}
                          placeholder="0.5"
                          min="0.1"
                          step="0.1"
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Price Summary */}
                  {selectedSchedule && packageWeight && (
                    <Card className="bg-accent/5 border-accent">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-accent" />
                            <span className="text-sm font-medium text-gray-900">Total Price</span>
                          </div>
                          <span className="text-2xl font-bold text-accent">{formatZMW(calculatePrice())}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Base fare {formatZMW(selectedSchedule.price_zmw)} + Weight charge {formatZMW(Math.ceil(parseFloat(packageWeight) * 5000))}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent/90 text-white h-12 font-semibold"
                    disabled={!selectedSchedule || !senderName || !recipientName || !packageDesc || !packageWeight}
                  >
                    Submit Delivery Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Track Deliveries Tab */}
        {activeTab === 'track' && (
          <div className="space-y-4">
            {deliveries.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Deliveries Yet</h3>
                  <p className="text-gray-600">Start by sending your first package</p>
                </CardContent>
              </Card>
            ) : (
              deliveries.map((delivery) => (
                <Card key={delivery.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {delivery.origin} → {delivery.destination}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{delivery.package_description}</p>
                      </div>
                      {getStatusBadge(delivery.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 py-4 border-y border-gray-200">
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Recipient</p>
                        <p className="font-semibold text-gray-900 mt-1">{delivery.recipient_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Weight</p>
                        <p className="font-semibold text-gray-900 mt-1">{delivery.package_weight_kg} kg</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Date</p>
                        <p className="font-semibold text-gray-900 mt-1">
                          {format(new Date(delivery.delivery_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Cost</p>
                        <p className="font-semibold text-gray-900 mt-1">{formatZMW(delivery.price_zmw)}</p>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default PeerDelivery;
