import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, Lock, Eye, EyeOff, User, ArrowRight, AlertCircle } from "lucide-react";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "@/hooks/use-toast";

// Shopify Customer Account API
const CUSTOMER_CREATE_MUTATION = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
        firstName
        lastName
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

const CUSTOMER_ACCESS_TOKEN_CREATE = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

const CUSTOMER_QUERY = `
  query customer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      email
      firstName
      lastName
      phone
      orders(first: 10) {
        edges {
          node {
            id
            orderNumber
            processedAt
            financialStatus
            fulfillmentStatus
            totalPrice {
              amount
              currencyCode
            }
            lineItems(first: 5) {
              edges {
                node {
                  title
                  quantity
                }
              }
            }
          }
        }
      }
    }
  }
`;

const CUSTOMER_RECOVER_MUTATION = `
  mutation customerRecover($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

interface CustomerData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  orders: {
    edges: Array<{
      node: {
        id: string;
        orderNumber: number;
        processedAt: string;
        financialStatus: string;
        fulfillmentStatus: string;
        totalPrice: {
          amount: string;
          currencyCode: string;
        };
        lineItems: {
          edges: Array<{
            node: {
              title: string;
              quantity: number;
            };
          }>;
        };
      };
    }>;
  };
}

const ACCESS_TOKEN_KEY = 'shopify_customer_access_token';

const Account = () => {
  const { t, direction } = useLanguage();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const storeDomain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
  const storefrontToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;
  const isConfigured = Boolean(storeDomain && storefrontToken);

  const graphqlFetch = async <T,>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    const response = await fetch(
      `https://${storeDomain}/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    const json = await response.json();
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL error');
    }
    return json.data;
  };

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && isConfigured) {
      setAccessToken(token);
      fetchCustomer(token);
    }
  }, [isConfigured]);

  const fetchCustomer = async (token: string) => {
    setIsLoading(true);
    try {
      const data = await graphqlFetch<{ customer: CustomerData | null }>(
        CUSTOMER_QUERY,
        { customerAccessToken: token }
      );
      if (data.customer) {
        setCustomer(data.customer);
      } else {
        // Token expired or invalid
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        setAccessToken(null);
      }
    } catch (err) {
      console.error('Failed to fetch customer:', err);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await graphqlFetch<{
        customerAccessTokenCreate: {
          customerAccessToken: { accessToken: string; expiresAt: string } | null;
          customerUserErrors: Array<{ code: string; message: string }>;
        };
      }>(CUSTOMER_ACCESS_TOKEN_CREATE, {
        input: { email, password },
      });

      const { customerAccessToken, customerUserErrors } = data.customerAccessTokenCreate;

      if (customerUserErrors.length > 0) {
        setError(t('invalidCredentials'));
        return;
      }

      if (customerAccessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, customerAccessToken.accessToken);
        setAccessToken(customerAccessToken.accessToken);
        await fetchCustomer(customerAccessToken.accessToken);
        toast({ title: t('welcomeBack') });
      }
    } catch (err) {
      setError(t('invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t('passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    setIsLoading(true);

    try {
      const data = await graphqlFetch<{
        customerCreate: {
          customer: { id: string } | null;
          customerUserErrors: Array<{ code: string; field: string[]; message: string }>;
        };
      }>(CUSTOMER_CREATE_MUTATION, {
        input: { email, password, firstName, lastName },
      });

      const { customerUserErrors } = data.customerCreate;

      if (customerUserErrors.length > 0) {
        const emailError = customerUserErrors.find(e => e.field?.includes('email'));
        if (emailError) {
          setError(t('emailAlreadyExists'));
        } else {
          setError(customerUserErrors[0].message);
        }
        return;
      }

      // Auto sign in after registration
      const tokenData = await graphqlFetch<{
        customerAccessTokenCreate: {
          customerAccessToken: { accessToken: string } | null;
          customerUserErrors: Array<{ message: string }>;
        };
      }>(CUSTOMER_ACCESS_TOKEN_CREATE, {
        input: { email, password },
      });

      if (tokenData.customerAccessTokenCreate.customerAccessToken) {
        const token = tokenData.customerAccessTokenCreate.customerAccessToken.accessToken;
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        setAccessToken(token);
        await fetchCustomer(token);
        toast({ title: t('welcomeBack') });
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await graphqlFetch(CUSTOMER_RECOVER_MUTATION, { email });
      toast({
        title: t('passwordResetSent'),
        description: t('checkYourEmail'),
      });
      setMode('signin');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setAccessToken(null);
    setCustomer(null);
    toast({ title: t('signOut') });
  };

  // Loading state
  if (isLoading && !customer && accessToken) {
    return (
      <div className="min-h-screen bg-background" dir={direction}>
        <Header />
        <main className="pt-32 pb-20">
          <div className="max-w-md mx-auto px-6 text-center">
            <Loader2 className="w-12 h-12 mx-auto text-muted-foreground animate-spin mb-4" />
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Logged in - show account dashboard
  if (customer && accessToken) {
    return (
      <div className="min-h-screen bg-background" dir={direction}>
        <Header />
        <main className="pt-32 pb-20">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-light text-foreground">{t('myAccount')}</h1>
              <Button variant="outline" onClick={handleSignOut} className="rounded-none">
                {t('signOut')}
              </Button>
            </div>

            {/* Account Details */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-muted/20 border border-border/30 p-6">
                <h2 className="text-xl font-light text-foreground mb-4">{t('accountDetails')}</h2>
                <div className="space-y-2">
                  <p className="text-foreground">
                    {customer.firstName} {customer.lastName}
                  </p>
                  <p className="text-muted-foreground text-sm">{customer.email}</p>
                  {customer.phone && (
                    <p className="text-muted-foreground text-sm">{customer.phone}</p>
                  )}
                </div>
              </div>

              <div className="bg-muted/20 border border-border/30 p-6">
                <h2 className="text-xl font-light text-foreground mb-4">{t('orderHistory')}</h2>
                <p className="text-muted-foreground text-sm">
                  {customer.orders.edges.length} {customer.orders.edges.length === 1 ? 'order' : 'orders'}
                </p>
              </div>
            </div>

            {/* Order History */}
            <div className="bg-muted/20 border border-border/30 p-6">
              <h2 className="text-xl font-light text-foreground mb-6">{t('orderHistory')}</h2>
              
              {customer.orders.edges.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No orders yet</p>
                  <Button asChild className="rounded-none">
                    <Link to="/category/all">{t('continueShopping')}</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {customer.orders.edges.map(({ node: order }) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-background border border-border/30">
                      <div>
                        <p className="font-medium text-foreground">Order #{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.processedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.lineItems.edges.map(({ node }) => `${node.title} x${node.quantity}`).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {order.totalPrice.currencyCode} {parseFloat(order.totalPrice.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {order.fulfillmentStatus?.toLowerCase().replace('_', ' ') || 'Processing'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not logged in - show auth forms
  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />
      <main className="pt-32 pb-20">
        <div className="max-w-md mx-auto px-6">
          {/* Sign In Form */}
          {mode === 'signin' && (
            <div>
              <div className="text-center mb-8">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h1 className="text-2xl font-light text-foreground">{t('welcomeBack')}</h1>
                <p className="text-muted-foreground text-sm mt-2">{t('signInToContinue')}</p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">{t('emailAddress')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 rounded-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 rounded-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {t('forgotPassword')}
                </button>

                <Button type="submit" className="w-full rounded-none py-6" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('signIn')}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {t('noAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-foreground hover:underline"
                  >
                    {t('signUp')}
                  </button>
                </p>
              </form>
            </div>
          )}

          {/* Sign Up Form */}
          {mode === 'signup' && (
            <div>
              <div className="text-center mb-8">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h1 className="text-2xl font-light text-foreground">{t('createYourAccount')}</h1>
                <p className="text-muted-foreground text-sm mt-2">{t('joinCommunity')}</p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('firstName')}</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="rounded-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('lastName')}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="rounded-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupEmail">{t('emailAddress')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signupEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 rounded-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword">{t('password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signupPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 rounded-none"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 rounded-none"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full rounded-none py-6" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('createAccount')}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {t('haveAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-foreground hover:underline"
                  >
                    {t('signIn')}
                  </button>
                </p>
              </form>
            </div>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <div>
              <div className="text-center mb-8">
                <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h1 className="text-2xl font-light text-foreground">{t('resetPassword')}</h1>
                <p className="text-muted-foreground text-sm mt-2">{t('checkYourEmail')}</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="resetEmail">{t('emailAddress')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="resetEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 rounded-none"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full rounded-none py-6" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('resetPassword')}
                </Button>

                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  ← {t('signIn')}
                </button>
              </form>
            </div>
          )}

          {/* Not configured warning */}
          {!isConfigured && (
            <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm rounded">
              <p>Shopify customer accounts are not configured. Please ensure your Shopify Storefront API credentials are set up.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Account;
