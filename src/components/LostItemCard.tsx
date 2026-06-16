import { Heart, MapPin, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface LostItem {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  route?: string;
  postDate: Date;
  status: "lost" | "found" | "claimed";
  rewardAmount?: number;
  contactInfo?: string;
}

interface LostItemCardProps {
  item: LostItem;
  onClaim?: (itemId: string) => void;
  onContact?: (itemId: string) => void;
}

const categoryColors: Record<string, string> = {
  baggage: "bg-blue-100 text-blue-800",
  documents: "bg-red-100 text-red-800",
  electronics: "bg-purple-100 text-purple-800",
  jewelry: "bg-yellow-100 text-yellow-800",
  clothing: "bg-green-100 text-green-800",
  other: "bg-gray-100 text-gray-800",
};

const statusBadges: Record<string, string> = {
  lost: "status-badge-pending",
  found: "status-badge-success",
  claimed: "status-badge-claimed",
};

export default function LostItemCard({
  item,
  onClaim,
  onContact,
}: LostItemCardProps) {
  return (
    <Card className="modern-card overflow-hidden">
      <div className="relative">
        {/* Item Image */}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <AlertCircle className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`${statusBadges[item.status]}`}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </span>
        </div>

        {/* Reward Badge */}
        {item.rewardAmount && (
          <div className="absolute top-3 left-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            K{item.rewardAmount} Reward
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Category */}
        <div className="mb-3">
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${categoryColors[item.category] || categoryColors.other}`}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {item.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {item.description}
        </p>

        {/* Info Grid */}
        <div className="space-y-2 mb-4 text-xs text-gray-600">
          {item.route && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              <span>{item.route}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <span>{formatDistanceToNow(item.postDate, { addSuffix: true })}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {item.status !== "claimed" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => onClaim?.(item.id)}
              >
                Claim Item
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                onClick={() => onContact?.(item.id)}
              >
                Contact
              </Button>
            </>
          )}
          {item.status === "claimed" && (
            <Button
              disabled
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              Item Claimed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
