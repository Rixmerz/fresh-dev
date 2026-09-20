// Types for Coffee Shop Landing Page

export interface Product {
  name: string;
  description: string;
  price: string;
  image: string;
  category: "coffee" | "pastry" | "specialty";
  featured?: boolean;
}

export interface MenuItem {
  name: string;
  description: string;
  price: string;
  category: string;
  popular?: boolean;
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

export interface FooterSection {
  title: string;
  links: Array<{
    text: string;
    href: string;
  }>;
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface Schedule {
  day: string;
  hours: string;
  special?: boolean;
}
