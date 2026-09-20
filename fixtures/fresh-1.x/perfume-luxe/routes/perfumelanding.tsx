import type { Perfume } from "../types/landing.ts";
import PerfumeFilter from "../islands/PerfumeFilter.tsx";

export default function PerfumeLanding() {
  const perfumes: Perfume[] = [
    {
      name: "Essence Noir",
      description: "Fragancia sofisticada con notas de ámbar y almizcares",
      price: "$189",
      volume: "100ml",
      notes: "Ámbar, Almizcares, Sándalo",
      category: "luxury",
      featured: true,
      image:
        "/images/pexels/luxury-perfume-fragrance-bottle-product-3059609.jpg",
    },
    {
      name: "Floral Dreams",
      description: "Delicada mezcla de flores silvestres y notas florales",
      price: "$149",
      volume: "50ml",
      notes: "Rosa, Jazmín, Peonía",
      category: "floral",
      featured: false,
      image:
        "/images/pexels/luxury-perfume-fragrance-bottle-product-5199128.jpg",
    },
    {
      name: "Ocean Breeze",
      description: "Refrescante aroma marino con toques cítricos",
      price: "$139",
      volume: "75ml",
      notes: "Bergamota, Limón, Notas Marinas",
      category: "fresh",
      featured: true,
      image:
        "/images/pexels/luxury-perfume-fragrance-bottle-product-8361484.jpg",
    },
    {
      name: "Midnight Garden",
      description: "Misterioso y envolvente con toques de especias",
      price: "$199",
      volume: "100ml",
      notes: "Clavo, Canela, Vetiver",
      category: "luxury",
      featured: false,
      image:
        "/images/pexels/luxury-perfume-fragrance-bottle-product-3910071.jpg",
    },
    {
      name: "Sunrise Citrus",
      description: "Energizante con cítricos frescos y notas de frutas",
      price: "$129",
      volume: "75ml",
      notes: "Naranja, Mandarina, Pomelo",
      category: "fresh",
      featured: false,
      image:
        "/images/pexels/luxury-perfume-fragrance-bottle-product-8361478.jpg",
    },
    {
      name: "Rose Garden",
      description: "Romántico y clásico, perfecto para cualquier ocasión",
      price: "$159",
      volume: "100ml",
      notes: "Rosa Roja, Pétalo de Rosa, Geranio",
      category: "floral",
      featured: false,
      image:
        "/images/pexels/luxury-perfume-fragrance-bottle-product-9957554.jpg",
    },
    {
      name: "Woody Elegance",
      description: "Masculino sofisticado con base de maderas nobles",
      price: "$169",
      volume: "100ml",
      notes: "Cedro, Roble, Patchouli",
      category: "woody",
      featured: true,
      image:
        "/images/pexels/luxury-perfume-fragrance-bottle-product-8361481.jpg",
    },
    {
      name: "Vanilla Sunset",
      description: "Dulce y envolvente con toques de vainilla pura",
      price: "$139",
      volume: "75ml",
      notes: "Vainilla, Caramelo, Almizcares",
      category: "floral",
      featured: false,
      image:
        "/images/pexels/luxury-perfume-fragrance-bottle-product-7796322.jpg",
    },
    {
      name: "Aromatic Spice",
      description: "Cálido y especiado, perfecto para noches especiales",
      price: "$179",
      volume: "100ml",
      notes: "Cardamomo, Pimienta Negra, Jengibre",
      category: "luxury",
      featured: false,
      image:
        "/images/pexels/luxury-perfume-fragrance-bottle-product-11028230.jpg",
    },
  ];

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-3xl">🌸</span>
              <h1 class="text-2xl font-bold text-gray-900">Perfume Luxe</h1>
            </div>
            <nav class="hidden md:flex gap-6">
              <a
                href="#collection"
                class="text-gray-700 hover:text-purple-600 font-medium"
              >
                Colección
              </a>
              <a
                href="#about"
                class="text-gray-700 hover:text-purple-600 font-medium"
              >
                Acerca de
              </a>
              <a
                href="#contact"
                class="text-gray-700 hover:text-purple-600 font-medium"
              >
                Contacto
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section class="relative py-24 text-center overflow-hidden">
        <div
          class="absolute inset-0 bg-cover bg-center opacity-10"
          style="background-image: url('/images/pexels/luxury-perfume-fragrance-bottle-product-8450339.jpg')"
        >
        </div>
        <div class="relative container mx-auto px-4">
          <h2 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Fragancias Extraordinarias
          </h2>
          <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Descubre aromas únicos que capturan la esencia del lujo y la
            elegancia
          </p>
          <button
            type="button"
            class="inline-block bg-gradient-to-r from-purple-600 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-lg transition-shadow"
          >
            Explorar Colección
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="about" class="py-16 bg-white">
        <div class="container mx-auto px-4">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">
              ¿Por Qué Elegir Perfume Luxe?
            </h2>
            <p class="text-gray-600 text-lg">
              Fragancias premium seleccionadas con cuidado
            </p>
          </div>
          <div class="grid md:grid-cols-3 gap-8">
            <div class="text-center">
              <div class="text-4xl mb-4">✨</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">
                Ingredientes Finos
              </h3>
              <p class="text-gray-600">
                Solo utilizamos extractos naturales de la más alta calidad
              </p>
            </div>
            <div class="text-center">
              <div class="text-4xl mb-4">🎭</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">
                Arte Olfativo
              </h3>
              <p class="text-gray-600">
                Creaciones maestras de perfumistas internacionales
              </p>
            </div>
            <div class="text-center">
              <div class="text-4xl mb-4">💎</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">
                Presentación Lujosa
              </h3>
              <p class="text-gray-600">
                Empaques diseñados para impresionar y deleitar
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Collection Section */}
      <section
        id="collection"
        class="py-16 bg-gradient-to-br from-gray-50 to-purple-50"
      >
        <div class="container mx-auto px-4">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">
              Nuestra Colección
            </h2>
            <p class="text-gray-600 text-lg">
              Filtra por tu tipo de aroma preferido
            </p>
          </div>
          <PerfumeFilter perfumes={perfumes} />
        </div>
      </section>

      {/* Testimonials Section */}
      <section class="py-16 bg-white">
        <div class="container mx-auto px-4">
          <h2 class="text-4xl font-bold text-center text-gray-900 mb-12">
            Lo Que Dicen Nuestros Clientes
          </h2>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div class="bg-purple-50 rounded-xl p-6">
              <div class="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} class="text-yellow-400">⭐</span>
                ))}
              </div>
              <p class="text-gray-700 mb-4">
                "Simplemente exquisito. El aroma perdura todo el día y huele
                divino. Definitivamente volvería a comprar."
              </p>
              <p class="font-bold text-gray-900">— María L.</p>
              <p class="text-sm text-gray-600">Madrid, España</p>
            </div>
            <div class="bg-purple-50 rounded-xl p-6">
              <div class="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} class="text-yellow-400">⭐</span>
                ))}
              </div>
              <p class="text-gray-700 mb-4">
                "La calidad es incomparable. Recibí mi pedido hermosamente
                empaquetado y la fragancia es perfecta."
              </p>
              <p class="font-bold text-gray-900">— Juan C.</p>
              <p class="text-sm text-gray-600">Barcelona, España</p>
            </div>
            <div class="bg-purple-50 rounded-xl p-6">
              <div class="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} class="text-yellow-400">⭐</span>
                ))}
              </div>
              <p class="text-gray-700 mb-4">
                "Hace exactamente un mes que lo compré y sigo enamora del aroma.
                ¡Recomendado 100%!"
              </p>
              <p class="font-bold text-gray-900">— Isabel R.</p>
              <p class="text-sm text-gray-600">Valencia, España</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section class="py-16 bg-gradient-to-r from-purple-600 to-pink-500">
        <div class="container mx-auto px-4 text-center">
          <h2 class="text-4xl font-bold text-white mb-4">
            ¿Listo para encontrar tu fragancia ideal?
          </h2>
          <p class="text-purple-100 text-lg mb-8">
            Descubre el lujo y la elegancia en cada botella
          </p>
          <button
            type="button"
            class="inline-block bg-white text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-lg transition-shadow"
          >
            Comprar Ahora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer class="bg-gray-900 text-white py-8">
        <div class="container mx-auto px-4 text-center">
          <p class="text-lg mb-2">🌸 Perfume Luxe</p>
          <p class="text-gray-400">
            © 2024 Perfume Luxe. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
