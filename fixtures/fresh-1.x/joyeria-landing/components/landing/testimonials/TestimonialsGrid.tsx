interface TestimonialsGridProps {
  testimonials?: Array<{
    quote: string;
    author: string;
    role: string;
    company: string;
    image?: string;
  }>;
}

export default function TestimonialsGrid({
  testimonials = [
    {
      quote: "This product has completely transformed how we work. The team is responsive and the results speak for themselves.",
      author: "Sarah Johnson",
      role: "CEO",
      company: "TechCorp Inc.",
      image: "/testimonial-1.jpg"
    },
    {
      quote: "Outstanding quality and exceptional service. We've seen a 300% improvement in our metrics since implementation.",
      author: "Michael Chen",
      role: "Director of Operations",
      company: "Growth Solutions",
      image: "/testimonial-2.jpg"
    },
    {
      quote: "The best investment we've made this year. Highly recommended for any team looking to scale efficiently.",
      author: "Emily Rodriguez",
      role: "Product Manager",
      company: "Innovate Labs",
      image: "/testimonial-3.jpg"
    },
    {
      quote: "Impressive results from day one. The platform is intuitive and the support team goes above and beyond.",
      author: "David Kim",
      role: "CTO",
      company: "Digital Ventures",
      image: "/testimonial-4.jpg"
    }
  ]
}: TestimonialsGridProps) {
  return (
    <section class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            What Our Customers Say
          </h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it - hear from businesses that have transformed their operations
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              class="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-shadow"
            >
              <div class="flex items-start gap-4 mb-6">
                {testimonial.image && (
                  <img
                    src={testimonial.image}
                    alt={testimonial.author}
                    class="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 class="font-semibold text-gray-900">{testimonial.author}</h3>
                  <p class="text-sm text-gray-600">{testimonial.role}</p>
                  <p class="text-sm text-gray-500">{testimonial.company}</p>
                </div>
              </div>
              <p class="text-gray-700 italic leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div class="flex gap-1 mt-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}