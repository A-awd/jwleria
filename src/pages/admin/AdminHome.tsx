import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Tags, Grid3X3, TrendingUp } from 'lucide-react';

const AdminHome = () => {
  const [stats, setStats] = useState({
    products: 0,
    brands: 0,
    categories: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, brandsRes, categoriesRes] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('brands').select('id', { count: 'exact', head: true }),
          supabase.from('categories').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          products: productsRes.count || 0,
          brands: brandsRes.count || 0,
          categories: categoriesRes.count || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { 
      title: 'المنتجات', 
      value: stats.products, 
      icon: Package, 
      href: '/admin/products',
      color: 'bg-blue-500'
    },
    { 
      title: 'العلامات التجارية', 
      value: stats.brands, 
      icon: Tags, 
      href: '/admin/brands',
      color: 'bg-green-500'
    },
    { 
      title: 'الفئات', 
      value: stats.categories, 
      icon: Grid3X3, 
      href: '/admin/categories',
      color: 'bg-purple-500'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground">مرحباً بك في لوحة تحكم jWleria</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.href} to={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.color} p-2 rounded-md`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {isLoading ? '...' : stat.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              to="/admin/products/new" 
              className="p-4 border border-dashed border-border rounded-lg text-center hover:bg-muted transition-colors"
            >
              <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">إضافة منتج جديد</p>
            </Link>
            <Link 
              to="/admin/brands/new" 
              className="p-4 border border-dashed border-border rounded-lg text-center hover:bg-muted transition-colors"
            >
              <Tags className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">إضافة علامة تجارية</p>
            </Link>
            <Link 
              to="/admin/categories/new" 
              className="p-4 border border-dashed border-border rounded-lg text-center hover:bg-muted transition-colors"
            >
              <Grid3X3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">إضافة فئة جديدة</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHome;
