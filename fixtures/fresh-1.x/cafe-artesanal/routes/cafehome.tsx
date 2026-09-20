import MenuFilter from "../islands/MenuFilter.tsx";
import type { MenuItem } from "../types/landing.ts";

export default function CafeHome() {
  const menuItems: MenuItem[] = [
    {
      name: "Espresso",
      description: "Rich and bold single shot of premium coffee",
      price: "$3.50",
      category: "coffee",
      popular: true,
    },
    {
      name: "Cappuccino",
      description: "Espresso with steamed milk and foam",
      price: "$4.50",
      category: "coffee",
      popular: true,
    },
    {
      name: "Latte",
      description: "Smooth espresso with steamed milk and latte art",
      price: "$4.75",
      category: "coffee",
      popular: true,
    },
    {
      name: "Americano",
      description: "Espresso diluted with hot water",
      price: "$3.75",
      category: "coffee",
    },
    {
      name: "Croissant",
      description: "Buttery, flaky French pastry",
      price: "$3.25",
      category: "pastries",
      popular: true,
    },
    {
      name: "Chocolate Muffin",
      description: "Moist chocolate chip muffin",
      price: "$3.50",
      category: "pastries",
    },
    {
      name: "Almond Biscotti",
      description: "Traditional Italian twice-baked cookie",
      price: "$2.75",
      category: "pastries",
    },
    {
      name: "Avocado Toast",
      description: "Smashed avocado on artisan bread with toppings",
      price: "$8.50",
      category: "breakfast",
      popular: true,
    },
    {
      name: "Breakfast Burrito",
      description: "Eggs, cheese, vegetables wrapped in tortilla",
      price: "$9.75",
      category: "breakfast",
    },
    {
      name: "Grilled Chicken Sandwich",
      description: "Marinated chicken breast with fresh vegetables",
      price: "$11.50",
      category: "lunch",
      popular: true,
    },
    {
      name: "Caesar Salad",
      description: "Crisp romaine with parmesan and homemade dressing",
      price: "$9.50",
      category: "lunch",
    },
  ];

  return (
    <div class="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50">
      {/* Header */}
      <header class="bg-white shadow-md sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-4xl">☕</span>
              <h1 class="text-2xl font-bold text-amber-800">
                Café Artesanal
              </h1>
            </div>
            <nav class="hidden md:flex gap-6">
              <a href="#menu" class="text-gray-700 hover:text-amber-600">
                Menú
              </a>
              <a href="#about" class="text-gray-700 hover:text-amber-600">
                Nosotros
              </a>
              <a href="#contact" class="text-gray-700 hover:text-amber-600">
                Contacto
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section class="relative py-20 text-center overflow-hidden">
        <div
          class="absolute inset-0 bg-cover bg-center opacity-20"
          style="background-image: url('/images/pexels/artisan-coffee-shop-espresso-latte-art-2858192.jpg')"
        >
        </div>
        <div class="relative container mx-auto px-4">
          <h2 class="text-5xl md:text-6xl font-bold text-amber-900 mb-6">
            Café Artesanal de Calidad
          </h2>
          <p class="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Descubre el sabor auténtico del café preparado con pasión y
            dedicación
          </p>
          <a
            href="#menu"
            class="inline-block bg-amber-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-amber-700 transition-colors shadow-lg"
          >
            Ver Menú
          </a>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" class="py-16 bg-white">
        <div class="container mx-auto px-4">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-amber-900 mb-4">
              Nuestro Menú
            </h2>
            <p class="text-gray-600 text-lg">
              Selecciona una categoría para filtrar nuestros productos
            </p>
          </div>
          <MenuFilter items={menuItems} />
        </div>
      </section>

      {/* About Section */}
      <section id="about" class="py-16 bg-amber-50">
        <div class="container mx-auto px-4">
          <div class="max-w-3xl mx-auto text-center">
            <h2 class="text-4xl font-bold text-amber-900 mb-6">
              Nuestra Historia
            </h2>
            <p class="text-lg text-gray-700 mb-4">
              En Café Artesanal, creemos que cada taza de café cuenta una
              historia. Desde 2024, hemos estado sirviendo café de la más alta
              calidad, preparado con técnicas artesanales y amor por el detalle.
            </p>
            <p class="text-lg text-gray-700">
              Nuestro equipo de baristas expertos selecciona cuidadosamente cada
              grano, asegurando que cada bebida sea una experiencia única e
              inolvidable.
            </p>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section class="py-16 bg-white">
        <div class="container mx-auto px-4">
          <h2 class="text-4xl font-bold text-center text-amber-900 mb-12">
            Nuestra Galería
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <img
                src="/images/pexels/artisan-coffee-shop-espresso-latte-art-11896535.jpg"
                alt="Latte art close-up"
                class="w-full h-64 object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div class="overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <img
                src="/images/pexels/artisan-coffee-shop-espresso-latte-art-8059268.jpg"
                alt="Milk pouring for latte art"
                class="w-full h-64 object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div class="overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <img
                src="/images/pexels/artisan-coffee-shop-espresso-latte-art-28098571.jpg"
                alt="Latte art design"
                class="w-full h-64 object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div class="overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <img
                src="/images/pexels/artisan-coffee-shop-espresso-latte-art-17506071.jpg"
                alt="Intricate coffee art"
                class="w-full h-64 object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div class="overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <img
                src="/images/pexels/artisan-coffee-shop-espresso-latte-art-30226606.jpg"
                alt="Latte with chocolate"
                class="w-full h-64 object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div class="overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <img
                src="/images/pexels/artisan-coffee-shop-espresso-latte-art-2101150.jpg"
                alt="Cappuccino in sunlight"
                class="w-full h-64 object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div class="overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <img
                src="/images/pexels/artisan-coffee-shop-espresso-latte-art-302897.jpg"
                alt="Barista pouring milk art"
                class="w-full h-64 object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div class="overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <img
                src="/images/pexels/artisan-coffee-shop-espresso-latte-art-7162994.jpg"
                alt="Barista making espresso"
                class="w-full h-64 object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" class="py-16 bg-white">
        <div class="container mx-auto px-4">
          <div class="max-w-2xl mx-auto text-center">
            <h2 class="text-4xl font-bold text-amber-900 mb-6">Contáctanos</h2>
            <div class="space-y-4 text-lg text-gray-700">
              <p>
                <strong>Dirección:</strong>{" "}
                Calle Principal 123, Centro Histórico
              </p>
              <p>
                <strong>Teléfono:</strong> (555) 123-4567
              </p>
              <p>
                <strong>Email:</strong> hola@cafeartesanal.com
              </p>
              <p>
                <strong>Horario:</strong>{" "}
                Lunes a Viernes: 7am - 8pm | Fin de semana: 8am - 10pm
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer class="bg-amber-900 text-white py-8">
        <div class="container mx-auto px-4 text-center">
          <p class="text-lg mb-2">☕ Café Artesanal</p>
          <p class="text-amber-200">
            © 2024 Café Artesanal. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
