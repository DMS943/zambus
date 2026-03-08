import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Phone, Mail, Clock, CheckCircle, AlertCircle, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const Support = () => {
  const { user } = useAuth();
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    message: "",
    priority: "medium",
    category: "general"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTicketId, setSearchTicketId] = useState("");
  const [userTickets, setUserTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [searchedTicket, setSearchedTicket] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserTickets();
    }
  }, [user]);

  const fetchUserTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      // Check if table exists by trying to query it with a timeout
      const queryPromise = supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      );
      
      const result = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as { data: any; error: any };
      
      const { data, error } = result;

      if (error) {
        // If table doesn't exist, just set empty array
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('support_tickets table does not exist yet');
          setUserTickets([]);
          return;
        }
        throw error;
      }
      setUserTickets(data || []);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      // Don't show error to user, just set empty array
      setUserTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSearchTicket = async () => {
    if (!searchTicketId.trim()) return;
    setLoadingTickets(true);
    try {
      const queryPromise = supabase
        .from('support_tickets')
        .select('*')
        .eq('ticket_id', searchTicketId.trim())
        .maybeSingle();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      );
      
      const result = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as { data: any; error: any };
      
      const { data, error } = result;

      if (error) {
        // If table doesn't exist, show helpful message
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          toast({
            title: "Table Not Set Up",
            description: "Please run the database migration first (ADD_CONTACT_AND_SUPPORT_TABLES.sql)",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }
      
      if (data) {
        setSearchedTicket(data);
      } else {
        toast({
          title: "Ticket Not Found",
          description: "No ticket found with that ID",
          variant: "destructive"
        });
        setSearchedTicket(null);
      }
    } catch (error: any) {
      console.error('Error searching ticket:', error);
      toast({
        title: "Error",
        description: error.message?.includes('timeout') 
          ? "Request timed out. Please check your connection."
          : "Failed to search ticket",
        variant: "destructive"
      });
    } finally {
      setLoadingTickets(false);
    }
  };

  const faqs = [
    {
      question: "How do I cancel my booking?",
      answer: "You can cancel your booking up to 2 hours before departure by contacting our support team or through your booking confirmation email."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept Mobile Money (MTN, Airtel), bank transfers, and cash payments at select locations."
    },
    {
      question: "Can I change my travel date?",
      answer: "Yes, you can change your travel date subject to availability. A small change fee may apply depending on the fare type."
    },
    {
      question: "What should I do if I lose my ticket?",
      answer: "Don't worry! You can show your booking reference number and ID to the conductor, or contact support for assistance."
    },
    {
      question: "How early should I arrive at the bus station?",
      answer: "We recommend arriving at least 30 minutes before departure time to allow for boarding and luggage handling."
    },
    {
      question: "What items are not allowed on the bus?",
      answer: "Prohibited items include flammable substances, weapons, illegal drugs, and items that may disturb other passengers."
    }
  ];

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { user } = await supabase.auth.getUser();
      const ticketId = `TICKET-${Date.now()}`;
      
      const ticketData = {
        ticket_id: ticketId,
        subject: ticketForm.subject,
        message: ticketForm.message,
        category: ticketForm.category,
        priority: ticketForm.priority,
        user_id: user?.data?.user?.id || null
      };

      const { error } = await supabase
        .from('support_tickets')
        .insert(ticketData);

      if (error) {
        // If table doesn't exist, show helpful message
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          toast({
            title: "Database Table Not Set Up",
            description: "Please run ADD_CONTACT_AND_SUPPORT_TABLES.sql in Supabase SQL Editor first.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }
      
      toast({
        title: "Ticket Submitted",
        description: `Your support ticket ${ticketId} has been created. We'll respond within 24 hours.`,
      });

      setTicketForm({
        subject: "",
        message: "",
        priority: "medium",
        category: "general"
      });

      // Refresh tickets list
      if (user) {
        fetchUserTickets();
      }

    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({
        title: "Error",
        description: "Failed to submit support ticket. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
    <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">Customer Support</h1>

      <Tabs defaultValue="contact" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contact">Contact Us</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="ticket">Submit Ticket</TabsTrigger>
          <TabsTrigger value="status">Ticket Status</TabsTrigger>
        </TabsList>

        <TabsContent value="contact" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Phone Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">+260 97 123 4567</p>
                  <p className="text-sm text-muted-foreground">Mon-Sun: 6:00 AM - 10:00 PM</p>
                  <Badge className="bg-green-100 text-green-800">Available Now</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">support@busticket.zm</p>
                  <p className="text-sm text-muted-foreground">Response within 24 hours</p>
                  <Badge variant="outline">Email</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Get instant help from our team</p>
                  <Button className="w-full">
                    Start Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Operating Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Support Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Phone & Live Chat</h4>
                  <ul className="space-y-1 text-sm">
                    <li>Monday - Friday: 6:00 AM - 10:00 PM</li>
                    <li>Saturday - Sunday: 7:00 AM - 9:00 PM</li>
                    <li>Public Holidays: 8:00 AM - 6:00 PM</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Email Support</h4>
                  <ul className="space-y-1 text-sm">
                    <li>Available 24/7</li>
                    <li>Response within 24 hours</li>
                    <li>Priority support for urgent issues</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <h3 className="font-medium mb-2 flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 mt-0.5 text-blue-500" />
                      {faq.question}
                    </h3>
                    <p className="text-sm text-muted-foreground ml-6">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ticket" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Support Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select 
                      className="w-full border rounded-md p-2"
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})}
                    >
                      <option value="general">General Inquiry</option>
                      <option value="booking">Booking Issue</option>
                      <option value="payment">Payment Problem</option>
                      <option value="technical">Technical Issue</option>
                      <option value="complaint">Complaint</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Priority</label>
                    <select 
                      className="w-full border rounded-md p-2"
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value})}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Subject</label>
                  <Input
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <Textarea
                    value={ticketForm.message}
                    onChange={(e) => setTicketForm({...ticketForm, message: e.target.value})}
                    placeholder="Please provide detailed information about your issue"
                    rows={6}
                    required
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Check Ticket Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input 
                  placeholder="Enter your ticket ID (e.g., TICKET-1234567890)" 
                  value={searchTicketId}
                  onChange={(e) => setSearchTicketId(e.target.value)}
                />
                <Button 
                  className="w-full" 
                  onClick={handleSearchTicket}
                  disabled={loadingTickets || !searchTicketId.trim()}
                >
                  {loadingTickets ? "Searching..." : "Check Status"}
                </Button>
              </div>

              {/* Searched Ticket Result */}
              {searchedTicket && (
                <div className="mt-6 p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{searchedTicket.ticket_id}</p>
                      <p className="text-sm text-muted-foreground">{searchedTicket.subject}</p>
                    </div>
                    <Badge className={
                      searchedTicket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      searchedTicket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      searchedTicket.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {searchedTicket.status === 'resolved' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                       searchedTicket.status === 'in_progress' ? <AlertCircle className="h-3 w-3 mr-1" /> :
                       <Clock className="h-3 w-3 mr-1" />}
                      {searchedTicket.status.charAt(0).toUpperCase() + searchedTicket.status.slice(1).replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{searchedTicket.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created: {new Date(searchedTicket.created_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* User's Recent Tickets */}
              {user && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-medium">Your Recent Tickets</h3>
                  {loadingTickets ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : userTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tickets yet</p>
                  ) : (
                    <div className="space-y-3">
                      {userTickets.map((ticket) => (
                        <div key={ticket.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <p className="font-medium">{ticket.ticket_id}</p>
                            <p className="text-sm text-muted-foreground">{ticket.subject}</p>
                          </div>
                          <Badge className={
                            ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {ticket.status === 'resolved' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                             ticket.status === 'in_progress' ? <AlertCircle className="h-3 w-3 mr-1" /> :
                             <Clock className="h-3 w-3 mr-1" />}
                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Support;