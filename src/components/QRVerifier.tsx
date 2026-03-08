
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Scan } from "lucide-react";
import { verifyQRData } from "@/utils/qrUtils";

const QRVerifier = () => {
  const [qrInput, setQrInput] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    
    // Simulate scanning delay
    setTimeout(() => {
      try {
        const data = JSON.parse(qrInput);
        const isValid = verifyQRData(qrInput);
        
        setVerificationResult({
          isValid,
          data: isValid ? data : null
        });
      } catch {
        setVerificationResult({
          isValid: false,
          data: null
        });
      }
      setIsVerifying(false);
    }, 1000);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Ticket Verifier
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Paste QR Code Data:
          </label>
          <Input
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="Paste scanned QR data here..."
            className="mb-3"
          />
          <Button 
            onClick={handleVerify} 
            disabled={!qrInput || isVerifying}
            className="w-full"
          >
            {isVerifying ? "Verifying..." : "Verify Ticket"}
          </Button>
        </div>

        {verificationResult && (
          <div className={`p-4 rounded-lg ${
            verificationResult.isValid 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {verificationResult.isValid ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Badge className="bg-green-100 text-green-800">Valid Ticket</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <Badge className="bg-red-100 text-red-800">Invalid Ticket</Badge>
                </>
              )}
            </div>
            
            {verificationResult.isValid && verificationResult.data && (
              <div className="space-y-2 text-sm">
                <p><strong>Booking Ref:</strong> {verificationResult.data.bookingRef}</p>
                <p><strong>Passenger:</strong> {verificationResult.data.passengerName}</p>
                <p><strong>Route:</strong> {verificationResult.data.route}</p>
                <p><strong>Date:</strong> {verificationResult.data.date}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRVerifier;
