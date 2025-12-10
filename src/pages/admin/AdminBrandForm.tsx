import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminBrandForm = () => {
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
    description_en: '',
    description_ar: '',
    description_fr: '',
    description_es: '',
    slug: '',
    country: '',
    founded_year: '',
    specialty: '',
    logo_url: '',
    is_active: true,
  });

  useEffect(() => {
    const fetchBrand = async () => {
      if (!isEdit) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('brands').select('*').eq('id', id).single();
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
            description_en: data.description_en || '',
            description_ar: data.description_ar || '',
            description_fr: data.description_fr || '',
            description_es: data.description_es || '',
            slug: data.slug || '',
            country: data.country || '',
            founded_year: data.founded_year?.toString() || '',
            specialty: data.specialty || '',
            logo_url: data.logo_url || '',
            is_active: data.is_active ?? true,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchBrand();
  }, [id, isEdit]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const brandData = {
        name_en: formData.name_en,
        name_ar: formData.name_ar || null,
        name_fr: formData.name_fr || null,
        name_es: formData.name_es || null,
        description_en: formData.description_en || null,
        description_ar: formData.description_ar || null,
        description_fr: formData.description_fr || null,
        description_es: formData.description_es || null,
        slug: formData.slug || generateSlug(formData.name_en),
        country: formData.country || null,
        founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
        specialty: formData.specialty || null,
        logo_url: formData.logo_url || null,
        is_active: formData.is_active,
      };

      if (isEdit) {
        const { error } = await supabase.from('brands').update(brandData).eq('id', id);
        if (error) throw error;
        toast({ title: 'تم الحفظ', description: 'تم تحديث العلامة التجارية بنجاح' });
      } else {
        const { error } = await supabase.from('brands').insert(brandData);
        if (error) throw error;
        toast({ title: 'تم الإضافة', description: 'تم إضافة العلامة التجارية بنجاح' });
      }
      navigate('/admin/brands');
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/brands')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold">{isEdit ? 'تعديل العلامة التجارية' : 'إضافة علامة تجارية'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>التفاصيل</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>البلد</Label>
                  <Input value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>سنة التأسيس</Label>
                  <Input type="number" value={formData.founded_year} onChange={(e) => setFormData({...formData, founded_year: e.target.value})} min="1800" max="2030" />
                </div>
                <div className="space-y-2">
                  <Label>التخصص</Label>
                  <Input value={formData.specialty} onChange={(e) => setFormData({...formData, specialty: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>رابط الشعار</Label>
                  <Input value={formData.logo_url} onChange={(e) => setFormData({...formData, logo_url: e.target.value})} dir="ltr" placeholder="https://..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>الحالة</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label>نشط</Label>
                  <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({...formData, is_active: c})} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {isEdit ? 'حفظ التغييرات' : 'إضافة العلامة'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/brands')}>إلغاء</Button>
        </div>
      </form>
    </div>
  );
};

export default AdminBrandForm;
