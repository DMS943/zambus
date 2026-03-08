import { QrCode, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";

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
      // Get the QR code SVG element
      const svgElement = qrRef.current?.querySelector('svg');
      if (!svgElement) {
        toast.error('QR code not found');
        return;
      }

      // Convert SVG to image
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
    try {
      toast.info('Generating PDF...');
      
      // Get QR code as image first
      const svgElement = qrRef.current?.querySelector('svg');
      if (!svgElement) {
        toast.error('QR code not found');
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const margin = 15;
          let yPos = margin;

          // Header
          pdf.setFontSize(24);
          pdf.setTextColor(30, 64, 175);
          pdf.setFont('helvetica', 'bold');
          pdf.text('ZamBus', pageWidth / 2, yPos, { align: 'center' });
          yPos += 8;

          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          pdf.setFont('helvetica', 'normal');
          pdf.text('Zambian Bus Ticketing System', pageWidth / 2, yPos, { align: 'center' });
          yPos += 15;

          // Booking Reference
          pdf.setFontSize(16);
          pdf.setTextColor(30, 64, 175);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Booking Reference: ${bookingRef}`, pageWidth / 2, yPos, { align: 'center' });
          yPos += 15;

          // Ticket Information
          pdf.setFontSize(10);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'normal');

          const infoItems = [
            { label: 'From', value: bookingData?.origin || 'N/A' },
            { label: 'To', value: bookingData?.destination || 'N/A' },
            { label: 'Date', value: bookingData?.date || 'N/A' },
            { label: 'Departure Time', value: bookingData?.time || 'N/A' },
            { label: 'Passenger', value: bookingData?.passengerName || 'N/A' },
            { label: 'Seat Number', value: bookingData?.seatNumber || 'N/A' },
          ];

          // Draw info boxes
          const boxWidth = (pageWidth - margin * 2 - 10) / 2;
          const boxHeight = 12;
          let xPos = margin;

          infoItems.forEach((item, index) => {
            if (index > 0 && index % 2 === 0) {
              xPos = margin;
              yPos += boxHeight + 5;
            }

            // Box background
            pdf.setFillColor(243, 244, 246);
            pdf.rect(xPos, yPos - 8, boxWidth, boxHeight, 'F');

            // Label
            pdf.setFontSize(8);
            pdf.setTextColor(107, 114, 128);
            pdf.text(item.label, xPos + 3, yPos - 3);

            // Value
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            const valueText = pdf.splitTextToSize(item.value, boxWidth - 6);
            pdf.text(valueText, xPos + 3, yPos + 3);

            xPos += boxWidth + 10;
          });

          yPos += boxHeight + 10;

          // Price
          if (bookingData?.price) {
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(`Total: K${bookingData.price}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 15;
          }

          // QR Code Section
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Verification QR Code', pageWidth / 2, yPos, { align: 'center' });
          yPos += 10;

          // Convert SVG to canvas then to image
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const imgData = canvas.toDataURL('image/png');
            const qrSize = 50; // mm
            const qrX = (pageWidth - qrSize) / 2;
            const qrY = yPos;

            // Add border around QR code
            pdf.setDrawColor(30, 64, 175);
            pdf.setLineWidth(0.5);
            pdf.rect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4);

            // Add QR code image
            pdf.addImage(imgData, 'PNG', qrX, qrY, qrSize, qrSize);

            yPos += qrSize + 12;

            // Footer
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(107, 114, 128);
            pdf.text('Scan this QR code at boarding for verification', pageWidth / 2, yPos, { align: 'center' });
            yPos += 6;

            pdf.setFontSize(7);
            pdf.text('Important: Please arrive 30 minutes before departure time.', pageWidth / 2, yPos, { align: 'center' });
            yPos += 4;
            pdf.text('Bring a valid ID for verification. Keep this ticket safe.', pageWidth / 2, yPos, { align: 'center' });
            yPos += 4;
            pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });

            // Save PDF
            pdf.save(`zambus-ticket-${bookingRef}.pdf`);
            URL.revokeObjectURL(svgUrl);
            toast.success('Ticket downloaded as PDF!');
          }
        } catch (error) {
          console.error('Error generating PDF:', error);
          toast.error('Failed to generate PDF');
          URL.revokeObjectURL(svgUrl);
        }
      };

      img.onerror = () => {
        toast.error('Failed to load QR code image');
        URL.revokeObjectURL(svgUrl);
      };

      img.src = svgUrl;
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
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
