interface GalleryJoyeriaProps {
  images?: Array<{ src: string; alt: string; title?: string; category?: string }>;
}

export default function GalleryJoyeria({
  images = [
    { src: "/gallery-1.jpg", alt: "Gallery image 1", title: "Project Alpha", category: "Web Design" },
    { src: "/gallery-2.jpg", alt: "Gallery image 2", title: "Project Beta", category: "Branding" },
    { src: "/gallery-3.jpg", alt: "Gallery image 3", title: "Project Gamma", category: "Photography" },
    { src: "/gallery-4.jpg", alt: "Gallery image 4", title: "Project Delta", category: "Web Design" },
    { src: "/gallery-5.jpg", alt: "Gallery image 5", title: "Project Epsilon", category: "Illustration" },
    { src: "/gallery-6.jpg", alt: "Gallery image 6", title: "Project Zeta", category: "Branding" }
  ]
}: GalleryJoyeriaProps) {
  return (
    <section class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-4xl font-bold text-center text-gray-900 mb-12">Our Work</h2>

        <div class="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {images.map((image, i) => (
            <div key={i} class="break-inside-avoid group relative overflow-hidden rounded-xl cursor-pointer">
              <img
                src={image.src}
                alt={image.alt}
                class="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                {image.title && <h3 class="text-white text-xl font-bold mb-1">{image.title}</h3>}
                {image.category && <p class="text-white/80 text-sm">{image.category}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}