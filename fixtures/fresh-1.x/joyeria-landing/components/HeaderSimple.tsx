interface NavLink {
  text: string;
  href: string;
}

interface HeaderSimpleProps {
  logo?: string;
  logoText: string;
  navLinks: NavLink[];
  ctaText: string;
  ctaLink: string;
}

export default function HeaderSimple({
  logo,
  logoText,
  navLinks,
  ctaText,
  ctaLink,
}: HeaderSimpleProps) {
  return (
    <header class="sticky top-0 z-50 bg-white shadow-md">
      <nav class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          {/* Logo */}
          <a href="/" class="flex items-center space-x-2">
            {logo && <img src={logo} alt="Logo" class="h-8 w-8" />}
            <span class="text-xl font-bold text-gray-900">{logoText}</span>
          </a>

          {/* Navigation Links */}
          <div class="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                class="text-gray-600 hover:text-rose-600 transition-colors"
              >
                {link.text}
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <a
            href={ctaLink}
            class="bg-gradient-to-r from-rose-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-rose-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-md"
          >
            {ctaText}
          </a>
        </div>
      </nav>
    </header>
  );
}
