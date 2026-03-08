import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/hooks/useTranslations";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";
import { Loader2, Bus, UserPlus, LogIn } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { login, register, user } = useAuth();
  const { isAdminOrModerator, isOperator, loading: rolesLoading } = useUserRole();
  const { t } = useTranslations();
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    preferredLanguage: "english" as "english" | "bemba" | "nyanja"
  });

  // Redirect if already authenticated - check role and redirect accordingly
  useEffect(() => {
    if (user && !rolesLoading) {
      // Wait a bit for roles to load, then redirect based on role
      const timer = setTimeout(() => {
        const currentPath = window.location.pathname;
        if (isAdminOrModerator()) {
          // Only redirect to /admin if not already there
          if (currentPath !== "/admin" && !currentPath.startsWith("/admin")) {
            navigate("/admin", { replace: true });
          }
        } else if (isOperator()) {
          // Redirect operators to their dashboard
          if (currentPath !== "/operator" && !currentPath.startsWith("/operator")) {
            navigate("/operator", { replace: true });
          }
        } else {
          // Only redirect to / if not already there and not on auth page
          if (currentPath !== "/" && currentPath !== "/auth") {
            navigate("/", { replace: true });
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    }, [user, navigate, isAdminOrModerator, isOperator, rolesLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result = await login(loginData.email, loginData.password);
      if (result.success) {
        toast({
          title: "Success",
          description: "Successfully logged in!"
        });
        // Wait for roles to load before redirecting
        const checkRoleAndRedirect = () => {
          if (rolesLoading) {
            // If still loading, wait a bit more
            setTimeout(checkRoleAndRedirect, 200);
          } else {
            // Roles have loaded, now check and redirect
            const currentPath = window.location.pathname;
            if (isAdminOrModerator()) {
              // Only redirect to /admin if not already there
              if (currentPath !== "/admin" && !currentPath.startsWith("/admin")) {
                navigate("/admin", { replace: true });
              }
            } else if (isOperator()) {
              // Redirect operators to their dashboard
              if (currentPath !== "/operator" && !currentPath.startsWith("/operator")) {
                navigate("/operator", { replace: true });
              }
            } else {
              // Only redirect to / if not already there
              if (currentPath !== "/") {
                navigate("/", { replace: true });
              }
            }
          }
        };
        // Start checking after a short delay to allow roles to start loading
        setTimeout(checkRoleAndRedirect, 500);
      } else {
        toast({
          title: "Error",
          description: result.error || "Invalid email or password",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: error?.message || "An error occurred during login",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!signupData.firstName || !signupData.lastName || !signupData.email || !signupData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    // Security: Note - All new users are automatically assigned 'user' role by database trigger
    // No role can be set during registration - roles must be assigned by existing admins
    // The registration process only sends user metadata, not role information

    setLoading(true);
    try {
      const result = await register({
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        email: signupData.email,
        phone: signupData.phone,
        preferredLanguage: signupData.preferredLanguage,
        password: signupData.password
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Account created successfully! You can now log in."
        });
        // Wait a moment for the profile to be created, then navigate
        setTimeout(() => {
        navigate("/");
        }, 1500);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create account. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      const errorMessage = error?.message || "An error occurred during registration";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Bus className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">ZamBus</h1>
          </div>
          <p className="text-sm text-gray-600">Smart bus booking for Zambia</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-base">{t('account')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9 bg-gray-100">
                <TabsTrigger value="login" className="flex items-center gap-1.5 text-xs">
                  <LogIn className="h-3.5 w-3.5" />
                  {t('login')}
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-1.5 text-xs">
                  <UserPlus className="h-3.5 w-3.5" />
                  {t('register')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <Label htmlFor="login-email" className="text-xs">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      disabled={loading}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password" className="text-xs">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your password"
                      disabled={loading}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button type="submit" className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-sm" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t('login')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                      <Input
                        id="firstName"
                        value={signupData.firstName}
                        onChange={(e) => setSignupData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="John"
                        disabled={loading}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={signupData.lastName}
                        onChange={(e) => setSignupData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Mwale"
                        disabled={loading}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="signup-email" className="text-xs">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john.mwale@example.com"
                      disabled={loading}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                    <Input
                      id="phone"
                      value={signupData.phone}
                      onChange={(e) => setSignupData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+260 977 123456"
                      disabled={loading}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="language" className="text-xs">Preferred Language</Label>
                    <Select 
                      value={signupData.preferredLanguage} 
                      onValueChange={(value: "english" | "bemba" | "nyanja") => 
                        setSignupData(prev => ({ ...prev, preferredLanguage: value }))
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="bemba">Bemba</SelectItem>
                        <SelectItem value="nyanja">Nyanja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="signup-password" className="text-xs">Password *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Minimum 6 characters"
                      disabled={loading}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirm-password" className="text-xs">Confirm Password *</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm your password"
                      disabled={loading}
                      className="h-9 text-sm"
                    />
                  </div>

                  <Button type="submit" className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-sm" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="text-xs text-gray-600 hover:text-gray-900 h-8"
          >
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;