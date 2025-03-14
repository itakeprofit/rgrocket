import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  // Don't render layout for auth pages
  if (!isAuthenticated && !isLoading && (location === '/login' || location === '/register')) {
    return <>{children}</>;
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Show sidebar on medium and larger screens, or when toggled on mobile */}
      <div 
        className={`${
          sidebarOpen ? 'block' : 'hidden'
        } md:block fixed md:relative z-20 md:z-0 w-64 h-full`}
      >
        <Sidebar />
      </div>

      {/* Sidebar overlay - only visible on mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-x-hidden overflow-y-auto">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
