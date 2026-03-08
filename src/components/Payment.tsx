
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Smartphone, CheckCircle } from "lucide-react";
import { formatZMW } from "@/utils/pricingUtils";

interface PaymentProps {
  bookingData: any;
  from?: string;
  to?: string;
  onBack: () => void;
  onComplete: (paymentData?: any) => void;
}

const Payment = ({ bookingData, from, to, onBack, onComplete }: PaymentProps) => {
  const [paymentMethod, setPaymentMethod] = useState("mobile");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setProcessing(false);
    
    // Call onComplete with payment data
    onComplete({
      success: true,
      method: paymentMethod,
      reference: `PAY_${Date.now()}`,
      phoneNumber: phoneNumber
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-3 p-4 border rounded-lg">
                <RadioGroupItem value="mobile" id="mobile" />
                <Label htmlFor="mobile" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Mobile Money</p>
                    <p className="text-sm text-gray-600">Pay with Airtel Money or MTN Mobile Money</p>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-4 border rounded-lg opacity-50">
                <RadioGroupItem value="card" id="card" disabled />
                <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-400">Credit/Debit Card</p>
                    <p className="text-sm text-gray-400">Coming soon</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {paymentMethod === "mobile" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Mobile Money Phone Number</Label>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+260 XXX XXXXXX"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Enter your Airtel Money or MTN Mobile Money number
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={onBack} className="flex-1">
                Back to Details
              </Button>
              <Button 
                onClick={handlePayment}
                disabled={!phoneNumber || processing}
                className="flex-1 african-gradient"
              >
                {processing ? "Processing..." : `Pay ${formatZMW(bookingData.totalPrice)}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Final Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Route</p>
              <p className="text-sm text-gray-600">
                {from && to 
                  ? `${from} → ${to}` 
                  : bookingData?.route || (bookingData?.from && bookingData?.to 
                    ? `${bookingData.from} → ${bookingData.to}` 
                    : "Route information not available")}
              </p>
            </div>
            
            <div>
              <p className="font-medium">Passengers</p>
              <div className="space-y-1">
                {bookingData.passengers.map((passenger: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{passenger.firstName} {passenger.lastName}</span>
                    <Badge variant="outline" className="text-xs">{passenger.seatNumber}</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t space-y-2">
              {bookingData.baggageWeightKg > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Baggage Weight</span>
                  <span>{bookingData.baggageWeightKg}kg</span>
                </div>
              )}
              {bookingData.luggage > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Extra Bags</span>
                  <span>{bookingData.luggage}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-bold pt-2 border-t">
                <span>Total Amount</span>
                <span className="text-xl text-primary">{formatZMW(bookingData.totalPrice)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
