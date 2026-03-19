import { useEffect, useState } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Home, Menu, X, ExternalLink } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { toast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { user, isEditor, isAdmin, isLoading, signOut, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!user || !isEditor)) {
      navigate('/admin/login');
    }
  }, [user, isEditor, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'تم تسجيل الخروج' });
    navigate('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isEditor) return null;

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Top bar */}
      <header className="bg-background border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Logo size="md" className="text-foreground" />
          <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
            {userRole === 'admin' ? 'مدير' : userRole === 'editor' ? 'محرر' : 'مشاهد'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" target="_blank" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ExternalLink className="h-3.5 w-3.5" />
            عرض المتجر
          </Link>
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{user.email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            خروج
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminDashboard;
