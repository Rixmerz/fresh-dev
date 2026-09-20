export interface SecurityService {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
  price: string;
  category:
    | "penetration"
    | "governance"
    | "incident"
    | "consulting"
    | "training";
  featured: boolean;
  image: string;
}

export interface TestimonialReview {
  name: string;
  company: string;
  role: string;
  message: string;
  rating: number;
  image?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface ComplianceStandard {
  name: string;
  description: string;
  icon: string;
}

export interface TeamMember {
  name: string;
  role: string;
  specialization: string;
  image: string;
  bio: string;
}
