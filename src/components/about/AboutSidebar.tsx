import { NavLink } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';

const AboutSidebar = () => {
  const { t } = useLanguage();

  const aboutPages = [
    { nameKey: 'ourStory', path: '/about/our-story' },
    { nameKey: 'sustainability', path: '/about/sustainability' },
    { nameKey: 'sizeGuide', path: '/about/size-guide' },
    { nameKey: 'customerCare', path: '/about/customer-care' },
  ];

  return (
    <aside className="hidden md:block w-64 sticky top-32 h-fit px-6">
      <nav className="space-y-1">
        <h3 className="text-lg font-light text-foreground mb-6">{t("about")}</h3>
        {aboutPages.map((page) => (
          <NavLink
            key={page.path}
            to={page.path}
            className={({ isActive }) =>
              `block py-2 text-sm font-light transition-all ${
                isActive
                  ? 'text-primary underline decoration-2 underline-offset-4'
                  : 'text-muted-foreground hover:text-foreground hover:underline hover:decoration-1 hover:underline-offset-4'
              }`
            }
          >
            {t(page.nameKey as any)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AboutSidebar;
