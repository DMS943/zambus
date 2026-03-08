import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Separator } from '@/components/ui/separator';
import { User, Lock, Save, Mail, Phone, MapPin, CreditCard, Bell, HelpCircle, Settings, LogOut, ArrowRight, ChevronDown, ChevronUp, Plus } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateLanguage, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [totalTrips, setTotalTrips] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    sms: true,
    push: false
  });
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    preferredLanguage: user?.preferredLanguage || 'english'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch user statistics
  // Update formData when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        preferredLanguage: user.preferredLanguage || 'english'
      });
    }
  }, [user]);

  // Fetch notification preferences
  useEffect(() => {
    const fetchNotificationPreferences = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('email_notifications, sms_notifications, push_notifications')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setNotificationPreferences({
            email: data.email_notifications ?? true,
            sms: data.sms_notifications ?? true,
            push: data.push_notifications ?? false
          });
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      }
    };

    fetchNotificationPreferences();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchUserStats = async () => {
      try {
        const queryPromise = supabase
          .from('bookings')
          .select('id, total_price_zmw, status')
          .eq('user_id', user.id)
          .in('status', ['confirmed', 'completed']);
        
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        );
        
        const result = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as { data: any; error: any };
        
        const { data: bookings, error } = result;

        if (error) throw error;

        const trips = bookings?.length || 0;
        const spent = bookings?.reduce((sum, booking) => sum + (booking.total_price_zmw || 0), 0) || 0;

        setTotalTrips(trips);
        setTotalSpent(spent);
      } catch (error: any) {
        console.error('Error fetching user stats:', error);
        // Set defaults on error
        setTotalTrips(0);
        setTotalSpent(0);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchUserStats();
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          preferred_language: formData.preferredLanguage,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update language in context
      await updateLanguage(formData.preferredLanguage);
      
      // Trigger language change event to update all components
      window.dispatchEvent(new Event('language-changed'));

      toast({
        title: "Profile updated successfully",
        description: "Your profile information has been saved."
      });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Error updating profile",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Password updated successfully",
        description: "Your password has been changed."
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Password update error:', error);
      toast({
        title: "Error updating password",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotificationPreferenceChange = async (type: 'email' | 'sms' | 'push', value: boolean) => {
    if (!user) return;

    setNotificationsLoading(true);
    try {
      const updateData: any = {};
      if (type === 'email') updateData.email_notifications = value;
      if (type === 'sms') updateData.sms_notifications = value;
      if (type === 'push') updateData.push_notifications = value;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setNotificationPreferences(prev => ({
        ...prev,
        [type]: value
      }));

      toast({
        title: "Preferences updated",
        description: `${type === 'email' ? 'Email' : type === 'sms' ? 'SMS' : 'Push'} notifications ${value ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences.",
        variant: "destructive"
      });
    } finally {
      setNotificationsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-16 md:pb-0">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please log in to view your profile.
              </p>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'January 2024';

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Profile Card with Gradient */}
        <Card className="border-0 shadow-sm mb-3 overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 to-blue-400 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-blue-600">
                  {user.firstName?.[0] || user.email?.[0] || 'U'}
                </span>
                  </div>
              <div className="flex-1 text-white min-w-0">
                <h2 className="text-base font-bold truncate">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-xs text-blue-100">Member since {memberSince}</p>
                  </div>
                </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/20 backdrop-blur rounded-lg p-2">
                <div className="text-lg font-bold text-white">
                  {statsLoading ? "..." : totalTrips}
                </div>
                <div className="text-xs text-blue-100">Total Trips</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-2">
                <div className="text-lg font-bold text-white">
                  {statsLoading ? "..." : `K${totalSpent.toLocaleString()}`}
                </div>
                <div className="text-xs text-blue-100">Total Spent</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card className="border-0 shadow-sm mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">{user.phone || '+260 97 123 4567'}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">Lusaka, Zambia</span>
                </div>
            </CardContent>
          </Card>

        {/* Account Section */}
        <Card className="border-0 shadow-sm mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
          <CardContent className="space-y-0 pt-0">
            {/* Personal Information */}
            <div>
              <button 
                onClick={() => setExpandedSection(expandedSection === 'personal' ? null : 'personal')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">Personal Information</span>
                </div>
                {expandedSection === 'personal' ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {expandedSection === 'personal' && (
                <div className="px-3 pb-3 pt-2 border-t">
                  <form onSubmit={handleProfileUpdate} className="space-y-4 mt-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+260 97 123 4567"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="language">Preferred Language</Label>
                      <Select
                        value={formData.preferredLanguage}
                        onValueChange={async (value: "english" | "bemba" | "nyanja") => {
                          setFormData({...formData, preferredLanguage: value});
                          // Update immediately for instant feedback
                          try {
                            await updateLanguage(value);
                            window.dispatchEvent(new Event('language-changed'));
                          } catch (error) {
                            console.error('Failed to update language:', error);
                          }
                        }}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="bemba">Bemba</SelectItem>
                          <SelectItem value="nyanja">Nyanja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                  
                  <Separator className="my-4" />
                  
                  <div>
                    <Label className="mb-2 block">Change Password</Label>
                    <form onSubmit={handlePasswordChange} className="space-y-3">
                      <Input
                        type="password"
                        placeholder="New Password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        disabled={passwordLoading}
                      />
                      <Input
                        type="password"
                        placeholder="Confirm New Password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        disabled={passwordLoading}
                      />
                      <Button type="submit" disabled={passwordLoading} variant="outline" className="w-full">
                        {passwordLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div>
              <button 
                onClick={() => setExpandedSection(expandedSection === 'payment' ? null : 'payment')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border-t"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">Payment Methods</span>
                </div>
                {expandedSection === 'payment' ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {expandedSection === 'payment' && (
                <div className="px-3 pb-3 pt-2 border-t">
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-600">No payment methods saved yet.</p>
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      We support Mobile Money (MTN, Airtel), Visa, and MasterCard
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div>
              <button 
                onClick={() => setExpandedSection(expandedSection === 'notifications' ? null : 'notifications')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border-t"
              >
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">Notifications</span>
                </div>
                {expandedSection === 'notifications' ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {expandedSection === 'notifications' && (
                <div className="px-3 pb-3 pt-2 border-t">
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Email Notifications</p>
                        <p className="text-xs text-gray-500">Receive booking confirmations via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={notificationPreferences.email}
                          onChange={(e) => handleNotificationPreferenceChange('email', e.target.checked)}
                          disabled={notificationsLoading}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">SMS Notifications</p>
                        <p className="text-xs text-gray-500">Receive booking updates via SMS</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={notificationPreferences.sms}
                          onChange={(e) => handleNotificationPreferenceChange('sms', e.target.checked)}
                          disabled={notificationsLoading}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Push Notifications</p>
                        <p className="text-xs text-gray-500">Get notified about special offers</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={notificationPreferences.push}
                          onChange={(e) => handleNotificationPreferenceChange('push', e.target.checked)}
                          disabled={notificationsLoading}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </CardContent>
          </Card>

        {/* Support Section */}
        <Card className="border-0 shadow-sm mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 pt-0">
            <button 
              onClick={() => navigate('/support')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-purple-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">Help Center</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </button>
            <div>
              <button 
                onClick={() => setExpandedSection(expandedSection === 'settings' ? null : 'settings')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border-t"
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">Settings</span>
                </div>
                {expandedSection === 'settings' ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {expandedSection === 'settings' && (
                <div className="px-3 pb-3 pt-2 border-t">
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label>Theme</Label>
                      <Select defaultValue="light">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Default Currency</Label>
                      <Select defaultValue="zmw">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zmw">ZMW (Kwacha)</SelectItem>
                          <SelectItem value="usd">USD (Dollar)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Log Out Button */}
        <Button 
          variant="outline" 
          className="w-full border-red-600 text-red-600 hover:bg-red-50 h-8 text-sm"
          onClick={logout}
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          Log Out
        </Button>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;