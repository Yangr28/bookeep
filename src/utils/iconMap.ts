import {
  // 收入/资产
  Wallet, Gift, TrendingUp, Plus, Briefcase, Award,
  Circle, Building2, MessageCircle, Banknote, CreditCard,
  CheckCircle, Bookmark, Landmark, PiggyBank, Coins,
  Receipt, FileText, HandCoins, PiggyBank as Jar,
  // 支出 - 餐饮
  UtensilsCrossed, Utensils, Coffee, Cake, Wine, IceCream, Cookie,
  // 支出 - 交通
  Car, Plane, Train, Bus, Bike, CarTaxiFront, Fuel, ParkingCircle,
  // 支出 - 购物
  ShoppingBag, ShoppingCart, Shirt, Watch, Gem, Package, Gift as Gift2,
  // 支出 - 居住
  Home, Key, Paintbrush, Wrench, Lightbulb, Droplet, Flame, Wifi,
  // 支出 - 生活
  ShoppingBag as Grocery, Baby, HeartPulse, Pill, Dumbbell, Scissors,
  PawPrint, Stethoscope, Hand, Music, Headphones, Tv, Radio,
  // 支出 - 教育娱乐
  GraduationCap, BookOpen, Gamepad2, Film, Theater, Palette, Brush,
  Camera, Image, Video, Mic, Pencil, Ruler, Calculator,
  // 支出 - 其他
  Phone, Laptop, MoreHorizontal, Heart, HelpCircle, AlertTriangle, Lock,
  ShieldCheck, Flag, Globe, Users, Crown, Star, Sun, Moon, Cloud, Bell,
  Calendar, Clock, MapPin, Navigation, Compass, Target, Zap, Leaf,
  Flame as Fire, Coffee as Cup, Cookie as Biscuit, Wine as Bottle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// 图标名 -> 组件 映射（统一 key，避免重复引入别名冲突）
const iconMapDef: Record<string, LucideIcon> = {
  // 基础
  Circle, Plus, MoreHorizontal,
  // 收入/资产
  Wallet, Gift, TrendingUp, Briefcase, Award, Building2, MessageCircle,
  Banknote, CreditCard, CheckCircle, Bookmark, Landmark, PiggyBank, Coins,
  Receipt, FileText, HandCoins,
  // 餐饮
  UtensilsCrossed, Utensils, Coffee, Cake, Wine, IceCream, Cookie,
  // 交通
  Car, Plane, Train, Bus, Bike, CarTaxiFront, Fuel, ParkingCircle,
  // 购物
  ShoppingBag, ShoppingCart, Shirt, Watch, Gem, Package,
  // 居住
  Home, Key, Paintbrush, Wrench, Lightbulb, Droplet, Flame, Wifi,
  // 生活
  Baby, HeartPulse, Pill, Dumbbell, Scissors, PawPrint, Stethoscope,
  // 教育娱乐
  GraduationCap, BookOpen, Gamepad2, Film, Theater, Palette, Brush,
  Camera, Image, Video, Mic, Pencil, Ruler, Calculator,
  // 其他
  Phone, Laptop, Heart, HelpCircle, AlertTriangle, Lock, ShieldCheck,
  Flag, Globe, Users, Crown, Star, Sun, Moon, Cloud, Bell, Calendar,
  Clock, MapPin, Navigation, Compass, Target, Zap, Leaf, Music,
  Headphones, Tv, Radio,
};

// 导出使用时直接用 getIcon(name)
export const iconMap: Record<string, LucideIcon> = iconMapDef;

export function getIcon(name: string): LucideIcon {
  return iconMapDef[name] || Circle;
}

// 预设分类使用的图标（iconList）——用于分类管理页选择器
// 按语义分组展示，用户易查找
export const CATEGORY_ICONS: string[] = [
  // 收入组
  'Wallet', 'TrendingUp', 'Briefcase', 'Gift', 'Award', 'Banknote',
  'CreditCard', 'Landmark', 'PiggyBank', 'Coins', 'Receipt', 'FileText',
  // 餐饮组
  'UtensilsCrossed', 'Utensils', 'Coffee', 'Cake', 'Wine', 'IceCream',
  // 交通组
  'Car', 'Plane', 'Train', 'Bus', 'Bike', 'CarTaxiFront', 'Fuel', 'ParkingCircle',
  // 购物组
  'ShoppingBag', 'ShoppingCart', 'Shirt', 'Watch', 'Gem', 'Package',
  // 居住组
  'Home', 'Key', 'Paintbrush', 'Wrench', 'Lightbulb', 'Flame', 'Wifi',
  // 生活组
  'Baby', 'HeartPulse', 'Pill', 'Dumbbell', 'Scissors', 'PawPrint',
  // 娱乐教育组
  'Gamepad2', 'Film', 'Music', 'Headphones', 'Tv', 'BookOpen', 'GraduationCap',
  'Camera', 'Image', 'Palette', 'Brush',
  // 通讯组
  'Phone', 'Laptop', 'MessageCircle',
  // 其他
  'Heart', 'Star', 'Bell', 'Calendar', 'Globe', 'Users', 'Flag', 'Circle', 'MoreHorizontal',
];
