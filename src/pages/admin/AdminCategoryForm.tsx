import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminCategoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    name_fr: '',
    name_es: '',
    slug: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    const fetchCategory = async () => {
      if (!isEdit) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('categories').select('*').eq('id', id).single();
        if (error) {
          toast({ title: 'خطأ', description: 'فشل في تحميل البيانات', variant: 'destructive' });
          return;
        }
        if (data) {
          setFormData({
            name_en: data.name_en || '',
            name_ar: data.name_ar || '',
            name_fr: data.name_fr || '',
            name_es: data.name_es || '',
            slug: data.slug || '',
            image_url: data.image_url || '',
            is_active: data.is_active ?? true,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategory();
  }, [id, isEdit]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const categoryData = {
        name_en: formData.name_en,
        name_ar: formData.name_ar || null,
        name_fr: formData.name_fr || null,
        name_es: formData.name_es || null,
        slug: formData.slug || generateSlug(formData.name_en),
        image_url: formData.image_url || null,
        is_active: formData.is_active,
      };

      if (isEdit) {
        const { error } = await supabase.from('categories').update(categoryData).eq('id', id);
        if (error) throw error;
        toast({ title: 'تم الحفظ', description: 'تم تحديث الفئة بنجاح' });
      } else {
        const { error } = await supabase.from('categories').insert(categoryData);
        if (error) throw error;
        toast({ title: 'تم الإضافة', description: 'تم إضافة الفئة بنجاح' });
      }
      navigate('/admin/categories');
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: 'خطأ', description: error.message || 'فشل في الحفظ', variant: 'destructive' });
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/categories')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold">{isEdit ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle>الأسماء</CardTitle></CardHeader>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>التفاصيل</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>رابط الصورة</Label>
              <Input value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} dir="ltr" placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>نشط</Label>
              <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({...formData, is_active: c})} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {isEdit ? 'حفظ التغييرات' : 'إضافة الفئة'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/categories')}>إلغاء</Button>
        </div>
      </form>
    </div>
  );
};

export default AdminCategoryForm;
