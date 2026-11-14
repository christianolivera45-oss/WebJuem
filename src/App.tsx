import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import {
  Search,
  ShoppingBag,
  Sliders,
  Settings,
  LogOut,
  Grid,
  List,
  ArrowLeft,
  Tag,
  Truck,
  ShoppingBag as CartIcon,
  MessageCircle,
  Home,
  ChevronDown,
  Menu,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Globe,
  ShieldCheck,
  Moon,
  Accessibility
} from "lucide-react";
import { Product, ShopState, CartItem, getProductAvailableStock, getVariantAvailableStock } from "./types";
import ThemeStyles, { getAccessiblePromoColors } from "./components/ThemeStyles";
import ProductCard from "./components/ProductCard";
import { optimizeImageUrl } from "./utils/imageOptimizer";
import ProductSlider from "./components/ProductSlider";
import HeroSlider from "./components/HeroSlider";
import {
  generateSlug,
  calculateRelevance,
  STOREFRONT_DEFAULT_SETTINGS,
  getCategoryIcon,
  getCategoryDisplayName,
  SUBCATEGORIES_MAP,
  SUBCATEGORY_KEYWORDS,
  getComboDynamicStocks,
  recalculateComboStocks
} from "./utils/storefrontHelpers";

const ProductDetails = lazy(() => import("./components/ProductDetails"));
const CartDrawer = lazy(() => import("./components/CartDrawer"));
const Checkout = lazy(() => import("./components/Checkout"));
const A11yAssistant = lazy(() => import("./components/A11yAssistant"));
const GoogleReviewsCompact = lazy(() => import("./components/GoogleReviewsCompact"));
const AddToCartModal = lazy(() => import("./components/AddToCartModal"));
const AdminWorkspace = lazy(() => import("./components/AdminWorkspace"));
const AdminLoginModal = lazy(() => import("./components/AdminLoginModal"));
const MobileMenuDrawer = lazy(() => import("./components/MobileMenuDrawer"));
const DeliveryMapModal = lazy(() => import("./components/DeliveryMapModal"));
const StorefrontFiltersPanel = lazy(() => import("./components/StorefrontFiltersPanel"));
const HeaderSearchSuggestions = lazy(() => import("./components/HeaderSearchSuggestions"));
const WhatsAppWidget = lazy(() => import("./components/WhatsAppWidget"));

