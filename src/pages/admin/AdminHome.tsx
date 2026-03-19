import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Edit, Trash2, Loader2, Package, Tags, Grid3X3, Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// ─── Products Tab ───
const ProductsTab = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { isAdmin } = useAuth();

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, slug, sku, name_en, name_ar, price, currency, is_active, is_featured, images, brand:brands(name_en, name_ar), category:categories(name_en, name_ar)')
      .order('created_at', { ascending: false });
    if (!error) setProducts(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('products').delete().eq('id', deleteId);
    if (!error) { toast({ title: 'تم الحذف' }); fetchProducts(); }
    setDeleteId(null);
  };

  const filtered = products.filter((p) =>
    p.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name_ar?.includes(searchQuery) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getImg = (images: unknown) => Array.isArray(images) && images.length > 0 ? images[0] as string : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
        </div>
        <Button onClick={() => { setEditProduct(null); setShowForm(true); }}><Plus className="h-4 w-4 ml-2" />إضافة منتج</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
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
              {filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {getImg(product.images) ? (
                      <img src={getImg(product.images)!} alt="" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name_ar || product.name_en}</TableCell>
                  <TableCell className="font-mono text-sm">{product.sku || '-'}</TableCell>
                  <TableCell>{product.brand?.name_ar || product.brand?.name_en || '-'}</TableCell>
                  <TableCell>{product.price.toLocaleString()} {product.currency}</TableCell>
                  <TableCell><Badge variant={product.is_active ? 'default' : 'secondary'}>{product.is_active ? 'نشط' : 'مخفي'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditProduct(product); setShowForm(true); }}><Edit className="h-4 w-4" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" onClick={() => setDeleteId(product.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductFormDialog open={showForm} onClose={() => setShowForm(false)} product={editProduct} onSaved={fetchProducts} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف هذا المنتج نهائياً.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Product Form Dialog ───
const ProductFormDialog = ({ open, onClose, product, onSaved }: { open: boolean; onClose: () => void; product: any | null; onSaved: () => void }) => {
  const isEdit = !!product;
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    name_en: '', name_ar: '', description_en: '', description_ar: '',
    material_en: '', material_ar: '', price: '', currency: 'SAR',
    sku: '', slug: '', brand_id: '', category_id: '',
    is_active: true, is_featured: false, dimensions: '', weight_grams: '', tags: '',
  });

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setIsLoading(true);
      const [b, c] = await Promise.all([
        supabase.from('brands').select('id, name_en, name_ar').eq('is_active', true).order('name_en'),
        supabase.from('categories').select('id, name_en, name_ar').eq('is_active', true).order('name_en'),
      ]);
      setBrands(b.data || []);
      setCategories(c.data || []);

      if (isEdit) {
        const { data } = await supabase.from('products').select('*').eq('id', product.id).single();
        if (data) {
          setForm({
            name_en: data.name_en || '', name_ar: data.name_ar || '',
            description_en: data.description_en || '', description_ar: data.description_ar || '',
            material_en: data.material_en || '', material_ar: data.material_ar || '',
            price: data.price?.toString() || '', currency: data.currency || 'SAR',
            sku: data.sku || '', slug: data.slug || '',
            brand_id: data.brand_id || '', category_id: data.category_id || '',
            is_active: data.is_active ?? true, is_featured: data.is_featured ?? false,
            dimensions: data.dimensions || '', weight_grams: data.weight_grams?.toString() || '',
            tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
          });
          setImages(Array.isArray(data.images) ? data.images as string[] : []);
        }
      } else {
        setForm({ name_en: '', name_ar: '', description_en: '', description_ar: '', material_en: '', material_ar: '', price: '', currency: 'SAR', sku: '', slug: '', brand_id: '', category_id: '', is_active: true, is_featured: false, dimensions: '', weight_grams: '', tags: '' });
        setImages([]);
      }
      setIsLoading(false);
    };
    load();
  }, [open, product, isEdit]);

  const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setImages([...images, data.publicUrl]);
    } catch { toast({ title: 'خطأ', description: 'فشل رفع الصورة', variant: 'destructive' }); }
    setUploadingImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const data = {
      name_en: form.name_en, name_ar: form.name_ar || null,
      description_en: form.description_en || null, description_ar: form.description_ar || null,
      material_en: form.material_en || null, material_ar: form.material_ar || null,
      price: parseFloat(form.price) || 0, currency: form.currency,
      sku: form.sku || null, slug: form.slug || slug(form.name_en),
      brand_id: form.brand_id || null, category_id: form.category_id || null,
      is_active: form.is_active, is_featured: form.is_featured,
      dimensions: form.dimensions || null,
      weight_grams: form.weight_grams ? parseFloat(form.weight_grams) : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      images,
    };
    try {
      if (isEdit) {
        const { error } = await supabase.from('products').update(data).eq('id', product.id);
        if (error) throw error;
        toast({ title: 'تم الحفظ' });
      } else {
        const { error } = await supabase.from('products').insert(data);
        if (error) throw error;
        toast({ title: 'تم الإضافة' });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle>{isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>الاسم (إنجليزي) *</Label><Input value={form.name_en} onChange={(e) => setForm({...form, name_en: e.target.value, slug: slug(e.target.value)})} required dir="ltr" /></div>
              <div className="space-y-2"><Label>الاسم (عربي)</Label><Input value={form.name_ar} onChange={(e) => setForm({...form, name_ar: e.target.value})} dir="rtl" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>الوصف (إنجليزي)</Label><Textarea value={form.description_en} onChange={(e) => setForm({...form, description_en: e.target.value})} dir="ltr" rows={2} /></div>
              <div className="space-y-2"><Label>الوصف (عربي)</Label><Textarea value={form.description_ar} onChange={(e) => setForm({...form, description_ar: e.target.value})} dir="rtl" rows={2} /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>السعر *</Label><Input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required min="0" step="0.01" /></div>
              <div className="space-y-2"><Label>العملة</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({...form, currency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="SAR">SAR</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>العلامة</Label>
                <Select value={form.brand_id} onValueChange={(v) => setForm({...form, brand_id: v})}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name_ar || b.name_en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>الفئة</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({...form, category_id: v})}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar || c.name_en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value})} dir="ltr" /></div>
              <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} dir="ltr" /></div>
              <div className="space-y-2"><Label>التاغات</Label><Input value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})} placeholder="tag1, tag2" dir="ltr" /></div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm({...form, is_active: c})} /><Label>نشط</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={(c) => setForm({...form, is_featured: c})} /><Label>مميز</Label></div>
            </div>
            {/* Images */}
            <div>
              <Label className="mb-2 block">الصور</Label>
              <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={img} alt="" className="w-full h-full object-cover rounded" />
                    <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <label className="w-20 h-20 border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:bg-muted">
                  {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}{isEdit ? 'حفظ' : 'إضافة'}</Button>
              <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Brands Tab ───
