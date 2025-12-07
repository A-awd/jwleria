const Footer = () => {
  return (
    <footer className="w-full bg-white text-black pt-8 pb-2 px-6 border-t border-[#e5e5e5] mt-48">
      <div className="">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-8">
          {/* Brand - Right side */}
          <div>
            <span className="text-xl font-bold tracking-widest text-black mb-4 block">jWleria</span>
            <p className="text-sm font-normal text-black/70 leading-relaxed max-w-md mb-6">
              مجوهرات أنيقة مصنوعة للشخصية العصرية
            </p>
            
            {/* Contact Information */}
            <div className="space-y-2 text-sm font-normal text-black/70">
              <div>
                <p className="font-medium text-black mb-1">زورونا</p>
                <p>١٢٣ شارع الملك فهد</p>
                <p>الرياض، المملكة العربية السعودية</p>
              </div>
              <div>
                <p className="font-medium text-black mb-1 mt-3">تواصل معنا</p>
                <p>+٩٦٦ ١١ ٥٥٥ ٠١٢٣</p>
                <p>hello@jwleria.com</p>
              </div>
            </div>
          </div>

          {/* Link lists - Left side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Shop */}
            <div>
              <h4 className="text-sm font-medium mb-4">تسوق</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">جديدنا</a></li>
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">خواتم</a></li>
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">أقراط</a></li>
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">أساور</a></li>
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">قلادات</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-medium mb-4">المساعدة</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">دليل المقاسات</a></li>
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">العناية بالمجوهرات</a></li>
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">الإرجاع</a></li>
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">الشحن</a></li>
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">تواصل معنا</a></li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="text-sm font-medium mb-4">تواصل</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">انستغرام</a></li>
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">بنترست</a></li>
                <li><a href="#" className="text-sm font-normal text-black/70 hover:text-black transition-colors">النشرة البريدية</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - edge to edge separator */}
      <div className="border-t border-[#e5e5e5] -mx-6 px-6 pt-2">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm font-normal text-black mb-1 md:mb-0">
            © ٢٠٢٤ jWleria. جميع الحقوق محفوظة.
          </p>
          <div className="flex space-x-6 space-x-reverse">
            <a href="/privacy-policy" className="text-sm font-normal text-black hover:text-black/70 transition-colors">
              سياسة الخصوصية
            </a>
            <a href="/terms-of-service" className="text-sm font-normal text-black hover:text-black/70 transition-colors">
              الشروط والأحكام
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;