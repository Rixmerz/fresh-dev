import type { Feature, FruitProduct, Testimonial } from "../types/landing.ts";

export default function FrutasHome() {
  const productos: FruitProduct[] = [
    {
      id: "1",
      name: "Fresas Premium",
      description: "Fresas frescas y jugosas, perfectas para cualquier ocasión",
      price: "$85",
      unit: "kg",
      category: "berries",
      featured: true,
      inStock: true,
      image: "/images/pexels/fresh-strawberries-fruit-market-1435301.jpg",
      nutritionalInfo: {
        calories: "32 kcal/100g",
        vitamins: ["Vitamina C", "Ácido Fólico", "Potasio"],
      },
    },
    {
      id: "2",
      name: "Naranjas Valencia",
      description: "Naranjas dulces y jugosas, ideales para jugo natural",
      price: "$35",
      unit: "kg",
      category: "citricos",
      featured: false,
      inStock: true,
      image: "/images/pexels/fresh-strawberries-fruit-market-4846530.jpg",
      nutritionalInfo: {
        calories: "47 kcal/100g",
        vitamins: ["Vitamina C", "Fibra", "Calcio"],
      },
    },
    {
      id: "3",
      name: "Mangos Manila",
      description: "Mangos dulces y aromáticos, listos para comer",
      price: "$55",
      unit: "kg",
      category: "tropicales",
      featured: true,
      inStock: true,
      image: "/images/pexels/fresh-strawberries-fruit-market-5678019.jpg",
      nutritionalInfo: {
        calories: "60 kcal/100g",
        vitamins: ["Vitamina A", "Vitamina C", "Fibra"],
      },
    },
  ];

  const features: Feature[] = [
    {
      icon: "🍓",
      title: "Frescura Garantizada",
      description:
        "Frutas seleccionadas diariamente de los mejores proveedores",
    },
    {
      icon: "🚚",
      title: "Entrega Rápida",
      description: "Recibe tus frutas en menos de 2 horas en toda la ciudad",
    },
    {
      icon: "✨",
      title: "Calidad Premium",
      description:
        "Solo las frutas más frescas y de mejor calidad llegan a tu hogar",
    },
    {
      icon: "💰",
      title: "Precios Justos",
      description: "Los mejores precios del mercado sin intermediarios",
    },
  ];

  const testimonios: Testimonial[] = [
    {
      name: "María López",
      location: "Polanco, CDMX",
      content:
        "Las frutas llegan super frescas y el servicio es excelente. Ya no compro en otro lugar.",
      rating: 5,
      purchaseFrequency: "Compra semanal",
    },
    {
      name: "Carlos Ramírez",
      location: "Roma Norte, CDMX",
      content:
        "Me encanta la variedad y la calidad. El delivery es rapidísimo y siempre puntual.",
      rating: 5,
      purchaseFrequency: "Cliente frecuente",
    },
    {
      name: "Ana Martínez",
      location: "Condesa, CDMX",
      content:
        "Perfectas para mis smoothies matutinos. La app es muy fácil de usar.",
      rating: 5,
      purchaseFrequency: "Compra 3x por semana",
    },
  ];

  return (
    <div class="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-yellow-50">
      {/* Header */}
      <header class="bg-white shadow-sm sticky top-0 z-50 border-b border-green-100">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-3xl">🍎</span>
              <h1 class="text-2xl font-bold text-green-800">Frutas Frescas</h1>
            </div>
            <nav class="hidden md:flex gap-6">
              <a
                href="#productos"
                class="text-gray-700 hover:text-green-600 font-medium transition"
              >
                Productos
              </a>
              <a
                href="#beneficios"
                class="text-gray-700 hover:text-green-600 font-medium transition"
              >
                Beneficios
              </a>
              <a
                href="#testimonios"
                class="text-gray-700 hover:text-green-600 font-medium transition"
              >
                Testimonios
              </a>
              <a
                href="#contacto"
                class="text-gray-700 hover:text-green-600 font-medium transition"
              >
                Contacto
              </a>
            </nav>
            <button
              type="button"
              class="bg-gradient-to-r from-green-600 to-lime-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-shadow"
            >
              Pedir Ahora
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section class="relative py-20 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-green-500/10 to-lime-500/10">
        </div>
        <div class="relative container mx-auto px-4 text-center">
          <h2 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Frutas Frescas a tu Puerta
          </h2>
          <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Recibe las frutas más frescas y deliciosas directamente en tu hogar.
            Entrega rápida en menos de 2 horas.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              class="inline-block bg-gradient-to-r from-green-600 to-lime-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-lg transition-shadow"
            >
              Ver Catálogo 🍓
            </button>
            <button
              type="button"
              class="inline-block bg-white text-green-600 border-2 border-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-50 transition-colors"
            >
              Cómo Funciona
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="beneficios" class="py-16 bg-white">
        <div class="container mx-auto px-4">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">
              ¿Por Qué Elegirnos?
            </h2>
            <p class="text-gray-600 text-lg">
              El mejor servicio de entrega de frutas frescas
            </p>
          </div>
          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} class="text-center">
                <div class="text-5xl mb-4">{feature.icon}</div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p class="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section
        id="productos"
        class="py-16 bg-gradient-to-br from-green-50 to-lime-50"
      >
        <div class="container mx-auto px-4">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">
              Nuestros Productos
            </h2>
            <p class="text-gray-600 text-lg">
              Frutas frescas seleccionadas especialmente para ti
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {productos.map((producto) => (
              <div
                key={producto.id}
                class="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
              >
                {producto.featured && (
                  <span class="absolute top-4 right-4 bg-gradient-to-r from-green-600 to-lime-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                    ⭐ Popular
                  </span>
                )}

                <div class="relative">
                  <img
                    src={producto.image}
                    alt={producto.name}
                    class="w-full h-56 object-cover"
                  />
                  {!producto.inStock && (
                    <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span class="text-white text-lg font-bold">Agotado</span>
                    </div>
                  )}
                </div>

                <div class="p-6">
                  <h3 class="text-2xl font-bold text-gray-900 mb-2">
                    {producto.name}
                  </h3>
                  <p class="text-gray-600 mb-4">{producto.description}</p>

                  {producto.nutritionalInfo && (
                    <div class="bg-green-50 rounded-lg p-3 mb-4">
                      <p class="text-sm text-gray-600 mb-1">
                        <strong>Calorías:</strong>{" "}
                        {producto.nutritionalInfo.calories}
                      </p>
                      <p class="text-sm text-gray-600">
                        <strong>Rico en:</strong>{" "}
                        {producto.nutritionalInfo.vitamins.join(", ")}
                      </p>
                    </div>
                  )}

                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-3xl font-bold text-green-600">
                        {producto.price}
                      </span>
                      <span class="text-gray-600 text-sm ml-1">
                        / {producto.unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      class="bg-gradient-to-r from-green-600 to-lime-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!producto.inStock}
                    >
                      {producto.inStock ? "Agregar" : "Agotado"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery Zones Section */}
      <section class="py-16 bg-white">
        <div class="container mx-auto px-4">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-gray-900 mb-4">
              Zonas de Entrega
            </h2>
            <p class="text-gray-600 text-lg">
              Cobertura en toda la Ciudad de México
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div class="bg-gradient-to-br from-green-50 to-lime-50 rounded-xl p-6 text-center">
              <div class="text-4xl mb-4">📍</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">Zona Centro</h3>
              <p class="text-gray-600 mb-2">Entrega en 1-2 horas</p>
              <p class="text-green-600 font-bold">Envío gratis desde $300</p>
            </div>

            <div class="bg-gradient-to-br from-green-50 to-lime-50 rounded-xl p-6 text-center">
              <div class="text-4xl mb-4">📍</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">
                Zona Norte/Sur
              </h3>
              <p class="text-gray-600 mb-2">Entrega en 2-3 horas</p>
              <p class="text-green-600 font-bold">Envío gratis desde $500</p>
            </div>

            <div class="bg-gradient-to-br from-green-50 to-lime-50 rounded-xl p-6 text-center">
              <div class="text-4xl mb-4">📍</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">
                Zona Metropolitana
              </h3>
              <p class="text-gray-600 mb-2">Entrega en 3-4 horas</p>
              <p class="text-green-600 font-bold">Envío gratis desde $700</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonios"
        class="py-16 bg-gradient-to-br from-green-50 to-lime-50"
      >
        <div class="container mx-auto px-4">
          <h2 class="text-4xl font-bold text-center text-gray-900 mb-12">
            Lo Que Dicen Nuestros Clientes
          </h2>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonios.map((testimonio, idx) => (
              <div key={idx} class="bg-white rounded-xl p-6 shadow-md">
                <div class="flex gap-1 mb-4">
                  {[...Array(testimonio.rating)].map((_, i) => (
                    <span key={i} class="text-yellow-400 text-xl">⭐</span>
                  ))}
                </div>
                <p class="text-gray-700 mb-4 italic">"{testimonio.content}"</p>
                <div class="border-t pt-4">
                  <p class="font-bold text-gray-900">{testimonio.name}</p>
                  <p class="text-sm text-gray-600">{testimonio.location}</p>
                  {testimonio.purchaseFrequency && (
                    <p class="text-xs text-green-600 mt-1">
                      {testimonio.purchaseFrequency}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section class="py-16 bg-gradient-to-r from-green-600 to-lime-500">
        <div class="container mx-auto px-4 text-center">
          <h2 class="text-4xl font-bold text-white mb-4">
            ¿Listo para Disfrutar Frutas Frescas?
          </h2>
          <p class="text-green-100 text-lg mb-8">
            Haz tu primer pedido hoy y recibe 10% de descuento
          </p>
          <button
            type="button"
            class="inline-block bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-lg transition-shadow"
          >
            Hacer Pedido Ahora 🛒
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer class="bg-gray-900 text-white py-12">
        <div class="container mx-auto px-4">
          <div class="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div class="flex items-center gap-2 mb-4">
                <span class="text-3xl">🍎</span>
                <h3 class="text-xl font-bold">Frutas Frescas</h3>
              </div>
              <p class="text-gray-400">
                Frutas frescas a domicilio en toda la CDMX
              </p>
            </div>

            <div>
              <h4 class="font-bold mb-4">Productos</h4>
              <ul class="space-y-2 text-gray-400">
                <li>
                  <a href="#" class="hover:text-white transition">Cítricos</a>
                </li>
                <li>
                  <a href="#" class="hover:text-white transition">Tropicales</a>
                </li>
                <li>
                  <a href="#" class="hover:text-white transition">Berries</a>
                </li>
                <li>
                  <a href="#" class="hover:text-white transition">Temporada</a>
                </li>
              </ul>
            </div>

            <div>
              <h4 class="font-bold mb-4">Empresa</h4>
              <ul class="space-y-2 text-gray-400">
                <li>
                  <a href="#" class="hover:text-white transition">Nosotros</a>
                </li>
                <li>
                  <a href="#" class="hover:text-white transition">Entregas</a>
                </li>
                <li>
                  <a href="#" class="hover:text-white transition">Preguntas</a>
                </li>
                <li>
                  <a href="#" class="hover:text-white transition">Blog</a>
                </li>
              </ul>
            </div>

            <div>
              <h4 class="font-bold mb-4">Contacto</h4>
              <ul class="space-y-2 text-gray-400">
                <li>
                  <a href="tel:5512345678" class="hover:text-white transition">
                    55 1234 5678
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hola@frutasfrescas.mx"
                    class="hover:text-white transition"
                  >
                    hola@frutasfrescas.mx
                  </a>
                </li>
                <li>
                  <a href="#" class="hover:text-white transition">WhatsApp</a>
                </li>
                <li>
                  <a href="#" class="hover:text-white transition">Instagram</a>
                </li>
              </ul>
            </div>
          </div>

          <div class="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2024 Frutas Frescas. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
