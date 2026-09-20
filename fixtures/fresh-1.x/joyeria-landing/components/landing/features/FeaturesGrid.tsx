interface Feature {
  icon: string;
  title: string;
  description: string;
  link?: string;
}

interface FeaturesGridProps {
  features: Feature[];
  title?: string;
}

export default function FeaturesGrid({
  features,
  title = "Our Features"
}: FeaturesGridProps) {
  return (
    <section class="bg-white py-20 px-4">
      <div class="max-w-7xl mx-auto">
        {title && (
          <h2 class="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-16">{title}</h2>
        )}
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              class="group bg-gray-50 rounded-2xl p-8 hover:shadow-2xl hover:bg-white transition-all duration-300 border-2 border-transparent hover:border-purple-600"
            >
              <div class="text-5xl mb-6 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 class="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
              <p class="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
              {feature.link && (
                <a
                  href={feature.link}
                  class="inline-flex items-center text-purple-600 font-semibold group-hover:gap-2 transition-all"
                >
                  Learn more
                  <span class="ml-1 group-hover:ml-2 transition-all">→</span>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
