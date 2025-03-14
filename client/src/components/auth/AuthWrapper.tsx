import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "./LoginForm";
import Sidebar from "@/components/layout/Sidebar";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect to dashboard if not on a proper route
  useEffect(() => {
    if (isAuthenticated && location === "/") {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-gray-50">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <Separator orientation="vertical" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