const BrandsTab = () => {
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editBrand, setEditBrand] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { isAdmin } = useAuth();

  const fetchBrands = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('brands').select('*').order('name_en');
    setBrands(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('brands').delete().eq('id', deleteId);
    if (!error) { toast({ title: 'تم الحذف' }); fetchBrands(); }
    setDeleteId(null);
  };

  const filtered = brands.filter((b) => b.name_en.toLowerCase().includes(searchQuery.toLowerCase()) || b.name_ar?.includes(searchQuery));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
        </div>
        <Button onClick={() => { setEditBrand(null); setShowForm(true); }}><Plus className="h-4 w-4 ml-2" />إضافة علامة</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{searchQuery ? 'لا توجد نتائج' : 'لا توجد علامات بعد'}</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البلد</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-24">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {brand.logo_url && <img src={brand.logo_url} alt="" className="w-10 h-10 object-contain" />}
                      <div><p className="font-medium">{brand.name_ar || brand.name_en}</p>{brand.name_ar && <p className="text-xs text-muted-foreground">{brand.name_en}</p>}</div>
                    </div>
                  </TableCell>
                  <TableCell>{brand.country || '-'}</TableCell>
                  <TableCell><Badge variant={brand.is_active ? 'default' : 'secondary'}>{brand.is_active ? 'نشط' : 'مخفي'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditBrand(brand); setShowForm(true); }}><Edit className="h-4 w-4" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" onClick={() => setDeleteId(brand.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BrandFormDialog open={showForm} onClose={() => setShowForm(false)} brand={editBrand} onSaved={fetchBrands} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف هذه العلامة التجارية نهائياً.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Brand Form Dialog ───
