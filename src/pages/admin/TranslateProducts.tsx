import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Languages, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationResult {
  productId: string;
  title: string;
  status: 'success' | 'error';
  error?: string;
  translations?: string[];
}

export default function TranslateProducts() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [summary, setSummary] = useState<{ translated: number; failed: number } | null>(null);
  const { toast } = useToast();

  const translateAllProducts = async () => {
    setIsTranslating(true);
    setResults([]);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('translate-product', {
        body: { action: 'translate_all' }
      });

      if (error) throw error;

      setResults(data.results || []);
      setSummary({
        translated: data.translated || 0,
        failed: data.failed || 0,
      });

      toast({
        title: 'Translation Complete',
        description: `Successfully translated ${data.translated} products. ${data.failed} failed.`,
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: 'Translation Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="w-6 h-6" />
              Product Translation Manager
            </CardTitle>
            <CardDescription>
              Automatically translate all products from English to Spanish, Arabic, and French using AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Button 
                onClick={translateAllProducts} 
                disabled={isTranslating}
                size="lg"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Translate All Products
                  </>
                )}
              </Button>
            </div>

            {summary && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-2xl font-bold text-green-600">{summary.translated}</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">Products translated successfully</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-2xl font-bold text-red-600">{summary.failed}</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">Products failed</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Results:</h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {results.map((result, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg flex items-center justify-between ${
                        result.status === 'success' 
                          ? 'bg-green-50 dark:bg-green-900/20' 
                          : 'bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{result.title}</p>
                        {result.error && (
                          <p className="text-sm text-red-600">{result.error}</p>
                        )}
                      </div>
                      {result.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>How it works:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Fetches all products from your Shopify store</li>
                <li>Uses AI to translate titles and descriptions to ES, AR, FR</li>
                <li>Saves translations as product metafields in Shopify</li>
                <li>The storefront reads these metafields based on selected language</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
