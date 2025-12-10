import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Brand {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  country: string | null;
  founded_year: number | null;
  is_active: boolean;
  logo_url: string | null;
}

const AdminBrands = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name_en');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل العلامات التجارية',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: 'تم الحذف',
        description: 'تم حذف العلامة التجارية بنجاح',
      });
      fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف العلامة التجارية',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const filteredBrands = brands.filter(
    (b) =>
      b.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.name_ar?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">العلامات التجارية</h1>
          <p className="text-muted-foreground">إدارة العلامات التجارية</p>
        </div>
        <Link to="/admin/brands/new">
          <Button>
            <Plus className="h-4 w-4 ml-2" />
            إضافة علامة
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد علامات تجارية بعد'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>البلد</TableHead>
                    <TableHead>سنة التأسيس</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="w-24">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBrands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {brand.logo_url && (
                            <img
                              src={brand.logo_url}
                              alt={brand.name_en}
                              className="w-10 h-10 object-contain"
                            />
                          )}
                          <div>
                            <p className="font-medium">{brand.name_ar || brand.name_en}</p>
                            {brand.name_ar && (
                              <p className="text-xs text-muted-foreground">{brand.name_en}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{brand.country || '-'}</TableCell>
                      <TableCell>{brand.founded_year || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={brand.is_active ? 'default' : 'secondary'}>
                          {brand.is_active ? 'نشط' : 'مخفي'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link to={`/admin/brands/${brand.id}`}>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          {isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setDeleteId(brand.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذه العلامة التجارية نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBrands;
