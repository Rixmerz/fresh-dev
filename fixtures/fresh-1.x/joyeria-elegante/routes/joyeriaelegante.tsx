import type { Feature, JewelryProduct, Testimonial } from "../types/joyeria.ts";

export default function JoyeriaElegante() {
  const productos: JewelryProduct[] = [
    {
      id: "1",
      name: "Collar Esmeralda Imperial",
      description: "Collar de oro blanco 18k con esmeraldas colombianas",
      price: "$12,500",
      category: "collares",
      material: "Oro Blanco 18k",
      featured: true,
      inStock: true,
      image: "/images/pexels/luxury-jewelry-diamond-necklace-elegant-3641059.jpg",
      karat: "18k",
    },
    {
      id: "2",
      name: "Anillo Diamante Solitario",
      description: "Anillo de compromiso con diamante certificado 1.5ct",
      price: "$18,900",
      category: "anillos",
      material: "Platino 950",
      featured: true,
      inStock: true,
      image: "/images/pexels/luxury-jewelry-diamond-necklace-elegant-3641056.jpg",
      discount: "15% OFF",
    },
    {
      id: "3",
      name: "Set Perlas Tahití",
      description: "Set completo: collar, aretes y pulsera de perlas negras",
      price: "$9,800",
      category: "sets",
      material: "Oro Amarillo 14k",
      featured: true,
      inStock: true,
      image: "/images/pexels/luxury-jewelry-diamond-necklace-elegant-10983785.jpg",
      karat: "14k",
    },
  ];

  const features: Feature[] = [
    {
      icon: "💎",
      title: "Piedras Certificadas",
      description:
        "Todas nuestras gemas cuentan con certificación internacional",
    },
    {
      icon: "🏆",
      title: "Artesanía Excepcional",
      description:
        "Cada pieza es trabajada por maestros joyeros con +20 años de experiencia",
    },
    {
      icon: "🔒",
      title: "Garantía de por Vida",
      description: "Garantía completa en materiales y manufactura",
    },
    {
      icon: "✨",
      title: "Diseños Exclusivos",
      description: "Colecciones limitadas y piezas únicas personalizadas",
    },
  ];

  const testimonios: Testimonial[] = [
    {
      name: "Isabella Fernández",
      location: "Polanco, CDMX",
      content:
        "El anillo de compromiso superó todas mis expectativas. La calidad es excepcional y el servicio personalizado fue extraordinario.",
      rating: 5,
      date: "Noviembre 2024",
    },
    {
      name: "Sofía Mendoza",
      location: "San Pedro, Monterrey",
      content:
        "Compré un collar de esmeraldas para mi aniversario. La pieza es simplemente espectacular, cada detalle es perfecto.",
      rating: 5,
      date: "Octubre 2024",
    },
    {
      name: "Valentina Ruiz",
      location: "Guadalajara",
      content:
        "La mejor inversión en joyería que he hecho. El set de perlas es una obra de arte que usaré toda la vida.",
      rating: 5,
      date: "Septiembre 2024",
    },
  ];

  return (
    <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header - Elegante y minimalista */}
      <header class="bg-black/50 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b border-amber-900/20">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-4xl">💎</span>
              <div>
                <h1 class="text-2xl font-serif font-bold text-amber-400">
                  Elegance Royale
                </h1>
                <p class="text-xs text-amber-200/70">Haute Joaillerie</p>
              </div>
            </div>
            <nav class="hidden md:flex gap-8">
              <a
                href="#colecciones"
                class="text-amber-100 hover:text-amber-400 transition font-light"
              >
                Colecciones
              </a>
              <a
                href="#exclusivos"
                class="text-amber-100 hover:text-amber-400 transition font-light"
              >
                Exclusivos
              </a>
              <a
                href="#testimonios"
                class="text-amber-100 hover:text-amber-400 transition font-light"
              >
                Testimonios
              </a>
              <a
                href="#contacto"
                class="text-amber-100 hover:text-amber-400 transition font-light"
              >
                Contacto
              </a>
            </nav>
            <button
              type="button"
              class="bg-gradient-to-r from-amber-600 to-amber-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-amber-500/50 transition-all"
            >
              Agendar Cita
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - Dramático y lujoso */}
      <section class="relative pt-32 pb-20 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-amber-950/20 via-transparent to-amber-950/20">
        </div>
        <div class="absolute inset-0">
          <div class="absolute top-20 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-pulse">
          </div>
          <div class="absolute bottom-20 right-10 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl animate-pulse delay-1000">
          </div>
        </div>

        <div class="relative container mx-auto px-4 text-center">
          <div class="inline-block mb-6 px-6 py-2 bg-amber-950/50 border border-amber-700/30 rounded-full">
            <span class="text-amber-300 text-sm font-light tracking-wider">
              COLECCIÓN OTOÑO 2024
            </span>
          </div>

          <h2 class="text-6xl md:text-7xl lg:text-8xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 mb-6 leading-tight">
            Lujo Atemporal
          </h2>

          <p class="text-xl md:text-2xl text-amber-100/80 mb-8 max-w-3xl mx-auto font-light leading-relaxed">
            Piezas únicas de alta joyería, creadas con las gemas más
            excepcionales del mundo
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              class="px-8 py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white rounded-full text-lg font-medium hover:shadow-2xl hover:shadow-amber-500/50 transition-all transform hover:scale-105"
            >
              Explorar Colección
            </button>
            <button
              type="button"
              class="px-8 py-4 bg-transparent border-2 border-amber-500/50 text-amber-200 rounded-full text-lg font-light hover:bg-amber-950/30 transition-all"
            >
              Diseño Personalizado
            </button>
          </div>

          <div class="mt-12 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div class="text-center">
              <p class="text-4xl font-bold text-amber-400">50+</p>
              <p class="text-amber-200/70 text-sm mt-1">Años de Experiencia</p>
            </div>
            <div class="text-center">
              <p class="text-4xl font-bold text-amber-400">10K+</p>
              <p class="text-amber-200/70 text-sm mt-1">Clientas Satisfechas</p>
            </div>
            <div class="text-center">
              <p class="text-4xl font-bold text-amber-400">100%</p>
              <p class="text-amber-200/70 text-sm mt-1">Piezas Certificadas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section class="py-20 bg-gradient-to-b from-transparent via-slate-900 to-transparent">
        <div class="container mx-auto px-4">
          <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-serif font-bold text-amber-400 mb-4">
              Excelencia en Cada Detalle
            </h2>
            <p class="text-amber-100/70 text-lg max-w-2xl mx-auto">
              Nuestro compromiso con la perfección nos distingue
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                class="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-amber-900/20 hover:border-amber-600/40 transition-all hover:shadow-xl hover:shadow-amber-500/10"
              >
                <div class="text-5xl mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 class="text-xl font-semibold text-amber-300 mb-3">
                  {feature.title}
                </h3>
                <p class="text-amber-100/60 font-light leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="colecciones" class="py-20">
        <div class="container mx-auto px-4">
          <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-serif font-bold text-amber-400 mb-4">
              Piezas Destacadas
            </h2>
            <p class="text-amber-100/70 text-lg">
              Selección exclusiva de nuestra colección
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {productos.map((producto) => (
              <div
                key={producto.id}
                class="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-3xl overflow-hidden border border-amber-900/30 hover:border-amber-600/50 transition-all hover:shadow-2xl hover:shadow-amber-500/20"
              >
                {producto.featured && (
                  <div class="absolute top-4 right-4 z-10 bg-gradient-to-r from-amber-600 to-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    ⭐ EXCLUSIVO
                  </div>
                )}
                {producto.discount && (
                  <div class="absolute top-4 left-4 z-10 bg-red-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    {producto.discount}
                  </div>
                )}

                <div class="aspect-square bg-gradient-to-br from-slate-700 to-slate-800 relative overflow-hidden">
                  <img
                    src={producto.image}
                    alt={producto.name}
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  </div>
                </div>

                <div class="p-6">
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <p class="text-xs text-amber-400 font-semibold mb-1 uppercase tracking-wider">
                        {producto.category}
                      </p>
                      <h3 class="text-xl font-serif font-bold text-amber-200">
                        {producto.name}
                      </h3>
                    </div>
                  </div>

                  <p class="text-amber-100/60 text-sm mb-4 font-light">
                    {producto.description}
                  </p>

                  <div class="bg-slate-950/50 rounded-xl p-4 mb-4 border border-amber-900/20">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs text-amber-300/70">Material</span>
                      <span class="text-sm text-amber-200 font-medium">
                        {producto.material}
                      </span>
                    </div>
                    {producto.karat && (
                      <div class="flex items-center justify-between">
                        <span class="text-xs text-amber-300/70">Quilates</span>
                        <span class="text-sm text-amber-200 font-medium">
                          {producto.karat}
                        </span>
                      </div>
                    )}
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-3xl font-bold text-amber-400">
                      {producto.price}
                    </span>
                    <button
                      type="button"
                      class="bg-gradient-to-r from-amber-600 to-amber-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-amber-500/50 transition-all"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonios"
        class="py-20 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent"
      >
        <div class="container mx-auto px-4">
          <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-serif font-bold text-amber-400 mb-4">
              Experiencias Excepcionales
            </h2>
            <p class="text-amber-100/70 text-lg">
              Lo que nuestras clientas dicen de nosotros
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-8">
            {testimonios.map((testimonio, idx) => (
              <div
                key={idx}
                class="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-amber-900/20 hover:border-amber-600/40 transition-all"
              >
                <div class="flex gap-1 mb-4">
                  {[...Array(testimonio.rating)].map((_, i) => (
                    <span key={i} class="text-amber-400 text-xl">⭐</span>
                  ))}
                </div>

                <p class="text-amber-100/80 italic mb-6 font-light leading-relaxed">
                  "{testimonio.content}"
                </p>

                <div class="flex items-center justify-between pt-4 border-t border-amber-900/20">
                  <div>
                    <p class="font-semibold text-amber-200">
                      {testimonio.name}
                    </p>
                    <p class="text-xs text-amber-300/60">
                      {testimonio.location}
                    </p>
                  </div>
                  <p class="text-xs text-amber-400/70">{testimonio.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section class="py-20 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-amber-950/40">
        </div>
        <div class="relative container mx-auto px-4 text-center">
          <h2 class="text-4xl md:text-5xl font-serif font-bold text-amber-400 mb-6">
            Diseñamos Tu Pieza Soñada
          </h2>
          <p class="text-xl text-amber-100/80 mb-8 max-w-2xl mx-auto font-light">
            Agenda una cita privada con nuestros expertos y crea la joya
            perfecta para ti
          </p>
          <button
            type="button"
            class="px-10 py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white rounded-full text-lg font-medium hover:shadow-2xl hover:shadow-amber-500/50 transition-all transform hover:scale-105"
          >
            Agendar Cita Privada
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer class="bg-black/80 backdrop-blur-md border-t border-amber-900/20 py-12">
        <div class="container mx-auto px-4">
          <div class="grid md:grid-cols-4 gap-8 mb-8">
            <div class="col-span-2">
              <div class="flex items-center gap-3 mb-4">
                <span class="text-4xl">💎</span>
                <div>
                  <h3 class="text-2xl font-serif font-bold text-amber-400">
                    Elegance Royale
                  </h3>
                  <p class="text-xs text-amber-200/70">Haute Joaillerie</p>
                </div>
              </div>
              <p class="text-amber-100/60 font-light mb-4">
                Más de 50 años creando piezas de alta joyería que perduran
                generaciones.
              </p>
              <div class="flex gap-4">
                <a
                  href="#"
                  class="w-10 h-10 bg-amber-950/50 rounded-full flex items-center justify-center text-amber-400 hover:bg-amber-600 hover:text-white transition"
                >
                  <span>📘</span>
                </a>
                <a
                  href="#"
                  class="w-10 h-10 bg-amber-950/50 rounded-full flex items-center justify-center text-amber-400 hover:bg-amber-600 hover:text-white transition"
                >
                  <span>📸</span>
                </a>
                <a
                  href="#"
                  class="w-10 h-10 bg-amber-950/50 rounded-full flex items-center justify-center text-amber-400 hover:bg-amber-600 hover:text-white transition"
                >
                  <span>📱</span>
                </a>
              </div>
            </div>

            <div>
              <h4 class="text-amber-400 font-semibold mb-4">Navegación</h4>
              <ul class="space-y-2">
                <li>
                  <a
                    href="#colecciones"
                    class="text-amber-100/70 hover:text-amber-400 transition"
                  >
                    Colecciones
                  </a>
                </li>
                <li>
                  <a
                    href="#exclusivos"
                    class="text-amber-100/70 hover:text-amber-400 transition"
                  >
                    Piezas Exclusivas
                  </a>
                </li>
                <li>
                  <a
                    href="#personalizado"
                    class="text-amber-100/70 hover:text-amber-400 transition"
                  >
                    Diseño Personalizado
                  </a>
                </li>
                <li>
                  <a
                    href="#testimonios"
                    class="text-amber-100/70 hover:text-amber-400 transition"
                  >
                    Testimonios
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 class="text-amber-400 font-semibold mb-4">Contacto</h4>
              <ul class="space-y-2 text-amber-100/70 font-light">
                <li>📞 +52 55 1234 5678</li>
                <li>✉️ info@eleganceroyale.mx</li>
                <li>📍 Polanco, Ciudad de México</li>
                <li>🕐 Lun-Sáb: 10am - 8pm</li>
              </ul>
            </div>
          </div>

          <div class="border-t border-amber-900/20 pt-8 text-center">
            <p class="text-amber-100/50 text-sm font-light">
              © 2024 Elegance Royale. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
