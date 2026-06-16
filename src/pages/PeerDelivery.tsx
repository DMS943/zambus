import { useState, useEffect } from "react";
import { Package, MapPin, Clock, DollarSign, Plus, Search, CheckCircle, XCircle, AlertCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const PackageDelivery = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"my-packages" | "browse">("my-packages");
  const [showNewPackageDialog, setShowNewPackageDialog] = useState(false);
  const [myPackages, setMyPackages] = useState<any[]>([]);
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Documents",
    size: "medium",
    weight_kg: "",
    pickup_city: "",
    dropoff_city: "",
    pickup_date: "",
    preferred_time: "",
    insurance_option: false,
    recipient_name: "",
    recipient_phone: "",
    recipient_email: "",
    special_instructions: ""
  });

  const categories = ["Documents", "Electronics", "Clothing", "Food", "Gifts", "Medicine", "Other"];
  const sizes = ["small", "medium", "large", "extra_large"];
  const priorities = ["standard", "express", "same_day"];
  
  const zambianCities = [
    "Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe", 
    "Chingola", "Mufulira", "Luanshya", "Kasama", "Chipata",
    "Mongu", "Solwezi", "Mbala", "Mansa", "Kaoma"
  ];

  const calculatePrice = (weight: number) => {
    const baseFee = 20; // ZMW base fee
    const perKgRate = 10; // ZMW per kg
    const price = baseFee + (weight * perKgRate);
    return price.toFixed(2);
  };

  useEffect(() => {
    if (user) {
      loadMyPackages();
    }
    loadAvailablePackages();
  }, [user]);

  const loadMyPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages' as any)
        .select('*')
        .eq('sender_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages' as any)
        .select('*')
        .in('status', ['pending', 'offered'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailablePackages(data || []);
    } catch (error) {
      console.error('Error loading available packages:', error);
    }
  };

  const loadOffers = async (packageId: string) => {
    try {
      const { data, error } = await supabase
        .from('delivery_offers' as any)
        .select(`
          *,
          carrier:carrier_id(id, email, profiles(first_name, last_name))
        `)
        .eq('package_id', packageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error loading offers:', error);
    }
  };

  const handleSubmitPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const weight = parseFloat(formData.weight_kg);
    const calculatedPrice = parseFloat(calculatePrice(weight));
    
    try {
      const packageData = {
        sender_id: user?.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        size: formData.size,
        weight_kg: weight,
        pickup_city: formData.pickup_city,
        dropoff_city: formData.dropoff_city,
        pickup_date: formData.pickup_date,
        preferred_time: formData.preferred_time || null,
        offered_price: calculatedPrice,
        insurance_option: formData.insurance_option,
        insurance_cost: formData.insurance_option ? calculatedPrice * 0.1 : null,
        recipient_name: formData.recipient_name,
        recipient_phone: formData.recipient_phone,
        recipient_email: formData.recipient_email || null,
        special_instructions: formData.special_instructions || null
      };

      const { error } = await supabase
        .from('packages' as any)
        .insert(packageData);

      if (error) {
        if (error.code === '42P01') {
          toast.error("Database table not set up. Please run the package delivery migration.");
          return;
        }
        throw error;
      }

      toast.success("Package listed successfully! Carriers can now make offers.");
      setShowNewPackageDialog(false);
      setFormData({
        title: "",
        description: "",
        category: "Documents",
        size: "medium",
        weight_kg: "",
        pickup_city: "",
        dropoff_city: "",
        pickup_date: "",
        preferred_time: "",
        insurance_option: false,
        recipient_name: "",
        recipient_phone: "",
        recipient_email: "",
        special_instructions: ""
      });
      loadMyPackages();
    } catch (error) {
      console.error('Error creating package:', error);
      toast.error("Failed to list package. Please try again.");
    }
  };

  const handleAcceptOffer = async (offerId: string, packageId: string, carrierId: string) => {
    try {
      // Update package status and assign carrier
      const { error: packageError } = await supabase
        .from('packages' as any)
        .update({
          status: 'accepted',
          carrier_id: carrierId,
          accepted_at: new Date().toISOString()
        })
        .eq('id', packageId);

      if (packageError) throw packageError;

      // Update offer status
      const { error: offerError } = await supabase
        .from('delivery_offers' as any)
        .update({ status: 'accepted' })
        .eq('id', offerId);

      if (offerError) throw offerError;

      // Reject other offers
      const { error: rejectError } = await supabase
        .from('delivery_offers' as any)
        .update({ status: 'cancelled' })
        .eq('package_id', packageId)
        .neq('id', offerId);

      if (rejectError) throw rejectError;

      toast.success("Offer accepted! Carrier will pick up your package.");
      loadMyPackages();
      setOffers([]);
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error("Failed to accept offer. Please try again.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'offered': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      case 'offered': return <Search className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'in_transit': return <Package className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Package Delivery</h1>
          <p className="text-gray-600">Send packages with travelers heading your way</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "my-packages" ? "default" : "outline"}
            onClick={() => setActiveTab("my-packages")}
            className="flex-1"
          >
            <Package className="h-4 w-4 mr-2" />
            My Packages
          </Button>
          <Button
            variant={activeTab === "browse" ? "default" : "outline"}
            onClick={() => setActiveTab("browse")}
            className="flex-1"
          >
            <Search className="h-4 w-4 mr-2" />
            Browse Packages
          </Button>
        </div>

        {activeTab === "my-packages" && (
          <div className="space-y-4">
            {/* New Package Button */}
            <Dialog open={showNewPackageDialog} onOpenChange={setShowNewPackageDialog}>
              <DialogTrigger asChild>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  List New Package
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>List a Package for Delivery</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitPackage} className="space-y-4">
                  <Input
                    placeholder="Package title (e.g., Documents to Kitwe)"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Describe your package contents"
                    rows={2}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      required
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      required
                      value={formData.size}
                      onValueChange={(value) => setFormData({ ...formData, size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size.charAt(0).toUpperCase() + size.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Weight (kg)"
                    required
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Pickup City</label>
                      <Select
                        required
                        value={formData.pickup_city}
                        onValueChange={(value) => setFormData({ ...formData, pickup_city: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {zambianCities.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Dropoff City</label>
                      <Select
                        required
                        value={formData.dropoff_city}
                        onValueChange={(value) => setFormData({ ...formData, dropoff_city: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {zambianCities.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      required
                      value={formData.pickup_date}
                      onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={formData.preferred_time}
                      onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                    />
                  </div>
                  {formData.weight_kg && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">Calculated Price:</span>
                        <span className="text-lg font-bold text-blue-600">
                          ZMW {calculatePrice(parseFloat(formData.weight_kg) || 0)}
                        </span>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        Base fee: ZMW 20 + ZMW 10 per kg
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="insurance"
                      checked={formData.insurance_option}
                      onChange={(e) => setFormData({ ...formData, insurance_option: e.target.checked })}
                    />
                    <label htmlFor="insurance" className="text-sm">
                      Add insurance (10% of price)
                    </label>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Recipient Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Recipient name"
                        required
                        value={formData.recipient_name}
                        onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                      />
                      <Input
                        type="tel"
                        placeholder="Recipient phone"
                        required
                        value={formData.recipient_phone}
                        onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                      />
                    </div>
                    <Input
                      type="email"
                      placeholder="Recipient email (optional)"
                      className="mt-4"
                      value={formData.recipient_email}
                      onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                    />
                  </div>
                  <Textarea
                    placeholder="Special instructions (optional)"
                    rows={2}
                    value={formData.special_instructions}
                    onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                  />
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                    List Package
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* My Packages List */}
            {loading ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-600">Loading your packages...</p>
                </CardContent>
              </Card>
            ) : myPackages.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No packages listed yet.</p>
                  <p className="text-sm text-gray-500 mt-1">Click the button above to list your first package.</p>
                </CardContent>
              </Card>
            ) : (
              myPackages.map((pkg) => (
                <Card key={pkg.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{pkg.title}</h3>
                        <p className="text-sm text-gray-600">{pkg.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pkg.status)}`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(pkg.status)}
                          {pkg.status.replace('_', ' ')}
                        </div>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{pkg.pickup_city} → {pkg.dropoff_city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(pkg.pickup_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>ZMW {pkg.offered_price}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>{pkg.size} • {pkg.weight_kg}kg</span>
                      </div>
                    </div>
                    {pkg.tracking_number && (
                      <div className="bg-gray-50 p-2 rounded text-sm mb-3">
                        <span className="text-gray-600">Tracking: </span>
                        <span className="font-mono font-medium">{pkg.tracking_number}</span>
                      </div>
                    )}
                    {pkg.status === 'offered' && (
                      <Button
                        onClick={() => {
                          setSelectedPackage(pkg);
                          loadOffers(pkg.id);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        View Offers ({offers.length})
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "browse" && (
          <div className="space-y-4">
            {availablePackages.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No packages available for delivery right now.</p>
                  <p className="text-sm text-gray-500 mt-1">Check back later or list your own package.</p>
                </CardContent>
              </Card>
            ) : (
              availablePackages.map((pkg) => (
                <Card key={pkg.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{pkg.title}</h3>
                        <p className="text-sm text-gray-600">{pkg.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pkg.status)}`}>
                        {pkg.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{pkg.pickup_city} → {pkg.dropoff_city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(pkg.pickup_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>ZMW {pkg.offered_price}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>{pkg.size} • {pkg.weight_kg}kg</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => window.location.href = `/carrier-opportunities`}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      View as Carrier
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Offers Dialog */}
        {selectedPackage && (
          <Dialog open={!!selectedPackage} onOpenChange={() => setSelectedPackage(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delivery Offers</DialogTitle>
              </DialogHeader>
              {offers.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No offers yet for this package.</p>
              ) : (
                <div className="space-y-3">
                  {offers.map((offer) => (
                    <Card key={offer.id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {offer.carrier?.profiles?.first_name} {offer.carrier?.profiles?.last_name}
                            </p>
                            <p className="text-sm text-gray-600">{offer.carrier?.email}</p>
                          </div>
                          <span className="text-lg font-bold text-blue-600">
                            ZMW {offer.offered_price}
                          </span>
                        </div>
                        {offer.message && (
                          <p className="text-sm text-gray-600 mb-3">{offer.message}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAcceptOffer(offer.id, selectedPackage.id, offer.carrier_id)}
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            Accept Offer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            View Profile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default PackageDelivery;
