import { useState, useEffect } from "react";
import {
  Package, MapPin, Clock, DollarSign, Plus, Search,
  CheckCircle, AlertCircle, Bus, ChevronRight, Scale,
  User, Phone, Mail, FileText, ArrowRight, Truck, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatZMW } from "@/utils/pricingUtils";

const zambianCities = [
  "Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe",
  "Chingola", "Mufulira", "Luanshya", "Kasama", "Chipata",
  "Mongu", "Solwezi", "Mbala", "Mansa", "Kaoma",
  "Mazabuka", "Choma", "Kafue", "Kapiri Mposhi", "Mpika"
];

const categories = ["Documents", "Electronics", "Clothing", "Food & Groceries", "Medicine", "Gifts", "Household Items", "Other"];

const sizeOptions = [
  { value: "small", label: "Small", desc: "Fits in a bag (up to 2kg)", icon: "S" },
  { value: "medium", label: "Medium", desc: "Shoe-box size (2–5kg)", icon: "M" },
  { value: "large", label: "Large", desc: "Suitcase size (5–15kg)", icon: "L" },
  { value: "extra_large", label: "Extra Large", desc: "Over 15kg", icon: "XL" },
];

const RATE_PER_KG = 12; // ZMW per kg
const BASE_FEE = 25;    // ZMW base handling fee

const calcPrice = (weight: number) => BASE_FEE + weight * RATE_PER_KG;

