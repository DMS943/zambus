import { useState } from "react";
import { Heart, Plus, Search, Filter, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import LostItemCard from "@/components/LostItemCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

// Mock data - in production, this would come from Supabase
const mockItems = [
  {
    id: "1",
    title: "Blue Laptop Backpack",
    description: "Blue North Face backpack with laptop compartment and rain cover",
    category: "baggage",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop",
    route: "Lusaka - Ndola",
    postDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: "lost" as const,
    rewardAmount: 500,
    contactInfo: "John +260 965 123456",
  },
  {
    id: "2",
    title: "iPhone 13 Pro",
    description: "Space gray iPhone with case, found on bus ZM-2045",
    category: "electronics",
    imageUrl: "https://images.unsplash.com/photo-1592286927505-1def25115558?w=400&h=300&fit=crop",
    route: "Kitwe - Livingstone",
    postDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: "found" as const,
    contactInfo: "Sarah +260 977 654321",
  },
  {
    id: "3",
    title: "Brown Leather Wallet",
    description: "Leather wallet with ZM ID and bank cards",
    category: "documents",
    imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=300&fit=crop",
    route: "Chirundu - Lusaka",
    postDate: new Date(Date.now() - 5 * 60 * 60 * 1000),
    status: "claimed" as const,
    rewardAmount: 300,
    contactInfo: "Mike +260 955 789012",
  },
  {
    id: "4",
    title: "Gold Wedding Ring",
    description: "Gold wedding ring with initials engraved inside",
    category: "jewelry",
    postDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
    status: "lost" as const,
    rewardAmount: 1000,
    contactInfo: "Grace +260 966 111222",
  },
  {
    id: "5",
    title: "Black Jacket",
    description: "Formal black jacket, size medium, left on seat",
    category: "clothing",
    imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=400&h=300&fit=crop",
    route: "Lusaka - Kabwe",
    postDate: new Date(Date.now() - 4 * 60 * 60 * 1000),
    status: "found" as const,
    contactInfo: "David +260 978 333444",
  },
];

export default function LostAndFound() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showPostForm, setShowPostForm] = useState(false);

  const categories = [
    "all",
    "baggage",
    "documents",
    "electronics",
    "jewelry",
    "clothing",
    "other",
  ];

  const statuses = ["all", "lost", "found", "claimed"];

  const filteredItems = mockItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleClaim = (itemId: string) => {
    if (!isAuthenticated) {
      alert("Please sign in to claim items");
      return;
    }
    alert(`Claim request sent for item ${itemId}. You'll be notified when the owner responds.`);
  };

  const handleContact = (itemId: string) => {
    if (!isAuthenticated) {
      alert("Please sign in to contact owners");
      return;
    }
    alert(`Opening contact form for item ${itemId}`);
  };

  const handlePostItem = () => {
    if (!isAuthenticated) {
      alert("Please sign in to post items");
      return;
    }
    setShowPostForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />

      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Heart className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lost & Found</h1>
              <p className="text-gray-600">Report lost items or help reunite belongings with their owners</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handlePostItem}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Post Item
            </Button>
            <Button variant="outline" size="lg">
              View My Posts
            </Button>
          </div>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="bg-white border-b border-gray-200 px-4 py-6 sticky top-14 md:top-0 z-30">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items, routes, descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedStatus === status
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Items Grid */}
      <section className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {filteredItems.length === 0 ? (
            <Card className="modern-card text-center py-12">
              <CardContent>
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No items found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Found <span className="font-semibold">{filteredItems.length}</span> item{filteredItems.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <LostItemCard
                    key={item.id}
                    item={item}
                    onClaim={handleClaim}
                    onContact={handleContact}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Post Item Form Modal */}
      {showPostForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="modern-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Post a Lost or Found Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-sm">Form coming soon - connect to database to enable item posting</p>
              <Button
                variant="outline"
                onClick={() => setShowPostForm(false)}
                className="w-full"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
