
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import RoutesPage from "./pages/Routes";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Validation from "./pages/Validation";
import Analytics from "./pages/Analytics";
import Support from "./pages/Support";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import Operator from "./pages/Operator";
import LostAndFound from "./pages/LostAndFound";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/support" element={<Support />} />
            <Route path="/lost-and-found" element={<LostAndFound />} />
            
            {/* Protected routes requiring authentication */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/bookings" element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            } />
            
            {/* Operator protected routes */}
            <Route path="/operator" element={
              <ProtectedRoute requiredRole="operator">
                <Operator />
              </ProtectedRoute>
            } />
            
            {/* Admin/Moderator protected routes */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdminOrModerator>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/validation" element={
              <ProtectedRoute requireAdminOrModerator>
                <Validation />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute requireAdminOrModerator>
                <Analytics />
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
