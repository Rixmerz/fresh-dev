// Types for Luxury Perfume Landing Page

export interface Perfume {
  name: string;
  description: string;
  price: string;
  volume: string;
  notes: string; // Fragrance notes (top, middle, base)
  category: string;
  featured?: boolean;
  image?: string;
}

export interface PerfumeCollection {
  name: string;
  description: string;
  perfumes: Perfume[];
  image?: string;
}

export interface Testimonial {
  name: string;
  role: string;
  location: string;
  content: string;
  rating: number;
  avatar?: string;
}

export interface NavLink {
  text: string;
  href: string;
  icon?: string;
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface PricingTier {
  name: string;
  price: string;
  volume: string;
  features: string[];
  highlighted: boolean;
  ctaText: string;
  ctaLink: string;
}

export interface FooterSection {
  title: string;
  links: Array<{
    text: string;
    href: string;
  }>;
}

export interface Ingredient {
  name: string;
  description: string;
  benefits: string[];
}
