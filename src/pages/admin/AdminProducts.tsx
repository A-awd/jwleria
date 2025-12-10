import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`id, slug, sku, name_en, name_ar, price, currency, is_active, is_featured, images, brand:brands(name_en, name_ar), category:categories(name_en, name_ar)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ title: 'خطأ', description: 'فشل في تحميل المنتجات', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', deleteId);
      if (error) throw error;
      toast({ title: 'تم الحذف', description: 'تم حذف المنتج بنجاح' });
      fetchProducts();
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف المنتج', variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name_ar?.includes(searchQuery) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getImageUrl = (images: unknown) => {
    if (Array.isArray(images) && images.length > 0) return images[0] as string;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">المنتجات</h1>
          <p className="text-muted-foreground">إدارة منتجات المتجر</p>
        </div>
        <Link to="/admin/products/new"><Button><Plus className="h-4 w-4 ml-2" />إضافة منتج</Button></Link>
      </div>
      <Card>
        <CardHeader>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{searchQuery ? 'لا توجد نتائج' : 'لا توجد منتجات بعد'}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">صورة</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>العلامة</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="w-24">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {getImageUrl(product.images) ? (
                          <img src={getImageUrl(product.images)!} alt={product.name_en} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                        )}
                      </TableCell>
                      <TableCell><p className="font-medium">{product.name_ar || product.name_en}</p></TableCell>
                      <TableCell className="font-mono text-sm">{product.sku || '-'}</TableCell>
                      <TableCell>{product.brand?.name_ar || product.brand?.name_en || '-'}</TableCell>
                      <TableCell>{product.price.toLocaleString()} {product.currency}</TableCell>
                      <TableCell><Badge variant={product.is_active ? 'default' : 'secondary'}>{product.is_active ? 'نشط' : 'مخفي'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link to={`/admin/products/${product.id}`}><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></Link>
                          {isAdmin && <Button variant="ghost" size="icon" onClick={() => setDeleteId(product.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
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
            <AlertDialogDescription>سيتم حذف هذا المنتج نهائياً.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProducts;
