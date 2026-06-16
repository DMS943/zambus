import { useState } from "react";
import { Search, Package, MapPin, Calendar, Phone, Mail, AlertCircle, CheckCircle } from "lucide-react";
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

const LostAndFound = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"report" | "search">("search");
  const [formData, setFormData] = useState({
    item_name: "",
    category: "",
    description: "",
    location: "",
    date_lost: "",
    contact_phone: "",
    contact_email: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [foundItems, setFoundItems] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const categories = [
    "Electronics",
    "Clothing",
    "Documents",
    "Baggage/Luggage",
    "Accessories",
    "Other"
  ];

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const reportData = {
        item_name: formData.item_name,
        category: formData.category,
        description: formData.description,
        location: formData.location,
        date_lost: formData.date_lost,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        user_id: user?.id || null,
        status: 'lost'
      };

      const { error } = await supabase
        .from('lost_and_found')
        .insert(reportData);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          toast.error("Database table not set up. Please run the lost and found migration in Supabase.");
          return;
        }
        throw error;
      }

      toast.success("Lost item reported successfully! We'll help you find it.");
      
      setFormData({
        item_name: "",
        category: "",
        description: "",
        location: "",
        date_lost: "",
        contact_phone: "",
        contact_email: ""
      });
    } catch (error) {
      console.error('Error reporting lost item:', error);
      toast.error("Failed to report lost item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      let query = supabase
        .from('lost_and_found')
        .select('*')
        .eq('status', 'found');

      if (searchQuery) {
        query = query.or(`item_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          toast.error("Database table not set up. Please run the lost and found migration in Supabase.");
          setFoundItems([]);
          return;
        }
        throw error;
      }

      setFoundItems(data || []);
    } catch (error) {
      console.error('Error searching found items:', error);
      toast.error("Failed to search. Please try again.");
      setFoundItems([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lost & Found</h1>
          <p className="text-gray-600">Report lost items or search for found items</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "search" ? "default" : "outline"}
            onClick={() => setActiveTab("search")}
            className="flex-1"
          >
            <Search className="h-4 w-4 mr-2" />
            Search Found Items
          </Button>
          <Button
            variant={activeTab === "report" ? "default" : "outline"}
            onClick={() => setActiveTab("report")}
            className="flex-1"
          >
            <Package className="h-4 w-4 mr-2" />
            Report Lost Item
          </Button>
        </div>

        {activeTab === "search" && (
          <div className="space-y-4">
            {/* Search Box */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by item name, category, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Found Items List */}
            <div className="space-y-3">
              {foundItems.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">
                      {searchQuery ? "No found items match your search." : "Enter a search term to find items."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                foundItems.map((item) => (
                  <Card key={item.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{item.item_name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {item.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {item.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(item.date_found || item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                            <Button size="sm" variant="outline" className="text-xs">
                              <Phone className="h-3 w-3 mr-1" />
                              Contact
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs">
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "report" && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Fill in the details below to report your lost item. We'll help you locate it.
                  </p>
                </div>

                <Input
                  placeholder="Item name (e.g., Black Backpack)"
                  required
                  className="h-10"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                />

                <Select
                  required
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Describe the item (color, size, distinctive features...)"
                  rows={3}
                  required
                  className="resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />

                <Input
                  placeholder="Location where item was lost (e.g., Lusaka Station)"
                  required
                  className="h-10"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />

                <Input
                  type="date"
                  required
                  className="h-10"
                  value={formData.date_lost}
                  onChange={(e) => setFormData({ ...formData, date_lost: e.target.value })}
                />

                <Input
                  type="tel"
                  placeholder="Contact phone number"
                  required
                  className="h-10"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />

                <Input
                  type="email"
                  placeholder="Contact email"
                  required
                  className="h-10"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
                  disabled={isSubmitting}
                >
                  <Package className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Submitting..." : "Report Lost Item"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default LostAndFound;
