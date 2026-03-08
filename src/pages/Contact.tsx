
import { useState } from "react";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Contact = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const contactData = {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        user_id: user?.id || null
      };

      const { error } = await supabase
        .from('contact_messages')
        .insert(contactData);

      if (error) {
        // If table doesn't exist, show helpful message
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          toast.error("Database table not set up. Please run ADD_CONTACT_AND_SUPPORT_TABLES.sql in Supabase.");
          return;
        }
        throw error;
      }

      toast.success("Message sent successfully! We'll get back to you soon.");
      
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: ""
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Support</h1>
          <p className="text-gray-600">We're here to help with your journey</p>
        </div>

        {/* Contact Methods Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-blue-100 p-2.5 rounded-lg mb-2.5">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-xs font-medium text-gray-700 mb-1">Phone</p>
                <p className="text-xs text-gray-600">+260 97 123 4567</p>
                  </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 p-2.5 rounded-lg mb-2.5">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-xs font-medium text-gray-700 mb-1">Email</p>
                <p className="text-xs text-gray-600">support@zambus.co.zm</p>
                  </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-purple-100 p-2.5 rounded-lg mb-2.5">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-xs font-medium text-gray-700 mb-1">Office</p>
                <p className="text-xs text-gray-600">Cairo Road, Lusaka</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 p-2.5 rounded-lg mb-2.5">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-xs font-medium text-gray-700 mb-1">WhatsApp</p>
                <p className="text-xs text-gray-600">+260 97 765 4321</p>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Send us a message */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Send us a message</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input 
                  placeholder="Your full name" 
                  required 
                  className="h-10"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input 
                  type="email" 
                  placeholder="your.email@example.com" 
                  required 
                  className="h-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Select 
                  required
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking">Booking Inquiry</SelectItem>
                    <SelectItem value="payment">Payment Issue</SelectItem>
                    <SelectItem value="cancellation">Cancellation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                  <Textarea 
                  placeholder="Tell us how we can help you..."
                  rows={4}
                    required
                  className="resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
                  disabled={isSubmitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
      </div>

        {/* Quick Answers */}
            <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Answers</h2>
          <div className="space-y-2.5">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3.5">
                <h4 className="font-semibold text-gray-900 text-sm mb-1.5">How do I cancel a booking?</h4>
                <p className="text-xs text-gray-600">You can cancel up to 24 hours before departure.</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3.5">
                <h4 className="font-semibold text-gray-900 text-sm mb-1.5">What payment methods do you accept?</h4>
                <p className="text-xs text-gray-600">We accept Mobile Money, Visa, and MasterCard.</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3.5">
                <h4 className="font-semibold text-gray-900 text-sm mb-1.5">Can I change my travel date?</h4>
                <p className="text-xs text-gray-600">Yes, date changes are allowed with a small fee.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Contact;
