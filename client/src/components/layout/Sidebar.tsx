import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import UserMenu from "./UserMenu";
import {
  LayoutDashboard,
  Search,
  History,
  Settings,
  Users,
  FileText,
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const isAdmin = user?.role === "admin";
  
  const navigationItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      title: "Check Accounts",
      href: "/check-accounts",
      icon: Search,
      adminOnly: false,
    },
    {
      title: "History",
      href: "/history",
      icon: History,
      adminOnly: false,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      adminOnly: false,
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: Users,
      adminOnly: true,
    },
    {
      title: "System Logs",
      href: "/admin/logs",
      icon: FileText,
      adminOnly: true,
    },
  ];

  return (
    <aside className="w-64 bg-white shadow-md z-10 flex-shrink-0 flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-medium text-primary">Account Checker</h1>
      </div>

      <nav className="py-4 flex-1">
        <ul>
          {navigationItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;

            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center px-4 py-3 text-foreground hover:bg-gray-100 cursor-pointer",
                      location === item.href
                        ? "bg-primary/10 border-l-4 border-primary font-medium"
                        : ""
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.title}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-4">
        <UserMenu />
      </div>
    </aside>
  );
}
