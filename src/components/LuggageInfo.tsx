
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Luggage, Package, AlertCircle } from "lucide-react";

const LuggageInfo = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Luggage className="h-5 w-5" />
          Luggage Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Free Allowance</h4>
                <p className="text-sm text-gray-600">1 bag up to 20kg included</p>
                <Badge variant="secondary" className="mt-1">Free</Badge>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Luggage className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Additional Baggage</h4>
                <p className="text-sm text-gray-600">By weight: K5 per kg over 20kg</p>
                <p className="text-sm text-gray-600">By bags: ZMW 50 per extra bag</p>
                <Badge variant="outline" className="mt-1">Up to 20kg each bag</Badge>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-amber-800">Important Notes</h5>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    <li>• Maximum 3 bags per passenger</li>
                    <li>• Fragile items at own risk</li>
                    <li>• No liquids over 100ml</li>
                    <li>• Valuables in carry-on only</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Prohibited Items</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
            <span>• Flammable items</span>
            <span>• Sharp objects</span>
            <span>• Live animals</span>
            <span>• Perishable food</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LuggageInfo;
