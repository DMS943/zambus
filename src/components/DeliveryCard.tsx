import { Truck, MapPin, Calendar, Clock, Package, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface DeliveryTracking {
  id: string;
  packageName: string;
  from: string;
  to: string;
  status: "pending" | "pickup_ready" | "in_transit" | "delivered" | "completed";
  estimatedDelivery: Date;
  price: number;
  driver?: string;
  driverPhone?: string;
  pickupDate: Date;
  createdAt: Date;
}

interface DeliveryCardProps {
  delivery: DeliveryTracking;
  onTrack?: (deliveryId: string) => void;
  onCancel?: (deliveryId: string) => void;
}

const statusConfig = {
  pending: {
    label: "Pending Pickup",
    color: "bg-yellow-50 text-yellow-700",
    icon: AlertCircle,
    progress: 25,
  },
  pickup_ready: {
    label: "Ready for Pickup",
    color: "bg-blue-50 text-blue-700",
    icon: Package,
    progress: 50,
  },
  in_transit: {
    label: "In Transit",
    color: "bg-purple-50 text-purple-700",
    icon: Truck,
    progress: 75,
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-50 text-green-700",
    icon: CheckCircle,
    progress: 100,
  },
  completed: {
    label: "Completed",
    color: "bg-gray-50 text-gray-700",
    icon: CheckCircle,
    progress: 100,
  },
};

export default function DeliveryCard({
  delivery,
  onTrack,
  onCancel,
}: DeliveryCardProps) {
  const config = statusConfig[delivery.status];
  const StatusIcon = config.icon;

  return (
    <Card className="modern-card overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {delivery.packageName}
            </h3>
            <p className="text-sm text-gray-600">Delivery ID: {delivery.id.slice(0, 8)}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {config.label}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all"
              style={{ width: `${config.progress}%` }}
            />
          </div>
        </div>

        {/* Route Info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-2 flex-1">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600">From</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{delivery.from}</p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-600">To</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{delivery.to}</p>
            </div>
          </div>
        </div>

        {/* Timing & Price */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div className="min-w-0">
              <p className="text-xs text-gray-600">Delivery</p>
              <p className="text-xs font-semibold text-gray-900 truncate">
                {formatDistanceToNow(delivery.estimatedDelivery, { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div className="min-w-0">
              <p className="text-xs text-gray-600">Cost</p>
              <p className="text-xs font-semibold text-gray-900">K{delivery.price}</p>
            </div>
          </div>
        </div>

        {/* Driver Info */}
        {delivery.driver && (
          <div className="bg-teal-50 rounded-lg p-3 mb-4 border border-teal-200">
            <p className="text-xs text-teal-700 font-medium mb-1">Driver</p>
            <p className="text-sm font-semibold text-teal-900">{delivery.driver}</p>
            {delivery.driverPhone && (
              <p className="text-xs text-teal-700 mt-1">{delivery.driverPhone}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {delivery.status !== "completed" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onTrack?.(delivery.id)}
            >
              Track
            </Button>
          )}
          {(delivery.status === "pending" || delivery.status === "pickup_ready") && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs text-destructive hover:text-destructive"
              onClick={() => onCancel?.(delivery.id)}
            >
              Cancel
            </Button>
          )}
          {delivery.status === "completed" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              disabled
            >
              Completed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
