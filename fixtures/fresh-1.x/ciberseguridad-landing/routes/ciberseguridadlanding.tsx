import type { SecurityService } from "../types/landing.ts";

export default function CiberseguridadLanding() {
  const services: SecurityService[] = [
    {
      id: "1",
      name: "Pentesting",
      description: "Pruebas de penetración para identificar vulnerabilidades",
      icon: "🔍",
      features: [
        "Análisis de vulnerabilidades",
        "Explotación controlada",
        "Reporte detallado",
      ],
      price: "$2,500",
      category: "penetration",
      featured: true,
      image:
        "/images/pexels/cybersecurity-network-protection-digital-lock-6963098.jpg",
    },
    {
      id: "2",
      name: "Consultoría de Seguridad",
      description: "Asesoramiento experto en ciberseguridad",
      icon: "💼",
      features: [
        "Evaluación de riesgos",
        "Políticas de seguridad",
        "Cumplimiento normativo",
      ],
      price: "$1,800",
      category: "consulting",
      featured: false,
      image:
        "/images/pexels/cybersecurity-network-protection-digital-lock-6963941.jpg",
    },
    {
      id: "3",
      name: "Respuesta a Incidentes",
      description: "Gestión rápida de incidentes de seguridad",
      icon: "🚨",
      features: ["Detección 24/7", "Respuesta inmediata", "Análisis forense"],
      price: "$3,000",
      category: "incident",
      featured: true,
      image:
        "/images/pexels/cybersecurity-network-protection-digital-lock-5952647.jpg",
    },
  ];

  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header class="bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50 border-b border-blue-500/20">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-3xl">🔒</span>
              <h1 class="text-2xl font-bold text-white">CyberSecure Pro</h1>
            </div>
            <nav class="hidden md:flex gap-6">
              <a
                href="#servicios"
                class="text-gray-300 hover:text-blue-400 font-medium transition"
              >
                Servicios
              </a>
              <a
                href="#beneficios"
                class="text-gray-300 hover:text-blue-400 font-medium transition"
              >
                Beneficios
              </a>
              <a
                href="#contacto"
                class="text-gray-300 hover:text-blue-400 font-medium transition"
              >
                Contacto
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section class="relative py-24 text-center overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
        </div>
        <div class="relative container mx-auto px-4">
          <h2 class="text-5xl md:text-6xl font-bold text-white mb-6">
            Protección Avanzada para tu Negocio
          </h2>
          <p class="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Servicios especializados de ciberseguridad para empresas que valoran
            la protección de sus activos digitales
          </p>
          <button
            type="button"
            class="inline-block bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all"
          >
            Solicitar Consultoría
          </button>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" class="py-16 bg-slate-900/50">
        <div class="container mx-auto px-4">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-white mb-4">
              Nuestros Servicios
            </h2>
            <p class="text-gray-400 text-lg">
              Soluciones integrales de ciberseguridad
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div
                key={service.id}
                class="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 transition-all p-6 border border-blue-500/10 relative overflow-hidden"
              >
                {service.featured && (
                  <span class="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    ⭐ Destacado
                  </span>
                )}

                <img
                  src={service.image}
                  alt={service.name}
                  class="w-full h-48 object-cover rounded-lg mb-4"
                />

                <div class="text-4xl mb-4">{service.icon}</div>
                <h3 class="text-2xl font-bold text-white mb-2">
                  {service.name}
                </h3>
                <p class="text-gray-400 mb-4">{service.description}</p>

                <div class="bg-blue-900/30 rounded-lg p-3 mb-4">
                  <p class="text-sm text-gray-300 font-semibold mb-2">
                    Incluye:
                  </p>
                  <ul class="text-sm text-gray-400 space-y-1">
                    {service.features.map((feature, idx) => (
                      <li key={idx}>✓ {feature}</li>
                    ))}
                  </ul>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-2xl font-bold text-blue-400">
                    {service.price}
                  </span>
                  <button
                    type="button"
                    class="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all font-medium"
                  >
                    Contratar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" class="py-16 bg-slate-800/30">
        <div class="container mx-auto px-4">
          <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-white mb-4">
              ¿Por Qué Elegirnos?
            </h2>
            <p class="text-gray-400 text-lg">
              Experiencia y tecnología de vanguardia
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-8">
            <div class="text-center">
              <div class="text-5xl mb-4">🛡️</div>
              <h3 class="text-xl font-bold text-white mb-2">
                Protección Total
              </h3>
              <p class="text-gray-400">
                Cobertura completa de todos los vectores de ataque
              </p>
            </div>
            <div class="text-center">
              <div class="text-5xl mb-4">⚡</div>
              <h3 class="text-xl font-bold text-white mb-2">
                Respuesta Rápida
              </h3>
              <p class="text-gray-400">
                Equipo disponible 24/7 para responder a incidentes
              </p>
            </div>
            <div class="text-center">
              <div class="text-5xl mb-4">📊</div>
              <h3 class="text-xl font-bold text-white mb-2">
                Reportes Detallados
              </h3>
              <p class="text-gray-400">
                Análisis exhaustivos con recomendaciones prácticas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section class="py-16 bg-gradient-to-r from-blue-600 to-cyan-500">
        <div class="container mx-auto px-4 text-center">
          <h2 class="text-4xl font-bold text-white mb-4">
            ¿Listo para Proteger tu Empresa?
          </h2>
          <p class="text-blue-100 text-lg mb-8">
            Contáctanos hoy y recibe una consultoría gratuita
          </p>
          <button
            type="button"
            class="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-lg transition-all"
          >
            Comenzar Ahora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer class="bg-slate-950 text-white py-8">
        <div class="container mx-auto px-4 text-center">
          <p class="text-lg mb-2">🔒 CyberSecure Pro</p>
          <p class="text-gray-400">
            © 2024 CyberSecure Pro. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
