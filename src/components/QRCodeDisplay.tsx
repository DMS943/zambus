import { QrCode, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  qrData: string;
  bookingRef: string;
  bookingData?: {
    origin?: string;
    destination?: string;
    date?: string;
    time?: string;
    passengerName?: string;
    seatNumber?: string;
    price?: number;
  };
}

const QRCodeDisplay = ({ qrData, bookingRef, bookingData }: QRCodeDisplayProps) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownloadQR = async () => {
    try {
      const svgElement = qrRef.current?.querySelector('svg');
      if (!svgElement) {
        toast.error('QR code not found');
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.download = `zambus-qr-${bookingRef}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(url);
            toast.success('QR code downloaded!');
          }
        });
      };

      img.src = url;
    } catch (error) {
      console.error('Error downloading QR:', error);
      toast.error('Failed to download QR code');
    }
  };

  const handleDownloadTicket = () => {
    toast.info('PDF download is not available in this environment. Please use the QR download instead.');
  };

  return (
    <Card className="max-w-sm mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <QrCode className="h-5 w-5" />
          Verification QR Code
        </CardTitle>
        <p className="text-sm text-gray-600">Scan to verify ticket</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="bg-white p-4 border-2 border-gray-300 rounded-lg" ref={qrRef}>
          <QRCodeSVG
            value={qrData}
            size={192}
            level="H"
            includeMargin={true}
            fgColor="#000000"
            bgColor="#FFFFFF"
          />
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 font-mono">Booking: {bookingRef}</p>
          <p className="text-xs text-gray-500 mt-1">
            Present this QR code at boarding
          </p>
        </div>
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadQR}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download QR
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTicket}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;