const BrandFormDialog = ({ open, onClose, brand, onSaved }: { open: boolean; onClose: () => void; brand: any | null; onSaved: () => void }) => {
  const isEdit = !!brand;
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name_en: '', name_ar: '', description_en: '', description_ar: '', slug: '', country: '', founded_year: '', specialty: '', logo_url: '', is_active: true });

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({ name_en: brand.name_en || '', name_ar: brand.name_ar || '', description_en: brand.description_en || '', description_ar: brand.description_ar || '', slug: brand.slug || '', country: brand.country || '', founded_year: brand.founded_year?.toString() || '', specialty: brand.specialty || '', logo_url: brand.logo_url || '', is_active: brand.is_active ?? true });
    } else {
      setForm({ name_en: '', name_ar: '', description_en: '', description_ar: '', slug: '', country: '', founded_year: '', specialty: '', logo_url: '', is_active: true });
    }
  }, [open, brand, isEdit]);

  const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const data = { name_en: form.name_en, name_ar: form.name_ar || null, description_en: form.description_en || null, description_ar: form.description_ar || null, slug: form.slug || slug(form.name_en), country: form.country || null, founded_year: form.founded_year ? parseInt(form.founded_year) : null, specialty: form.specialty || null, logo_url: form.logo_url || null, is_active: form.is_active };
    try {
      if (isEdit) {
        const { error } = await supabase.from('brands').update(data).eq('id', brand.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('brands').insert(data);
        if (error) throw error;
      }
      toast({ title: isEdit ? 'تم الحفظ' : 'تم الإضافة' });
      onSaved(); onClose();
    } catch (err: any) { toast({ title: 'خطأ', description: err.message, variant: 'destructive' }); }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle>{isEdit ? 'تعديل العلامة' : 'إضافة علامة جديدة'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>الاسم (إنجليزي) *</Label><Input value={form.name_en} onChange={(e) => setForm({...form, name_en: e.target.value, slug: slug(e.target.value)})} required dir="ltr" /></div>
            <div className="space-y-2"><Label>الاسم (عربي)</Label><Input value={form.name_ar} onChange={(e) => setForm({...form, name_ar: e.target.value})} dir="rtl" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>البلد</Label><Input value={form.country} onChange={(e) => setForm({...form, country: e.target.value})} /></div>
            <div className="space-y-2"><Label>سنة التأسيس</Label><Input type="number" value={form.founded_year} onChange={(e) => setForm({...form, founded_year: e.target.value})} /></div>
          </div>
          <div className="space-y-2"><Label>رابط الشعار</Label><Input value={form.logo_url} onChange={(e) => setForm({...form, logo_url: e.target.value})} dir="ltr" placeholder="https://..." /></div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm({...form, is_active: c})} /><Label>نشط</Label></div>
          <div className="flex gap-3"><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}{isEdit ? 'حفظ' : 'إضافة'}</Button><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Categories Tab ───
const CategoriesTab = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { isAdmin } = useAuth();

  const fetchCategories = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('categories').select('*').order('name_en');
    setCategories(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteId);
    if (!error) { toast({ title: 'تم الحذف' }); fetchCategories(); }
    setDeleteId(null);
  };

  const filtered = categories.filter((c) => c.name_en.toLowerCase().includes(searchQuery.toLowerCase()) || c.name_ar?.includes(searchQuery));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
        </div>
        <Button onClick={() => { setEditCat(null); setShowForm(true); }}><Plus className="h-4 w-4 ml-2" />إضافة فئة</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{searchQuery ? 'لا توجد نتائج' : 'لا توجد فئات بعد'}</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم (عربي)</TableHead>
                <TableHead>الاسم (إنجليزي)</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-24">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name_ar || '-'}</TableCell>
                  <TableCell>{cat.name_en}</TableCell>
                  <TableCell><Badge variant={cat.is_active ? 'default' : 'secondary'}>{cat.is_active ? 'نشط' : 'مخفي'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditCat(cat); setShowForm(true); }}><Edit className="h-4 w-4" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" onClick={() => setDeleteId(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryFormDialog open={showForm} onClose={() => setShowForm(false)} category={editCat} onSaved={fetchCategories} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف هذه الفئة نهائياً.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Category Form Dialog ───
