import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Mail, Phone, Building, Key, UserPlus, Search, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface BusOperator {
  id: string;
  name: string;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
}

interface OperatorUser {
  id: string;
  user_id: string;
  operator_id: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  bus_operators?: {
    name: string;
  };
  user_roles?: Array<{
    role: string;
  }>;
}

const OperatorManagement = () => {
  const { user: adminUser } = useAuth();
  const [operators, setOperators] = useState<BusOperator[]>([]);
  const [operatorUsers, setOperatorUsers] = useState<OperatorUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<OperatorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreateOperatorDialogOpen, setIsCreateOperatorDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkOperatorId, setLinkOperatorId] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    operatorId: "",
    createNewOperator: false,
    newOperatorName: "",
    newOperatorPhone: "",
    newOperatorEmail: ""
  });

  useEffect(() => {
    fetchData();
    
    // Set up real-time subscriptions
    const operatorUsersChannel = supabase
      .channel('operator-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operator_users'
        },
        (payload) => {
          console.log('Operator users changed:', payload);
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bus_operators'
        },
        (payload) => {
          console.log('Bus operators changed:', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(operatorUsersChannel);
    };
  }, []);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(operatorUsers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = operatorUsers.filter(opUser => {
      const profile = opUser.profiles;
      const operator = opUser.bus_operators;
      
      return (
        profile?.first_name?.toLowerCase().includes(term) ||
        profile?.last_name?.toLowerCase().includes(term) ||
        profile?.email?.toLowerCase().includes(term) ||
        profile?.phone?.includes(term) ||
        operator?.name?.toLowerCase().includes(term)
      );
    });

    setFilteredUsers(filtered);
  }, [searchTerm, operatorUsers]);

  // Search for users to link
  const searchUsersToLink = async (email: string) => {
    if (!email || email.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      // Use the search function
      const { data, error } = await supabase.rpc('search_users_for_admin', {
        search_term: email
      });

      if (error) {
        console.error('Error searching users:', error);
        // Fallback to simple profile search
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone')
          .or(`email.ilike.%${email}%,first_name.ilike.%${email}%,last_name.ilike.%${email}%`)
          .limit(10);

        if (profileError) {
          console.error('Error searching profiles:', profileError);
          setSearchResults([]);
        } else {
          setSearchResults(profiles || []);
        }
      } else {
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (linkEmail) {
        searchUsersToLink(linkEmail);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [linkEmail]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all bus operators
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('bus_operators')
        .select('*')
        .order('name');

      if (operatorsError) throw operatorsError;

      // Fetch operator users (can't join profiles directly since both reference auth.users)
      const { data: operatorUsersData, error: operatorUsersError } = await supabase
        .from('operator_users')
        .select(`
          *,
          bus_operators:operator_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (operatorUsersError) {
        // If table doesn't exist yet, that's okay
        if (operatorUsersError.code !== '42P01') {
          throw operatorUsersError;
        }
      }

      // Fetch profiles and roles for all operator users separately
      const userIds = (operatorUsersData || []).map(op => op.user_id);
      
      let profilesMap: Record<string, any> = {};
      let rolesMap: Record<string, any[]> = {};

      if (userIds.length > 0) {
        // Fetch all profiles for these users
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone')
          .in('id', userIds);

        if (profilesData) {
          profilesData.forEach(profile => {
            profilesMap[profile.id] = profile;
          });
        }

        // Fetch all roles for these users
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        if (rolesData) {
          rolesData.forEach(role => {
            if (!rolesMap[role.user_id]) {
              rolesMap[role.user_id] = [];
            }
            rolesMap[role.user_id].push({ role: role.role });
          });
        }
      }

      // Combine the data
      const usersWithRoles = (operatorUsersData || []).map((opUser) => {
        return {
          ...opUser,
          profiles: profilesMap[opUser.user_id] || null,
          user_roles: rolesMap[opUser.user_id] || []
        };
      });

      setOperators(operatorsData || []);
      setOperatorUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch operator data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperator = async () => {
    if (!formData.newOperatorName) {
      toast({
        title: "Error",
        description: "Operator name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: newOperator, error } = await supabase
        .from('bus_operators')
        .insert({
          name: formData.newOperatorName,
          contact_phone: formData.newOperatorPhone || null,
          contact_email: formData.newOperatorEmail || null,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bus operator created successfully"
      });

      setFormData(prev => ({ ...prev, operatorId: newOperator.id, createNewOperator: false }));
      setIsCreateOperatorDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating operator:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create bus operator",
        variant: "destructive"
      });
    }
  };

  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!formData.operatorId && !formData.createNewOperator) {
      toast({
        title: "Error",
        description: "Please select an operator or create a new one",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let operatorId = formData.operatorId;

      // Create new operator if needed
      if (formData.createNewOperator) {
        if (!formData.newOperatorName) {
          toast({
            title: "Error",
            description: "Operator name is required",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        const { data: newOperator, error: operatorError } = await supabase
          .from('bus_operators')
          .insert({
            name: formData.newOperatorName,
            contact_phone: formData.newOperatorPhone || null,
            contact_email: formData.newOperatorEmail || null,
            is_active: true
          })
          .select()
          .single();

        if (operatorError) throw operatorError;
        operatorId = newOperator.id;
      }

      // Get Supabase URL for Edge Functions
      const supabaseUrl = "https://iqwynkrzzhzqeoulflzi.supabase.co";
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token || '';

      if (!token) {
        throw new Error('You must be logged in to create operator accounts');
      }

      // Try Edge Function first, fallback to direct signup if not available
      let userId: string | null = null;
      
      try {
        // Call Edge Function to create operator user
        const response = await fetch(`${supabaseUrl}/functions/v1/create-operator-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxd3lua3J6emh6cWVvdWxmbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMTUyNjAsImV4cCI6MjA3OTY5MTI2MH0.QU88bLJWujtJMI5AwYQjd6SQfe27mwwwxxdEz7CUsfg'
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone || null,
            operatorId: operatorId
          })
        }).catch((fetchError) => {
          // If fetch fails entirely (network error, CORS, etc.), treat as Edge Function not available
          console.warn('Edge Function fetch failed:', fetchError);
          throw new Error('EDGE_FUNCTION_NOT_FOUND');
        });

        if (!response.ok) {
          // If Edge Function returns 404, use fallback method
          if (response.status === 404) {
            throw new Error('EDGE_FUNCTION_NOT_FOUND');
          }
          
          // CORS errors or other network issues
          if (response.status === 0 || !response.status) {
            throw new Error('EDGE_FUNCTION_NOT_FOUND');
          }
          
          // Try to parse error response
          let errorMessage = `HTTP ${response.status}`;
          try {
            const responseText = await response.text();
            if (responseText) {
              try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorMessage;
              } catch {
                errorMessage = responseText || response.statusText || errorMessage;
              }
            } else {
              errorMessage = response.statusText || errorMessage;
            }
          } catch (parseError) {
            // If we can't parse, assume Edge Function issue
            throw new Error('EDGE_FUNCTION_NOT_FOUND');
          }
          throw new Error(errorMessage);
        }

        const responseText = await response.text();
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        
        const result = JSON.parse(responseText);
        userId = result.userId;
        
        // Verify the operator_users entry was created by Edge Function
        if (userId) {
          const { data: verifyLink } = await supabase
            .from('operator_users')
            .select('id, operator_id')
            .eq('user_id', userId)
            .single();
          
          if (!verifyLink) {
            console.error('Warning: operator_users entry not found after Edge Function creation');
            toast({
              title: "Warning",
              description: "Operator account created but operator assignment may be incomplete. Please verify.",
              variant: "default"
            });
          } else {
            toast({
              title: "Success",
              description: "Operator account created successfully"
            });
          }
        } else {
          toast({
            title: "Success",
            description: "Operator account created successfully"
          });
        }
        
        setIsAddDialogOpen(false);
        resetForm();
        fetchData();
        return; // Exit early since Edge Function handled everything
      } catch (edgeError: any) {
        // If Edge Function not found, fails, or has CORS issues, use fallback: regular signup
        if (edgeError.message === 'EDGE_FUNCTION_NOT_FOUND' || 
            edgeError.message.includes('404') || 
            edgeError.message.includes('CORS') ||
            edgeError.message.includes('Failed to fetch') ||
            edgeError.name === 'TypeError') {
          console.warn('Edge Function not deployed, using fallback signup method');
          
          // Fallback: Use regular signup (requires email verification)
          const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone: formData.phone
              },
              email_redirect_to: `${window.location.origin}/auth`
            }
          });

          if (signupError) {
            if (signupError.message?.includes('already registered')) {
              throw new Error('User with this email already exists. Please use a different email or have them sign in and you can link their account manually.');
            }
            throw signupError;
          }

          if (!signupData.user) {
            throw new Error('Failed to create user account');
          }

          userId = signupData.user.id;

          // Create or update profile (may already exist if trigger created it)
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              first_name: formData.firstName,
              last_name: formData.lastName,
              phone: formData.phone || null
            }, {
              onConflict: 'id'
            });

          if (profileError) {
            // If profile creation fails, try to continue anyway (might already exist)
            console.warn('Profile upsert warning:', profileError);
            // Check if profile exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .single();
            
            if (!existingProfile) {
              throw new Error(`Failed to create profile: ${profileError.message}`);
            }
          }

          // Assign operator role using the assign_role function (bypasses RLS)
          const { error: roleError } = await supabase.rpc('assign_role', {
            _target_user_id: userId,
            _role: 'operator',
            _created_by: adminUser?.id || null
          });

          if (roleError) {
            console.error('Failed to assign operator role:', roleError);
            // Don't delete profile - it was created by trigger
            throw new Error(`Failed to assign operator role: ${roleError.message}`);
          }

          // Link user to operator (use upsert to handle duplicates)
          const { error: linkError } = await supabase
            .from('operator_users')
            .upsert({
              user_id: userId,
              operator_id: operatorId
            }, {
              onConflict: 'user_id,operator_id'
            });

          if (linkError) {
            console.error('Failed to link user to operator:', linkError);
            // Try to verify if the link already exists
            const { data: existingLink } = await supabase
              .from('operator_users')
              .select('id')
              .eq('user_id', userId)
              .eq('operator_id', operatorId)
              .single();
            
            if (!existingLink) {
              // Link doesn't exist and we couldn't create it
              await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'operator').catch(() => {});
              throw new Error(`Failed to link to operator: ${linkError.message}`);
            }
            // If link exists, that's fine - continue
            console.log('Operator link already exists, continuing...');
          }

          // Verify the operator_users entry was created
          const { data: verifyLink } = await supabase
            .from('operator_users')
            .select('id, operator_id')
            .eq('user_id', userId)
            .single();
          
          if (!verifyLink) {
            console.error('Warning: operator_users entry not found after creation');
            toast({
              title: "Warning",
              description: "Operator account created but link may not be complete. Please verify the operator assignment.",
              variant: "default"
            });
          } else {
            toast({
              title: "Success",
              description: "Operator account created successfully. User will need to verify their email to complete signup."
            });
          }
          
          setIsAddDialogOpen(false);
          resetForm();
          fetchData();
          return;
        } else {
          // Re-throw other errors
          throw edgeError;
        }
      }
    } catch (error: any) {
      console.error('Error creating operator account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create operator account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      operatorId: "",
      createNewOperator: false,
      newOperatorName: "",
      newOperatorPhone: "",
      newOperatorEmail: ""
    });
  };

  const handleLinkExistingUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkEmail || !linkOperatorId) {
      toast({
        title: "Error",
        description: "Please provide email and select an operator",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Use the search function to find user
      const { data: users, error: searchError } = await supabase.rpc('search_users_for_admin', {
        search_term: linkEmail
      });

      if (searchError) {
        console.error('Search error:', searchError);
        throw new Error('Failed to search for user');
      }

      // Find exact email match
      const userProfile = users?.find(u => 
        u.email?.toLowerCase() === linkEmail.toLowerCase()
      );

      if (!userProfile) {
        throw new Error('User not found with that email address. Make sure the user has signed up first.');
      }

      const userId = userProfile.id;

      // Check if user already has operator role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'operator');

      if (!roles || roles.length === 0) {
        // User doesn't have operator role, assign it using RPC function
        const { error: roleError } = await supabase.rpc('assign_role', {
          _target_user_id: userId,
          _role: 'operator',
          _created_by: adminUser?.id || null
        });

        if (roleError) {
          throw new Error(`Failed to assign operator role: ${roleError.message}`);
        }
      }

      // Check if user is already linked to this operator
      const { data: existingLink } = await supabase
        .from('operator_users')
        .select('id')
        .eq('user_id', userId)
        .eq('operator_id', linkOperatorId)
        .single();

      if (existingLink) {
        toast({
          title: "Already Linked",
          description: "This user is already linked to the selected operator",
          variant: "default"
        });
        setIsLinkDialogOpen(false);
        setLinkEmail("");
        setLinkOperatorId("");
        setSearchResults([]);
        return;
      }

      // Link user to operator
      const { error: linkError } = await supabase
        .from('operator_users')
        .insert({
          user_id: userId,
          operator_id: linkOperatorId
        });

      if (linkError) {
        throw new Error(`Failed to link user to operator: ${linkError.message}`);
      }

      toast({
        title: "Success",
        description: "User successfully linked to operator"
      });

      setIsLinkDialogOpen(false);
      setLinkEmail("");
      setLinkOperatorId("");
      setSearchResults([]);
      fetchData();
    } catch (error: any) {
      console.error('Error linking user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to link user to operator",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOperator = async (operatorUserId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this operator? This will not delete their user account.')) {
      return;
    }

    try {
      // Remove operator role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'operator');

      if (roleError) throw roleError;

      // Remove operator-user link
      const { error: linkError } = await supabase
        .from('operator_users')
        .delete()
        .eq('id', operatorUserId);

      if (linkError) throw linkError;

      toast({
        title: "Success",
        description: "Operator removed successfully"
      });

      fetchData();
    } catch (error: any) {
      console.error('Error removing operator:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove operator",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Operator Management</h2>
          <p className="text-gray-600 mt-1">Create and manage bus operator accounts</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Link Existing User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Link Existing User to Operator</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleLinkExistingUser} className="space-y-4">
                <div>
                  <Label htmlFor="link-email">Search User by Email *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="link-email"
                      type="text"
                      value={linkEmail}
                      onChange={(e) => setLinkEmail(e.target.value)}
                      placeholder="Type to search..."
                      className="pl-10"
                      required
                    />
                    {linkEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          setLinkEmail("");
                          setSearchResults([]);
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                  
                  {searchingUsers && (
                    <div className="mt-2 text-sm text-gray-500">Searching...</div>
                  )}
                  
                  {searchResults.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setLinkEmail(user.email);
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="font-medium text-sm">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-gray-600">{user.email}</div>
                          {user.phone && <div className="text-xs text-gray-500">{user.phone}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {linkEmail && searchResults.length === 0 && !searchingUsers && (
                    <div className="mt-2 text-sm text-gray-500">No users found</div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">User will be assigned operator role if they don't have it</p>
                </div>

                <div>
                  <Label htmlFor="link-operator">Bus Operator Company *</Label>
                  <Select
                    value={linkOperatorId}
                    onValueChange={setLinkOperatorId}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsLinkDialogOpen(false);
                      setLinkEmail("");
                      setLinkOperatorId("");
                      setSearchResults([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="african-gradient">
                    {loading ? "Linking..." : "Link User"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="african-gradient">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Operator
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Operator Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddOperator} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+260..."
                  />
                </div>

                <div>
                  <Label htmlFor="operator">Bus Operator Company *</Label>
                  <div className="space-y-2">
                    <Select
                      value={formData.createNewOperator ? "new" : formData.operatorId}
                      onValueChange={(value) => {
                        if (value === "new") {
                          setFormData({ ...formData, createNewOperator: true, operatorId: "" });
                        } else {
                          setFormData({ ...formData, createNewOperator: false, operatorId: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select or create operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.id} value={op.id}>
                            {op.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">+ Create New Operator</SelectItem>
                      </SelectContent>
                    </Select>

                    {formData.createNewOperator && (
                      <div className="p-4 border rounded-lg space-y-3 bg-gray-50">
                        <div>
                          <Label htmlFor="newOperatorName">Operator Name *</Label>
                          <Input
                            id="newOperatorName"
                            value={formData.newOperatorName}
                            onChange={(e) => setFormData({ ...formData, newOperatorName: e.target.value })}
                            required={formData.createNewOperator}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="newOperatorPhone">Contact Phone</Label>
                            <Input
                              id="newOperatorPhone"
                              type="tel"
                              value={formData.newOperatorPhone}
                              onChange={(e) => setFormData({ ...formData, newOperatorPhone: e.target.value })}
                              placeholder="+260..."
                            />
                          </div>
                          <div>
                            <Label htmlFor="newOperatorEmail">Contact Email</Label>
                            <Input
                              id="newOperatorEmail"
                              type="email"
                              value={formData.newOperatorEmail}
                              onChange={(e) => setFormData({ ...formData, newOperatorEmail: e.target.value })}
                              placeholder="info@operator.zm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="african-gradient">
                    {loading ? "Creating..." : "Create Operator Account"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search operators by name, email, phone, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-600 mt-2">
              Found {filteredUsers.length} operator{filteredUsers.length !== 1 ? 's' : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {loading && operatorUsers.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading operators...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((opUser) => {
            const profile = opUser.profiles;
            const operator = opUser.bus_operators;
            const hasOperatorRole = opUser.user_roles?.some(r => r.role === 'operator');

            return (
              <Card key={opUser.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {profile?.first_name} {profile?.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{profile?.email}</p>
                      </div>
                    </div>
                    {hasOperatorRole && (
                      <Badge variant="default" className="bg-blue-600">Operator</Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{profile?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building className="h-4 w-4" />
                      <span>{operator?.name || 'No operator assigned'}</span>
                    </div>
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Added: {new Date(opUser.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDeleteOperator(opUser.id, opUser.user_id)}
                    >
                      Remove Operator
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredUsers.length === 0 && searchTerm && (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No operators found</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search terms</p>
                  <Button variant="outline" onClick={() => setSearchTerm("")}>
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {operatorUsers.length === 0 && !searchTerm && (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No operators yet</h3>
                  <p className="text-gray-600 mb-4">Add your first operator account to get started.</p>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="african-gradient">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Operator
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OperatorManagement;

