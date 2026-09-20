// Jewelry Landing Page Types

export interface JewelryProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  wholesalePrice?: string;
  category: "necklace" | "earring" | "bracelet" | "ring" | "set";
  featured: boolean;
  image: string;
  images?: string[];
  materials?: string[];
  colors?: string[];
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted: boolean;
  ctaText: string;
  ctaLink: string;
  badge?: string;
}

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  image?: string;
}

export interface GalleryImage {
  src: string;
  alt: string;
  category?: string;
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
