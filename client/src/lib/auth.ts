import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiRequest, queryClient } from "./queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  // Check auth status on load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch("/api/auth/status", {
          credentials: "include",
        });
        const data = await res.json();

        if (data.authenticated) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await res.json();
      setUser(data.user);
      
      toast.toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      return true;
    } catch (error) {
      console.error("Login error:", error);
      
      toast.toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid username or password",
        variant: "destructive",
      });
      
      return false;
    }
  };

  // Register function
  const register = async (userData: any): Promise<boolean> => {
    try {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      const data = await res.json();
      setUser(data.user);
      
      toast.toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
      
      return true;
    } catch (error) {
      console.error("Registration error:", error);
      
      toast.toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Username may already exist",
        variant: "destructive",
      });
      
      return false;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      
      // Invalidate all queries
      queryClient.clear();
      
      toast.toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      
      toast.toast({
        title: "Logout failed",
        description: "There was an error logging out",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