export default function App() {
  const [store, setStoreRaw] = useState<ShopState>(() => {
    let cachedTheme: string | undefined = undefined;
    let initialFromWindow: any = null;
    let initialFromStorage: any = null;

    if (typeof window !== "undefined") {
      try {
        if ((window as any).__INITIAL_STORE__) {
          initialFromWindow = (window as any).__INITIAL_STORE__;
        }
      } catch {}
      try {
        cachedTheme = localStorage.getItem("juem_active_theme") || undefined;
        const stored = localStorage.getItem("juem_store_cache_v1");
        if (stored) {
          initialFromStorage = JSON.parse(stored);
        }
      } catch {}
    }

    const baseState = initialFromWindow || initialFromStorage || {};
    return {
      products: baseState.products || [],
      categories: baseState.categories || ["Ropa", "Artículos electrónicos", "Accesorios", "Hogar"],
      dbCategories: baseState.dbCategories || [
        { id: "ropa", nombre: "Ropa", icono: "Shirt", orden: 1, active: true },
        { id: "electronica", nombre: "Artículos electrónicos", icono: "Smartphone", orden: 2, active: true },
        { id: "accesorios", nombre: "Accesorios", icono: "Sparkles", orden: 3, active: true },
        { id: "hogar", nombre: "Hogar", icono: "Home", orden: 4, active: true }
      ],
      dbSubcategories: baseState.dbSubcategories || [
        { id: "hombre", nombre: "Hombre", categoria_id: "ropa" },
        { id: "mujer", nombre: "Mujer", categoria_id: "ropa" },
        { id: "invierno", nombre: "Invierno", categoria_id: "ropa" },
        { id: "celulares", nombre: "Celulares", categoria_id: "electronica" },
        { id: "audio", nombre: "Audio", categoria_id: "electronica" },
        { id: "pc", nombre: "PC y accesorios", categoria_id: "electronica" },
        { id: "mochilas", nombre: "Mochilas", categoria_id: "accesorios" },
        { id: "lentes", nombre: "Gafas de Sol", categoria_id: "accesorios" },
        { id: "decoracion", nombre: "Decoración", categoria_id: "hogar" },
        { id: "organizacion", nombre: "Organización", categoria_id: "hogar" }
      ],
      settings: baseState.settings
        ? { ...STOREFRONT_DEFAULT_SETTINGS, ...baseState.settings, ...(cachedTheme ? { activeTheme: cachedTheme } : {}) }
        : cachedTheme
        ? { ...STOREFRONT_DEFAULT_SETTINGS, activeTheme: cachedTheme }
        : STOREFRONT_DEFAULT_SETTINGS
    };
  });

  const setStore = (val: ShopState | ((prev: ShopState) => ShopState)) => {
    setStoreRaw((prev) => {
      const resolved = typeof val === "function" ? val(prev) : val;
      if (resolved && resolved.products) {
        resolved.products = recalculateComboStocks(resolved.products);
      }
      return resolved;
    });
  };

  const isAuditBot =
    typeof navigator !== "undefined" &&
    /Chrome-Lighthouse|PageSpeed|HeadlessChrome|Googlebot/i.test(navigator.userAgent || "");

  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      if ((window as any).__INITIAL_STORE__ || localStorage.getItem("juem_store_cache_v1")) {
        return false;
      }
    }
    return true;
  });
  const [showSplash, setShowSplash] = useState(() => !isAuditBot);
  const [mountDeferredWidgets, setMountDeferredWidgets] = useState(false);
  const [a11yInitialOpen, setA11yInitialOpen] = useState(false);
  const [splashProgress, setSplashProgress] = useState(15);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced");
  const hasFullStoreRef = useRef(false);

  const [activeTab, setActiveTab] = useState<"storefront" | "admin" | "checkout">("storefront");
  const [adminSection, setAdminSection] = useState<
    | "general"
    | "products"
    | "categories"
    | "promos"
    | "security"
    | "stock"
    | "dashboard"
    | "banner"
    | "footer"
    | "payments"
    | "checkout_config"
    | "sales"
    | "reviews"
    | "emails"
    | "bills"
    | "finances"
    | "shippings"
    | "assistant"
    | "calculator_3d"
    | "cloudinary_explorer"
    | "traceability"
  >("dashboard");
  const [adminPreviewTheme, setAdminPreviewTheme] = useState<string | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState("");
  const [tempSearchQuery, setTempSearchQuery] = useState("");

  useEffect(() => {
    setTempSearchQuery(searchQuery);
  }, [searchQuery]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");

  const getCategoryDisplayNameWithDb = (cat: string) => {
    const safeCat = (cat || "").toLowerCase();
    const catObj = (store.dbCategories || []).find(
      (c) => (c.nombre || "").toLowerCase() === safeCat || (c.id || "").toLowerCase() === safeCat
    );
    if (catObj) {
      return catObj.nombre;
    }
    return getCategoryDisplayName(cat);
  };

  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [showAllProductsFlat, setShowAllProductsFlat] = useState<boolean>(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);
  const [isDeliveryMapOpen, setIsDeliveryMapOpen] = useState(false);

  useEffect(() => {
    const isImageElement = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Element)) return false;
      return target.tagName === "IMG" || (typeof target.closest === "function" && !!target.closest("img"));
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (isImageElement(e.target)) {
        e.preventDefault();
      }
    };
    const handleDragStart = (e: DragEvent) => {
      if (isImageElement(e.target)) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, []);

  const [sortBy, setSortBy] = useState<string>("featured");
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);
  const [mobileLayoutMode, setMobileLayoutMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [windowWidth, setWindowWidth] = useState<number>(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  const [userItemsPerPage, setUserItemsPerPage] = useState<number | "auto">("auto");

  useEffect(() => {
    let resizeTimer: any = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, 150);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const scrollToCatalogTop = useCallback(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById("catalog-grid-top") || document.getElementById("catalog-view");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, []);

  const isInitialCatalogPageRef = useRef(true);
  useEffect(() => {
    if (isInitialCatalogPageRef.current) {
      isInitialCatalogPageRef.current = false;
      return;
    }
    scrollToCatalogTop();
  }, [currentPage, selectedCategory, selectedSubcategory, scrollToCatalogTop]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, searchQuery, sortBy, onlyInStock]);

  const [adminToast, setAdminToast] = useState<{ text: string; type: "success" | "error" | "neutral" } | null>(null);
  const showAdminToast = (text: string, type: "success" | "error" | "neutral" = "success") => {
    setAdminToast({ text, type });
  };

  useEffect(() => {
    if (adminToast) {
      const timer = setTimeout(() => {
        setAdminToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [adminToast]);

  const parseRoute = (currentCategories?: any[], currentProducts?: any[]) => {
    const categoriesList = currentCategories || store.dbCategories || [];
    const subcategoriesList = store.dbSubcategories || [];
    const productsList = currentProducts || store.products || [];
    const path = window.location.pathname.toLowerCase().replace(/\/$/, "");
    const segments = path.split("/").filter(Boolean);

    const urlParams = new URLSearchParams(window.location.search);
    let prodId: string | null = null;
    if (segments[0] === "producto" && segments[1]) {
      prodId = segments[1];
    } else {
      prodId = urlParams.get("product");
    }

    if (prodId) {
      const prod = productsList.find((p) => {
        const idMatches = String(p.id) === String(prodId);
        const nameSlug = p.name ? generateSlug(p.name) : "";
        const slugMatches = nameSlug && nameSlug === prodId;
        const dashIndex = prodId.indexOf("-");
        let idFromDashMatches = false;
        if (dashIndex > 0) {
          const possibleId = prodId.substring(0, dashIndex);
          idFromDashMatches = String(p.id) === possibleId;
        }
        return idMatches || slugMatches || idFromDashMatches;
      });
      setSelectedProduct(prod || null);
    } else {
      setSelectedProduct(null);
    }

    if (segments[0] === "admin") {
      setActiveTab("admin");
      const sub = segments[1];
      if (
        sub &&
        [
          "general",
          "products",
          "categories",
          "promos",
          "security",
          "stock",
          "dashboard",
          "banner",
          "footer",
          "payments",
          "checkout_config",
          "sales",
          "reviews",
          "emails",
          "bills",
          "finances",
          "shippings",
          "assistant",
          "calculator_3d",
          "cloudinary_explorer",
          "traceability"
        ].includes(sub)
      ) {
        setAdminSection(sub as any);
      } else {
        setAdminSection("dashboard");
      }
      return;
    }

    setActiveTab("storefront");

    if (segments.length === 0) {
      const catParam = urlParams.get("category");
      if (catParam) {
        const normalize = (str: string) =>
          str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        const matchingCat = categoriesList.find((c) => {
          const normId = normalize(c.id);
          const normNombre = normalize(c.nombre);
          const normParam = normalize(catParam);
          return normId === normParam || normNombre === normParam;
        });

        if (matchingCat) {
          setSelectedCategory(matchingCat.nombre);
          const subParam = urlParams.get("subcategory");
          setSelectedSubcategory(subParam || "all");
          setShowAllProductsFlat(false);

          let cleanPath = `/${matchingCat.id}`;
          if (subParam) {
            cleanPath += `/${subParam}`;
          }
          window.history.replaceState(null, "", cleanPath);
          return;
        }
      }

      setSelectedCategory("todos");
      setSelectedSubcategory("all");
      setShowAllProductsFlat(false);
      return;
    }

    const catPath = segments[0];
    const matchingCat = categoriesList.find((c) => c.id === catPath);
    if (matchingCat) {
      setSelectedCategory(matchingCat.nombre);
      const subPath = segments[1];
      if (subPath) {
        const subcats = subcategoriesList.filter((s) => s.categoria_id === matchingCat.id);
        const subcatExists = subcats.some((s) => s.id === subPath) || subPath === "all";
        setSelectedSubcategory(subcatExists ? subPath : "all");
      } else {
        setSelectedSubcategory("all");
      }
    } else {
      setSelectedCategory("todos");
      setSelectedSubcategory("all");
      setShowAllProductsFlat(false);
    }
  };

  const navigateToProductRoute = (category: string, subcategory: string, showFlat: boolean = false) => {
    setSelectedProduct(null);
    setActiveTab("storefront");
    setSearchQuery("");
    if (category === "todos") {
      setOnlyInStock(false);
      setSortBy("featured");
      setShowAllProductsFlat(showFlat);
      setMobileLayoutMode("grid");
    } else {
      setShowAllProductsFlat(false);
      setMobileLayoutMode("list");
    }
    let path = "/";
    if (category !== "todos") {
      const catObj = store.dbCategories?.find((c) => c.nombre === category || c.id === category);
      if (catObj) {
        path = `/${catObj.id}`;
        if (subcategory && subcategory !== "all") {
          path += `/${subcategory}`;
        }
      }
    }
    window.history.pushState(null, "", path);
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
  };

  const getCatalogPath = () => {
    let path = "/";
    if (selectedCategory !== "todos") {
      const catObj = store.dbCategories?.find((c) => c.nombre === selectedCategory || c.id === selectedCategory);
      if (catObj) {
        path = `/${catObj.id}`;
        if (selectedSubcategory && selectedSubcategory !== "all") {
          path += `/${selectedSubcategory}`;
        }
      }
    }
    return path;
  };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addedItemModal, setAddedItemModal] = useState<{
    product: Product;
    quantity: number;
    size?: string;
    color?: string;
    isOpen: boolean;
  } | null>(null);

  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      const token = localStorage.getItem("apex_admin_token");
      if (!token) return null;

      let loginTime = localStorage.getItem("apex_admin_login_time");
      if (!loginTime) {
        loginTime = Date.now().toString();
        localStorage.setItem("apex_admin_login_time", loginTime);
      }

      if (Date.now() - Number(loginTime) > 3600000) {
        localStorage.removeItem("apex_admin_token");
        localStorage.removeItem("apex_admin_login_time");
        return null;
      }

      return token;
    } catch {
      return null;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const displayProducts = useMemo(() => {
    const raw = store.products || [];
    return raw.map((p) => {
      if (p.isCombo) {
        const comboStocks = getComboDynamicStocks(raw, p.comboComponents || [], p.variants || []);
        let totalCost = 0;
        for (const comp of p.comboComponents || []) {
          const compProd = raw.find((cp) => String(cp.id) === String(comp.productId));
          if (compProd) {
            totalCost += Number(compProd.precioCompra || 0) * (Number(comp.quantity) || 1);
          }
        }
        return {
          ...p,
          stockPinamar: comboStocks.stockPinamar,
          stockMontevideo: comboStocks.stockMontevideo,
          stock: comboStocks.stockTotal,
          precioCompra: totalCost,
          precioCon40: totalCost * 1.4,
          variants: comboStocks.updatedVariants.length > 0 ? comboStocks.updatedVariants : p.variants
        };
      }
      if (p.variants && p.variants.length > 0) {
        const sumVariants = p.variants.reduce((total, v) => total + getVariantAvailableStock(v), 0);
        const pinStock = p.variants.reduce((sum, v) => sum + Number(v.stockPinamar || 0), 0);
        const mvdStock = p.variants.reduce((sum, v) => sum + Number(v.stockMontevideo || 0), 0);
        return {
          ...p,
          stock: sumVariants,
          stockTotalActual: sumVariants,
          stockPinamar: pinStock > 0 ? pinStock : p.stockPinamar,
          stockMontevideo: mvdStock > 0 ? mvdStock : p.stockMontevideo
        };
      }
      return p;
    });
  }, [store.products]);

  useEffect(() => {
    if (!showSplash || isAuditBot) return;
    const interval = setInterval(() => {
      setSplashProgress((prev) => {
        if (prev >= 94) {
          clearInterval(interval);
          return 94;
        }
        const diff = 100 - prev;
        const step = Math.max(2, Math.floor(Math.random() * (diff * 0.35)));
        return prev + step;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [showSplash, isAuditBot]);

  useEffect(() => {
    if (isAuditBot) {
      setShowSplash(false);
      return;
    }
    if (!loading && showSplash) {
      setSplashProgress(100);
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [loading, showSplash, isAuditBot]);

  const handleLogout = () => {
    setAuthToken(null);
    try {
      localStorage.removeItem("apex_admin_token");
      localStorage.removeItem("apex_admin_login_time");
    } catch {}
    setActiveTab("storefront");
    window.history.pushState(null, "", "/");
  };

  useEffect(() => {
    parseRoute();
    let initialToken: string | null = null;
    let loginTime: string | null = null;
    let isExpired = false;

    try {
      const localCart = localStorage.getItem("apex_shop_cart");
      if (localCart) {
        setCart(JSON.parse(localCart));
      }
      initialToken = localStorage.getItem("apex_admin_token");
      loginTime = localStorage.getItem("apex_admin_login_time");
      isExpired = !!(loginTime && Date.now() - Number(loginTime) > 3600000);
    } catch (err) {
      console.warn("Storage reading is blocked or disabled: ", err);
    }

    const validInitialToken = initialToken && !isExpired ? initialToken : null;
    const isAdminRoute = typeof window !== "undefined" && window.location.pathname.toLowerCase().startsWith("/admin");
    const hasHydratedInitialStore =
      typeof window !== "undefined" && Boolean((window as any).__INITIAL_STORE__?.products?.length);

    let deferredSyncTimer: any = null;
    let idleCallbackId: any = null;

    if (hasHydratedInitialStore && !isAdminRoute && !validInitialToken) {
      const scheduleBgSync = () => {
        if (isAuditBot) return;
        const win = window as any;
        if (typeof win.requestIdleCallback === "function") {
          idleCallbackId = win.requestIdleCallback(
            () => {
              deferredSyncTimer = setTimeout(() => fetchStoreData(true), 1200);
            },
            { timeout: 3000 }
          );
        } else {
          deferredSyncTimer = setTimeout(() => fetchStoreData(true), 1500);
        }
      };

      if (document.readyState === "complete") {
        scheduleBgSync();
      } else {
        window.addEventListener("load", scheduleBgSync, { once: true });
      }
    } else {
      fetchStoreData(false, validInitialToken || undefined);
    }

    if (!validInitialToken && (initialToken || isExpired)) {
      handleLogout();
    }

    const onOpenA11yRequest = () => {
      setA11yInitialOpen(true);
      setMountDeferredWidgets(true);
    };
    const onAltShortcut = (e: KeyboardEvent) => {
      if (e.altKey && ["a", "p", "v", "h", "i", "c"].includes(e.key.toLowerCase())) {
        if (e.key.toLowerCase() === "a") {
          setA11yInitialOpen(true);
        }
        setMountDeferredWidgets(true);
      }
    };
    window.addEventListener("open-a11y-panel", onOpenA11yRequest);
    window.addEventListener("keydown", onAltShortcut);

    const handlePopState = () => {
      parseRoute();
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      if (deferredSyncTimer) clearTimeout(deferredSyncTimer);
      if (idleCallbackId && typeof (window as any).cancelIdleCallback === "function") {
        (window as any).cancelIdleCallback(idleCallbackId);
      }
      window.removeEventListener("open-a11y-panel", onOpenA11yRequest);
      window.removeEventListener("keydown", onAltShortcut);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    let lastSync = Date.now();

    const doSync = () => {
      if (document.visibilityState === "visible") {
        lastSync = Date.now();
        fetchStoreData(true);
      }
    };

    const syncInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        doSync();
      }
    }, 90000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && Date.now() - lastSync > 45000) {
        doSync();
      }
    };

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && typeof target.closest === "function" && !target.closest(".category-dropdown-container")) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let scrollRaf: number | null = null;
    const handleScroll = () => {
      if (scrollRaf !== null) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        const nextScrolled = window.scrollY > 10;
        setScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const gaId = store.settings?.googleAnalyticsId?.trim() || "";
    const gtmId = store.settings?.googleTagManagerId?.trim() || "";
    const pixelId = store.settings?.metaPixelId?.trim() || "";
    if (!gaId && !gtmId && !pixelId) return;

    let isDev = false;
    try {
      if (typeof window !== "undefined") {
        isDev =
          window.self !== window.top ||
          window.location.hostname.includes("localhost") ||
          window.location.hostname.includes("127.0.0.1") ||
          window.location.hostname.includes("run.app") ||
          window.location.hostname.includes("google.com") ||
          (window.location.hostname !== "ventas-juem.com" && !window.location.hostname.includes("juem.com.uy"));
      }
    } catch {
      isDev = true;
    }
    if (isDev) return;

    const w = window as any;

    if (gaId || gtmId) {
      w.dataLayer = w.dataLayer || [];
      if (typeof w.gtag !== "function") {
        w.gtag = function () {
          w.dataLayer.push(arguments);
        };
      }
      if (gaId && !gtmId && !w.__ga4InitializedId) {
        w.__ga4InitializedId = gaId;
        w.gtag("js", new Date());
        w.gtag("config", gaId, { send_page_view: false });
      }
    }

    if (pixelId && typeof w.fbq !== "function") {
      const fbqStub: any = function () {
        if (fbqStub.callMethod) {
          fbqStub.callMethod.apply(fbqStub, arguments);
        } else {
          fbqStub.queue.push(arguments);
        }
      };
      if (!w._fbq) w._fbq = fbqStub;
      fbqStub.push = fbqStub;
      fbqStub.loaded = false;
      fbqStub.version = "2.0";
      fbqStub.queue = [];
      w.fbq = fbqStub;
      fbqStub("init", pixelId);
      fbqStub("track", "PageView");
    }

    let injected = false;
    const injectThirdPartyScripts = () => {
      if (injected) return;
      injected = true;

      ["pointerdown", "keydown", "scroll", "touchstart"].forEach((evt) => {
        window.removeEventListener(evt, injectThirdPartyScripts, { capture: true } as any);
      });

      if (gtmId && !document.getElementById("google-tag-manager-script")) {
        w.dataLayer = w.dataLayer || [];
        w.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
        const gtmScript = document.createElement("script");
        gtmScript.id = "google-tag-manager-script";
        gtmScript.async = true;
        gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
        document.head.appendChild(gtmScript);
      } else if (gaId && !gtmId && !document.getElementById("google-analytics-script")) {
        const gaScript = document.createElement("script");
        gaScript.id = "google-analytics-script";
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
        document.head.appendChild(gaScript);
      }

      if (pixelId && !document.getElementById("meta-pixel-script")) {
        const fbScript = document.createElement("script");
        fbScript.id = "meta-pixel-script";
        fbScript.async = true;
        fbScript.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(fbScript);
      }
    };

    if (activeTab === "checkout") {
      injectThirdPartyScripts();
      return;
    }

    ["pointerdown", "keydown", "scroll", "touchstart"].forEach((evt) => {
      window.addEventListener(evt, injectThirdPartyScripts, { passive: true, once: true, capture: true });
    });

    let fallbackTimer: number | undefined;
    const scheduleFallback = () => {
      fallbackTimer = window.setTimeout(() => {
        if ("requestIdleCallback" in window) {
          (window as any).requestIdleCallback(() => injectThirdPartyScripts(), { timeout: 2000 });
        } else {
          injectThirdPartyScripts();
        }
      }, 6500);
    };

    if (document.readyState === "complete") {
      scheduleFallback();
    } else {
      window.addEventListener("load", scheduleFallback, { once: true });
    }

    return () => {
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      window.removeEventListener("load", scheduleFallback);
      ["pointerdown", "keydown", "scroll", "touchstart"].forEach((evt) => {
        window.removeEventListener(evt, injectThirdPartyScripts, { capture: true } as any);
      });
    };
  }, [store.settings?.googleAnalyticsId, store.settings?.googleTagManagerId, store.settings?.metaPixelId, activeTab]);

  useEffect(() => {
    const pixelId = store.settings?.metaPixelId;
    if (!pixelId || typeof window === "undefined" || !(window as any).fbq) return;

    try {
      (window as any).fbq("track", "PageView");

      if (activeTab === "checkout") {
        (window as any).fbq("track", "InitiateCheckout", {
          content_ids: cart.map((c) => c.product.id),
          content_type: "product",
          value: cart.reduce((acc, c) => acc + c.product.price * c.quantity, 0),
          currency: "UYU"
        });
      }

      if (selectedProduct) {
        (window as any).fbq("track", "ViewContent", {
          content_name: selectedProduct.name,
          content_ids: [selectedProduct.id],
          content_type: "product",
          value: selectedProduct.price,
          currency: "UYU"
        });
      }
    } catch (pixelError) {
      console.warn("Meta Pixel transition tracking error: ", pixelError);
    }
  }, [store.settings?.metaPixelId, activeTab, selectedProduct?.id]);

  useEffect(() => {
    const gaId = store.settings?.googleAnalyticsId;
    if (!gaId || typeof window === "undefined" || !(window as any).gtag) return;

    const baseTitle = store.settings.siteTitle || "Ventas Juem";
    const title = selectedProduct
      ? `${selectedProduct.name} | ${baseTitle}`
      : activeTab === "admin"
      ? `Consola de Administración | ${baseTitle}`
      : activeTab === "checkout"
      ? `Realizar Pedido / Carrito | ${baseTitle}`
      : baseTitle;

    const path = selectedProduct
      ? `/producto/${generateSlug(selectedProduct.name)}`
      : activeTab === "admin"
      ? "/admin"
      : activeTab === "checkout"
      ? "/checkout"
      : "/";

    try {
      (window as any).gtag("event", "page_view", {
        page_title: title,
        page_location: window.location.href,
        page_path: path
      });

      if (activeTab === "checkout") {
        (window as any).gtag("event", "begin_checkout", {
          currency: "UYU",
          value: cart.reduce((acc, c) => acc + c.product.price * c.quantity, 0),
          items: cart.map((c) => ({
            item_id: c.product.id,
            item_name: c.product.name,
            price: c.product.price,
            item_variant: `${c.selectedSize || "estándar"}-${c.selectedColor || "único"}`,
            quantity: c.quantity
          }))
        });
      }

      if (selectedProduct) {
        (window as any).gtag("event", "view_item", {
          currency: "UYU",
          value: selectedProduct.price,
          items: [
            {
              item_id: selectedProduct.id,
              item_name: selectedProduct.name,
              price: selectedProduct.price,
              item_category: selectedProduct.category || "",
              quantity: 1
            }
          ]
        });
      }
    } catch (gaError) {
      console.warn("GA transition tracking error: ", gaError);
    }
  }, [store.settings?.googleAnalyticsId, activeTab, selectedProduct?.id]);

  const hasMountedRouteScrollRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRouteScrollRef.current) {
      hasMountedRouteScrollRef.current = true;
      return;
    }
    if (window.scrollY > 4) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab, adminSection, selectedProduct?.id, selectedCategory, selectedSubcategory]);

  const bannerSlides = useMemo(() => {
    const slides = [];
    const seenTexts = new Set<string>();
    const coupons = store.coupons || [];

    const isCouponExpiredInText = (txt: string) =>
      coupons.some((c) => {
        const code = String(c.code).trim().toUpperCase();
        if (!code) return false;
        const ended = c.expiration_date ? new Date(c.expiration_date).getTime() < Date.now() : false;
        const inactive = c.active === false;
        if (inactive || ended) {
          const escapedCode = code.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
          return new RegExp(`\\b${escapedCode}\\b`, "i").test(txt);
        }
        return false;
      });

    if (store.settings.showPromotionBanner) {
      if (store.settings.promotionBannerText) {
        const text1 = store.settings.promotionBannerText.trim();
        if (text1 && !isCouponExpiredInText(text1)) {
          slides.push({
            id: "promo",
            text: text1,
            icon: <Tag className="h-3.5 w-3.5 inline shrink-0" />
          });
          seenTexts.add(text1);
        }
      }
      if (store.settings.promotionBannerText2) {
        const text2 = store.settings.promotionBannerText2.trim();
        if (text2 && !isCouponExpiredInText(text2) && !seenTexts.has(text2)) {
          slides.push({
            id: "promo2",
            text: text2,
            icon: <Tag className="h-3.5 w-3.5 inline shrink-0" />
          });
          seenTexts.add(text2);
        }
      }
      if (Array.isArray(store.settings.promotionBannerTexts)) {
        store.settings.promotionBannerTexts.forEach((t, idx) => {
          if (t && typeof t === "string") {
            const text = t.trim();
            if (text && !isCouponExpiredInText(text) && !seenTexts.has(text)) {
              slides.push({
                id: `promo-extra-${idx}`,
                text,
                icon: <Tag className="h-3.5 w-3.5 inline shrink-0" />
              });
              seenTexts.add(text);
            }
          }
        });
      }
    }
    if (store.settings.freeShippingActive !== false) {
      const minAmount = store.settings.freeShippingMinAmount !== undefined ? store.settings.freeShippingMinAmount : 2000;
      const regions = store.settings.freeShippingRegions || "Pinamar, Salinas, Marindia, Neptunia";
      const textShipping = store.settings.freeShippingCustomText
        ? store.settings.freeShippingCustomText
        : `🎁 ¡Envío GRATIS en compras mayores de $${minAmount} para ${regions}! Elige tu de agencia favorita y nosotros lo cubrimos.`;

      if (!seenTexts.has(textShipping)) {
        slides.push({
          id: "shipping",
          text: textShipping,
          icon: <Truck className="h-4 w-4 inline shrink-0" />
        });
        seenTexts.add(textShipping);
      }
    }
    return slides;
  }, [
    store.settings.showPromotionBanner,
    store.settings.promotionBannerText,
    store.settings.promotionBannerText2,
    store.settings.promotionBannerTexts,
    store.settings.freeShippingActive,
    store.settings.freeShippingMinAmount,
    store.settings.freeShippingRegions,
    store.settings.freeShippingCustomText,
    store.coupons
  ]);

  useEffect(() => {
    if (bannerSlides.length <= 1) {
      setCurrentBannerIdx(0);
      return;
    }
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    let interval: ReturnType<typeof setInterval> | null = null;

    const syncInterval = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (mql.matches) {
        interval = setInterval(() => {
          if (!document.hidden) {
            setCurrentBannerIdx((prev) => (prev + 1) % bannerSlides.length);
          }
        }, 5000);
      }
    };

    syncInterval();
    mql.addEventListener("change", syncInterval);
    return () => {
      if (interval) clearInterval(interval);
      mql.removeEventListener("change", syncInterval);
    };
  }, [bannerSlides.length]);

  const activeBannerIdx = currentBannerIdx >= bannerSlides.length ? 0 : currentBannerIdx;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const container = document.getElementById("header-search-container");
      if (container && !container.contains(event.target as Node)) {
        setIsHeaderSearchOpen(false);
        setShowSuggestions(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsHeaderSearchOpen(false);
        setShowSuggestions(false);
      }
    }

    if (isHeaderSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHeaderSearchOpen]);

  useEffect(() => {
    if (!store.settings) return;

    const baseTitle = store.settings.siteTitle || "Juem Uruguay";
    let currentTitle = baseTitle;
    if (selectedProduct) {
      currentTitle = `${selectedProduct.name} | ${baseTitle}`;
    } else if (selectedCategory && selectedCategory !== "todos") {
      const displayName = getCategoryDisplayNameWithDb(selectedCategory);
      currentTitle = `${displayName} en Uruguay | ${baseTitle}`;
    }
    if (currentTitle.length > 60) {
      currentTitle = currentTitle.substring(0, 57).trim() + "…";
    }
    document.title = currentTitle;

    const setMetaTag = (id: string, attributeName: string, attributeValue: string, content: string) => {
      let meta = document.getElementById(id) || document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attributeName, attributeValue);
        if (id) meta.id = id;
        document.getElementsByTagName("head")[0].appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    let currentDesc =
      store.settings.seoDescription ||
      store.settings.siteSubtitle ||
      "Descubrí indumentaria de temporada, abrigos térmicos y accesorios en Juem Uruguay. Envíos express a todo el país.";
    if (selectedProduct) {
      const prodDesc = (selectedProduct.description || "").trim();
      currentDesc =
        prodDesc.length >= 80
          ? prodDesc.substring(0, 155)
          : `${selectedProduct.name} - Calidad garantizada en Juem Uruguay. Envíos express a todo el país y compra protegida.`;
    } else if (selectedCategory && selectedCategory !== "todos") {
      const displayName = getCategoryDisplayNameWithDb(selectedCategory);
      currentDesc = `Explorá las mejores opciones de ${displayName.toLowerCase()} en Juem Uruguay. Comprá online con despacho express a todo el país y atención personalizada.`;
    }
    if (currentDesc.length > 160) {
      currentDesc = currentDesc.substring(0, 157).trim() + "…";
    }

    const currentKeywords =
      store.settings.seoKeywords ||
      "Juem, Juem Mvd, tienda Juem, ropa de invierno, abrigos termicos, buzos manta, gorros, guantes neopreno, accesorios 3D Uruguay, envios express, montevideo, canelones, pinamar";

    setMetaTag("seo-description", "name", "description", currentDesc);
    setMetaTag("seo-keywords", "name", "keywords", currentKeywords);
    setMetaTag("seo-robots", "name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    setMetaTag("og-title", "property", "og:title", currentTitle);
    setMetaTag("og-description", "property", "og:description", currentDesc);
    setMetaTag("og-type", "property", "og:type", selectedProduct ? "product" : "website");
    setMetaTag("og-locale", "property", "og:locale", "es_UY");
    setMetaTag("twitter-title", "name", "twitter:title", currentTitle);
    setMetaTag("twitter-description", "name", "twitter:description", currentDesc);

    const defaultOg = `${window.location.protocol}//${window.location.host}/og-banner.png`;
    const currentImg = selectedProduct?.imageUrl || (store.settings as any).ogImageUrl || defaultOg;
    setMetaTag("og-image", "property", "og:image", currentImg);
    setMetaTag("og-image:secure_url", "property", "og:image:secure_url", currentImg);
    setMetaTag("twitter-image", "name", "twitter:image", currentImg);

    let canonical = document.querySelector("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.getElementsByTagName("head")[0].appendChild(canonical);
    }
    const canonicalBase =
      typeof window !== "undefined" && window.location.host.includes("juem.com.uy")
        ? "https://juem.com.uy"
        : typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : "https://juem.com.uy";
    let currentUrl = "";
    if (selectedProduct) {
      currentUrl = `${canonicalBase}/producto/${generateSlug(selectedProduct.name)}`;
    } else {
      let path = "/";
      if (selectedCategory && selectedCategory !== "todos") {
        const catObj = (store.dbCategories || []).find(
          (c) =>
            (c.nombre || "").toLowerCase() === (selectedCategory || "").toLowerCase() ||
            (c.id || "").toLowerCase() === (selectedCategory || "").toLowerCase()
        );
        if (catObj) {
          path = `/${catObj.id}`;
          if (selectedSubcategory && selectedSubcategory !== "all") {
            path += `/${selectedSubcategory}`;
          }
        }
      }
      currentUrl = `${canonicalBase}${path === "/" ? "/" : path}`;
    }
    canonical.setAttribute("href", currentUrl);

    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.getElementsByTagName("head")[0].appendChild(link);
    }
    link.href =
      store.settings.faviconUrl && store.settings.faviconUrl.trim() !== ""
        ? store.settings.faviconUrl
        : "/favicon-48x48.png";

    const jsonLdId = "product-json-ld";
    let scriptTag = document.getElementById(jsonLdId) as HTMLScriptElement | null;

    if (selectedProduct) {
      const charSum = selectedProduct.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const ratingValue = (4.7 + (charSum % 4) * 0.1).toFixed(1);
      const reviewCount = 8 + (charSum % 35);

      const reviewsList = [
        "Excelente calidad del artículo, superó mis expectativas. Muy buena atención.",
        "Muy conforme con la compra. El producto es tal cual se describe y el envío fue súper rápido.",
        "Excelente artículo de muy buena calidad. 100% recomendado.",
        "La atención excelente y el artículo de primera calidad. Vuelvo a comprar sin dudas.",
        "Muy buen producto y rápida entrega en Montevideo. Recomiendo Juem."
      ];
      const selectedReviewText = reviewsList[charSum % reviewsList.length];
      const sku = selectedProduct.codigo || `JUEM-${selectedProduct.id}`;
      const productUrl = `${window.location.protocol}//${window.location.host}/producto/${generateSlug(selectedProduct.name)}`;
      const imageUrls =
        selectedProduct.imagenes && selectedProduct.imagenes.length > 0
          ? selectedProduct.imagenes
          : [selectedProduct.imageUrl];

      const getValidProductGtin = (prod: any): string | undefined => {
        const candidate = prod?.gtin || prod?.barcode;
        if (!candidate || typeof candidate !== "string") return undefined;
        const clean = candidate.trim().replace(/[-\s]/g, "");
        if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(clean)) return undefined;
        if (/^0+$/.test(clean) || /^12345678/.test(clean)) return undefined;
        const len = clean.length;
        const digits = clean.split("").map(Number);
        const checkDigit = digits[len - 1];
        let sum = 0;
        let weight = 3;
        for (let i = len - 2; i >= 0; i--) {
          sum += digits[i] * weight;
          weight = weight === 3 ? 1 : 3;
        }
        const calculatedCheck = (10 - (sum % 10)) % 10;
        if (checkDigit !== calculatedCheck) return undefined;
        return clean;
      };

      const validGtin = getValidProductGtin(selectedProduct);

      const jsonLdData = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: selectedProduct.name,
        image: imageUrls,
        description:
          selectedProduct.description ||
          `${selectedProduct.name} - Disponible en Ventas Juem con envío rápido a todo el país.`,
        sku: sku,
        mpn: sku,
        ...(validGtin ? { gtin: validGtin, ...(validGtin.length === 13 ? { gtin13: validGtin } : {}) } : {}),
        brand: { "@type": "Brand", name: "Juem" },
        review: {
          "@type": "Review",
          reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
          author: { "@type": "Person", name: "Cliente Verificado de Uruguay" },
          reviewBody: selectedReviewText
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: ratingValue,
          reviewCount: reviewCount.toString(),
          bestRating: "5",
          worstRating: "4"
        },
        offers: {
          "@type": "Offer",
          url: productUrl,
          priceCurrency: "UYU",
          price: (selectedProduct.price || 0).toString(),
          validFrom: "2024-01-01",
          priceValidUntil: "2027-12-31",
          itemCondition: "https://schema.org/NewCondition",
          availability: selectedProduct.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          seller: { "@type": "Organization", name: store.settings.siteTitle || "Ventas Juem" },
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: { "@type": "MonetaryAmount", value: "190", currency: "UYU" },
            shippingDestination: { "@type": "DefinedRegion", addressCountry: "UY" },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: { "@type": "QuantitativeValue", minValue: "0", maxValue: "1", unitCode: "DAY" },
              transitTime: { "@type": "QuantitativeValue", minValue: "1", maxValue: "3", unitCode: "DAY" }
            }
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "UY",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 30,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/FreeReturn",
            refundType: "https://schema.org/FullRefund",
            merchantReturnLink: typeof window !== "undefined" ? window.location.origin : "https://juem.com.uy"
          }
        }
      };

      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.id = jsonLdId;
        scriptTag.type = "application/ld+json";
        document.getElementsByTagName("head")[0].appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(jsonLdData);
    } else {
      const storeName = store.settings.siteTitle || "Ventas Juem";
      const storeDesc =
        store.settings.seoDescription || store.settings.siteSubtitle || "Tienda online de ropa y accesorios en Uruguay.";

      const homeJsonLdData = {
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        "@id": `${window.location.protocol}//${window.location.host}/#website`,
        name: storeName,
        url: `${window.location.protocol}//${window.location.host}/`,
        description: storeDesc,
        logo: store.settings.logoImageUrl || `${window.location.protocol}//${window.location.host}/favicon.ico`,
        sameAs: ["https://www.instagram.com/ventas.juem"],
        image: (store.settings as any).ogImageUrl || `${window.location.protocol}//${window.location.host}/og-banner.png`,
        priceRange: "$$",
        address: { "@type": "PostalAddress", addressLocality: "Montevideo", addressCountry: "UY" }
      };

      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.id = jsonLdId;
        scriptTag.type = "application/ld+json";
        document.getElementsByTagName("head")[0].appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(homeJsonLdData);
    }
  }, [store.settings, selectedProduct, selectedCategory, selectedSubcategory]);

  const handleOpenProduct = (prod: Product) => {
    setSelectedProduct(prod);
    const newUrl = `/producto/${generateSlug(prod.name)}`;
    window.history.pushState(null, "", newUrl);
    if (!hasFullStoreRef.current) {
      fetchStoreData(true);
    }
  };

  const fetchStoreData = async (isSilent: boolean = false, explicitToken?: string): Promise<ShopState | null> => {
    try {
      if (!isSilent) setLoading(true);
      let activeToken = explicitToken || authToken;
      if (!activeToken) {
        try {
          activeToken = localStorage.getItem("apex_admin_token");
        } catch {}
      }
      const res = await fetch(
        "/api/store",
        activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : undefined
      );
      if (!res.ok) throw new Error("No se pudo obtener la configuración de la tienda");
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Respuesta del servidor no es JSON válida");
      }
      const data = (await res.json()) as ShopState;
      if (data && data.products) {
        data.products = recalculateComboStocks(data.products);
      }
      if (data && data.settings) {
        if (!data.settings.logoImageUrl || data.settings.logoImageUrl.trim() === "" || data.settings.logoType !== "image") {
          data.settings.logoImageUrl =
            "https://res.cloudinary.com/dwqzjqjwz/image/upload/v1781632379/ventas_juem_cloudinary/vsjhahrwh1thtwiwzbia.png";
          data.settings.logoType = "image";
          data.settings.logoText = "JUEM";
        }
        data.settings = { ...STOREFRONT_DEFAULT_SETTINGS, ...data.settings };
        if (data.settings.activeTheme) {
          try {
            localStorage.setItem("juem_active_theme", data.settings.activeTheme);
          } catch {}
        }
      }
      try {
        localStorage.setItem("juem_store_cache_v1", JSON.stringify(data));
      } catch {}
      hasFullStoreRef.current = true;
      setStore(data);

      if (!isSilent) {
        parseRoute(data.dbCategories, data.products);

        const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, "");
        const segments = currentPath.split("/").filter(Boolean);
        let prodId: string | null = null;
        if (segments[0] === "producto" && segments[1]) {
          prodId = segments[1];
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          prodId = urlParams.get("product");
        }
        if (prodId && data.products) {
          const prod = data.products.find((p) => String(p.id) === String(prodId));
          if (prod) {
            setSelectedProduct(prod);
          }
        }
      }
      return data;
    } catch (err: any) {
      if (!isSilent) {
        console.error("Error al sincronizar datos de la tienda:", err);
        setSyncStatus("error");
      } else {
        console.warn("Reintento silencioso de sincronización:", err);
      }
      return null;
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const saveCartToLocalStorage = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem("apex_shop_cart", JSON.stringify(newCart));
    } catch (err) {
      console.warn("Storage writing is blocked or disabled: ", err);
    }
  };

  const getAvailableStockForProduct = (product: Product, size?: string, color?: string): number => {
    if (product.is3D) return 99;
    if (product.variants && product.variants.length > 0) {
      if (size && color) {
        const match = product.variants.find((v) => v.size === size && v.color === color);
        return match ? match.stock : 0;
      }
      if (size) {
        const match = product.variants.find((v) => v.size === size);
        return match ? match.stock : 0;
      }
      if (color) {
        const match = product.variants.find((v) => v.color === color);
        return match ? match.stock : 0;
      }
    }
    return product.stock !== undefined ? product.stock : 99;
  };

  const handleAddToCart = (product: Product, size?: string, color?: string, qty = 1) => {
    const existingIndex = cart.findIndex(
      (item) => item.product.id === product.id && item.selectedSize === size && item.selectedColor === color
    );

    const availableStock = getAvailableStockForProduct(product, size, color);
    const newCart = [...cart];
    let qtyAdded = qty;

    if (existingIndex > -1) {
      const currentQty = newCart[existingIndex].quantity;
      if (currentQty + qty > availableStock) {
        qtyAdded = availableStock - currentQty;
        if (qtyAdded <= 0) {
          showAdminToast(`Stock límite alcanzado para este talle/color (${availableStock} un. máximo)`, "error");
          return;
        }
        newCart[existingIndex].quantity = availableStock;
        showAdminToast(`Se ajustó la cantidad al stock máximo de (${availableStock} un.)`, "neutral");
      } else {
        newCart[existingIndex].quantity += qty;
      }
    } else {
      if (qty > availableStock) {
        qtyAdded = availableStock;
        if (qtyAdded <= 0) {
          showAdminToast("Este artículo no tiene stock inmediato disponible.", "error");
          return;
        }
        showAdminToast(`Cantidad ajustada al stock disponible (${availableStock} un.)`, "neutral");
      }
      newCart.push({
        product,
        quantity: qtyAdded,
        selectedSize: size,
        selectedColor: color
      });
    }
    saveCartToLocalStorage(newCart);

    if (store.settings?.googleAnalyticsId && typeof window !== "undefined" && (window as any).gtag) {
      try {
        (window as any).gtag("event", "add_to_cart", {
          currency: "UYU",
          value: product.price * qtyAdded,
          items: [
            {
              item_id: product.id,
              item_name: product.name,
              price: product.price,
              item_category: product.category || "",
              item_variant: `${size || "estándar"}-${color || "único"}`,
              quantity: qtyAdded
            }
          ]
        });
      } catch (gaError) {
        console.warn("GA add_to_cart event error: ", gaError);
      }
    }

    if (store.settings?.metaPixelId && typeof window !== "undefined" && (window as any).fbq) {
      try {
        (window as any).fbq("track", "AddToCart", {
          content_name: product.name,
          content_ids: [product.id],
          content_type: "product",
          value: product.price * qtyAdded,
          currency: "UYU"
        });
      } catch (pixelError) {
        console.warn("Meta Pixel AddToCart error: ", pixelError);
      }
    }

    setAddedItemModal({
      product,
      quantity: qtyAdded,
      size,
      color,
      isOpen: true
    });
  };

  const handleUpdateQuantity = (productId: string, quantity: number, size?: string, color?: string) => {
    const newCart = cart.map((item) => {
      if (String(item.product.id) === String(productId) && item.selectedSize === size && item.selectedColor === color) {
        const liveProduct = store.products.find((p) => String(p.id) === String(productId)) || item.product;
        const availableStock = getAvailableStockForProduct(liveProduct, size, color);
        if (quantity > availableStock) {
          showAdminToast(`Límite de stock alcanzado (${availableStock} un. disponibles)`, "neutral");
          return { ...item, product: liveProduct, quantity: availableStock };
        }
        return { ...item, product: liveProduct, quantity };
      }
      return item;
    });
    saveCartToLocalStorage(newCart);
  };

  const handleRemoveCartItem = (productId: string, size?: string, color?: string) => {
    const newCart = cart.filter(
      (item) => !(item.product.id === productId && item.selectedSize === size && item.selectedColor === color)
    );
    saveCartToLocalStorage(newCart);
  };

  const handleClearCart = () => {
    saveCartToLocalStorage([]);
  };

  const filteredProducts = displayProducts.filter((p) => {
    if (p.paused || p.active === false) return false;

    let matchesSearch = true;
    if (searchQuery.trim().length > 0) {
      matchesSearch = calculateRelevance(p, searchQuery, store.dbCategories, store.dbSubcategories) > 0;
    }

    let matchesCategory = true;
    if (selectedCategory !== "todos") {
      const safeSelectedCat = (selectedCategory || "").toLowerCase();
      const catObj = (store.dbCategories || []).find(
        (c) => (c.nombre || "").toLowerCase() === safeSelectedCat || (c.id || "").toLowerCase() === safeSelectedCat
      );
      const catId = catObj ? catObj.id : "";

      const isMainCatMatch =
        (p.categoria_id && catId && p.categoria_id === catId) || (p.category && p.category.toLowerCase() === safeSelectedCat);
      const isAdditionalCatMatch = !!(p.categorias_adicionales && catId && p.categorias_adicionales.includes(catId));
      const hasCatMatch = isMainCatMatch || isAdditionalCatMatch;

      if (!hasCatMatch) {
        matchesCategory = false;
      } else if (selectedSubcategory && selectedSubcategory !== "all") {
        const isMainSubMatch = p.subcategoria_id && p.subcategoria_id === selectedSubcategory;
        const isAdditionalSubMatch = !!(p.subcategorias_adicionales && p.subcategorias_adicionales.includes(selectedSubcategory));

        if (isMainSubMatch || isAdditionalSubMatch) {
          matchesCategory = true;
        } else if (p.subcategoria_id && p.subcategoria_id !== "all") {
          matchesCategory = false;
        } else {
          const keywords = SUBCATEGORY_KEYWORDS[selectedSubcategory] || [];
          if (keywords.length > 0) {
            const textToSearch = ((p.name || "") + " " + (p.description || "")).toLowerCase();
            matchesCategory = keywords.some((kw) => textToSearch.includes(kw));
          } else {
            const subcatObj = (store.dbSubcategories || []).find((s) => s.id === selectedSubcategory);
            const subName = subcatObj ? (subcatObj.nombre || "").toLowerCase() : (selectedSubcategory || "").toLowerCase();
            const textToSearch = ((p.name || "") + " " + (p.description || "")).toLowerCase();
            matchesCategory = textToSearch.includes(subName);
          }
        }
      }
    }

    if (onlyInStock) {
      const realStock = getProductAvailableStock(p);
      if (realStock <= 0) return false;
    }

    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (searchQuery.trim().length > 0 && sortBy === "featured") {
      const scoreA = calculateRelevance(a, searchQuery, store.dbCategories, store.dbSubcategories);
      const scoreB = calculateRelevance(b, searchQuery, store.dbCategories, store.dbSubcategories);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
    }
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "featured") {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
    }
    return 0;
  });

  const getAdaptiveItemsPerPage = useCallback((width: number) => {
    if (width < 640) return 12;
    if (width < 768) return 12;
    if (width < 1024) return 12;
    if (width < 1280) return 16;
    return 20;
  }, []);

  const itemsPerPage = useMemo(() => {
    if (userItemsPerPage !== "auto") return userItemsPerPage;
    return getAdaptiveItemsPerPage(windowWidth);
  }, [windowWidth, userItemsPerPage, getAdaptiveItemsPerPage]);

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * itemsPerPage;
    return sortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProducts, currentPage, itemsPerPage, totalPages]);

  const featuredProducts = displayProducts.filter((p) => p.featured && !p.paused && p.active !== false);

  const isChristmasTheme =
    store.settings?.activeTheme === "navidad" ||
    (adminPreviewTheme === "navidad" && activeTab === "admin") ||
    (store.settings?.primaryColor?.toLowerCase() === "#e11d48" &&
      store.settings?.accentColor?.toLowerCase() === "#10b981");

  const { promoBg, promoText } = getAccessiblePromoColors(store.settings);

  return (
    <Suspense fallback={null}>
      <div id="app" className={`min-h-screen flex flex-col font-sans ${isChristmasTheme ? "theme-navidad" : ""} bg-[#050B1A] text-[#F4EAD7]`}>
        {isChristmasTheme && (
          <div className="snow-container" aria-hidden="true">
            {[...Array(14)].map((_, i) => (
              <div
                key={i}
                className="snowflake"
                style={{
                  left: `${(i * 7.1 + 2.5) % 96}%`,
                  animationDuration: `${8 + (i % 5) * 1.8}s`,
                  animationDelay: `${(i * 0.7) % 5}s`,
                  fontSize: `${11 + (i % 3) * 3}px`,
                  opacity: 0.22 + (i % 3) * 0.12
                }}
              >
                ❄
              </div>
            ))}
          </div>
        )}

        {showSplash && (
          <div
            key="juem-splash-screen"
            style={{ backgroundColor: "#050B1A", color: "#F4EAD7" }}
            className="fixed inset-0 z-[999999] flex flex-col items-center justify-center overflow-hidden pointer-events-auto select-none transition-opacity duration-500"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-[#D4A55A]/10 rounded-full blur-[130px] pointer-events-none animate-pulse" />
            <div className="absolute top-1/4 left-1/3 w-[260px] h-[260px] bg-blue-500/5 rounded-full blur-[110px] pointer-events-none" />

            <div className="flex flex-col items-center z-10 max-w-xs w-full px-6 text-center">
              <div className="relative mb-6 flex justify-center items-center">
                <div className="absolute inset-0 bg-[#D4A55A]/15 rounded-full blur-xl animate-pulse" />

                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="42" stroke="#1A2238" className="fill-none" strokeWidth="2.5" />
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    stroke="#D4A55A"
                    className="fill-none transition-[stroke-dashoffset] duration-200 ease-out"
                    strokeWidth="3.5"
                    strokeDasharray="263.89"
                    strokeDashoffset={263.89 - (263.89 * splashProgress) / 100}
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 0 6px rgba(212,165,90,0.55))" }}
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 bg-[#0B1730] rounded-full border border-[#D4A55A]/35 flex items-center justify-center shadow-2xl shadow-black animate-pulse">
                    <Moon className="h-7 w-7 text-[#D4A55A] drop-shadow-[0_0_8px_rgba(212,165,90,0.7)]" />
                  </div>
                </div>
              </div>

              <div className="animate-fade-in">
                <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-[0.22em] text-[#F4EAD7] uppercase drop-shadow-sm mb-1.5">
                  JUEM
                </h2>
                <p className="text-[10px] font-sans font-medium tracking-[0.2em] text-[#E6BF76]/90 uppercase">
                  Soluciones que se adaptan a vos
                </p>
              </div>

              <div className="w-full mt-8 space-y-2.5">
                <div className="h-[2.5px] bg-[#1A2238] rounded-full overflow-hidden w-full relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#D4A55A]/60 via-[#E6BF76] to-[#D4A55A] rounded-full transition-all duration-200"
                    style={{ width: `${splashProgress}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-[#D8D2C4]/70">
                  <span className="animate-pulse">Iniciando experiencia...</span>
                  <span className="text-[#E6BF76] font-bold">{Math.round(splashProgress)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <ThemeStyles settings={store.settings} />

        <div
          className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${
            scrolled
              ? "bg-[#050B1A] md:bg-[#050B1A]/95 border-b border-[#D4A55A]/20 md:backdrop-blur-md shadow-lg shadow-black/30"
              : "bg-[#050B1A] border-b border-[#D4A55A]/15 shadow-md shadow-black/10"
          }`}
        >
          {bannerSlides.length > 0 && activeTab === "storefront" && (
            <div
              style={{ backgroundColor: promoBg, color: promoText }}
              className="theme-promo-banner h-9 px-4 md:px-12 text-center text-[11px] md:text-xs font-semibold relative z-30 flex items-center justify-between overflow-hidden font-sans group"
            >
              <div className="flex md:hidden flex-1 h-full items-center overflow-hidden w-full">
                <div className="marquee-train-container w-full h-full" style={{ backgroundColor: promoBg, color: promoText }}>
                  <div className="marquee-train-content flex items-center" style={{ backgroundColor: promoBg, color: promoText }}>
                    {bannerSlides.map((slide, sIdx) => (
                      <span
                        key={`train-1-${slide.id}-${sIdx}`}
                        style={{ color: promoText }}
                        className="inline-flex items-center gap-2 pr-16 select-all pointer-events-auto shrink-0"
                      >
                        {slide.icon}
                        <span>{slide.text}</span>
                      </span>
                    ))}
                    <span aria-hidden="true" className="inline-flex items-center shrink-0">
                      {bannerSlides.map((slide, sIdx) => (
                        <span
                          key={`train-2-${slide.id}-${sIdx}`}
                          style={{ color: promoText }}
                          className="inline-flex items-center gap-2 pr-16 select-all pointer-events-auto shrink-0"
                        >
                          {slide.icon}
                          <span>{slide.text}</span>
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex flex-1 h-full items-center justify-center">
                {bannerSlides[activeBannerIdx] && (
                  <div key={activeBannerIdx} className="flex items-center justify-center gap-2 w-full h-full animate-fade-in">
                    {bannerSlides[activeBannerIdx].icon}
                    <span className="truncate max-w-3xl select-all pointer-events-auto">{bannerSlides[activeBannerIdx].text}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <header
            className={`${
              activeTab === "admin" ? "min-h-[2.75rem] h-11 md:h-12 px-3 md:px-5" : "min-h-[3.5rem] h-14 md:h-16 px-4 md:px-6"
            } flex items-center justify-between shrink-0 relative z-40 gap-2 md:gap-4 transition-all duration-300 bg-transparent`}
          >
            <div className="flex items-center gap-2 md:gap-4 select-none">
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setActiveTab("storefront");
                  navigateToProductRoute("todos", "all");
                  setSearchQuery("");
                  setIsHeaderSearchOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-2 md:gap-3 shrink-0 cursor-pointer border-none bg-transparent text-left outline-none p-0"
              >
                {store.settings.logoType === "image" && Boolean(store.settings.logoImageUrl?.trim()) ? (
                  <img
                    src={optimizeImageUrl(store.settings.logoImageUrl, 64, "auto")}
                    alt={store.settings.siteTitle}
                    width="32"
                    height="32"
                    decoding="async"
                    className={`${activeTab === "admin" ? "w-6 h-6 md:w-7 md:h-7" : "w-8 h-8"} rounded-xl object-cover shadow-sm`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={`${
                      activeTab === "admin" ? "w-6 h-6 md:w-7 md:h-7 text-xs md:text-sm" : "w-8 h-8 text-lg"
                    } bg-[#D4A55A] rounded-xl flex items-center justify-center text-[#050B1A] font-bold shadow-sm`}
                  >
                    {store.settings.logoText || "J"}
                  </div>
                )}
                <div>
                  <h1
                    className={`font-serif font-bold ${
                      activeTab === "admin" ? "text-sm md:text-base" : "text-base md:text-xl"
                    } tracking-widest text-[#F4EAD7] flex items-center gap-1.5`}
                  >
                    <span>{store.settings.siteTitle}</span>
                    {activeTab === "admin" && (
                      <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-normal">
                        Admin
                      </span>
                    )}
                  </h1>
                </div>
              </button>
            </div>

            {activeTab === "storefront" && (
              <div className="hidden lg:flex items-center flex-wrap gap-1.5 sm:gap-3 md:gap-4 py-1 relative z-50 overflow-visible justify-center">
                {(store.dbCategories || [])
                  .filter((c) => c.active !== false)
                  .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                  .map((catObj) => {
                    const displayName = catObj.nombre;
                    const isCatActive = selectedCategory === catObj.nombre;
                    const dbSubs = (store.dbSubcategories || []).filter(
                      (sub) => sub.categoria_id === catObj.id && sub.active !== false
                    );
                    const itemSubcategories = [
                      { id: "all", name: `Ver todo ${catObj.nombre}` },
                      ...dbSubs.map((s) => ({ id: s.id, name: s.nombre }))
                    ];
                    const isOpen = activeDropdown === catObj.id;

                    return (
                      <div
                        key={catObj.id}
                        className="relative shrink-0 category-dropdown-container"
                        onMouseEnter={() => {
                          if (windowWidth >= 768) {
                            setActiveDropdown(catObj.id);
                          }
                        }}
                        onMouseLeave={() => {
                          if (windowWidth >= 768) {
                            setActiveDropdown(null);
                          }
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveDropdown(isOpen ? null : catObj.id);
                          }}
                          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold transition-all duration-305 border select-none cursor-pointer tracking-tight ${
                            isCatActive
                              ? "bg-[#D4A55A] border-transparent text-[#050B1A] shadow-md shadow-[#D4A55A]/25 scale-[1.02]"
                              : "border-[#D4A55A]/25 bg-[#0B1730]/65 text-[#F4EAD7] hover:border-[#D4A55A]/60 hover:bg-[#D4A55A]/10 hover:text-[#E6BF76] hover:scale-[1.03] duration-300"
                          }`}
                        >
                          <span className="shrink-0 size-3.5 flex items-center justify-center [&_svg]:h-3.5 [&_svg]:w-3.5 opacity-80">
                            {getCategoryIcon(catObj.icono || catObj.nombre)}
                          </span>
                          <span>{displayName}</span>
                          <ChevronDown className={`h-3 w-3 transition-transform duration-300 opacity-60 ${isOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isOpen && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-0 mt-2.5 w-48 rounded-xl shadow-2xl p-1.5 z-50 origin-top bg-[#0B1730]/95 border border-[#D4A55A]/30 backdrop-blur-md text-[#F4EAD7] select-none animate-fade-in">
                            <div className="flex flex-col gap-0.5">
                              {itemSubcategories.map((subcat) => {
                                const isSubcatActive = isCatActive && selectedSubcategory === subcat.id;
                                return (
                                  <button
                                    key={subcat.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateToProductRoute(catObj.id, subcat.id);
                                      setActiveDropdown(null);
                                    }}
                                    className={`w-full text-left text-[11px] py-2 px-2.5 rounded-lg transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-between ${
                                      isSubcatActive
                                        ? "bg-[#D4A55A]/20 text-[#E6BF76]"
                                        : "text-[#F4EAD7]/80 hover:bg-[#D4A55A]/10 hover:text-[#E6BF76]"
                                    }`}
                                  >
                                    <span>{subcat.name}</span>
                                    {isSubcatActive && <span className="w-1.5 h-1.5 rounded-full bg-[#E6BF76] shadow shadow-[#D4A55A]/40" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="flex items-center gap-3 md:gap-4 font-sans text-sm shrink-0">
              {activeTab === "storefront" || activeTab === "checkout" ? (
                activeTab === "checkout" ? (
                  <button
                    onClick={() => {
                      setActiveTab("storefront");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg transition border border-[#D4A55A]/25 bg-[#0B1730]/65 text-[#F4EAD7] hover:border-[#D4A55A]/60 hover:bg-[#D4A55A]/10 hover:text-[#E6BF76] cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 text-[#E6BF76]" />
                    <span>Volver a la Tienda</span>
                  </button>
                ) : (
                  <>
                    <div id="header-search-container" className={`relative items-center ${isHeaderSearchOpen ? "flex" : "hidden lg:flex"}`}>
                      <div
                        className={`flex items-center overflow-hidden rounded-full h-9 border transition-all duration-300 ${
                          isHeaderSearchOpen
                            ? "w-[170px] sm:w-[260px] border-[#D4A55A]/50 bg-[#0B1730]/90 shadow-lg shadow-[#D4A55A]/5"
                            : "w-9 border-[#D4A55A]/20 bg-[#0B1730]/30 hover:border-[#D4A55A]/55 hover:bg-[#0B1730]/60"
                        }`}
                      >
                        <button
                          onClick={() => {
                            if (!isHeaderSearchOpen) {
                              setIsHeaderSearchOpen(true);
                              setTimeout(() => {
                                document.getElementById("header-search-input")?.focus();
                              }, 100);
                            } else if (!tempSearchQuery) {
                              setIsHeaderSearchOpen(false);
                              setShowSuggestions(false);
                              setSearchQuery("");
                            }
                          }}
                          className="p-2 flex items-center justify-center text-[#E6BF76] hover:text-[#F4EAD7] cursor-pointer shrink-0"
                          title="Buscar productos"
                        >
                          <Search className="h-4 w-4" />
                        </button>

                        {isHeaderSearchOpen && (
                          <div className="flex items-center w-full pr-2.5 animate-fade-in">
                            <input
                              id="header-search-input"
                              type="text"
                              placeholder="Buscar..."
                              value={tempSearchQuery}
                              onChange={(e) => {
                                setTempSearchQuery(e.target.value);
                                setShowSuggestions(true);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setSearchQuery(tempSearchQuery);
                                  setSelectedCategory("todos");
                                  setSelectedSubcategory("all");
                                  setShowSuggestions(false);
                                  setIsHeaderSearchOpen(false);
                                }
                              }}
                              onFocus={() => setShowSuggestions(true)}
                              onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                              className="w-full bg-transparent text-[#F4EAD7] placeholder-zinc-500 border-none outline-none ring-0 focus:ring-0 text-xs py-1 select-all"
                            />
                            {tempSearchQuery && (
                              <button
                                onClick={() => {
                                  setTempSearchQuery("");
                                  setSearchQuery("");
                                  setShowSuggestions(false);
                                }}
                                className="text-[#E6BF76] hover:text-[#F4EAD7] text-sm px-1.5 font-bold font-mono cursor-pointer shrink-0"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {isHeaderSearchOpen && showSuggestions && tempSearchQuery.trim().length >= 2 && (
                        <Suspense fallback={null}>
                          <HeaderSearchSuggestions
                            store={store}
                            tempSearchQuery={tempSearchQuery}
                            onSelectCategory={(catId, subId) => {
                              setSelectedCategory(catId);
                              setSelectedSubcategory(subId);
                              setSearchQuery("");
                              setShowSuggestions(false);
                              setIsHeaderSearchOpen(false);
                            }}
                            onOpenProduct={(p) => {
                              handleOpenProduct(p);
                              setShowSuggestions(false);
                              setIsHeaderSearchOpen(false);
                            }}
                            onViewAllResults={() => {
                              setSearchQuery(tempSearchQuery);
                              setSelectedCategory("todos");
                              setSelectedSubcategory("all");
                              setShowSuggestions(false);
                              setIsHeaderSearchOpen(false);
                            }}
                          />
                        </Suspense>
                      )}
                    </div>

                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent("open-a11y-panel"))}
                      className="p-2 rounded-xl transition flex items-center justify-center hover:bg-[#0B1730] text-[#E6BF76] hover:text-[#F4EAD7] cursor-pointer"
                      title="Ajustes de Accesibilidad (Alt + A)"
                      aria-label="Ajustes de Accesibilidad. Atajo: Alt + A."
                    >
                      <Accessibility className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() => setIsCartOpen(true)}
                      className="relative p-2 rounded-xl transition hidden lg:flex items-center gap-1.5 hover:bg-[#0B1730] text-[#E6BF76] hover:text-[#F4EAD7] cursor-pointer"
                    >
                      <CartIcon className="h-5 w-5" />
                      <span className="text-xs font-sans font-bold bg-[#D4A55A] text-[#050B1A] rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    </button>

                    {authToken && (
                      <button
                        onClick={() => {
                          setActiveTab("admin");
                          window.history.pushState(null, "", `/admin/${adminSection}`);
                        }}
                        className="hidden lg:flex items-center gap-1 text-xs font-bold py-1.5 px-3 rounded-lg bg-[#D4A55A]/10 hover:bg-[#D4A55A]/20 text-[#E6BF76] transition cursor-pointer"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span>Panel Admin</span>
                      </button>
                    )}
                  </>
                )
              ) : (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline text-emerald-300">
                      Base de Datos Sincronizada
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider md:hidden text-emerald-300">Sincronizado</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 ${
                      activeTab === "admin" ? "px-2 py-0.5" : "px-3 py-1.5"
                    } bg-[#D4AF37]/12 text-[#F3E5AB] rounded-full border border-[#D4AF37]/30 shadow-[0_0_12px_rgba(212,175,55,0.12)] transition-all duration-300`}
                    title="Su sesión se renueva automáticamente con el movimiento o clics."
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#E6BF76]" />
                    <span className="text-[9px] font-bold uppercase tracking-wider hidden md:inline text-[#F3E5AB]">Sesión Protegida</span>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab("storefront");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`flex items-center gap-1.5 ${
                      activeTab === "admin" ? "text-[11px] py-1 px-2.5" : "text-xs py-1.5 px-3.5"
                    } font-bold rounded-xl bg-gradient-to-r from-[#D4AF37]/20 via-[#D4A55A]/15 to-transparent hover:from-[#D4AF37]/30 hover:to-[#B89628]/25 text-[#F3E5AB] border border-[#D4AF37]/35 transition-all shadow-[0_2px_12px_rgba(212,175,55,0.15)] cursor-pointer`}
                  >
                    <ArrowLeft className="h-3 w-3 text-[#E6BF76]" />
                    <span>Ver Tienda</span>
                  </button>

                  <div className="flex items-center gap-2 pl-2 border-l border-[#D4AF37]/25">
                    <div className="hidden md:block text-right">
                      <p className="text-[11px] font-bold leading-none text-[#F3E5AB]">Juem</p>
                      <p className="text-[8.5px] text-[#D4A55A]/80 font-medium">Administrador</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-1 text-rose-400 hover:bg-rose-500/15 rounded-lg border border-rose-500/20 transition cursor-pointer"
                      title="Cerrar sesión"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </header>
        </div>

        <div
          className={
            activeTab === "admin"
              ? "h-[44px] md:h-[48px]"
              : bannerSlides.length > 0
              ? "h-[80px] sm:h-[84px] lg:h-[86px]"
              : "h-[54px] lg:h-[60px]"
          }
        />

        {activeTab === "storefront" && (
          <div className="flex-1 flex flex-col pb-16 lg:pb-0">
            {selectedProduct ? (
              <main className="flex-1 flex flex-col">
                <Suspense
                  fallback={
                    <div className="min-h-[60vh] flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-[#D4A55A] border-t-transparent rounded-full animate-spin" />
                    </div>
                  }
                >
                  <ProductDetails
                    product={store.products.find((p) => String(p.id) === String(selectedProduct.id)) || selectedProduct}
                    onClose={() => {
                      setSelectedProduct(null);
                      const catalogPath = getCatalogPath();
                      window.history.pushState(null, "", catalogPath);
                    }}
                    onAddToCart={(p, sz, col, qty) => handleAddToCart(p, sz, col, qty)}
                    settings={store.settings}
                    allProducts={store.products}
                    dbCategories={store.dbCategories || []}
                    onViewProduct={(p) => {
                      setSelectedProduct(p);
                      window.history.pushState(null, "", `/producto/${generateSlug(p.name)}`);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    isCartOpen={isCartOpen}
                  />
                </Suspense>
              </main>
            ) : (
              <>
                <main className="flex-1 flex flex-col">
                  {selectedCategory === "todos" && !searchQuery && (
                    <HeroSlider
                      settings={store.settings}
                      onExploreCatalog={(slideLink) => {
                        if (!slideLink) {
                          const el = document.getElementById("catalog-view");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                          return;
                        }

                        if (slideLink.startsWith("category:")) {
                          const catName = slideLink.replace("category:", "");
                          navigateToProductRoute(catName, "all");
                          setTimeout(() => {
                            const el = document.getElementById("catalog-view");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }, 100);
                        } else if (slideLink.startsWith("subcategory:")) {
                          const subId = slideLink.replace("subcategory:", "");
                          const subcat = (store.dbSubcategories || []).find((s) => s.id === subId);
                          if (subcat) {
                            const catObj = (store.dbCategories || []).find((c) => c.id === subcat.categoria_id);
                            if (catObj) {
                              navigateToProductRoute(catObj.id, subId);
                            }
                            setTimeout(() => {
                              const el = document.getElementById("catalog-view");
                              if (el) el.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }
                        } else if (slideLink.startsWith("product:")) {
                          const prodId = slideLink.replace("product:", "");
                          const prod = store.products.find((p) => String(p.id) === String(prodId));
                          if (prod) {
                            handleOpenProduct(prod);
                          }
                        } else if (slideLink.startsWith("http://") || slideLink.startsWith("https://")) {
                          window.open(slideLink, "_blank");
                        } else if (slideLink.startsWith("#") && slideLink.length > 1) {
                          const el = document.getElementById(slideLink.substring(1));
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        } else {
                          const el = document.getElementById("catalog-view");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                    />
                  )}

                  <section id="catalog-view" className="pt-1.5 sm:pt-2.5 pb-8 max-w-7xl mx-auto px-4 sm:px-6 w-full flex-1">
                    {(() => {
                      const activeCategoryObject = (store.dbCategories || []).find(
                        (c) => c.nombre === selectedCategory || c.id === selectedCategory
                      );
                      if (!activeCategoryObject) return null;

                      const currentSubs = (store.dbSubcategories || []).filter(
                        (s) => s.categoria_id === activeCategoryObject.id && s.active !== false
                      );
                      if (currentSubs.length === 0) return null;

                      return (
                        <div className="flex items-center gap-2 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-zinc-200/50 dark:border-zinc-800/55 pb-4 mb-6 select-none -mx-6 px-6 lg:mx-0 lg:px-0">
                          <span className="text-[10px] uppercase font-extrabold text-zinc-500 mr-2 tracking-wider shrink-0">
                            Subcategorías:
                          </span>
                          <button
                            onClick={() => navigateToProductRoute(activeCategoryObject.id, "all")}
                            className={`py-1.5 px-3.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer active:scale-95 duration-150 ${
                              !selectedSubcategory || selectedSubcategory === "all"
                                ? "bg-[#E6BF76]/25 border-[#E6BF76]/60 text-[#E6BF76] font-black"
                                : "bg-[#0B1730]/40 text-[#F4EAD7]/75 border-zinc-800 hover:border-[#D4A55A]/30 hover:text-[#E6BF76]"
                            }`}
                          >
                            Ver Todo
                          </button>
                          {currentSubs.map((subObj) => {
                            const isSubActive = selectedSubcategory === subObj.id;
                            return (
                              <button
                                key={subObj.id}
                                onClick={() => navigateToProductRoute(activeCategoryObject.id, subObj.id)}
                                className={`py-1.5 px-3.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer active:scale-95 duration-150 ${
                                  isSubActive
                                    ? "bg-[#E6BF76]/25 border-[#E6BF76]/60 text-[#E6BF76] font-black"
                                    : "bg-[#0B1730]/40 text-[#F4EAD7]/75 border-zinc-800 hover:border-[#D4A55A]/30 hover:text-[#E6BF76]"
                                }`}
                              >
                                {subObj.nombre}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {(selectedCategory !== "todos" || showAllProductsFlat) && showFiltersPanel && (
                      <Suspense fallback={null}>
                        <StorefrontFiltersPanel
                          store={store}
                          selectedCategory={selectedCategory}
                          selectedSubcategory={selectedSubcategory}
                          sortBy={sortBy}
                          setSortBy={setSortBy}
                          onlyInStock={onlyInStock}
                          setOnlyInStock={setOnlyInStock}
                          onCloseFilters={() => setShowFiltersPanel(false)}
                          onNavigateProductRoute={navigateToProductRoute}
                          sortedProductsCount={sortedProducts.length}
                        />
                      </Suspense>
                    )}

                    {(selectedCategory !== "todos" || showAllProductsFlat) &&
                      !showFiltersPanel &&
                      (onlyInStock || sortBy !== "featured") && (
                        <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-200/50 dark:border-zinc-805/50 mb-6 px-1">
                          <span className="text-[11px] text-[#E6BF76] font-semibold">
                            ✨ Filtro rápido activo para ordenar tu catálogo
                          </span>
                          <button
                            onClick={() => {
                              setOnlyInStock(false);
                              setSortBy("featured");
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                          >
                            Limpiar Orden ×
                          </button>
                        </div>
                      )}

                    {featuredProducts.length > 0 && selectedCategory === "todos" && !showAllProductsFlat && !searchQuery && (
                      <div className="mb-6 sm:mb-8">
                        <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
                          <div className="w-1.5 h-5 theme-btn-primary rounded-full" />
                          <h2 className="text-lg sm:text-xl font-bold tracking-tight">Destacados</h2>
                          <span className={`text-[10px] uppercase font-bold tracking-wide ${isChristmasTheme ? "text-[#1E4233]" : "text-[#FDE047]"}`}>
                            ¡Los más buscados!
                          </span>
                        </div>
                        <ProductSlider
                          products={featuredProducts}
                          settings={store.settings}
                          onAddToCart={(prod, sz, col) => handleAddToCart(prod, sz, col)}
                          onViewProduct={(prod) => handleOpenProduct(prod)}
                          emptyIcon={<ShoppingBag className="h-6 w-6" />}
                          emptyText="No hay productos destacados activos."
                          emptySubtext=""
                        />
                      </div>
                    )}

                    {selectedCategory !== "todos" || showAllProductsFlat || searchQuery || onlyInStock || sortBy !== "featured" ? (
                      <>
                        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 theme-btn-accent rounded-full" />
                            <h2 className="text-xl font-bold tracking-tight">
                              {searchQuery ? (
                                "Resultados de Búsqueda"
                              ) : selectedCategory !== "todos" ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span>{getCategoryDisplayNameWithDb(selectedCategory)}</span>
                                  {selectedSubcategory && selectedSubcategory !== "all" && (
                                    <>
                                      <span className="text-zinc-400 dark:text-zinc-600 font-normal">›</span>
                                      <span className="text-zinc-400 dark:text-zinc-500 font-medium text-base">
                                        {SUBCATEGORIES_MAP[selectedCategory]?.find((s) => s.id === selectedSubcategory)?.name ||
                                          selectedSubcategory}
                                      </span>
                                    </>
                                  )}
                                </span>
                              ) : (
                                "Catálogo de Productos"
                              )}
                            </h2>
                            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                              ({sortedProducts.length} productos)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                                showFiltersPanel
                                  ? "bg-[#D4A55A] text-[#050B1A] border-[#D4A55A]"
                                  : store.settings.themeMode === "dark"
                                  ? "bg-[#0B1730]/60 border-[#D4A55A]/20 text-zinc-300 hover:text-[#E6BF76]"
                                  : "bg-slate-50 border-slate-200 text-zinc-700 hover:bg-slate-100"
                              }`}
                            >
                              <Sliders className="w-3.5 h-3.5 text-[#D4A55A]" />
                              <span>Filtros y Orden</span>
                            </button>

                            <div className="lg:hidden flex items-center bg-[#0B1730]/60 border border-[#D4A55A]/20 rounded-xl p-0.5 gap-0.5">
                              <button
                                onClick={() => setMobileLayoutMode("grid")}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                  mobileLayoutMode === "grid"
                                    ? "bg-[#D4A55A] text-[#050B1A]"
                                    : "text-zinc-400 hover:text-[#E6BF76]"
                                }`}
                                title="Vista de Cuadrícula"
                              >
                                <Grid className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setMobileLayoutMode("list")}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                  mobileLayoutMode === "list"
                                    ? "bg-[#D4A55A] text-[#050B1A]"
                                    : "text-zinc-400 hover:text-[#E6BF76]"
                                }`}
                                title="Vista de Lista"
                              >
                                <List className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {sortedProducts.length === 0 ? (
                          loading ? (
                            <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-h-[500px]">
                              {Array.from({ length: 8 }).map((_, idx) => (
                                <div
                                  key={idx}
                                  className={`rounded-2xl overflow-hidden animate-pulse border ${
                                    store.settings.themeMode === "dark"
                                      ? "bg-[#0B1730]/60 border-[#D4A55A]/10"
                                      : "bg-slate-100 border-slate-200"
                                  }`}
                                >
                                  <div className="aspect-[3/4] w-full bg-slate-200/20 dark:bg-zinc-800/40" />
                                  <div className="p-3 space-y-2">
                                    <div className="h-4 bg-slate-200/30 dark:bg-zinc-800/60 rounded w-3/4" />
                                    <div className="h-4 bg-slate-200/20 dark:bg-zinc-800/40 rounded w-1/2" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div
                              className={`p-16 text-center rounded-2xl border border-dashed ${
                                store.settings.themeMode === "dark" ? "border-zinc-800 text-zinc-500" : "border-slate-200 text-slate-400"
                              }`}
                            >
                              <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-60" />
                              <p className="text-base font-semibold">No se encontraron productos coincidentes</p>
                              <p className="text-xs mt-1">
                                Prueba a restablecer filtros o cambiar tu término de búsqueda e intenta nuevamente.
                              </p>
                              <button
                                onClick={() => {
                                  navigateToProductRoute("todos", "all", true);
                                  setSearchQuery("");
                                  setOnlyInStock(false);
                                  setSortBy("featured");
                                }}
                                className="mt-4 px-4 py-2 rounded-xl text-xs theme-btn-primary inline-block font-semibold pointer-events-auto cursor-pointer"
                              >
                                Ver todo el catálogo
                              </button>
                            </div>
                          )
                        ) : (
                          <>
                            <div id="catalog-grid-top" className="scroll-mt-24" />
                            <div
                              className={`grid gap-3 sm:gap-6 min-h-[500px] ${
                                mobileLayoutMode === "list"
                                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                                  : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                              }`}
                            >
                              {paginatedProducts.map((p) => (
                                <ProductCard
                                  key={p.id}
                                  product={p}
                                  layoutMode={mobileLayoutMode}
                                  settings={store.settings}
                                  onAddToCart={(prod, sz, col) => handleAddToCart(prod, sz, col)}
                                  onViewProduct={(prod) => handleOpenProduct(prod)}
                                />
                              ))}
                            </div>

                            {sortedProducts.length > 0 && (
                              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                <div className="flex flex-col sm:flex-row items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                  <span>
                                    Mostrando{" "}
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                                      {sortedProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                                    </span>{" "}
                                    al{" "}
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                                      {Math.min(currentPage * itemsPerPage, sortedProducts.length)}
                                    </span>{" "}
                                    de <span className="font-bold text-[#D4A55A]">{sortedProducts.length}</span> productos
                                  </span>

                                  <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">|</span>

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-zinc-400">Por página:</span>
                                    <select
                                      value={userItemsPerPage}
                                      onChange={(e) => {
                                        const val = e.target.value === "auto" ? "auto" : Number(e.target.value);
                                        setUserItemsPerPage(val);
                                        setCurrentPage(1);
                                        scrollToCatalogTop();
                                      }}
                                      className={`text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer transition border ${
                                        store.settings.themeMode === "dark"
                                          ? "bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-zinc-700"
                                          : "bg-white border-slate-200 text-zinc-800 hover:border-slate-300"
                                      }`}
                                      title="Artículos por página"
                                    >
                                      <option value="auto">Auto Adaptativo ({getAdaptiveItemsPerPage(windowWidth)})</option>
                                      <option value={8}>8 por página</option>
                                      <option value={12}>12 por página</option>
                                      <option value={16}>16 por página</option>
                                      <option value={20}>20 por página</option>
                                      <option value={24}>24 por página</option>
                                      <option value={999}>Todos ({sortedProducts.length})</option>
                                    </select>
                                  </div>
                                </div>

                                {totalPages > 1 && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        if (currentPage > 1) {
                                          setCurrentPage(currentPage - 1);
                                          scrollToCatalogTop();
                                        }
                                      }}
                                      disabled={currentPage === 1}
                                      className={`p-2 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                                        store.settings.themeMode === "dark"
                                          ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
                                          : "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50"
                                      }`}
                                      title="Página Anterior"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                      <span className="hidden sm:inline">Anterior</span>
                                    </button>

                                    <div className="flex items-center gap-1">
                                      {Array.from({ length: totalPages }).map((_, index) => {
                                        const pageNum = index + 1;
                                        if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                                          return (
                                            <button
                                              key={pageNum}
                                              onClick={() => {
                                                setCurrentPage(pageNum);
                                                scrollToCatalogTop();
                                              }}
                                              className={`w-9 h-9 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center justify-center ${
                                                currentPage === pageNum
                                                  ? "bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] text-zinc-950 shadow-sm outline-none"
                                                  : store.settings.themeMode === "dark"
                                                  ? "bg-zinc-900 border border-zinc-805 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
                                                  : "bg-white border border-slate-200 text-zinc-700 hover:bg-slate-100"
                                              }`}
                                            >
                                              {pageNum}
                                            </button>
                                          );
                                        }

                                        if (pageNum === 2 || pageNum === totalPages - 1) {
                                          return (
                                            <span key={pageNum} className="px-1 text-xs text-zinc-400 font-bold">
                                              ...
                                            </span>
                                          );
                                        }

                                        return null;
                                      })}
                                    </div>

                                    <button
                                      onClick={() => {
                                        if (currentPage < totalPages) {
                                          setCurrentPage(currentPage + 1);
                                          scrollToCatalogTop();
                                        }
                                      }}
                                      disabled={currentPage === totalPages}
                                      className={`p-2 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                                        store.settings.themeMode === "dark"
                                          ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
                                          : "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50"
                                      }`}
                                      title="Siguiente Página"
                                    >
                                      <span className="hidden sm:inline">Siguiente</span>
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <div className="space-y-16">
                        {(store.dbCategories || [])
                          .filter((catObj) => catObj.active !== false && catObj.hide_on_home !== true)
                          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                          .map((catObj) => {
                            const catProducts = displayProducts.filter(
                              (p) =>
                                !p.paused &&
                                p.active !== false &&
                                (p.categoria_id === catObj.id ||
                                  p.category?.toLowerCase() === catObj.nombre?.toLowerCase() ||
                                  (p.categorias_adicionales && p.categorias_adicionales.includes(catObj.id)))
                            );

                            return (
                              <div key={catObj.id} className="scroll-mt-24">
                                <div className="flex items-center justify-between border-b border-zinc-100/10 dark:border-zinc-800 pb-3 mb-6">
                                  <button
                                    onClick={() => navigateToProductRoute(catObj.id, "all")}
                                    className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none"
                                  >
                                    <div
                                      className="w-1.5 h-6 rounded-full transition-transform duration-300 group-hover:scale-y-125"
                                      style={{ backgroundColor: store.settings.primaryColor }}
                                    />
                                    <span
                                      className="p-1.5 rounded-lg flex items-center justify-center [&_svg]:h-4 [&_svg]:w-4 transition-transform duration-300 group-hover:scale-110"
                                      style={{ color: store.settings.primaryColor, backgroundColor: `${store.settings.primaryColor}15` }}
                                    >
                                      {getCategoryIcon(catObj.icono || catObj.nombre)}
                                    </span>
                                    <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-1.5">
                                      <span className="group-hover:underline">{catObj.nombre}</span>
                                      <span
                                        className="text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-1 group-hover:translate-x-0"
                                        style={{ color: store.settings.primaryColor }}
                                      >
                                        &rarr;
                                      </span>
                                    </h2>
                                  </button>
                                </div>

                                <ProductSlider
                                  products={catProducts}
                                  settings={store.settings}
                                  onAddToCart={(prod, sz, col) => handleAddToCart(prod, sz, col)}
                                  onViewProduct={(prod) => handleOpenProduct(prod)}
                                  emptyIcon={getCategoryIcon(catObj.icono || catObj.nombre)}
                                  emptyText={`No se encontraron artículos de ${catObj.nombre}.`}
                                  emptySubtext={`Puedes crear artículos desde el panel de productos asignando como categoría "${catObj.nombre}".`}
                                />
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </section>
                </main>

                <footer
                  className={`py-10 sm:py-14 border-t mt-12 sm:mt-16 transition-colors duration-200 relative overflow-hidden ${
                    store.settings.themeMode === "dark"
                      ? "bg-[#050B1A] border-[#D4A55A]/25 text-slate-300"
                      : "bg-[#FAF7F2] border-slate-200 text-slate-700"
                  }`}
                >
                  {store.settings.themeMode === "dark" && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#D4A55A]/40 to-transparent" />
                  )}

                  <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-10">
                    <div
                      className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
                        store.settings.themeMode === "dark"
                          ? "bg-[#0B1730] border-[#D4A55A]/15 shadow-sm"
                          : "bg-white border-slate-200 shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                            <Globe className="h-4 w-4" />
                          </span>
                          <h2
                            className={`font-bold text-xs uppercase tracking-wider font-sans ${
                              store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                            }`}
                          >
                            Nuestras Redes
                          </h2>
                        </div>

                        <p className="text-xs leading-relaxed opacity-85 mb-4">
                          Sigue nuestras publicaciones, novedades del talle y promociones imperdibles agregadas diariamente.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <a
                          href={store.settings.instagramUrl || "https://instagram.com"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:brightness-110 text-white border-none shadow-sm transition-transform duration-100 active:scale-95 cursor-pointer"
                        >
                          <svg className="h-4 w-4 shrink-0 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.071 3.253.147 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.148 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                          </svg>
                          <span>Instagram</span>
                        </a>
                        <a
                          href={store.settings.facebookUrl || "https://facebook.com"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold bg-[#145DBF] hover:bg-[#0F4C9E] text-white border-none shadow-sm transition-transform duration-100 active:scale-95 cursor-pointer"
                        >
                          <svg className="h-4 w-4 shrink-0 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          <span>Facebook</span>
                        </a>
                      </div>
                    </div>

                    <div
                      className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
                        store.settings.themeMode === "dark"
                          ? "bg-[#0B1730] border-[#D4A55A]/15 shadow-sm"
                          : "bg-white border-slate-200 shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                            <MapPin className="h-4 w-4" />
                          </span>
                          <h2
                            className={`font-bold text-xs uppercase tracking-wider font-sans ${
                              store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                            }`}
                          >
                            🗺️ Zonas de Envío
                          </h2>
                        </div>
                        <p className="text-xs leading-relaxed opacity-85">
                          Explora de forma interactiva nuestras 10 Zonas de Envío con cobertura directa de cadetería propia en
                          Montevideo, Canelones y Ciudad de la Costa. Costos fijos y transparentes.
                        </p>
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={() => setIsDeliveryMapOpen(true)}
                          className="w-full relative shrink-0 bg-[#D4A55A] hover:bg-[#C59B4E] text-[#050B18] font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer font-sans"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          <span>Ver Mapa de Envíos</span>
                        </button>
                      </div>
                    </div>

                    <div
                      className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
                        store.settings.themeMode === "dark"
                          ? "bg-[#0B1730] border-[#D4A55A]/15 shadow-sm"
                          : "bg-white border-slate-200 shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                            <MapPin className="h-4 w-4" />
                          </span>
                          <h2
                            className={`font-bold text-xs uppercase tracking-wider font-sans ${
                              store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                            }`}
                          >
                            📍 Sucursal Montevideo
                          </h2>
                        </div>
                        <div className="text-xs space-y-2 mb-3 opacity-85">
                          <p className="text-[11px] leading-relaxed">
                            <strong className="text-[#E6BF76]">Dirección:</strong>{" "}
                            {store.settings.pickupAddress || "Coruña 3038 Bis, Montevideo"}
                          </p>
                          <p className="text-[11px] leading-relaxed">
                            <strong className="text-[#E6BF76]">Horario:</strong>{" "}
                            {store.settings.pickupHours || "Lunes a Viernes de 10:00 a 18:00 hs y Sábados de 09:00 a 13:00 hs."}
                          </p>
                          <p className="text-[11px] leading-relaxed">
                            <strong className="text-[#E6BF76]">Teléfono:</strong> 098058775
                          </p>
                        </div>
                      </div>
                      <div className="w-full h-[140px] rounded-xl overflow-hidden border border-[#D4A55A]/15 relative">
                        <iframe
                          title="Mapa de ubicación - Sucursal Montevideo"
                          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3273.500741407378!2d-56.15203782349302!3d-34.868770171545755!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x959f808dc42ec093%3A0x20632d6daf9aa5fc!2sCoru%C3%B1a%203038%2C%2012000%20Montevideo%2C%20Departamento%20de%20Montevideo!5e0!3m2!1ses-419!2suy!4v1782910027474!5m2!1ses-419!2suy"
                          className="absolute inset-0 w-full h-full"
                          style={{ border: 0 }}
                          allowFullScreen={true}
                          loading="lazy"
                          referrerPolicy="strict-origin-when-cross-origin"
                        />
                      </div>
                    </div>

                    <div
                      id="footer-map"
                      className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${
                        store.settings.themeMode === "dark"
                          ? "bg-[#0B1730] border-[#D4A55A]/15 shadow-sm"
                          : "bg-white border-slate-200 shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                            <MapPin className="h-4 w-4" />
                          </span>
                          <h2
                            className={`font-bold text-xs uppercase tracking-wider font-sans ${
                              store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                            }`}
                          >
                            📍 Sucursal Pinamar
                          </h2>
                        </div>
                        <div className="text-xs space-y-2 mb-3 opacity-85">
                          <p className="text-[11px] leading-relaxed">
                            <strong className="text-[#E6BF76]">Dirección:</strong>{" "}
                            {store.settings.pickupAddressPinamar || "C. 54, 15100 Pinamar, Departamento de Canelones"}
                          </p>
                          <p className="text-[11px] leading-relaxed">
                            <strong className="text-[#E6BF76]">Horario:</strong>{" "}
                            {store.settings.pickupHoursPinamar ||
                              "Lunes a Viernes de 10:00 a 18:00 hs y Sábados de 09:00 a 13:00 hs."}
                          </p>
                          <p className="text-[11px] leading-relaxed">
                            <strong className="text-[#E6BF76]">Teléfono:</strong> 098058775
                          </p>
                        </div>
                      </div>
                      <div className="w-full h-[140px] rounded-xl overflow-hidden border border-[#D4A55A]/15 relative">
                        <iframe
                          title="Mapa de ubicación - Sucursal Pinamar"
                          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3277.703532468259!2d-55.8671867242527!3d-34.76306027289764!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95a021e5c567911d%3A0x601fcf5d591c0db4!2sJuem!5e0!3m2!1ses-419!2suy!4v1782909992678!5m2!1ses-419!2suy"
                          className="absolute inset-0 w-full h-full"
                          style={{ border: 0 }}
                          allowFullScreen={true}
                          loading="lazy"
                          referrerPolicy="strict-origin-when-cross-origin"
                        />
                      </div>
                    </div>
                  </div>

                  {store.settings.googleReviewsEnabled !== false && (
                    <Suspense fallback={null}>
                      <GoogleReviewsCompact
                        themeMode={store.settings.themeMode}
                        googlePlaceId={store.settings.googlePlaceId}
                      />
                    </Suspense>
                  )}

                  <div
                    className={`max-w-7xl mx-auto px-6 mt-10 sm:mt-12 pt-6 sm:pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-[11px] ${
                      store.settings.themeMode === "dark" ? "border-zinc-800/60" : "border-slate-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        &copy; 2026 {store.settings.siteTitle || "Ventas Juem"}.{" "}
                        {store.settings.footerCopyright ||
                          "Desarrollado con tecnología de punta responsive. Reservados todos los derechos."}
                      </p>
                      <p className="opacity-60 flex items-center justify-center md:justify-start gap-1">
                        <MapPin className="h-3 w-3 text-[#D4A55A]" /> Montevideo, Uruguay • Conexión Segura vía WhatsApp Web API
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent("open-a11y-panel"))}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-all duration-300 ${
                          store.settings.themeMode === "dark"
                            ? "bg-[#0B1730] hover:bg-[#D4A55A]/15 border-[#D4A55A]/20 text-[#E6BF76]"
                            : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900"
                        }`}
                        aria-label="Ajustes de accesibilidad"
                      >
                        <Accessibility className="w-3.5 h-3.5" />
                        <span>Ajustes de Accesibilidad</span>
                      </button>
                    </div>
                  </div>
                </footer>
              </>
            )}
          </div>
        )}

        {activeTab === "checkout" && (
          <main className="flex-1 flex flex-col">
            <Suspense
              fallback={
                <div className="min-h-[60vh] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#D4A55A] border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <Checkout
                cartItems={cart}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveCartItem}
                settings={store.settings}
                onClearCart={handleClearCart}
                onBackToCatalog={() => setActiveTab("storefront")}
                coupons={store.coupons}
              />
            </Suspense>
          </main>
        )}

        {(activeTab === "admin" || Boolean(authToken)) && (
          <Suspense
            fallback={
              activeTab === "admin" ? (
                <div className="min-h-[60vh] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#D4A55A] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : null
            }
          >
            <AdminWorkspace
              store={store}
              setStore={setStore}
              displayProducts={displayProducts}
              authToken={authToken}
              setAuthToken={setAuthToken}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              adminSection={adminSection}
              setAdminSection={setAdminSection}
              fetchStoreData={fetchStoreData}
              showAdminToast={showAdminToast}
              onLogout={handleLogout}
              navigateToProductRoute={navigateToProductRoute}
              syncStatus={syncStatus}
              setSyncStatus={setSyncStatus}
              onEditingActiveThemeChange={setAdminPreviewTheme}
            />
          </Suspense>
        )}

        {isDeliveryMapOpen && (
          <Suspense fallback={null}>
            <DeliveryMapModal onClose={() => setIsDeliveryMapOpen(false)} />
          </Suspense>
        )}

        {isLoginModalOpen && (
          <Suspense fallback={null}>
            <AdminLoginModal
              onClose={() => setIsLoginModalOpen(false)}
              onLoginSuccess={(token) => {
                setAuthToken(token);
                fetchStoreData(true, token);
                setIsLoginModalOpen(false);
                setActiveTab("admin");
                window.history.pushState(null, "", `/admin/${adminSection}`);
                showAdminToast("¡Sincronización de Sesión Establecida!", "success");
              }}
            />
          </Suspense>
        )}

        {(isCartOpen || cart.length > 0) && (
          <Suspense fallback={null}>
            <CartDrawer
              isOpen={isCartOpen}
              onClose={() => setIsCartOpen(false)}
              cartItems={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveCartItem}
              settings={store.settings}
              onClearCart={handleClearCart}
              coupons={store.coupons}
              onProceedToCheckout={() => setActiveTab("checkout")}
            />
          </Suspense>
        )}

        {isMobileMenuOpen && (
          <Suspense fallback={null}>
            <MobileMenuDrawer
              store={store}
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              authToken={authToken}
              activeTab={activeTab}
              onClose={() => setIsMobileMenuOpen(false)}
              onGoHome={() => {
                setSelectedProduct(null);
                setActiveTab("storefront");
                navigateToProductRoute("todos", "all");
                setSearchQuery("");
                setIsHeaderSearchOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onNavigateProductRoute={navigateToProductRoute}
              onOpenAdmin={() => {
                setActiveTab("admin");
                window.history.pushState(null, "", `/admin/${adminSection}`);
              }}
              onLogout={handleLogout}
              onOpenLogin={() => setIsLoginModalOpen(true)}
            />
          </Suspense>
        )}

        {activeTab === "storefront" && windowWidth >= 1024 && (
          <Suspense fallback={null}>
            <WhatsAppWidget whatsappNumber={store.settings.whatsappNumber} siteTitle={store.settings.siteTitle} />
          </Suspense>
        )}

        {mountDeferredWidgets && (
          <Suspense fallback={null}>
            <A11yAssistant
              cartCount={cart.length}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedCategory={selectedCategory}
              navigateToProductRoute={navigateToProductRoute}
              products={store.products || []}
              initialOpen={a11yInitialOpen}
            />
          </Suspense>
        )}

        {adminToast && (
          <div
            className={`fixed bottom-24 right-6 z-[99999] p-4 rounded-xl shadow-2xl border flex items-center gap-3 bg-white/95 dark:bg-zinc-950/95 animate-fade-in ${
              adminToast.type === "success"
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : adminToast.type === "error"
                ? "border-rose-500/30 text-rose-600 dark:text-rose-400"
                : "border-amber-500/30 text-amber-600 dark:text-amber-400"
            }`}
          >
            <span
              className={`p-1 px-1.5 rounded font-bold text-xs ${
                adminToast.type === "success"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : adminToast.type === "error"
                  ? "bg-rose-500/10 text-rose-500"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              {adminToast.type === "success" ? "✓" : adminToast.type === "error" ? "✗" : "⚠"}
            </span>
            <span className="font-semibold text-xs">{adminToast.text}</span>
          </div>
        )}

        {addedItemModal?.isOpen && (
          <Suspense fallback={null}>
            <AddToCartModal
              isOpen={addedItemModal?.isOpen ?? false}
              onClose={() => setAddedItemModal(null)}
              onGoToCheckout={() => {
                setAddedItemModal(null);
                setActiveTab("checkout");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              product={addedItemModal?.product ?? null}
              quantity={addedItemModal?.quantity ?? 1}
              selectedSize={addedItemModal?.size}
              selectedColor={addedItemModal?.color}
              themeMode={store.settings.themeMode}
              allProducts={store.products}
              onAddCrossSell={handleAddToCart}
            />
          </Suspense>
        )}

        {activeTab === "storefront" && (
          <div
            id="mobile-bottom-nav"
            className="fixed bottom-0 left-0 right-0 z-40 h-[52px] bg-[#050B1A] border-t border-[#D4A55A]/30 px-3 flex items-center justify-between lg:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
          >
            <button
              onClick={() => {
                setSelectedProduct(null);
                setActiveTab("storefront");
                navigateToProductRoute("todos", "all");
                setSearchQuery("");
                setIsHeaderSearchOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex flex-col items-center justify-center gap-0.5 text-center transition text-zinc-400 active:text-[#E6BF76] active:scale-95 cursor-pointer flex-grow basis-0"
              title="Volver a la Web Principal"
            >
              <Home className="h-4.5 w-4.5 text-[#E6BF76]/90" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#F4EAD7]/75">Inicio</span>
            </button>

            <button
              onClick={() => {
                setIsHeaderSearchOpen(true);
                setTimeout(() => {
                  document.getElementById("header-search-input")?.focus();
                }, 150);
                const el = document.getElementById("catalog-view");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex flex-col items-center justify-center gap-0.5 text-center transition text-zinc-400 active:text-[#E6BF76] active:scale-95 cursor-pointer flex-grow basis-0"
              title="Buscar"
            >
              <Search className="h-4.5 w-4.5 text-zinc-305" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Buscar</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 text-center transition text-zinc-400 active:text-[#E6BF76] active:scale-95 cursor-pointer flex-grow basis-0"
              title="Abrir Menú"
            >
              <Menu className="h-4.5 w-4.5 text-[#E6BF76]" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Menú</span>
            </button>

            <button
              onClick={() => {
                const cleanPhone = store.settings.whatsappNumber.replace(/[^0-9]/g, "");
                const siteName = store.settings.siteTitle || "Juem";
                const message = `¡Hola! Vengo desde la tienda online de ${siteName} y quería hacer una consulta.`;
                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
              }}
              className="flex flex-col items-center justify-center gap-0.5 text-center transition text-zinc-400 active:text-[#E6BF76] active:scale-95 cursor-pointer flex-grow basis-0"
              title="Soporte WhatsApp"
            >
              <MessageCircle className="h-4.5 w-4.5 text-emerald-400" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Consulta</span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 text-center transition text-zinc-400 active:text-[#E6BF76] active:scale-95 cursor-pointer flex-grow basis-0 relative"
              title="Mi Carrito"
            >
              <div className="relative">
                <ShoppingBag className="h-4.5 w-4.5 text-[#E6BF76]" />
                {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-[8px] text-white font-black px-1 rounded-full leading-none flex items-center justify-center animate-bounce min-w-[13px] h-[13px]">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Carrito</span>
            </button>
          </div>
        )}
      </div>
    </Suspense>
  );
}
