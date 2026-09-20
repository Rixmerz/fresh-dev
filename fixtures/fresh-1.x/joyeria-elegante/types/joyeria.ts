// Types for Jewelry Elegant Landing Page

export interface JewelryProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  category: "anillos" | "collares" | "aretes" | "pulseras" | "sets";
  material: string;
  featured: boolean;
  image: string;
  inStock: boolean;
  discount?: string;
  karat?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  image: string;
  productCount: number;
}

export interface Testimonial {
  name: string;
  location: string;
  content: string;
  rating: number;
  image?: string;
  date: string;
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

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}
