import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  if (!user) return null;

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.username.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center">
      <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      
      <div className="ml-3">
        <p className="text-sm font-medium text-foreground">
          {user.fullName || user.username}
        </p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto"
        onClick={handleLogout}
        title="Logout"
      >
        <LogOut className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
