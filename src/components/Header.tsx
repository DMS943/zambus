
import { Bus, User, LogOut, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/hooks/useTranslations";
import { useUserRole } from "@/hooks/useUserRole";
import LanguageSelector from "./LanguageSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const navigate = useNavigate();
  const { user, logout, updateLanguage, isAuthenticated, guestLanguage, updateGuestLanguage, loading } = useAuth();
  const { t, currentLanguage } = useTranslations();
  const { isAdminOrModerator, isOperator, loading: rolesLoading } = useUserRole();

  
  
  const handleLanguageChange = async (value: string) => {
    console.log('Language change requested:', value);
    try {
      if (isAuthenticated) {
        await updateLanguage(value as 'english' | 'bemba' | 'nyanja');
      } else {
        updateGuestLanguage(value as 'english' | 'bemba' | 'nyanja');
      }
      // Force a re-render by updating the component state
      // The useTranslations hook will automatically pick up the new language
      window.dispatchEvent(new Event('language-changed'));
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          <Link to="/" className="flex items-center space-x-2">
            <div className="african-gradient p-1.5 rounded-lg">
              <Bus className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">ZamBus</h1>
              <p className="hidden sm:block text-xs text-muted-foreground">Zambian Bus Ticketing</p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-2">
            {/* Language selector - hidden on mobile, shown on desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden sm:flex p-2">
                  <Languages className="h-5 w-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border shadow-lg z-50">
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-popover-foreground mb-2">{t('header.selectLanguage')}</p>
                  <LanguageSelector
                    value={currentLanguage}
                    onValueChange={handleLanguageChange}
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Icon */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm hover:bg-blue-600 transition-colors">
                    {user?.firstName?.[0] || user?.email?.[0] || "U"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-popover border shadow-lg z-50">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-popover-foreground">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/bookings')}>
                    <Bus className="h-4 w-4 mr-2" />
                    My Bookings
                  </DropdownMenuItem>
                  {!rolesLoading && (isAdminOrModerator() || isOperator()) && (
                    <>
                      <DropdownMenuSeparator />
                      {isAdminOrModerator() && (
                        <DropdownMenuItem onClick={() => navigate('/admin')}>
                          <Bus className="h-4 w-4 mr-2" />
                          Admin Dashboard
                        </DropdownMenuItem>
                      )}
                      {isOperator() && (
                        <DropdownMenuItem onClick={() => navigate('/operator')}>
                          <Bus className="h-4 w-4 mr-2" />
                          Operator Dashboard
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('header.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button 
                onClick={() => navigate('/auth')} 
                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors"
              >
                <User className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
