import { Home, Ticket, MapPin, User, Package, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/routes", icon: MapPin, label: "Routes" },
    { path: "/bookings", icon: Ticket, label: "Bookings" },
    { path: "/lost-and-found", icon: Search, label: "Lost & Found" },
    { path: "/package-delivery", icon: Package, label: "Delivery" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden">
        <div className="flex justify-around items-center h-16 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full min-w-0 px-0.5 transition-colors duration-200",
                  active ? "text-blue-600" : "text-gray-500"
                )}
              >
                <div className={cn("p-1 rounded-lg transition-all", active && "bg-blue-50")}>
                  <Icon className={cn("h-5 w-5", active && "scale-110")} />
                </div>
                <span className="text-[9px] font-medium truncate w-full text-center leading-tight mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Bottom Navigation */}
      <nav className="hidden md:flex fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                    active
                      ? "text-blue-600 bg-blue-50 font-semibold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="h-16 md:h-16" />
    </>
  );
};

export default BottomNav;
