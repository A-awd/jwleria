import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Loader2, Upload, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState<{id: string; name_en: string; name_ar: string | null}[]>([]);
  const [categories, setCategories] = useState<{id: string; name_en: string; name_ar: string | null}[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    name_fr: '',
    name_es: '',
    description_en: '',
    description_ar: '',
    description_fr: '',
    description_es: '',
    material_en: '',
    material_ar: '',
    material_fr: '',
    material_es: '',
    price: '',
    currency: 'SAR',
    sku: '',
    slug: '',
    brand_id: '',
    category_id: '',
    is_active: true,
    is_featured: false,
    dimensions: '',
    weight_grams: '',
    tags: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [brandsRes, categoriesRes] = await Promise.all([
          supabase.from('brands').select('id, name_en, name_ar').eq('is_active', true).order('name_en'),
          supabase.from('categories').select('id, name_en, name_ar').eq('is_active', true).order('name_en'),
        ]);
        setBrands(brandsRes.data || []);
        setCategories(categoriesRes.data || []);

        if (isEdit) {
          const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
          if (error) throw error;
          if (data) {
            setFormData({
              name_en: data.name_en || '',
              name_ar: data.name_ar || '',
              name_fr: data.name_fr || '',
              name_es: data.name_es || '',
              description_en: data.description_en || '',
              description_ar: data.description_ar || '',
              description_fr: data.description_fr || '',
              description_es: data.description_es || '',
              material_en: data.material_en || '',
              material_ar: data.material_ar || '',
              material_fr: data.material_fr || '',
              material_es: data.material_es || '',
              price: data.price?.toString() || '',
              currency: data.currency || 'SAR',
              sku: data.sku || '',
              slug: data.slug || '',
              brand_id: data.brand_id || '',
              category_id: data.category_id || '',
              is_active: data.is_active ?? true,
              is_featured: data.is_featured ?? false,
              dimensions: data.dimensions || '',
              weight_grams: data.weight_grams?.toString() || '',
              tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
            });
            setImages(Array.isArray(data.images) ? data.images as string[] : []);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        toast({ title: 'خطأ', description: 'فشل في تحميل البيانات', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, isEdit]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
      setImages([...images, urlData.publicUrl]);
      toast({ title: 'تم الرفع', description: 'تم رفع الصورة بنجاح' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'خطأ', description: 'فشل في رفع الصورة', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const productData = {
        name_en: formData.name_en,
        name_ar: formData.name_ar || null,
        name_fr: formData.name_fr || null,
        name_es: formData.name_es || null,
        description_en: formData.description_en || null,
        description_ar: formData.description_ar || null,
        description_fr: formData.description_fr || null,
        description_es: formData.description_es || null,
        material_en: formData.material_en || null,
        material_ar: formData.material_ar || null,
        material_fr: formData.material_fr || null,
        material_es: formData.material_es || null,
        price: parseFloat(formData.price) || 0,
        currency: formData.currency,
        sku: formData.sku || null,
        slug: formData.slug || generateSlug(formData.name_en),
        brand_id: formData.brand_id || null,
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        dimensions: formData.dimensions || null,
        weight_grams: formData.weight_grams ? parseFloat(formData.weight_grams) : null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        images: images,
      };

      if (isEdit) {
        const { error } = await supabase.from('products').update(productData).eq('id', id);
        if (error) throw error;
        toast({ title: 'تم الحفظ', description: 'تم تحديث المنتج بنجاح' });
      } else {
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
        toast({ title: 'تم الإضافة', description: 'تم إضافة المنتج بنجاح' });
      }
      navigate('/admin/products');
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: 'خطأ', description: error.message || 'فشل في حفظ المنتج', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/products')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold">{isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>المعلومات الأساسية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم (إنجليزي) *</Label>
                  <Input value={formData.name_en} onChange={(e) => setFormData({...formData, name_en: e.target.value, slug: generateSlug(e.target.value)})} required dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>الاسم (عربي)</Label>
                  <Input value={formData.name_ar} onChange={(e) => setFormData({...formData, name_ar: e.target.value})} dir="rtl" />
                </div>
                <div className="space-y-2">
                  <Label>الاسم (فرنسي)</Label>
                  <Input value={formData.name_fr} onChange={(e) => setFormData({...formData, name_fr: e.target.value})} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>الاسم (إسباني)</Label>
                  <Input value={formData.name_es} onChange={(e) => setFormData({...formData, name_es: e.target.value})} dir="ltr" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الوصف (إنجليزي)</Label>
                  <Textarea value={formData.description_en} onChange={(e) => setFormData({...formData, description_en: e.target.value})} dir="ltr" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>الوصف (عربي)</Label>
                  <Textarea value={formData.description_ar} onChange={(e) => setFormData({...formData, description_ar: e.target.value})} dir="rtl" rows={3} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المادة (إنجليزي)</Label>
                  <Input value={formData.material_en} onChange={(e) => setFormData({...formData, material_en: e.target.value})} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>المادة (عربي)</Label>
                  <Input value={formData.material_ar} onChange={(e) => setFormData({...formData, material_ar: e.target.value})} dir="rtl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>التصنيف</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>العلامة التجارية</Label>
                  <Select value={formData.brand_id} onValueChange={(v) => setFormData({...formData, brand_id: v})}>
                    <SelectTrigger><SelectValue placeholder="اختر العلامة" /></SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name_ar || b.name_en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الفئة</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({...formData, category_id: v})}>
                    <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar || c.name_en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>السعر والمخزون</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>السعر *</Label>
                    <Input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required min="0" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label>العملة</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} dir="ltr" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>الحالة</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>نشط</Label>
                  <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({...formData, is_active: c})} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>مميز</Label>
                  <Switch checked={formData.is_featured} onCheckedChange={(c) => setFormData({...formData, is_featured: c})} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Images */}
        <Card>
          <CardHeader><CardTitle>الصور</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {images.map((img, i) => (
                <div key={i} className="relative w-24 h-24">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-md" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 border-2 border-dashed border-border rounded-md flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                {uploadingImage ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {isEdit ? 'حفظ التغييرات' : 'إضافة المنتج'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/products')}>إلغاء</Button>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;
