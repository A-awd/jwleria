import { useEffect, useState } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Package, 
  Tags, 
  Grid3X3, 
  Users, 
  LogOut, 
  Home,
  Menu,
  X
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { toast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { user, isEditor, isAdmin, isLoading, signOut, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !isEditor)) {
      navigate('/admin/login');
    }
  }, [user, isEditor, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'تم تسجيل الخروج',
      description: 'تم تسجيل خروجك بنجاح',
    });
    navigate('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isEditor) {
    return null;
  }

  const navItems = [
    { path: '/admin', label: 'الرئيسية', icon: Home, exact: true },
    { path: '/admin/products', label: 'المنتجات', icon: Package },
    { path: '/admin/brands', label: 'العلامات التجارية', icon: Tags },
    { path: '/admin/categories', label: 'الفئات', icon: Grid3X3 },
    ...(isAdmin ? [{ path: '/admin/users', label: 'المستخدمين', icon: Users }] : []),
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-muted/30 flex" dir="rtl">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 right-0 z-50
        w-64 bg-background border-l border-border
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <Logo size="md" className="text-foreground" />
            <button 
              className="lg:hidden p-2"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                  ${isActive(item.path, item.exact) 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-border">
            <div className="mb-3 text-sm">
              <p className="font-medium text-foreground truncate">{user.email}</p>
              <p className="text-muted-foreground text-xs">
                {userRole === 'admin' ? 'مدير' : userRole === 'editor' ? 'محرر' : 'مشاهد'}
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-background border-b border-border px-4 py-3 flex items-center justify-between lg:justify-end">
          <button 
            className="lg:hidden p-2"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <Link 
            to="/" 
            target="_blank"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            عرض المتجر ←
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
