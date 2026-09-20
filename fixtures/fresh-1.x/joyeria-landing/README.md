# ✨ Elegancia Joyería - Landing Page

Landing page moderna para joyería enfocada en mujeres, con precios unitarios y por mayor (5+ unidades).

## 🎯 Características

- **Diseño Elegante**: Interfaz moderna con gradientes rose/pink para público femenino
- **Calculadora de Precios Interactiva**: Island con Preact Signals que muestra ahorros en tiempo real
- **Precios Duales**:
  - Precio unitario: $299 MXN
  - Precio mayoreo (5+ piezas): $249 MXN (16% descuento)
  - Paquete Premium (10 piezas): $1,199 MXN
- **Galería de Productos**: Diseño masonry para mostrar colecciones
- **Testimonios de Clientas**: Reviews de clientes reales
- **Responsive**: 100% adaptable a móviles, tablets y desktop

## 🛠️ Tecnologías

- **Fresh 1.7.3+**: Framework de Deno
- **Preact Signals**: Reactividad en islas interactivas
- **Tailwind CSS**: Estilos utility-first
- **TypeScript**: Type safety completo

## 📦 Estructura del Proyecto

```
joyeria-landing/
├── routes/
│   └── joyeriahome.tsx          # Página principal
├── components/
│   └── landing/
│       ├── hero/                 # Hero personalizado para joyería
│       ├── pricing/              # Componente de precios
│       └── gallery/              # Galería masonry
├── islands/
│   └── PriceCalculator.tsx      # Calculadora interactiva
└── static/
    └── images/                   # Imágenes de productos
```

## 🚀 Instalación y Uso

```bash
# Navegar al directorio del proyecto
cd joyeria-landing

# Iniciar servidor de desarrollo
deno task start
```

El proyecto estará disponible en `http://localhost:8000/joyeriahome`

## 💎 Secciones de la Landing

1. **Header**: Navegación con logo "✨ Elegancia Joyería"
2. **Hero**: Imagen split-screen con CTA principal
3. **Features**: 4 características clave (Calidad Premium, Diseños Elegantes, Precios Mayoristas, Envío Rápido)
4. **Galería**: 6 imágenes de productos en diseño masonry
5. **Pricing**: 3 planes (Unitario, Mayoreo, Premium)
6. **Calculadora**: Island interactiva para calcular ahorros
7. **Testimonios**: 3 reviews de clientas
8. **CTA Final**: Llamado a la acción con gradiente rose/pink
9. **Footer**: Enlaces organizados por categorías

## 🎨 Personalización

### Cambiar Precios

Editar `islands/PriceCalculator.tsx`:

```typescript
const unitPrice = 299;           // Precio unitario
const wholesalePrice = 249;      // Precio mayoreo
const wholesaleMinimum = 5;      // Cantidad mínima para mayoreo
```

### Modificar Colores

Los colores principales están en clases de Tailwind:
- `rose-*`: Tonos principales (botones, títulos)
- `pink-*`: Tonos secundarios (gradientes)
- `gray-*`: Tonos neutros (texto, fondos)

### Agregar Productos

Editar `routes/joyeriahome.tsx`, sección `galleryImages`:

```typescript
const galleryImages = [
  { src: "/images/joyeria/collar-1.jpg", alt: "Descripción" },
  // Agregar más productos...
];
```

## 📱 Características de la Calculadora

- **Controles múltiples**: Botones +/-, slider, input directo
- **Cálculo en tiempo real**: Total y ahorro instantáneos
- **Indicadores visuales**:
  - 🎉 Animación cuando activa precio mayoreo
  - 💡 Mensaje mostrando cuántas piezas faltan para mayoreo
  - ✨ Badge destacado con ahorro total
- **Formato MX**: Precios formateados en pesos mexicanos
- **Rango 1-20 piezas**: Límites lógicos para la calculadora

## 🎯 Público Objetivo

- **Mujeres 25-45 años**: Buscan joyas de calidad
- **Revendedoras**: Interesadas en precio mayoreo
- **Emprendedoras**: Quieren iniciar negocio de joyería

## 🔗 Próximas Mejoras

- [ ] Integración con sistema de pagos
- [ ] Carrito de compras funcional
- [ ] Sistema de autenticación
- [ ] Panel de administración de productos
- [ ] Integración con WhatsApp Business
- [ ] Sistema de tracking de pedidos

## 📄 Licencia

© 2024 Elegancia Joyería. Todos los derechos reservados.

---

**Creado con Fresh MCP Server** 🍋
