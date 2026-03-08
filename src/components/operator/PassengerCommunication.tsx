import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Send, Users, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PassengerCommunicationProps {
  operatorId: string;
}

export const PassengerCommunication = ({ operatorId }: PassengerCommunicationProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messageType, setMessageType] = useState<'sms' | 'email' | 'both'>('both');
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Fetch message history
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['bulk-messages', operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bulk_messages')
        .select('*')
        .eq('operator_id', operatorId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Get recipient count
  const { data: recipientCount = 0 } = useQuery({
    queryKey: ['recipient-count', operatorId, recipientFilter, selectedDate],
    queryFn: async () => {
      // Get buses for this operator
      const { data: buses } = await supabase
        .from('buses')
        .select('id')
        .eq('operator_id', operatorId);

      if (!buses || buses.length === 0) return 0;

      // Get schedules
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id')
        .in('bus_id', buses.map(b => b.id));

      if (!schedules || schedules.length === 0) return 0;

      // Build query based on filter
      let query = supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('schedule_id', schedules.map(s => s.id))
        .in('status', ['confirmed', 'pending']);

      if (recipientFilter === 'today') {
        query = query.eq('booking_date', new Date().toISOString().split('T')[0]);
      } else if (recipientFilter === 'upcoming') {
        query = query.gte('booking_date', new Date().toISOString().split('T')[0]);
      } else if (recipientFilter === 'specific_date' && selectedDate) {
        query = query.eq('booking_date', selectedDate);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const { error } = await supabase
        .from('bulk_messages')
        .insert({
          operator_id: operatorId,
          sent_by: user?.id,
          message_type: messageData.message_type,
          subject: messageData.subject,
          message: messageData.message,
          recipient_filter: messageData.recipient_filter,
          total_recipients: recipientCount,
          status: 'draft', // In production, this would trigger a background job
        });

      if (error) throw error;

      // In production, you would call an Edge Function here to actually send the messages
      // For now, we just save the record
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-messages'] });
      toast({
        title: 'Message Queued',
        description: `Message will be sent to ${recipientCount} recipients`,
      });
      setSubject('');
      setMessage('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Message cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    if (messageType === 'email' && !subject.trim()) {
      toast({
        title: 'Error',
        description: 'Email subject is required',
        variant: 'destructive',
      });
      return;
    }

    if (recipientCount === 0) {
      toast({
        title: 'Error',
        description: 'No recipients match the selected filter',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      message_type: messageType,
      subject: messageType !== 'sms' ? subject : null,
      message,
      recipient_filter: {
        type: recipientFilter,
        date: selectedDate || null,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      sending: { variant: 'default', label: 'Sending' },
      sent: { variant: 'outline', label: 'Sent' },
      failed: { variant: 'destructive', label: 'Failed' },
    };
    return config[status] || config.draft;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Passenger Communication</h2>
        <p className="text-muted-foreground">Send messages to your passengers</p>
      </div>

      {/* Compose Message */}
      <Card>
        <CardHeader>
          <CardTitle>Compose Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Message Type</Label>
              <Select value={messageType} onValueChange={(v: any) => setMessageType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="both">Both SMS & Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Recipients</Label>
              <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Passengers</SelectItem>
                  <SelectItem value="today">Today's Passengers</SelectItem>
                  <SelectItem value="upcoming">Upcoming Trips</SelectItem>
                  <SelectItem value="specific_date">Specific Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {recipientFilter === 'specific_date' && (
            <div>
              <Label>Select Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">
              This message will be sent to <span className="font-bold text-blue-600">{recipientCount}</span> recipients
            </span>
          </div>

          {(messageType === 'email' || messageType === 'both') && (
            <div>
              <Label>Email Subject</Label>
              <Input
                placeholder="Enter email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label>Message</Label>
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={messageType === 'sms' ? 160 : 1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length} / {messageType === 'sms' ? 160 : 1000} characters
            </p>
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || recipientCount === 0}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
          </Button>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle>Message History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {msg.message_type === 'email' || msg.message_type === 'both' ? (
                      <Mail className="h-4 w-4 text-blue-600" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    )}
                    <span className="font-medium">{msg.subject || 'SMS Message'}</span>
                  </div>
                  <Badge variant={getStatusBadge(msg.status).variant}>
                    {getStatusBadge(msg.status).label}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-2">{msg.message}</p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{msg.total_recipients} recipients</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(msg.created_at), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                  {msg.sent_count > 0 && (
                    <span className="text-green-600">
                      {msg.sent_count} sent
                    </span>
                  )}
                  {msg.failed_count > 0 && (
                    <span className="text-red-600">
                      {msg.failed_count} failed
                    </span>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">No messages sent yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
