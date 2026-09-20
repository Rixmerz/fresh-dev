import type { JewelryProduct, PricingPlan, Testimonial, Feature } from "../types/landing.ts";

export default function JoyeriaHome() {
  const features = [
    {
      icon: "💎",
      title: "Calidad Premium",
      description: "Joyas elaboradas con materiales de la más alta calidad y diseños exclusivos"
    },
    {
      icon: "✨",
      title: "Diseños Elegantes",
      description: "Colecciones únicas que resaltan la belleza y sofisticación de cada mujer"
    },
    {
      icon: "🎁",
      title: "Precios Mayoristas",
      description: "Descuentos especiales en compras de 5 unidades o más"
    },
    {
      icon: "🚚",
      title: "Envío Rápido",
      description: "Entrega segura y rápida a todo el país"
    }
  ];

  const testimonials = [
    {
      name: "María González",
      role: "Cliente Frecuente",
      company: "Ciudad de México",
      content: "¡Las joyas son hermosas! Compré un juego completo y la calidad superó mis expectativas. El precio por mayor es excelente.",
      rating: 5
    },
    {
      name: "Ana Martínez",
      role: "Revendedora",
      company: "Guadalajara",
      content: "Perfectas para revender. Mis clientas están encantadas con los diseños y la calidad. El descuento por mayoreo me permite tener buen margen.",
      rating: 5
    },
    {
      name: "Laura Rodríguez",
      role: "Emprendedora",
      company: "Monterrey",
      content: "Compro por mayor cada mes. La variedad de diseños y la calidad son increíbles. ¡Totalmente recomendado!",
      rating: 5
    }
  ];

  const galleryImages = [
    { src: "/images/pexels/elegant-jewelry-necklace-9428788.jpg", alt: "Collar elegante de perlas" },
    { src: "/images/pexels/elegant-jewelry-necklace-9421388.jpg", alt: "Collar de perlas elegante" },
    { src: "/images/pexels/elegant-jewelry-necklace-3641059.jpg", alt: "Joyería de oro rosa sobre satín" },
    { src: "/images/pexels/elegant-jewelry-necklace-3641056.jpg", alt: "Pulsera de oro rosa con encaje" },
    { src: "/images/pexels/elegant-jewelry-necklace-15613452.jpg", alt: "Anillo de diamantes con diseño floral" },
    { src: "/images/pexels/elegant-jewelry-necklace-33466162.jpg", alt: "Joyería de perlas elegante" }
  ];

  const pricingPlans = [
    {
      name: "Precio Unitario",
      price: "$299",
      period: "por pieza",
      features: [
        "Joya individual de tu elección",
        "Caja de regalo incluida",
        "Certificado de autenticidad",
        "Garantía de 6 meses",
        "Envío gratis en compras +$500"
      ],
      highlighted: false,
      ctaText: "Comprar Ahora",
      ctaLink: "/comprar"
    },
    {
      name: "Precio Mayoreo",
      price: "$249",
      period: "por pieza (5+ unidades)",
      features: [
        "Mínimo 5 piezas (pueden ser variadas)",
        "16% de descuento",
        "Cajas de regalo incluidas",
        "Certificados de autenticidad",
        "Garantía de 1 año",
        "Envío gratis",
        "Atención prioritaria"
      ],
      highlighted: true,
      ctaText: "Comprar por Mayor",
      ctaLink: "/mayoreo"
    },
    {
      name: "Paquete Premium",
      price: "$1,199",
      period: "set completo (10 piezas)",
      features: [
        "10 piezas cuidadosamente seleccionadas",
        "60% de descuento vs precio unitario",
        "Mix de collares, aretes, pulseras y anillos",
        "Estuche de lujo incluido",
        "Certificados de autenticidad",
        "Garantía de 2 años",
        "Envío express gratis",
        "Asesoría personalizada"
      ],
      highlighted: false,
      ctaText: "Ver Paquete",
      ctaLink: "/premium"
    }
  ];

  const navLinks = [
    { text: "Inicio", href: "/" },
    { text: "Catálogo", href: "#catalogo" },
    { text: "Precios", href: "#pricing" },
    { text: "Nosotros", href: "#about" },
    { text: "Contacto", href: "#contact" }
  ];

  const footerSections = [
    {
      title: "Productos",
      links: [
        { text: "Collares", href: "/collares" },
        { text: "Aretes", href: "/aretes" },
        { text: "Pulseras", href: "/pulseras" },
        { text: "Anillos", href: "/anillos" },
        { text: "Sets Completos", href: "/sets" }
      ]
    },
    {
      title: "Comprar",
      links: [
        { text: "Precio Unitario", href: "/unitario" },
        { text: "Precio Mayoreo", href: "/mayoreo" },
        { text: "Paquetes Premium", href: "/premium" },
        { text: "Ofertas Especiales", href: "/ofertas" }
      ]
    },
    {
      title: "Información",
      links: [
        { text: "Sobre Nosotros", href: "/about" },
        { text: "Envíos", href: "/envios" },
        { text: "Garantías", href: "/garantias" },
        { text: "Preguntas Frecuentes", href: "/faq" }
      ]
    },
    {
      title: "Contacto",
      links: [
        { text: "WhatsApp", href: "https://wa.me/5215512345678" },
        { text: "Instagram", href: "https://instagram.com/joyeria" },
        { text: "Facebook", href: "https://facebook.com/joyeria" },
        { text: "Email", href: "mailto:contacto@joyeria.com" }
      ]
    }
  ];

  return (
    <>
      <HeaderSimple
        logo="/logo.svg"
        logoText="✨ Elegancia Joyería"
        navLinks={navLinks}
        ctaText="Comprar"
        ctaLink="/comprar"
      />

      <HeroJoyeria
        title="Joyas Elegantes para Mujeres Excepcionales"
        subtitle="Descubre nuestra exclusiva colección de joyas premium. Precios especiales por mayoreo desde 5 piezas."
        ctaText="Ver Catálogo"
        ctaLink="#catalogo"
        secondaryCtaText="Precio Mayoreo"
        secondaryCtaLink="#pricing"
        imageSrc="/images/pexels/elegant-jewelry-necklace-247287.jpg"
      />

      <FeaturesGrid
        features={features}
        title="¿Por Qué Elegirnos?"
        description="Calidad, estilo y precios que se ajustan a ti"
      />

      <GalleryJoyeria
        images={galleryImages}
        title="Nuestras Colecciones"
      />

      <PricingJoyeria
        plans={pricingPlans}
        title="Precios Transparentes"
      />

      <section class="py-16 bg-gradient-to-br from-gray-50 to-pink-50">
        <div class="container mx-auto px-4">
          <h2 class="text-4xl font-bold text-center mb-4 text-gray-900">
            Calcula Tu Ahorro
          </h2>
          <p class="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Usa nuestra calculadora interactiva para ver cuánto ahorras comprando por mayor
          </p>
          <PriceCalculator />
        </div>
      </section>

      <TestimonialsGrid
        testimonials={testimonials}
        title="Lo Que Dicen Nuestras Clientas"
      />

      <CTASimple
        title="¿Lista para lucir espectacular?"
        description="Únete a miles de mujeres que ya confían en nuestra calidad. Compra ahora y recibe envío gratis."
        ctaText="Comprar Ahora"
        ctaLink="/comprar"
        bgColor="bg-gradient-to-r from-rose-900 via-pink-900 to-purple-900"
      />

      <FooterComplete
        logo="/logo.svg"
        logoText="✨ Elegancia Joyería"
        description="Joyas premium para mujeres que buscan calidad y estilo. Precios especiales por mayoreo."
        sections={footerSections}
        copyright="© 2024 Elegancia Joyería. Todos los derechos reservados."
      />
    </>
  );
}
