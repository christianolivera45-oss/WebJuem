export interface ProductVariant {
  id?: string;
  sku?: string;
  size: string;
  color: string;
  colorCode?: string; // e.g. '#2563eb'
  priceDelta?: number;
  stock: number;
  imageUrl?: string; // Image associated with this color/variant
  price?: number; // Custom override price
  stockPinamar?: number;
  stockMontevideo?: number;
  stockTotalActual?: number;
}

export interface ComboComponent {
  productId: string;
  variantId?: string;
  quantity: number;
  comboColor?: string; // Color of the parent combo that this component belongs to
  comboSize?: string;  // Size of the parent combo that this component belongs to
}

export interface Product {
  id: string;
  codigo?: string; // Product code / SKU matching spreadsheet code (e.g., J001)
  name: string;
  description: string;
  price: number;
  originalPrice?: number; // For sale/discount prices
  category: string; // Keep for fallback compatibility
  categoria_id?: string; // Main Category ID
  subcategoria_id?: string; // Subcategory ID
  categorias_adicionales?: string[]; // Additional Category IDs
  subcategorias_adicionales?: string[]; // Additional Subcategory IDs
  imageUrl: string;
  imagenes?: string[]; // List of multiple product images
  variants?: ProductVariant[]; // Advanced dyn sub-variants with stock
  stock: number;
  featured: boolean;
  createdAt: string;
  sizes?: string[];
  colors?: string[];
  active?: boolean; // Logical soft delete
  paused?: boolean; // Pause in eCommerce store front
  is3D?: boolean; // Is a 3D printed product with custom logic
  hoursPerUnit?: number; // Hours needed to 3D print one unit
  consultOnly?: boolean; // Show 'Consultar por WhatsApp' instead of 'Comprar'
  isCombo?: boolean;
  comboComponents?: ComboComponent[];
  
  // Custom internal pricing and branch stock fields
  precioCompra?: number;
  precioCon40?: number;
  comisionML?: number;
  precioVentaML?: number;
  precioWeb?: number;
  calcWebPriceFromML?: boolean;
  descuentoPorcentaje?: number;
  stockPinamar?: number;
  stockMontevideo?: number;
  stockTotalActual?: number;

  sizeChartEnabled?: boolean;
  sizeChartShowSuperior?: boolean;
  sizeChartShowInferior?: boolean;
  sizeChartShowCalzado?: boolean;
  sizeChartShowRecommender?: boolean;
  sizeChartData?: {
    columns: string[];
    rows: Record<string, string>[];
  };
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText?: string;
  buttonLink?: string;
  hideButton?: boolean;
  hideWhatsAppButton?: boolean;
}

export interface DeliveryMethod {
  id: string;
  title: string;
  subtext?: string | null;
  iconType: string;
}

export interface SiteSettings {
  siteTitle: string;
  siteSubtitle: string;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerImageUrl: string;
  whatsappNumber: string; // WhatsApp context for messaging
  primaryColor: string; // Core branding color
  accentColor: string; // Interactive elements color
  themeMode: 'dark' | 'light';
  promotionBannerText: string;
  promotionBannerText2?: string;
  promotionBannerTexts?: string[];
  promotionBannerBgColor?: string;
  promotionBannerTextColor?: string;
  promotionBannerTransition?: 'slide' | 'fade' | 'zoom';
  showPromotionBanner: boolean;
  heroSlides?: HeroSlide[];
  heroSliderTransition?: 'slide' | 'fade' | 'zoom' | 'slide-up';
  logoType?: 'text' | 'image';
  logoText?: string;
  logoImageUrl?: string;
  footerCol1Title?: string;
  footerCol1Text?: string;
  footerCol2Title?: string;
  footerCol2Text?: string;
  footerCol3Title?: string;
  footerCol3Text?: string;
  footerCopyright?: string;
  lowStockThreshold?: number;
  mercadopagoActive?: boolean;
  mercadopagoMessage?: string;
  mercadopagoPublicKey?: string;
  mercadopagoAccessToken?: string;
  mercadopagoSurchargePercent?: number | string;
  exchangeRate?: number | string;
  transferActive?: boolean;
  transferDetails?: string;
  cashActive?: boolean;
  cashMessage?: string;
  pickupActive?: boolean;
  pickupAddress?: string;
  pickupHours?: string;
  pickupAddressPinamar?: string;
  pickupHoursPinamar?: string;
  pickupMontevideoActive?: boolean;
  pickupPinamarActive?: boolean;
  pickupSuccessMessage?: string;
  deliveryActive?: boolean;
  deliveryMethods?: DeliveryMethod[];
  invoiceOptionActive?: boolean;
  freeShippingActive?: boolean;
  freeShippingMinAmount?: number;
  freeShippingRegions?: string;
  freeShippingCustomText?: string;
  shippingCostMontevideo?: number;
  shippingCostPinamar?: number;
  defaultFirstName?: string;
  defaultLastName?: string;
  defaultPhone?: string;
  googleReviewsEnabled?: boolean;
  googleReviewsSource?: 'api' | 'custom';
  googleReviewsRating?: number;
  googleReviewsTotal?: number;
  googleReviewsCustomList?: Array<{
    author_name: string;
    profile_photo_url?: string;
    rating: number;
    relative_time_description: string;
    text: string;
    time: number;
    avatar_color?: string;
  }>;
  googlePlacesApiKey?: string;
  googlePlaceId?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  emailSenderEnabled?: boolean;
  emailSenderProvider?: 'smtp' | 'resend' | 'mailgun';
  resendApiKey?: string;
  mailgunApiKey?: string;
  mailgunDomain?: string;
  mailgunRegion?: 'us' | 'eu';
  emailSenderSmtpHost?: string;
  emailSenderSmtpPort?: number;
  emailSenderSmtpUser?: string;
  emailSenderSmtpPass?: string;
  emailSenderFromAddress?: string;
  emailTemplateOrderCreatedSubject?: string;
  emailTemplateOrderStatusChangedSubject?: string;
  emailTemplateOrderCreatedBody?: string;
  emailTemplateOrderStatusChangedBody?: string;
  emailHeaderImageUrl?: string;
  bannerOpacity?: number;
  featuredSliderSpeed?: number;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  metaPixelId?: string;
  seoDescription?: string;
  seoKeywords?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  styleSystemNotes?: string;
}

