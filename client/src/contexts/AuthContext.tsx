import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrentUser, login as apiLogin, logout as apiLogout } from "@/lib/api";
import { User } from "@shared/schema";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      // Check for token in localStorage (remember me) or sessionStorage (session-only)
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) {
        setUser(null);
        return;
      }

      // Add token to request headers
      const headers = new Headers();
      headers.append("Authorization", `Bearer ${token}`);

      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error("Error fetching current user:", error);
      // Clear tokens from both storages
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await apiLogin(username, password, rememberMe);
      
      if (response.rememberMe) {
        localStorage.setItem("auth_token", response.token);
      } else {
        // Use sessionStorage instead of localStorage when "Remember me" is not checked
        sessionStorage.setItem("auth_token", response.token);
      }
      
      setUser(response.user);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear tokens from both storages
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
