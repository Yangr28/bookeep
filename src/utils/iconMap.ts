import {
  Wallet, Gift, TrendingUp, Plus, Briefcase, Award,
  UtensilsCrossed, Car, ShoppingBag, Gamepad2, Heart,
  GraduationCap, Home, MoreHorizontal, Coffee, Plane,
  Shirt, Music, BookOpen, Phone, Laptop, Camera,
  Circle, Building2, MessageCircle, Banknote, CreditCard,
  CheckCircle, Bookmark,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const iconMap: Record<string, LucideIcon> = {
  Wallet,
  Gift,
  TrendingUp,
  Plus,
  Briefcase,
  Award,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Gamepad2,
  Heart,
  GraduationCap,
  Home,
  MoreHorizontal,
  Coffee,
  Plane,
  Shirt,
  Music,
  BookOpen,
  Phone,
  Laptop,
  Camera,
  Circle,
  Building2,
  MessageCircle,
  Banknote,
  CreditCard,
  CheckCircle,
  Bookmark,
};

export const getIcon = (name: string): LucideIcon => iconMap[name] || Circle;