export interface Category {
  id: string;
  nombre: string;
  icono: string; // icon name e.g. "Shirt", "Smartphone", "Sparkles", "Home"
  orden: number;
  active?: boolean; // toggle visibility on/off
  hide_on_home?: boolean; // hide from home page sections list
}

export interface Subcategory {
  id: string;
  nombre: string;
  categoria_id: string;
  active?: boolean;
}

export interface Coupon {
  code: string;
  discount_percent: number;
  expiration_date?: string; // ISO string on client side
  active?: boolean;
  max_uses?: number;
  uses_count?: number;
}

export interface AdminCredentials {
  username: string;
  passwordHash: string;
  sessionToken?: string;
  salt?: string;
}

export interface OrderItem {
  id?: string;
  productId?: string;
  variantId?: string;
  productName: string;
  sku?: string;
  sizeSelected?: string;
  colorSelected?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  comisionML?: number;
  costPrice?: number;
}

export type OrderStatus = 
  | "pedido_iniciado"
  | "pago_pendiente"
  | "pago_aprobado"
  | "pago_rechazado"
  | "pedido_cancelado"
  | "pedido_reembolsado";

export interface Order {
  id: string; // UUID or ID
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  couponCode?: string;
  surchargeAmount?: number;
  status: OrderStatus;
  notes?: string;
  bypassStockDeduction?: boolean;
  createdAt: string;
  updatedAt?: string;
  items?: OrderItem[];
  depositoOrigen?: 'Pinamar' | 'Montevideo';
  canal?: string;
  paymentMethod?: string;
}

export interface BillItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ivaRate?: string; // e.g. "22%", "10%", "No Gravado"
}

export interface Bill {
  id: string;
  providerName: string;
  providerRut?: string;
  documentType: string;
  documentNumber?: string;
  date: string; // YYYY-MM-DD
  currency: string;
  subtotal: number;
  ivaAmount: number;
  total: number;
  paymentMethod?: string;
  depositoOrigen?: "Pinamar" | "Montevideo";
  notes?: string;
  items?: BillItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface Shipping {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  deliveryHours?: string;
  deliveryAddress: string;
  comments?: string;
  branch: "Pinamar" | "Montevideo";
  shippingCost: number;
  status: "Pendiente" | "Entregado" | "Cancelado";
  createdAt: string;
  updatedAt?: string;
  orderId?: string | null;
}

export interface ShippingOrigin {
  id: "Pinamar" | "Montevideo";
  name: string;
  address: string;
  contact: string;
}

export interface StockTransfer {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  fromDeposito: "Pinamar" | "Montevideo";
  toDeposito: "Pinamar" | "Montevideo";
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  sku: string;
  productName: string;
  variantName?: string;
  deposito: "Montevideo" | "Pinamar";
  stockAnterior: number;
  stockNuevo: number;
  motivo: string;
  usuario: string;
  createdAt: string;
}

export interface ShopState {
  products: Product[];
  categories: string[]; // compatible fallback
  dbCategories?: Category[]; // dynamic main categories
  dbSubcategories?: Subcategory[]; // dynamic subcategories
  settings: SiteSettings;
  adminCredentials?: AdminCredentials;
  coupons?: Coupon[];
  orders?: Order[]; // local context or active cached orders
  bills?: Bill[]; // entered provider bills/expenses
  shippings?: Shipping[];
  shippingOrigins?: ShippingOrigin[];
  stockTransfers?: StockTransfer[];
  stockAdjustments?: StockAdjustment[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface AdminTask {
  id: string;
  title: string;
  description?: string;
  type: "task" | "idea" | "reminder";
  priority: "high" | "medium" | "low";
  status: "pending" | "completed";
  category?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function is3DProduct(product: Product): boolean {
  if (!product) return false;
  if (product.is3D === true) return true;
  if (product.is3D === false) return false;
  
  const name = (product.name || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();
  const cat = (product.category || "").toLowerCase();
  const catId = (product.categoria_id || "").toLowerCase();

  const matchesText = (txt: string) => {
    return (
      txt.includes("3d") || 
      txt.includes("3 d") ||
      txt.includes("impresión") || 
      txt.includes("impresion") ||
      txt.includes("impreción") ||
      txt.includes("imprecion")
    );
  };

  return matchesText(name) || matchesText(desc) || matchesText(cat) || matchesText(catId);
}
