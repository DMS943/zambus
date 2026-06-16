import { useState, useEffect } from "react";
import { Package, MapPin, Clock, DollarSign, Plus, Search, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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

  const zambianCities = [
    "Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe",
    "Chingola", "Mufulira", "Luanshya", "Kasama", "Chipata",
    "Mongu", "Solwezi", "Mbala", "Mansa", "Kaoma"
  ];

  const calculatePrice = (weight: number) => {
    const baseFee = 20;
    const perKgRate = 10;
    return (baseFee + weight * perKgRate).toFixed(2);
  };

  useEffect(() => {
    if (user) loadMyPackages();
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
        .select('*, carrier:carrier_id(id, email)')
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

      const { error } = await supabase.from('packages' as any).insert(packageData);

      if (error) {
        if (error.code === '42P01') {
          toast.error("Database table not set up. Please run the package delivery migration.");
          return;
        }
        throw error;
      }

      toast.success("Package listed! Carriers can now make delivery offers.");
      setShowNewPackageDialog(false);
      setFormData({
        title: "", description: "", category: "Documents", size: "medium",
        weight_kg: "", pickup_city: "", dropoff_city: "", pickup_date: "",
        preferred_time: "", insurance_option: false, recipient_name: "",
        recipient_phone: "", recipient_email: "", special_instructions: ""
      });
      loadMyPackages();
    } catch (error) {
      console.error('Error creating package:', error);
      toast.error("Failed to list package. Please try again.");
    }
  };

  const handleAcceptOffer = async (offerId: string, packageId: string, carrierId: string) => {
    try {
      const { error: packageError } = await supabase
        .from('packages' as any)
        .update({ status: 'accepted', carrier_id: carrierId, accepted_at: new Date().toISOString() })
        .eq('id', packageId);
      if (packageError) throw packageError;

      await supabase.from('delivery_offers' as any).update({ status: 'accepted' }).eq('id', offerId);
      await supabase.from('delivery_offers' as any).update({ status: 'cancelled' }).eq('package_id', packageId).neq('id', offerId);

      toast.success("Offer accepted! Carrier will pick up your package.");
      loadMyPackages();
      setSelectedPackage(null);
      setOffers([]);
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error("Failed to accept offer. Please try again.");
    }
  };

  const getStatusStyle = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 border border-amber-200',
      offered: 'bg-blue-100 text-blue-800 border border-blue-200',
      accepted: 'bg-green-100 text-green-800 border border-green-200',
      in_transit: 'bg-purple-100 text-purple-800 border border-purple-200',
      delivered: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      cancelled: 'bg-red-100 text-red-800 border border-red-200',
    };
    return map[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-3 w-3" />;
      case 'offered': return <Search className="h-3 w-3" />;
      case 'accepted': case 'delivered': return <CheckCircle className="h-3 w-3" />;
      case 'in_transit': return <Package className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-xl">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Package Delivery</h1>
              <p className="text-blue-100 text-sm">Send packages with travelers heading your way</p>
            </div>
          </div>
          <div className="flex gap-4 mt-4 text-xs">
            <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
              <div className="font-bold text-base">ZMW 20+</div>
              <div className="text-blue-200">Starting price</div>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
              <div className="font-bold text-base">15+</div>
              <div className="text-blue-200">Zambian cities</div>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
              <div className="font-bold text-base">Fast</div>
              <div className="text-blue-200">P2P delivery</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-5">
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
            {!user ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-800 mb-1">Sign in to send packages</h3>
                  <p className="text-sm text-gray-500">Create an account to list packages for peer-to-peer delivery.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Dialog open={showNewPackageDialog} onOpenChange={setShowNewPackageDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11">
                      <Plus className="h-4 w-4 mr-2" />
                      List New Package
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>List a Package for Delivery</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitPackage} className="space-y-4 pt-2">
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
                      <div className="grid grid-cols-2 gap-3">
                        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                          <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={formData.size} onValueChange={(v) => setFormData({ ...formData, size: v })}>
                          <SelectTrigger><SelectValue placeholder="Size" /></SelectTrigger>
                          <SelectContent>{sizes.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Input
                        type="number" step="0.1" placeholder="Weight (kg)" required
                        value={formData.weight_kg}
                        onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                      />
                      {formData.weight_kg && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-blue-900">Estimated Price</span>
                            <p className="text-xs text-blue-600">Base ZMW 20 + ZMW 10/kg</p>
                          </div>
                          <span className="text-xl font-bold text-blue-700">
                            ZMW {calculatePrice(parseFloat(formData.weight_kg) || 0)}
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Pickup City</label>
                          <Select value={formData.pickup_city} onValueChange={(v) => setFormData({ ...formData, pickup_city: v })}>
                            <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                            <SelectContent>{zambianCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Dropoff City</label>
                          <Select value={formData.dropoff_city} onValueChange={(v) => setFormData({ ...formData, dropoff_city: v })}>
                            <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                            <SelectContent>{zambianCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input type="date" required value={formData.pickup_date} onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })} />
                        <Input type="time" value={formData.preferred_time} onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })} />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" checked={formData.insurance_option} onChange={(e) => setFormData({ ...formData, insurance_option: e.target.checked })} />
                        <span className="text-sm text-gray-700">Add insurance (10% of price)</span>
                      </label>
                      <div className="border-t pt-4">
                        <p className="text-sm font-semibold text-gray-800 mb-3">Recipient Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <Input placeholder="Recipient name" required value={formData.recipient_name} onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })} />
                          <Input type="tel" placeholder="Recipient phone" required value={formData.recipient_phone} onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })} />
                        </div>
                        <Input type="email" placeholder="Recipient email (optional)" className="mt-3" value={formData.recipient_email} onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })} />
                      </div>
                      <Textarea placeholder="Special instructions (optional)" rows={2} value={formData.special_instructions} onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })} />
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-10">List Package</Button>
                    </form>
                  </DialogContent>
                </Dialog>

                {loading ? (
                  <Card className="border-0 shadow-sm"><CardContent className="p-6 text-center text-gray-500">Loading your packages...</CardContent></Card>
                ) : myPackages.length === 0 ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-8 text-center">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="font-medium text-gray-700">No packages listed yet</p>
                      <p className="text-sm text-gray-500 mt-1">Click the button above to list your first package.</p>
                    </CardContent>
                  </Card>
                ) : myPackages.map((pkg) => (
                  <Card key={pkg.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold text-gray-900 truncate">{pkg.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-1">{pkg.description}</p>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusStyle(pkg.status)}`}>
                          {getStatusIcon(pkg.status)}
                          {pkg.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          <span className="truncate">{pkg.pickup_city} → {pkg.dropoff_city}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          <span>{new Date(pkg.pickup_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          <span className="font-medium">ZMW {pkg.offered_price}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                          <span>{pkg.size} • {pkg.weight_kg}kg</span>
                        </div>
                      </div>
                      {pkg.tracking_number && (
                        <div className="bg-gray-50 border border-gray-200 rounded p-2 text-sm mb-3">
                          <span className="text-gray-500">Tracking: </span>
                          <span className="font-mono font-semibold text-gray-800">{pkg.tracking_number}</span>
                        </div>
                      )}
                      {pkg.status === 'offered' && (
                        <Button onClick={() => { setSelectedPackage(pkg); loadOffers(pkg.id); }} variant="outline" size="sm" className="w-full">
                          View Delivery Offers
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "browse" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Earn money as a carrier!</strong> Browse packages along your route and make delivery offers.
            </div>
            {availablePackages.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-gray-700">No packages available right now</p>
                  <p className="text-sm text-gray-500 mt-1">Check back later or list your own package.</p>
                </CardContent>
              </Card>
            ) : availablePackages.map((pkg) => (
              <Card key={pkg.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold text-gray-900 truncate">{pkg.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{pkg.description}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusStyle(pkg.status)}`}>
                      {pkg.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-blue-500" />
                      <span className="truncate">{pkg.pickup_city} → {pkg.dropoff_city}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-green-500" />
                      <span>{new Date(pkg.pickup_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-semibold text-blue-700">ZMW {pkg.offered_price}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-purple-500" />
                      <span>{pkg.size} • {pkg.weight_kg}kg</span>
                    </div>
                  </div>
                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                    Make Delivery Offer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedPackage && (
          <Dialog open={!!selectedPackage} onOpenChange={() => setSelectedPackage(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delivery Offers for "{selectedPackage.title}"</DialogTitle>
              </DialogHeader>
              {offers.length === 0 ? (
                <div className="py-8 text-center">
                  <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No offers yet for this package.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {offers.map((offer) => (
                    <Card key={offer.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{offer.carrier?.email || 'Carrier'}</p>
                          </div>
                          <span className="text-lg font-bold text-blue-600">ZMW {offer.offered_price}</span>
                        </div>
                        {offer.message && <p className="text-sm text-gray-600 mb-3">{offer.message}</p>}
                        <div className="flex gap-2">
                          <Button onClick={() => handleAcceptOffer(offer.id, selectedPackage.id, offer.carrier_id)} size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                            Accept Offer
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">View Profile</Button>
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
