// Fresh Fruit Delivery Landing Page Types

export interface FruitProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  unit: string; // "kg", "unidad", "paquete"
  category: "citricos" | "tropicales" | "berries" | "temporada" | "exoticas";
  featured: boolean;
  image: string;
  inStock: boolean;
  nutritionalInfo?: {
    calories: string;
    vitamins: string[];
  };
}

export interface DeliveryZone {
  name: string;
  deliveryTime: string;
  freeDeliveryMinimum: string;
  deliveryFee: string;
}

export interface Testimonial {
  name: string;
  location: string;
  content: string;
  rating: number;
  image?: string;
  purchaseFrequency?: string;
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface NavLink {
  text: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: Array<{
    text: string;
    href: string;
  }>;
}
