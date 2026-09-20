interface FooterLink {
  text: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface FooterCompleteProps {
  brandName?: string;
  description?: string;
  sections?: FooterSection[];
  bottomLinks?: FooterLink[];
  copyright?: string;
}

export default function FooterComplete({
  brandName = "Brand",
  description = "Your trusted partner for amazing solutions.",
  sections = [],
  bottomLinks = [],
  copyright
}: FooterCompleteProps) {
  const currentYear = new Date().getFullYear();
  const copyrightText = copyright || `© ${currentYear} ${brandName}. All rights reserved.`;

  return (
    <footer class="bg-gray-900 text-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Brand Section */}
        <div class="mb-12">
          <h3 class="text-3xl font-bold mb-4">{brandName}</h3>
          <p class="text-gray-400 max-w-md">{description}</p>
        </div>

        {/* Sitemap Grid */}
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-12">
          {sections.map((section) => (
            <div key={section.title}>
              <h4 class="font-semibold mb-4 text-lg">{section.title}</h4>
              <ul class="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      class="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div class="border-t border-gray-800 pt-8">
          <div class="flex flex-col md:flex-row justify-between items-center gap-4">
            <p class="text-gray-400 text-sm">{copyrightText}</p>
            {bottomLinks.length > 0 && (
              <nav class="flex gap-6">
                {bottomLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    class="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.text}
                  </a>
                ))}
              </nav>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
