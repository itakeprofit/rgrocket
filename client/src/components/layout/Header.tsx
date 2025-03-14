import { Bell, HelpCircle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { user } = useAuth();
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex justify-between items-center p-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
        >
          <Menu />
        </Button>
        <div className="flex items-center md:hidden">
          <h1 className="text-lg font-medium">Telegram Checker</h1>
        </div>
        <div className="flex items-center">
          <div className="relative mr-2">
            <Button
              variant="ghost"
              size="icon"
              className="p-2 rounded-full hover:bg-neutral-100"
            >
              <Bell />
              {/* Notification count badge - if there are notifications */}
              {user?.notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-white text-xs flex items-center justify-center">
                  {user.notificationCount}
                </span>
              )}
            </Button>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="p-2 rounded-full hover:bg-neutral-100"
            >
              <HelpCircle />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
