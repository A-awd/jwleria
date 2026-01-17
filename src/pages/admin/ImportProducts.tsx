import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Upload, FileText, Globe, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ImportResult {
  success: boolean;
  message?: string;
  error?: string;
  result?: {
    productsImported: number;
    categoriesImported: number;
    failedProducts: { name: string; reason: string }[];
  };
  rawData?: {
    markdownLength: number;
    htmlLength: number;
    linksCount: number;
    sampleLinks: string[];
    markdownPreview: string;
  };
}

export default function ImportProducts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [storeUrl, setStoreUrl] = useState('https://a2018011207583011294.szwego.com/weshop/store/_ZMAqfyWVgeIJzxk_lFSY2lWup1lK3tSA');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleSzwegoImport = async () => {
    if (!storeUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a store URL',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setImportResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('szwego-import', {
        body: { storeUrl, action: 'import' },
      });

      if (error) {
        console.error('Import error:', error);
        setImportResult({
          success: false,
          error: error.message || 'Failed to import products',
        });
        toast({
          title: 'Import Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        console.log('Import result:', data);
        setImportResult(data);
        
        if (data.success) {
          toast({
            title: 'Import Completed',
            description: `Imported ${data.result?.productsImported || 0} products and ${data.result?.categoriesImported || 0} categories`,
          });
        } else {
          toast({
            title: 'Import Issue',
            description: data.error || 'Some products may not have been imported',
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      console.error('Import exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setImportResult({
        success: false,
        error: errorMessage,
      });
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Import Products</h1>
          <p className="text-muted-foreground mt-2">
            Import products from external sources into your store
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/products')}>
          Back to Products
        </Button>
      </div>

      <Tabs defaultValue="szwego" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="szwego" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Szwego Import
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            CSV Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="szwego">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Import from Szwego Store
              </CardTitle>
              <CardDescription>
                Enter the Szwego store URL to attempt importing products. Note: Szwego uses anti-bot protection,
                so some content may not be accessible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Store URL</label>
                <Input
                  type="url"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://example.szwego.com/weshop/store/..."
                  className="font-mono text-sm"
                />
              </div>

              <Button 
                onClick={handleSzwegoImport} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Start Import
                  </>
                )}
              </Button>

              {/* Import Result */}
              {importResult && (
                <div className="mt-6 space-y-4">
                  <div className={`p-4 rounded-lg border ${
                    importResult.success 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                      : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-semibold">
                        {importResult.success ? 'Import Completed' : 'Import Failed'}
                      </span>
                    </div>
                    
                    {importResult.error && (
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {importResult.error}
                      </p>
                    )}

                    {importResult.result && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="text-center p-3 bg-background rounded-lg">
                          <div className="text-2xl font-bold">{importResult.result.productsImported}</div>
                          <div className="text-sm text-muted-foreground">Products Imported</div>
                        </div>
                        <div className="text-center p-3 bg-background rounded-lg">
                          <div className="text-2xl font-bold">{importResult.result.categoriesImported}</div>
                          <div className="text-sm text-muted-foreground">Categories Imported</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Failed Products */}
                  {importResult.result?.failedProducts && importResult.result.failedProducts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-600">
                          <AlertTriangle className="h-5 w-5" />
                          Failed Products ({importResult.result.failedProducts.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product Name</TableHead>
                              <TableHead>Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importResult.result.failedProducts.map((product, index) => (
                              <TableRow key={index}>
                                <TableCell>{product.name}</TableCell>
                                <TableCell className="text-red-600">{product.reason}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* Raw Data Preview */}
                  {importResult.rawData && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Scraped Data Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Markdown:</span>
                            <span className="ml-2 font-mono">{importResult.rawData.markdownLength} chars</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">HTML:</span>
                            <span className="ml-2 font-mono">{importResult.rawData.htmlLength} chars</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Links:</span>
                            <span className="ml-2 font-mono">{importResult.rawData.linksCount}</span>
                          </div>
                        </div>

                        {importResult.rawData.sampleLinks && importResult.rawData.sampleLinks.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Sample Links Found:</h4>
                            <div className="max-h-40 overflow-auto bg-muted p-2 rounded text-xs font-mono">
                              {importResult.rawData.sampleLinks.map((link, i) => (
                                <div key={i} className="truncate">{link}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {importResult.rawData.markdownPreview && (
                          <div>
                            <h4 className="font-medium mb-2">Content Preview:</h4>
                            <pre className="max-h-60 overflow-auto bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                              {importResult.rawData.markdownPreview}
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Import from CSV File
              </CardTitle>
              <CardDescription>
                Upload a CSV file containing your product data. Download the template to see the required format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" onClick={() => downloadCsvTemplate()}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV Template
              </Button>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  className="max-w-xs mx-auto"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleCsvImport(file);
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  function downloadCsvTemplate() {
    const template = `name_en,name_ar,description_en,description_ar,price,compare_at_price,sku,brand,category,images,tags
"Product Name","اسم المنتج","English description","الوصف بالعربي",1500,1800,SKU-001,Brand Name,Category Name,"https://example.com/image1.jpg,https://example.com/image2.jpg","tag1,tag2"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleCsvImport(file: File) {
    toast({
      title: 'CSV Import',
      description: 'CSV import feature coming soon!',
    });
  }
}
