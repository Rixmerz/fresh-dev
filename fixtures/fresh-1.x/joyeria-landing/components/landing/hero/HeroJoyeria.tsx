interface HeroJoyeriaProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  imageSrc: string;
}

export default function HeroJoyeria({
  title,
  subtitle,
  ctaText = "Get Started",
  ctaLink = "#",
  imageSrc
}: HeroJoyeriaProps) {
  return (
    <section class="min-h-screen grid md:grid-cols-2">
      {/* Left side - Content */}
      <div class="flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 px-8 py-20">
        <div class="max-w-lg text-white space-y-6">
          <h1 class="text-5xl md:text-6xl font-bold leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p class="text-xl text-purple-100">{subtitle}</p>
          )}
          {ctaText && (
            <a
              href={ctaLink}
              class="inline-block px-8 py-4 bg-white text-purple-600 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              {ctaText}
            </a>
          )}
        </div>
      </div>

      {/* Right side - Image */}
      <div class="relative min-h-[400px] md:min-h-full">
        <img
          src={imageSrc}
          alt={title}
          class="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          fetchpriority="high"
        />
      </div>
    </section>
  );
}