const CategoryFormDialog = ({ open, onClose, category, onSaved }: { open: boolean; onClose: () => void; category: any | null; onSaved: () => void }) => {
  const isEdit = !!category;
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name_en: '', name_ar: '', name_fr: '', name_es: '', slug: '', image_url: '', is_active: true });

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({ name_en: category.name_en || '', name_ar: category.name_ar || '', name_fr: category.name_fr || '', name_es: category.name_es || '', slug: category.slug || '', image_url: category.image_url || '', is_active: category.is_active ?? true });
    } else {
      setForm({ name_en: '', name_ar: '', name_fr: '', name_es: '', slug: '', image_url: '', is_active: true });
    }
  }, [open, category, isEdit]);

  const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const data = { name_en: form.name_en, name_ar: form.name_ar || null, name_fr: form.name_fr || null, name_es: form.name_es || null, slug: form.slug || slug(form.name_en), image_url: form.image_url || null, is_active: form.is_active };
    try {
      if (isEdit) {
        const { error } = await supabase.from('categories').update(data).eq('id', category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(data);
        if (error) throw error;
      }
      toast({ title: isEdit ? 'تم الحفظ' : 'تم الإضافة' });
      onSaved(); onClose();
    } catch (err: any) { toast({ title: 'خطأ', description: err.message, variant: 'destructive' }); }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle>{isEdit ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>الاسم (إنجليزي) *</Label><Input value={form.name_en} onChange={(e) => setForm({...form, name_en: e.target.value, slug: slug(e.target.value)})} required dir="ltr" /></div>
            <div className="space-y-2"><Label>الاسم (عربي)</Label><Input value={form.name_ar} onChange={(e) => setForm({...form, name_ar: e.target.value})} dir="rtl" /></div>
          </div>
          <div className="space-y-2"><Label>رابط الصورة</Label><Input value={form.image_url} onChange={(e) => setForm({...form, image_url: e.target.value})} dir="ltr" placeholder="https://..." /></div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm({...form, is_active: c})} /><Label>نشط</Label></div>
          <div className="flex gap-3"><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}{isEdit ? 'حفظ' : 'إضافة'}</Button><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Admin Home (Stats + Tabs) ───
const AdminHome = () => {
  const [stats, setStats] = useState({ products: 0, brands: 0, categories: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [p, b, c] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('brands').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
      ]);
      setStats({ products: p.count || 0, brands: b.count || 0, categories: c.count || 0 });
      setIsLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    { title: 'المنتجات', value: stats.products, icon: Package, color: 'bg-blue-500', tab: 'products' },
    { title: 'العلامات التجارية', value: stats.brands, icon: Tags, color: 'bg-green-500', tab: 'brands' },
    { title: 'الفئات', value: stats.categories, icon: Grid3X3, color: 'bg-purple-500', tab: 'categories' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground">مرحباً بك في لوحة تحكم jWleria</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.tab} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`${stat.color} p-2 rounded-md`}><stat.icon className="h-4 w-4 text-white" /></div>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{isLoading ? '...' : stat.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products" className="gap-2"><Package className="h-4 w-4" />المنتجات</TabsTrigger>
          <TabsTrigger value="brands" className="gap-2"><Tags className="h-4 w-4" />العلامات</TabsTrigger>
          <TabsTrigger value="categories" className="gap-2"><Grid3X3 className="h-4 w-4" />الفئات</TabsTrigger>
        </TabsList>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="brands"><BrandsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminHome;
