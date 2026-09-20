interface CTASimpleProps {
  title: string;
  description?: string;
  ctaText: string;
  ctaLink: string;
  bgColor?: string;
}

export default function CTASimple({
  title,
  description,
  ctaText,
  ctaLink,
  bgColor = "bg-gradient-to-r from-purple-600 to-blue-600"
}: CTASimpleProps) {
  return (
    <section class={`${bgColor} text-white py-20 px-4`}>
      <div class="max-w-4xl mx-auto text-center space-y-6">
        <h2 class="text-4xl md:text-5xl font-bold">{title}</h2>
        {description && <p class="text-xl text-gray-100">{description}</p>}
        <a
          href={ctaLink}
          class="inline-block px-8 py-4 bg-white text-purple-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
        >
          {ctaText}
        </a>
      </div>
    </section>
  );
}
