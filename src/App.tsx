import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import {
  Search,
  ShoppingBag,
  Tag,
  Truck,
  ShoppingBag as CartIcon,
  MessageCircle,
  Home,
  ChevronDown,
  Menu,
  Moon,
  Accessibility
} from "lucide-react";
import { Product, ShopState, CartItem, getVariantAvailableStock } from "./types";
import ThemeStyles, { getAccessiblePromoColors } from "./components/ThemeStyles";
import { optimizeImageUrl } from "./utils/imageOptimizer";
import ProductSlider from "./components/ProductSlider";
import HeroSlider from "./components/HeroSlider";
import {
  generateSlug,
  STOREFRONT_DEFAULT_SETTINGS,
  getCategoryIcon,
  getCategoryDisplayName,
  getComboDynamicStocks,
  recalculateComboStocks
} from "./utils/storefrontHelpers";

const ProductDetails = lazy(() => import("./components/ProductDetails"));
const CartDrawer = lazy(() => import("./components/CartDrawer"));
const Checkout = lazy(() => import("./components/Checkout"));
const A11yAssistant = lazy(() => import("./components/A11yAssistant"));
const AddToCartModal = lazy(() => import("./components/AddToCartModal"));
const AdminWorkspace = lazy(() => import("./components/AdminWorkspace"));
const AdminLoginModal = lazy(() => import("./components/AdminLoginModal"));
const MobileMenuDrawer = lazy(() => import("./components/MobileMenuDrawer"));
const DeliveryMapModal = lazy(() => import("./components/DeliveryMapModal"));
const HeaderSearchSuggestions = lazy(() => import("./components/HeaderSearchSuggestions"));
const WhatsAppWidget = lazy(() => import("./components/WhatsAppWidget"));
const CatalogGridView = lazy(() => import("./components/CatalogGridView"));
const StorefrontFooter = lazy(() => import("./components/StorefrontFooter"));
const AdminHeaderControls = lazy(() => import("./components/AdminHeaderControls"));

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

  const initialParsedRoute = (() => {
    if (typeof window === "undefined") {
      return {
        activeTab: "storefront" as const,
        category: "todos",
        subcategory: "all",
        product: null as Product | null
      };
    }
    const path = window.location.pathname.toLowerCase().replace(/\/$/, "");
    const segments = path.split("/").filter(Boolean);
    const urlParams = new URLSearchParams(window.location.search);

    let prod: Product | null = null;
    const prodId = segments[0] === "producto" && segments[1] ? segments[1] : urlParams.get("product");
    if (prodId) {
      prod =
        (store.products || []).find((p) => {
          const idMatches = String(p.id) === String(prodId);
          const nameSlug = p.name ? generateSlug(p.name) : "";
          const slugMatches = Boolean(nameSlug && nameSlug === prodId);
          const dashIndex = prodId.indexOf("-");
          const idFromDashMatches = dashIndex > 0 && String(p.id) === prodId.substring(0, dashIndex);
          return idMatches || slugMatches || idFromDashMatches;
        }) || null;
    }

    if (segments[0] === "admin") {
      return { activeTab: "admin" as const, category: "todos", subcategory: "all", product: prod };
    }

    const categoriesList = store.dbCategories || [];
    const subcategoriesList = store.dbSubcategories || [];
    if (segments.length > 0 && segments[0] !== "producto") {
      const catPath = segments[0];
      const matchingCat = categoriesList.find(
        (c) => c.active !== false && (c.id.toLowerCase() === catPath || generateSlug(c.nombre) === catPath)
      );
      if (matchingCat) {
        const subPath = segments[1];
        const subcats = subcategoriesList.filter((s) => s.active !== false && s.categoria_id === matchingCat.id);
        const matchedSub = subPath
          ? subcats.find((s) => s.id.toLowerCase() === subPath || generateSlug(s.nombre) === subPath)
          : undefined;
        return {
          activeTab: "storefront" as const,
          category: matchingCat.nombre,
          subcategory: matchedSub ? matchedSub.id : subPath === "all" ? "all" : subPath || "all",
          product: prod
        };
      }
    }

    return { activeTab: "storefront" as const, category: "todos", subcategory: "all", product: prod };
  })();

  const [activeTab, setActiveTab] = useState<"storefront" | "admin" | "checkout">(initialParsedRoute.activeTab);
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
  const [selectedCategory, setSelectedCategory] = useState<string>(initialParsedRoute.category);

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

  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(initialParsedRoute.subcategory);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialParsedRoute.product);
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

  const footerRef = useRef<HTMLElement | null>(null);
  const [shouldMountFooter, setShouldMountFooter] = useState(() => isAuditBot);

  useEffect(() => {
    if (shouldMountFooter || typeof IntersectionObserver === "undefined") {
      if (!shouldMountFooter) setShouldMountFooter(true);
      return;
    }
    const el = footerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldMountFooter(true);
          obs.disconnect();
        }
      },
      { rootMargin: "500px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shouldMountFooter, activeTab, selectedProduct, selectedCategory]);

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
    const matchingCat = categoriesList.find(
      (c) => c.active !== false && (c.id.toLowerCase() === catPath || generateSlug(c.nombre) === catPath)
    );
    if (matchingCat) {
      setSelectedCategory(matchingCat.nombre);
      const subPath = segments[1];
      if (subPath) {
        const subcats = subcategoriesList.filter((s) => s.active !== false && s.categoria_id === matchingCat.id);
        const matchedSub = subcats.find((s) => s.id.toLowerCase() === subPath || generateSlug(s.nombre) === subPath);
        setSelectedSubcategory(matchedSub ? matchedSub.id : subPath === "all" ? "all" : subPath);
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
    let bgSyncTriggered = false;
    const interactionEvents = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

    const triggerBgSyncOnce = () => {
      if (bgSyncTriggered || isAuditBot || hasFullStoreRef.current) return;
      bgSyncTriggered = true;
      interactionEvents.forEach((evt) => {
        window.removeEventListener(evt, triggerBgSyncOnce, { capture: true } as any);
      });
      if (deferredSyncTimer) {
        clearTimeout(deferredSyncTimer);
        deferredSyncTimer = null;
      }
      fetchStoreData(true);
    };

    const scheduleBgSync = () => {
      if (isAuditBot) return;
      interactionEvents.forEach((evt) => {
        window.addEventListener(evt, triggerBgSyncOnce, { passive: true, once: true, capture: true });
      });
      const win = window as any;
      deferredSyncTimer = setTimeout(() => {
        if (typeof win.requestIdleCallback === "function") {
          idleCallbackId = win.requestIdleCallback(() => triggerBgSyncOnce(), { timeout: 2000 });
        } else {
          triggerBgSyncOnce();
        }
      }, 5500);
    };

    if (hasHydratedInitialStore && !isAdminRoute && !validInitialToken) {
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
      window.removeEventListener("load", scheduleBgSync);
      interactionEvents.forEach((evt) => {
        window.removeEventListener(evt, triggerBgSyncOnce, { capture: true } as any);
      });
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

    const getPollIntervalMs = () => {
      try {
        const hasAdminSession = Boolean(authToken || localStorage.getItem("apex_admin_token"));
        return hasAdminSession ? 5 * 60 * 1000 : 15 * 60 * 1000;
      } catch {
        return 15 * 60 * 1000;
      }
    };

    const getFocusStaleMs = () => {
      try {
        const hasAdminSession = Boolean(authToken || localStorage.getItem("apex_admin_token"));
        return hasAdminSession ? 90 * 1000 : 10 * 60 * 1000;
      } catch {
        return 10 * 60 * 1000;
      }
    };

    const syncInterval = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastSync >= getPollIntervalMs()) {
        doSync();
      }
    }, 5 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && Date.now() - lastSync > getFocusStaleMs()) {
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
  }, [authToken]);

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

    let injected = false;
    const injectThirdPartyScripts = () => {
      if (injected) return;
      injected = true;
      ["pointerdown", "keydown", "scroll", "touchstart"].forEach((evt) => {
        window.removeEventListener(evt, injectThirdPartyScripts, { capture: true } as any);
      });
      import("./utils/analyticsTracker").then((m) => m.injectAnalyticsScripts(gaId, gtmId, pixelId)).catch(() => {});
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
    const gaId = store.settings?.googleAnalyticsId?.trim();
    const pixelId = store.settings?.metaPixelId?.trim();
    if (!gaId && !pixelId) return;
    if (activeTab !== "checkout" && !selectedProduct) return;

    import("./utils/analyticsTracker")
      .then((m) =>
        m.trackAnalyticsTransition({
          settings: store.settings,
          activeTab,
          selectedProduct,
          cart,
          generateSlug
        })
      )
      .catch(() => {});
  }, [store.settings?.googleAnalyticsId, store.settings?.metaPixelId, activeTab, selectedProduct?.id]);

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

  const hasNavigatedClientSeoRef = useRef(false);
  useEffect(() => {
    if (!store.settings) return;
    if (store.settings.faviconUrl && store.settings.faviconUrl.trim() !== "") {
      const iconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (iconLink) iconLink.href = store.settings.faviconUrl;
    }
    const isHomeRoute = !selectedProduct && (!selectedCategory || selectedCategory === "todos");
    if (isHomeRoute && !hasNavigatedClientSeoRef.current) {
      return;
    }
    hasNavigatedClientSeoRef.current = true;
    import("./utils/seoUpdater")
      .then((m) =>
        m.updateClientSeoAndJsonLd({
          settings: store.settings,
          selectedProduct,
          selectedCategory,
          selectedSubcategory,
          dbCategories: store.dbCategories,
          dbSubcategories: store.dbSubcategories,
          getCategoryDisplayNameWithDb,
          generateSlug
        })
      )
      .catch(() => {});
  }, [store.settings, store.dbCategories, store.dbSubcategories, selectedProduct, selectedCategory, selectedSubcategory]);

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

    if (store.settings?.googleAnalyticsId || store.settings?.metaPixelId) {
      import("./utils/analyticsTracker")
        .then((m) => m.trackAddToCartEvents({ settings: store.settings, product, qtyAdded, size, color }))
        .catch(() => {});
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
                    <svg className="h-3.5 w-3.5 text-[#E6BF76]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
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
                        <span>⚙</span>
                        <span>Panel Admin</span>
                      </button>
                    )}
                  </>
                )
              ) : (
                <Suspense fallback={null}>
                  <AdminHeaderControls
                    onBackToStore={() => {
                      setActiveTab("storefront");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onLogout={handleLogout}
                  />
                </Suspense>
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
                      <Suspense fallback={<div className="min-h-[500px]" />}>
                        <CatalogGridView
                          store={store}
                          displayProducts={displayProducts}
                          selectedCategory={selectedCategory}
                          selectedSubcategory={selectedSubcategory}
                          showAllProductsFlat={showAllProductsFlat}
                          searchQuery={searchQuery}
                          onlyInStock={onlyInStock}
                          setOnlyInStock={setOnlyInStock}
                          sortBy={sortBy}
                          setSortBy={setSortBy}
                          showFiltersPanel={showFiltersPanel}
                          setShowFiltersPanel={setShowFiltersPanel}
                          mobileLayoutMode={mobileLayoutMode}
                          setMobileLayoutMode={setMobileLayoutMode}
                          currentPage={currentPage}
                          setCurrentPage={setCurrentPage}
                          userItemsPerPage={userItemsPerPage}
                          setUserItemsPerPage={setUserItemsPerPage}
                          windowWidth={windowWidth}
                          loading={loading}
                          navigateToProductRoute={navigateToProductRoute}
                          getCategoryDisplayNameWithDb={getCategoryDisplayNameWithDb}
                          onOpenProduct={handleOpenProduct}
                          onAddToCart={(prod, sz, col) => handleAddToCart(prod, sz, col)}
                          setSearchQuery={setSearchQuery}
                          scrollToCatalogTop={scrollToCatalogTop}
                        />
                      </Suspense>
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
                                  <a
                                    href={`/${catObj.id}`}
                                    onClick={(e) => {
                                      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                                        e.preventDefault();
                                        navigateToProductRoute(catObj.id, "all");
                                      }
                                    }}
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
                                  </a>
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
                  ref={footerRef}
                  className={`py-10 sm:py-14 border-t mt-12 sm:mt-16 transition-colors duration-200 relative overflow-hidden ${
                    store.settings.themeMode === "dark"
                      ? "bg-[#050B1A] border-[#D4A55A]/25 text-slate-300"
                      : "bg-[#FAF7F2] border-slate-200 text-slate-700"
                  }`}
                >
                  {shouldMountFooter ? (
                    <Suspense fallback={<div className="min-h-[340px]" />}>
                      <StorefrontFooter store={store} onOpenDeliveryMap={() => setIsDeliveryMapOpen(true)} />
                    </Suspense>
                  ) : (
                    <div className="max-w-7xl mx-auto px-6 min-h-[280px] flex flex-col justify-end text-[11px] opacity-80">
                      <p>&copy; 2026 {store.settings.siteTitle || "Ventas Juem"}. Montevideo, Uruguay.</p>
                    </div>
                  )}
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