const PackageDelivery = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"send" | "track">("send");
  const [step, setStep] = useState<"route" | "details" | "recipient" | "confirm">("route");
  const [showDialog, setShowDialog] = useState(false);
  const [myShipments, setMyShipments] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [loadingShipments, setLoadingShipments] = useState(false);

  const [form, setForm] = useState({
    from_city: "",
    to_city: "",
    travel_date: "",
    operator_id: "",
    operator_name: "",
    category: "",
    size: "medium",
    weight_kg: "",
    description: "",
    special_instructions: "",
    recipient_name: "",
    recipient_phone: "",
    recipient_email: "",
    insurance: false,
  });

  const estimatedPrice = form.weight_kg ? calcPrice(parseFloat(form.weight_kg) || 0) : 0;
  const insuranceCost = form.insurance ? estimatedPrice * 0.1 : 0;
  const totalPrice = estimatedPrice + insuranceCost;

  useEffect(() => {
    if (user) loadMyShipments();
  }, [user]);

  useEffect(() => {
    if (form.from_city && form.to_city && form.from_city !== form.to_city) {
      loadOperators();
    }
  }, [form.from_city, form.to_city]);

  const loadOperators = async () => {
    setLoadingOperators(true);
    try {
      const { data, error } = await supabase
        .from('bus_operators')
        .select('id, name, contact_email, contact_phone')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setOperators(data || []);
    } catch (err) {
      console.error('Error loading operators:', err);
      setOperators([]);
    } finally {
      setLoadingOperators(false);
    }
  };

  const loadMyShipments = async () => {
    setLoadingShipments(true);
    try {
      const { data, error } = await supabase
        .from('packages' as any)
        .select('*')
        .eq('sender_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) {
        if (error.code === '42P01') { setMyShipments([]); return; }
        throw error;
      }
      setMyShipments(data || []);
    } catch (err) {
      console.error('Error loading shipments:', err);
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("Please sign in to send a package."); return; }
    const weight = parseFloat(form.weight_kg);
    if (isNaN(weight) || weight <= 0) { toast.error("Please enter a valid weight."); return; }

    try {
      const packageData = {
        sender_id: user.id,
        title: `${form.category} — ${form.from_city} to ${form.to_city}`,
        description: form.description,
        category: form.category,
        size: form.size,
        weight_kg: weight,
        pickup_city: form.from_city,
        dropoff_city: form.to_city,
        pickup_date: form.travel_date,
        offered_price: totalPrice,
        insurance_option: form.insurance,
        insurance_cost: form.insurance ? insuranceCost : null,
        recipient_name: form.recipient_name,
        recipient_phone: form.recipient_phone,
        recipient_email: form.recipient_email || null,
        special_instructions: form.special_instructions || null,
        carrier_id: form.operator_id || null,
        status: 'pending',
      };

      const { error } = await supabase.from('packages' as any).insert(packageData);
      if (error) {
        if (error.code === '42P01') {
          toast.error("Package delivery service is being set up. Please contact support.");
          return;
        }
        throw error;
      }

      toast.success("Package shipment booked! You will receive a tracking number shortly.");
      setShowDialog(false);
      setStep("route");
      setForm({
        from_city: "", to_city: "", travel_date: "", operator_id: "", operator_name: "",
        category: "", size: "medium", weight_kg: "", description: "", special_instructions: "",
        recipient_name: "", recipient_phone: "", recipient_email: "", insurance: false,
      });
      loadMyShipments();
    } catch (err) {
      console.error('Error creating shipment:', err);
      toast.error("Failed to book shipment. Please try again.");
    }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      accepted: 'bg-blue-50 text-blue-700 border-blue-200',
      in_transit: 'bg-purple-50 text-purple-700 border-purple-200',
      delivered: 'bg-green-50 text-green-700 border-green-200',
      cancelled: 'bg-red-50 text-red-700 border-red-200',
    };
    return map[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'accepted': return <CheckCircle className="h-3 w-3" />;
      case 'in_transit': return <Truck className="h-3 w-3" />;
      case 'delivered': return <CheckCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const canProceedRoute = form.from_city && form.to_city && form.from_city !== form.to_city && form.travel_date && form.operator_id;
  const canProceedDetails = form.category && form.weight_kg && parseFloat(form.weight_kg) > 0 && form.description;
  const canProceedRecipient = form.recipient_name && form.recipient_phone;

  const renderStepIndicator = () => (
    <div className="flex items-center gap-1 mb-5">
      {[
        { id: "route", label: "Route" },
        { id: "details", label: "Package" },
        { id: "recipient", label: "Recipient" },
        { id: "confirm", label: "Confirm" },
      ].map((s, i) => {
        const steps = ["route", "details", "recipient", "confirm"];
        const currentIdx = steps.indexOf(step);
        const thisIdx = steps.indexOf(s.id);
        const done = thisIdx < currentIdx;
        const active = thisIdx === currentIdx;
        return (
          <div key={s.id} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 transition-colors ${
              done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'
            }`}>
              {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`ml-1 text-[10px] font-medium hidden sm:block ${active ? 'text-blue-600' : done ? 'text-gray-600' : 'text-gray-400'}`}>{s.label}</span>
            {i < 3 && <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white px-4 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Package Delivery</h1>
              <p className="text-indigo-200 text-xs">Ship packages via Zambian bus companies</p>
            </div>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="bg-white/10 rounded-lg px-3 py-2 flex-1 text-center">
              <div className="font-bold text-sm">ZMW {BASE_FEE}+</div>
              <div className="text-indigo-200">Base fee</div>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2 flex-1 text-center">
              <div className="font-bold text-sm">Bus Network</div>
              <div className="text-indigo-200">Nationwide</div>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2 flex-1 text-center">
              <div className="font-bold text-sm">Tracking</div>
              <div className="text-indigo-200">Real-time</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "send" ? "default" : "outline"}
            onClick={() => setActiveTab("send")}
            className="flex-1"
          >
            <Package className="h-4 w-4 mr-2" />
            Send a Package
          </Button>
          <Button
            variant={activeTab === "track" ? "default" : "outline"}
            onClick={() => setActiveTab("track")}
            className="flex-1"
          >
            <Truck className="h-4 w-4 mr-2" />
            My Shipments
          </Button>
        </div>

        {activeTab === "send" && (
          <div className="space-y-4">
            {/* How it works */}
            <Card className="border-0 shadow-sm bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 text-sm mb-3">How it works</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { icon: MapPin, label: "1. Choose route & bus company", color: "text-blue-600" },
                    { icon: Package, label: "2. Describe your package", color: "text-indigo-600" },
                    { icon: Truck, label: "3. Package ships with the bus", color: "text-green-600" },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5">
                      <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <p className="text-[10px] text-blue-800 leading-tight">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
              onClick={() => { setStep("route"); setShowDialog(true); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Book a Package Shipment
            </Button>

            {/* Pricing info */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Pricing
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>Base handling fee</span>
                    <span className="font-semibold">ZMW {BASE_FEE}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Per kg rate</span>
                    <span className="font-semibold">ZMW {RATE_PER_KG}/kg</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Insurance (optional)</span>
                    <span className="font-semibold">10% of price</span>
                  </div>
                  <div className="border-t pt-2 text-xs text-gray-500">
                    Example: 3kg package = ZMW {calcPrice(3).toFixed(0)} (base + weight)
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "track" && (
          <div className="space-y-3">
            {!user ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700">Sign in to track your shipments</p>
                  <p className="text-sm text-gray-400 mt-1">Create an account to send and track packages.</p>
                </CardContent>
              </Card>
            ) : loadingShipments ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 text-center text-gray-400 text-sm">Loading shipments...</CardContent>
              </Card>
            ) : myShipments.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700">No shipments yet</p>
                  <p className="text-sm text-gray-400 mt-1">Book your first package shipment above.</p>
                </CardContent>
              </Card>
            ) : myShipments.map((pkg) => (
              <Card key={pkg.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{pkg.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{pkg.description}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusColor(pkg.status)}`}>
                      {getStatusIcon(pkg.status)}
                      {(pkg.status || 'pending').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <span className="truncate">{pkg.pickup_city} → {pkg.dropoff_city}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      <span>{pkg.pickup_date ? new Date(pkg.pickup_date).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                      <span>{pkg.size} · {pkg.weight_kg}kg</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <span className="font-semibold">{formatZMW(Math.round(pkg.offered_price || 0))}</span>
                    </div>
                  </div>
                  {pkg.tracking_number && (
                    <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Tracking #</span>
                      <span className="font-mono text-xs font-bold text-gray-800">{pkg.tracking_number}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); setStep("route"); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              Book Package Shipment
            </DialogTitle>
          </DialogHeader>

          <div className="pt-2">
            {renderStepIndicator()}

            {/* Step 1: Route & Operator */}
            {step === "route" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 text-sm">Select route &amp; bus company</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">From</label>
                    <Select value={form.from_city} onValueChange={(v) => setForm({ ...form, from_city: v, operator_id: "", operator_name: "" })}>
                      <SelectTrigger className="h-10 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          <SelectValue placeholder="Origin" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>{zambianCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">To</label>
                    <Select value={form.to_city} onValueChange={(v) => setForm({ ...form, to_city: v, operator_id: "", operator_name: "" })}>
                      <SelectTrigger className="h-10 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                          <SelectValue placeholder="Destination" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>{zambianCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Travel Date</label>
                  <Input
                    type="date"
                    value={form.travel_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm({ ...form, travel_date: e.target.value })}
                    className="h-10 text-sm"
                  />
                </div>

                {form.from_city && form.to_city && form.from_city !== form.to_city && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-2 block">Bus Company</label>
                    {loadingOperators ? (
                      <p className="text-sm text-gray-400">Loading operators...</p>
                    ) : operators.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                        No bus operators found. Please contact support.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {operators.map((op) => (
                          <button
                            key={op.id}
                            onClick={() => setForm({ ...form, operator_id: op.id, operator_name: op.name })}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                              form.operator_id === op.id
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Bus className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900">{op.name}</p>
                              {op.contact_phone && <p className="text-xs text-gray-500">{op.contact_phone}</p>}
                            </div>
                            {form.operator_id === op.id && (
                              <CheckCircle className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700"
                  disabled={!canProceedRoute}
                  onClick={() => setStep("details")}
                >
                  Next: Package Details <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Step 2: Package Details */}
            {step === "details" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 text-sm">Describe your package</h3>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-10 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <SelectValue placeholder="Select category" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {/* Size */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Package Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    {sizeOptions.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setForm({ ...form, size: s.value })}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          form.size === s.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`text-base font-black mb-0.5 ${form.size === s.value ? 'text-indigo-600' : 'text-gray-400'}`}>{s.icon}</div>
                        <p className="font-semibold text-xs text-gray-800">{s.label}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Weight (kg)</label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      type="number" step="0.1" min="0.1" placeholder="e.g. 2.5"
                      value={form.weight_kg}
                      onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                </div>

                {form.weight_kg && parseFloat(form.weight_kg) > 0 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-indigo-900">Estimated Price</p>
                      <p className="text-xs text-indigo-500">ZMW {BASE_FEE} base + ZMW {RATE_PER_KG}/kg × {form.weight_kg}kg</p>
                    </div>
                    <span className="text-xl font-black text-indigo-700">ZMW {estimatedPrice.toFixed(0)}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Contents Description</label>
                  <Textarea
                    placeholder="Describe what's inside the package..."
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="text-sm resize-none"
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded w-4 h-4 accent-indigo-600"
                    checked={form.insurance}
                    onChange={(e) => setForm({ ...form, insurance: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">
                    Add insurance <span className="text-gray-400">(+10% = ZMW {(estimatedPrice * 0.1).toFixed(0)})</span>
                  </span>
                </label>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("route")}>Back</Button>
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    disabled={!canProceedDetails}
                    onClick={() => setStep("recipient")}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Recipient */}
            {step === "recipient" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 text-sm">Recipient details</h3>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      placeholder="Recipient's full name"
                      value={form.recipient_name}
                      onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      type="tel" placeholder="+260..."
                      value={form.recipient_phone}
                      onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })}
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Email (optional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      type="email" placeholder="recipient@email.com"
                      value={form.recipient_email}
                      onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Special Instructions (optional)</label>
                  <Textarea
                    placeholder="Fragile, keep upright, call before delivery..."
                    rows={2}
                    value={form.special_instructions}
                    onChange={(e) => setForm({ ...form, special_instructions: e.target.value })}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("details")}>Back</Button>
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    disabled={!canProceedRecipient}
                    onClick={() => setStep("confirm")}
                  >
                    Review <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === "confirm" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 text-sm">Review your shipment</h3>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Route</span>
                      <span className="font-semibold">{form.from_city} → {form.to_city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5"><Bus className="h-3.5 w-3.5" />Operator</span>
                      <span className="font-semibold">{form.operator_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Date</span>
                      <span className="font-semibold">{form.travel_date}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category</span>
                      <span className="font-semibold">{form.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Size / Weight</span>
                      <span className="font-semibold">{form.size} · {form.weight_kg}kg</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Recipient</span>
                      <span className="font-semibold">{form.recipient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-semibold">{form.recipient_phone}</span>
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-700">
                      <span>Package fee</span>
                      <span>ZMW {estimatedPrice.toFixed(0)}</span>
                    </div>
                    {form.insurance && (
                      <div className="flex justify-between text-gray-700">
                        <span>Insurance</span>
                        <span>ZMW {insuranceCost.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-indigo-900 border-t border-indigo-200 pt-2">
                      <span>Total</span>
                      <span className="text-lg">ZMW {totalPrice.toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("recipient")}>Back</Button>
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-semibold"
                    onClick={handleSubmit}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Shipment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default PackageDelivery;
