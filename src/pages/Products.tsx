import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import ProductsCatalog from "@/components/products/ProductsCatalog";

const Products = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main id="main-content" className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-light tracking-wide text-foreground mb-8">Products</h1>
          <ProductsCatalog />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Products;
