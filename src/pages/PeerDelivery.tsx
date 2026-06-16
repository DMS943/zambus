import { useState } from "react";
import { Package, Plus, Search, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import DeliveryCard from "@/components/DeliveryCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

// Mock data - in production, this would come from Supabase
const mockDeliveries = [
  {
    id: "delivery-1",
    packageName: "Electronics Package",
    from: "Lusaka",
    to: "Ndola",
    status: "in_transit" as const,
    estimatedDelivery: new Date(Date.now() + 6 * 60 * 60 * 1000),
    price: 250,
    driver: "Joseph Banda",
    driverPhone: "+260 965 123456",
    pickupDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: "delivery-2",
    packageName: "Clothing & Gifts",
    from: "Livingstone",
    to: "Kitwe",
    status: "pending" as const,
    estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000),
    price: 180,
    driver: undefined,
    driverPhone: undefined,
    pickupDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: "delivery-3",
    packageName: "Documents & Files",
    from: "Chirundu",
    to: "Lusaka",
    status: "delivered" as const,
    estimatedDelivery: new Date(Date.now() - 3 * 60 * 60 * 1000),
    price: 150,
    driver: "Grace Mulenga",
    driverPhone: "+260 977 654321",
    pickupDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
  {
    id: "delivery-4",
    packageName: "Fresh Produce",
    from: "Kabwe",
    to: "Lusaka",
    status: "pickup_ready" as const,
    estimatedDelivery: new Date(Date.now() + 3 * 60 * 60 * 1000),
    price: 200,
    driver: "Mike Chanda",
    driverPhone: "+260 955 789012",
    pickupDate: new Date(Date.now() + 1 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
];

const mockRoutes = [
  {
    id: "route-1",
    from: "Lusaka",
    to: "Ndola",
    departTime: "08:00",
    arrivalTime: "14:30",
    capacity: 5,
    available: 2,
    price: 250,
  },
  {
    id: "route-2",
    from: "Livingstone",
    to: "Kitwe",
    departTime: "06:00",
    arrivalTime: "16:00",
    capacity: 8,
    available: 4,
    price: 180,
  },
  {
    id: "route-3",
    from: "Chirundu",
    to: "Lusaka",
    departTime: "10:00",
    arrivalTime: "13:00",
    capacity: 6,
    available: 1,
    price: 150,
  },
  {
    id: "route-4",
    from: "Kabwe",
    to: "Lusaka",
    departTime: "07:00",
    arrivalTime: "09:30",
    capacity: 4,
    available: 3,
    price: 200,
  },
];

export default function PeerDelivery() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"send" | "track" | "routes">("send");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);

  const filteredDeliveries = mockDeliveries.filter((delivery) => {
    return (
      delivery.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.to.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleTrack = (deliveryId: string) => {
    alert(`Opening tracking details for delivery ${deliveryId}`);
  };

  const handleCancel = (deliveryId: string) => {
    alert(`Cancelling delivery ${deliveryId}`);
  };

  const handleSendPackage = () => {
    if (!isAuthenticated) {
      alert("Please sign in to send packages");
      return;
    }
    setShowBookingForm(true);
  };

  const handleBookRoute = (routeId: string) => {
    if (!isAuthenticated) {
      alert("Please sign in to book delivery");
      return;
    }
    alert(`Booking route ${routeId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />

      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <Package className="h-6 w-6 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Peer-to-Peer Delivery</h1>
              <p className="text-gray-600">Send packages across routes with trusted drivers</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSendPackage}
              className="bg-cyan-600 hover:bg-cyan-700"
              size="lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Send Package
            </Button>
            <Button variant="outline" size="lg">
              Become a Driver
            </Button>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="bg-white border-b border-gray-200 px-4 sticky top-14 md:top-0 z-30">
        <div className="max-w-7xl mx-auto">
          <div className="flex space-x-1">
            {["send", "track", "routes"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab
                    ? "text-cyan-600 border-cyan-600"
                    : "text-gray-600 border-transparent hover:text-gray-900"
                }`}
              >
                {tab === "send" && "Send Package"}
                {tab === "track" && "My Deliveries"}
                {tab === "routes" && "Available Routes"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Send Package Tab */}
          {activeTab === "send" && (
            <div>
              <div className="mb-6">
                <Card className="modern-card bg-cyan-50 border-cyan-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-cyan-900 mb-1">Quick & Affordable Delivery</h3>
                        <p className="text-sm text-cyan-800">
                          Send your packages with verified drivers traveling on scheduled routes. Transparent pricing and real-time tracking.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="modern-card text-center py-12">
                <CardContent>
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to send a package?</h3>
                  <p className="text-gray-600 mb-4">
                    Click the "Send Package" button above to get started with booking
                  </p>
                  <Button
                    onClick={handleSendPackage}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    Start Booking
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Track Deliveries Tab */}
          {activeTab === "track" && (
            <div>
              <div className="mb-6 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search deliveries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {!isAuthenticated ? (
                <Card className="modern-card text-center py-12">
                  <CardContent>
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to track deliveries</h3>
                    <p className="text-gray-600">
                      View all your active and past deliveries
                    </p>
                  </CardContent>
                </Card>
              ) : filteredDeliveries.length === 0 ? (
                <Card className="modern-card text-center py-12">
                  <CardContent>
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No deliveries yet</h3>
                    <p className="text-gray-600">
                      Send your first package to get started
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDeliveries.map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      onTrack={handleTrack}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Available Routes Tab */}
          {activeTab === "routes" && (
            <div>
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  {mockRoutes.length} active routes available
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockRoutes.map((route) => (
                  <Card key={route.id} className="modern-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {route.from} → {route.to}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {route.departTime} - {route.arrivalTime}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-cyan-600 text-lg">K{route.price}</p>
                          <p className="text-xs text-gray-600">/package</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded p-2 mb-4">
                        <p className="text-xs text-gray-600">Capacity</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-500"
                              style={{ width: `${((route.capacity - route.available) / route.capacity) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {route.available}/{route.capacity}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleBookRoute(route.id)}
                        className="w-full bg-cyan-600 hover:bg-cyan-700"
                        size="sm"
                      >
                        Book Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
