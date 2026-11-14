import { useState, useEffect, useMemo, useCallback, useRef, FormEvent, lazy, Suspense } from "react";
import { AlertCircle, HelpCircle, Package, X } from "lucide-react";
import {
  Product,
  SiteSettings,
  ShopState,
  Category,
  Subcategory,
  getProductAvailableStock,
  StockTransfer,
  StockAdjustment,
  AdminTask,
  Coupon
} from "../types";
import { DEFAULT_SETTINGS, normalizeText } from "../utils/shopLogic.tsx";
import { getComboDynamicStocks } from "../utils/storefrontHelpers";

const AdminConsole = lazy(() => import("./AdminConsole"));

export interface AdminWorkspaceProps {
  store: ShopState;
  setStore: (val: ShopState | ((prev: ShopState) => ShopState)) => void;
  displayProducts: Product[];
  authToken: string | null;
  setAuthToken: (t: string | null) => void;
  activeTab: "storefront" | "admin" | "checkout";
  setActiveTab: (t: "storefront" | "admin" | "checkout") => void;
  adminSection: string;
  setAdminSection: (s: any) => void;
  fetchStoreData: (isSilent?: boolean, explicitToken?: string) => Promise<ShopState | null>;
  showAdminToast: (text: string, type?: "success" | "error" | "neutral") => void;
  onLogout: () => void;
  navigateToProductRoute: (category: string, subcategory: string, showFlat?: boolean) => void;
  syncStatus: "synced" | "syncing" | "error";
  setSyncStatus: (s: "synced" | "syncing" | "error") => void;
  onEditingActiveThemeChange?: (theme: string | undefined) => void;
}

export default function AdminWorkspace({
  store,
  setStore,
  displayProducts,
  authToken,
  setAuthToken,
  activeTab,
  setActiveTab,
  adminSection,
  setAdminSection,
  fetchStoreData,
  showAdminToast,
  onLogout,
  navigateToProductRoute,
  syncStatus,
  setSyncStatus,
  onEditingActiveThemeChange
}: AdminWorkspaceProps) {
  const [saving, setSaving] = useState(false);
  const [showMpAccessToken, setShowMpAccessToken] = useState(false);
  const [showMpPublicKey, setShowMpPublicKey] = useState(false);
  const [isJuemAccordionOpen, setIsJuemAccordionOpen] = useState(false);
  const [isAureaAccordionOpen, setIsAureaAccordionOpen] = useState(false);
  const [isNavidadAccordionOpen, setIsNavidadAccordionOpen] = useState(false);

  const [traceabilityProductId, setTraceabilityProductId] = useState<string | null>(null);
  const [traceabilitySku, setTraceabilitySku] = useState<string | null>(null);
  const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = useState(false);
  const [salesInitialFilter, setSalesInitialFilter] = useState<string>("all");
  const [salesInitialOrderId, setSalesInitialOrderId] = useState<string | null>(null);

  const [bannerProductSearch, setBannerProductSearch] = useState("");
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingEmailHeader, setUploadingEmailHeader] = useState(false);
  const [cloudinarySelectorConfig, setCloudinarySelectorConfig] = useState<{
    isOpen: boolean;
    onSelect: (url: string) => void;
  } | null>(null);

  const [stockFilterTab, setStockFilterTab] = useState<"all" | "outOfStock" | "lowStock" | "alerts">("alerts");
  const [stockSearchQuery, setStockSearchQuery] = useState<string>("");
  const [stockPage, setStockPage] = useState<number>(1);
  const [stockSkuFilter, setStockSkuFilter] = useState<string>("");
  const [stockNameFilter, setStockNameFilter] = useState<string>("");
  const [stockCostFilter, setStockCostFilter] = useState<string>("all");
  const [stockLocalFilter, setStockLocalFilter] = useState<string>("all");
  const [stockMlFilter, setStockMlFilter] = useState<string>("all");
  const [stockMvdFilter, setStockMvdFilter] = useState<string>("all");
  const [stockPinFilter, setStockPinFilter] = useState<string>("all");
  const [stockMarginFilter, setStockMarginFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [stockSubSection, setStockSubSection] = useState<"list" | "transfer" | "history" | "adjustments">("list");
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [selectedTransferGroup, setSelectedTransferGroup] = useState<{
    transferCode: string;
    batchId?: string;
    createdAt: string;
    fromDeposito: "Pinamar" | "Montevideo";
    toDeposito: "Pinamar" | "Montevideo";
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      variantId?: string;
      variantName?: string;
      sku?: string;
      imageUrl?: string;
      quantity: number;
    }>;
    totalQuantity: number;
    totalItems: number;
  } | null>(null);
  const [isTransferModalMaximized, setIsTransferModalMaximized] = useState<boolean>(false);
  const [transferHistorySearch, setTransferHistorySearch] = useState<string>("");

  const [isEditingTransfer, setIsEditingTransfer] = useState<boolean>(false);
  const [editTransferItems, setEditTransferItems] = useState<
    Array<{
      id?: string;
      productId: string;
      productName: string;
      variantId?: string;
      variantName?: string;
      sku?: string;
      imageUrl?: string;
      quantity: number;
    }>
  >([]);
  const [editAddProductId, setEditAddProductId] = useState<string>("");
  const [editAddVariantId, setEditAddVariantId] = useState<string>("");
  const [editAddQty, setEditAddQty] = useState<number>(1);
  const [editSearchProduct, setEditSearchProduct] = useState<string>("");
  const [editShowSuggestions, setEditShowSuggestions] = useState<boolean>(false);
  const [editFilterOnlyWithStock, setEditFilterOnlyWithStock] = useState<boolean>(false);
  const [isSavingTransferEdit, setIsSavingTransferEdit] = useState<boolean>(false);
  const [hasUnsavedTransferEdits, setHasUnsavedTransferEdits] = useState<boolean>(false);

  const [showStockAdjustmentModal, setShowStockAdjustmentModal] = useState<boolean>(false);
  const [pendingStockItem, setPendingStockItem] = useState<any>(null);
  const [pendingStockField, setPendingStockField] = useState<string>("");
  const [pendingStockValue, setPendingStockValue] = useState<number>(0);
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState<string>("Auditoría / Conteo Físico");
  const [customStockAdjustmentReason, setCustomStockAdjustmentReason] = useState<string>("");
  const [transfersLoading, setTransfersLoading] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; name: string; sku?: string; extraInfo?: string } | null>(null);
  const [transferProductId, setTransferProductId] = useState<string>("");
  const [transferVariantId, setTransferVariantId] = useState<string>("");
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferFrom, setTransferFrom] = useState<"Pinamar" | "Montevideo">("Pinamar");
  const [transferTo, setTransferTo] = useState<"Pinamar" | "Montevideo">("Montevideo");
  const [transferSearchQuery, setTransferSearchQuery] = useState<string>("");
  const [transferStep, setTransferStep] = useState<number>(1);
  const [transferItems, setTransferItems] = useState<
    Array<{
      id: string;
      productId: string;
      productName: string;
      variantId?: string;
      variantName?: string;
      sku?: string;
      quantity: number;
      maxAvailable: number;
    }>
  >([]);
  const [transferStockAlert, setTransferStockAlert] = useState<{ title: string; message: string; type: "error" | "warning" } | null>(null);

  const transferBackdropMouseDownRef = useRef(false);

  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [adminProductSearchQuery, setAdminProductSearchQuery] = useState("");
  const [adminProductCategoryFilter, setAdminProductCategoryFilter] = useState("all");
  const [adminProductStockFilter, setAdminProductStockFilter] = useState("all");
  const [adminProductStatusFilter, setAdminProductStatusFilter] = useState("all");
  const [adminProductFeaturedFilter, setAdminProductFeaturedFilter] = useState("all");
  const [adminProductsPage, setAdminProductsPage] = useState<number>(1);

  const [newProductStep, setNewProductStep] = useState(1);
  const [editingProductStep, setEditingProductStep] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductMode, setIsNewProductMode] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    description: "",
    price: 0,
    originalPrice: undefined,
    category: "",
    imageUrl: "",
    stock: 0,
    featured: false,
    consultOnly: false,
    categorias_adicionales: [],
    subcategorias_adicionales: [],
    precioCompra: 0,
    precioCon40: 0,
    comisionML: 0,
    comisionMP: 0,
    precioVentaML: 0,
    precioWeb: 0,
    calcWebPriceFromML: false,
    descuentoPorcentaje: 0,
    stockPinamar: 0,
    stockMontevideo: 0,
    stockTotalActual: 0
  });
  const [newProductErrors, setNewProductErrors] = useState<Record<string, string>>({});
  const [editProductErrors, setEditProductErrors] = useState<Record<string, string>>({});

  const [newSubSecCategoryFilter, setNewSubSecCategoryFilter] = useState<string>("");
  const [editSubSecCategoryFilter, setEditSubSecCategoryFilter] = useState<string>("");
  const [newVarSize, setNewVarSize] = useState<string>("Único");
  const [newVarColor, setNewVarColor] = useState<string>("General");
  const [editVarSize, setEditVarSize] = useState<string>("Único");
  const [editVarColor, setEditVarColor] = useState<string>("General");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("Shirt");
  const [newCategoryOrder, setNewCategoryOrder] = useState<number>(() => (store.dbCategories || []).length + 1);
  const [newCategoryHideOnHome, setNewCategoryHideOnHome] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<"percentage" | "fixed" | "free_shipping">("percentage");
  const [newCouponDiscount, setNewCouponDiscount] = useState<number>(10);
  const [newCouponAmount, setNewCouponAmount] = useState<number>(200);
  const [newCouponExpiration, setNewCouponExpiration] = useState("");
  const [newCouponMaxUses, setNewCouponMaxUses] = useState("");

  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editCouponCode, setEditCouponCode] = useState("");
  const [editCouponType, setEditCouponType] = useState<"percentage" | "fixed" | "free_shipping">("percentage");
  const [editCouponDiscount, setEditCouponDiscount] = useState<number>(10);
  const [editCouponAmount, setEditCouponAmount] = useState<number>(200);
  const [editCouponExpiration, setEditCouponExpiration] = useState("");
  const [editCouponMaxUses, setEditCouponMaxUses] = useState("");
  const [editCouponActive, setEditCouponActive] = useState(true);

  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryParent, setNewSubcategoryParent] = useState(() => (store.dbCategories || [])[0]?.id || "");
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);

  const [customAlert, setCustomAlert] = useState<{ title: string; message: string; show: boolean } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    show: boolean;
    onConfirm: () => void;
  } | null>(null);

  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);

  const [editingSettings, setEditingSettings] = useState<SiteSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...(store.settings || {})
  }));
  const [emailPreviewTab, setEmailPreviewTab] = useState<"created" | "changed">("created");

  const [googlePlaceSearchQuery, setGooglePlaceSearchQuery] = useState("");
  const [googlePlaceSearchResults, setGooglePlaceSearchResults] = useState<any[]>([]);
  const [googlePlaceSearchLoading, setGooglePlaceSearchLoading] = useState(false);
  const [googlePlaceSearchError, setGooglePlaceSearchError] = useState("");

  const getComboDynamicStocksAdmin = (comboComponents: any[], productVariants: any[] = []) =>
    getComboDynamicStocks(store.products || [], comboComponents, productVariants);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const adminType = type === "info" ? "neutral" : type;
    showAdminToast(message, adminType);
  };

  const showCustomAlert = (title: string, message: string) => {
    setCustomAlert({ title, message, show: true });
  };

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomConfirm({ title, message, show: true, onConfirm });
  };

  useEffect(() => {
    onEditingActiveThemeChange?.(editingSettings?.activeTheme);
  }, [editingSettings?.activeTheme, onEditingActiveThemeChange]);

  useEffect(() => {
    if (store.dbCategories && store.dbCategories.length > 0 && !newSubcategoryParent) {
      setNewSubcategoryParent(store.dbCategories[0].id);
    }
    setNewCategoryOrder((store.dbCategories || []).length + 1);
  }, [store.dbCategories]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    if (!selectedTransferGroup) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedTransferGroup(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedTransferGroup]);

  const scrollAdminToTop = useCallback(() => {
    if (activeTab !== "admin") return;
    const doScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      const mainEl = document.getElementById("admin-main-scroll");
      if (mainEl) {
        mainEl.scrollTop = 0;
        mainEl.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    };
    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 30);
    setTimeout(doScroll, 100);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "admin") return;
    scrollAdminToTop();
  }, [activeTab, adminSection, newProductStep, editingProductStep, isNewProductMode, editingProduct?.id, scrollAdminToTop]);

  const verifyAdminToken = async (token: string) => {
    try {
      const res = await fetch("/api/admin/verify", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.user?.role === "admin") {
          setAuthToken(token);
          const fresh = await fetchStoreData(true, token);
          if (fresh?.settings) {
            setEditingSettings({ ...DEFAULT_SETTINGS, ...fresh.settings });
          }
        } else {
          onLogout();
          showAdminToast("Acceso denegado: permisos de administrador requeridos.", "error");
        }
      } else {
        onLogout();
      }
    } catch (err) {
      console.warn("No se pudo verificar el token de administración:", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("apex_admin_token");
    const loginTime = localStorage.getItem("apex_admin_login_time");
    const isExpired = loginTime && Date.now() - Number(loginTime) > 3600000;
    if (token && !isExpired) {
      verifyAdminToken(token);
    }
  }, []);

  const fetchEmailLogs = async () => {
    setEmailLogsLoading(true);
    try {
      const activeToken = localStorage.getItem("apex_admin_token") || authToken;
      const res = await fetch("/api/admin/emails/logs", {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setEmailLogs(data.logs || []);
        }
      }
    } catch (e) {
      console.warn("Aviso al consultar registros de correos:", e);
    } finally {
      setEmailLogsLoading(false);
    }
  };

  const fetchStockTransfers = async () => {
    setTransfersLoading(true);
    try {
      const activeToken = localStorage.getItem("apex_admin_token") || authToken;
      const res = await fetch("/api/stock-transfers", {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setStockTransfers(data.transfers || []);
        }
      }
    } catch (e) {
      console.warn("Aviso al consultar transferencias de stock:", e);
    } finally {
      setTransfersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "admin") return;
    if (adminSection === "stock") {
      fetchStockTransfers();
    } else if (adminSection === "emails") {
      fetchEmailLogs();
    }
  }, [activeTab, adminSection]);

  const fetchAdminTasks = async () => {
    try {
      const token = localStorage.getItem("apex_admin_token") || authToken;
      if (!token) return;
      const res = await fetch("/api/admin-tasks", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            const data = await res.json();
            if (data && data.success) {
              setAdminTasks(data.tasks || []);
            }
          } catch (jsonErr) {
            console.warn("Error parsing admin tasks JSON:", jsonErr);
          }
        }
      } else if (res.status === 401 || res.status === 403) {
        console.warn(`Admin tasks authorization failed (status ${res.status}).`);
      }
    } catch (err) {
      console.warn("Aviso: no se pudieron cargar las tareas de administración temporalmente:", err);
    }
  };

  useEffect(() => {
    if (!authToken) return;
    const interval = setInterval(() => {
      const loginTime = localStorage.getItem("apex_admin_login_time");
      if (loginTime && Date.now() - Number(loginTime) > 3600000) {
        onLogout();
        showAdminToast("Sesión de administrador expirada (límite de 1 hora excedido).", "error");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    let lastUpdated = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdated > 15000) {
        lastUpdated = now;
        localStorage.setItem("apex_admin_login_time", now.toString());
      }
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      setAdminTasks([]);
      return;
    }
    fetchAdminTasks();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAdminTasks();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [authToken]);

  useEffect(() => {
    const handleGoogleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const payload = event.data.payload;
        showAdminToast(`¡Sincronización Exitosa! Conectado como ${payload?.name || "Merchant Owner"}`, "success");
        fetchStoreData();
      }
    };
    window.addEventListener("message", handleGoogleOAuthMessage);
    return () => {
      window.removeEventListener("message", handleGoogleOAuthMessage);
    };
  }, []);

  const navigateAdminSection = (
    section:
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
      | "cloudinary_explorer"
      | "calculator_3d"
      | "traceability"
  ) => {
    setAdminSection(section as any);
    setEditingProduct(null);
    setIsNewProductMode(false);
    setMobileAdminMenuOpen(false);
    window.history.pushState(null, "", `/admin/${section}`);
    scrollAdminToTop();
    if (section === "emails") {
      fetchEmailLogs();
    }
    if (section === "stock") {
      fetchStockTransfers();
    }
  };

  const updateProductCalculations = (p: Partial<Product>): Partial<Product> => {
    const pCompra = Number(p.precioCompra || 0);
    const pCon40 = Number((pCompra * 1.4).toFixed(2));
    const pVentaML = Number(p.precioVentaML || 0);
    const pComision = Number(p.comisionML || 0);
    const isAuto = p.calcWebPriceFromML !== false;
    const pWeb = isAuto ? Number((pVentaML - pComision).toFixed(2)) : Number(p.precioWeb || 0);
    const desc = Number(p.descuentoPorcentaje || 0);
    const computedPrice = desc > 0 ? Number((pWeb * (1 - desc / 100)).toFixed(2)) : pWeb;
    const computedOriginalPrice = desc > 0 ? pWeb : undefined;
    const pComisionMP =
      p.comisionMP !== undefined && p.comisionMP !== null && !isNaN(Number(p.comisionMP)) && (p.comisionMP as any) !== ""
        ? Number(p.comisionMP)
        : Number((computedPrice * 0.12).toFixed(2));

    let sPinamar = Number(p.stockPinamar || 0);
    let sMontevideo = Number(p.stockMontevideo || 0);

    if (p.variants && p.variants.length > 0) {
      sPinamar = p.variants.reduce((sum, v) => sum + Number(v.stockPinamar || 0), 0);
      sMontevideo = p.variants.reduce((sum, v) => sum + Number(v.stockMontevideo || 0), 0);
    }

    const sTotal = sPinamar + sMontevideo;

    return {
      ...p,
      precioCon40: pCon40,
      precioWeb: pWeb,
      comisionMP: pComisionMP,
      stockPinamar: sPinamar,
      stockMontevideo: sMontevideo,
      stockTotalActual: sTotal,
      stock: sTotal,
      price: computedPrice,
      originalPrice: computedOriginalPrice
    };
  };

  const prepareProductForEditing = (p: Product): Product => {
    const precioCompra = p.precioCompra !== undefined ? p.precioCompra : 0;
    const precioCon40 = p.precioCon40 !== undefined ? p.precioCon40 : Number((precioCompra * 1.4).toFixed(2));
    const comisionML = p.comisionML !== undefined ? p.comisionML : 0;
    const precioVentaML = p.precioVentaML !== undefined ? p.precioVentaML : p.price || 0;
    const calcWebPriceFromML = p.calcWebPriceFromML === true;
    const precioWeb =
      p.precioWeb !== undefined ? p.precioWeb : calcWebPriceFromML ? Number((precioVentaML - comisionML).toFixed(2)) : 0;
    const comisionMP = p.comisionMP !== undefined ? p.comisionMP : Number((precioWeb * 0.12).toFixed(2));

    let descuentoPorcentaje = p.descuentoPorcentaje !== undefined ? p.descuentoPorcentaje : 0;
    if (descuentoPorcentaje === 0 && p.originalPrice && p.price && p.originalPrice > p.price) {
      descuentoPorcentaje = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
    }

    const preparedVariants = p.variants
      ? p.variants.map((v) => {
          const sp = v.stockPinamar !== undefined ? v.stockPinamar : v.stock;
          const sm = v.stockMontevideo !== undefined ? v.stockMontevideo : 0;
          return {
            ...v,
            stockPinamar: sp,
            stockMontevideo: sm,
            stock: sp + sm
          };
        })
      : undefined;

    let stockPinamar = p.stockPinamar !== undefined ? p.stockPinamar : p.stock;
    let stockMontevideo = p.stockMontevideo !== undefined ? p.stockMontevideo : 0;
    if (preparedVariants && preparedVariants.length > 0) {
      stockPinamar = preparedVariants.reduce((sum, v) => sum + v.stockPinamar, 0);
      stockMontevideo = preparedVariants.reduce((sum, v) => sum + v.stockMontevideo, 0);
    }
    const stockTotalActual = stockPinamar + stockMontevideo;

    return {
      ...p,
      precioCompra,
      precioCon40,
      comisionML,
      comisionMP,
      precioVentaML,
      precioWeb,
      descuentoPorcentaje,
      stockPinamar,
      stockMontevideo,
      stockTotalActual,
      stock: stockTotalActual,
      variants: preparedVariants
    };
  };

  const getComboPurchaseCost = (comboComponents: any[]) => {
    if (!comboComponents || comboComponents.length === 0) return 0;
    const rawProds = store.products || [];

    const hasColorsOrSizes = comboComponents.some((c) => c.comboColor || c.comboSize);
    let finalCost = 0;

    if (hasColorsOrSizes) {
      const uniqueColors = Array.from(new Set(comboComponents.map((c) => c.comboColor || undefined)));
      if (uniqueColors.length === 0 || (uniqueColors.length === 1 && uniqueColors[0] === undefined)) {
        uniqueColors.push(undefined);
      }
      const uniqueSizes = Array.from(new Set(comboComponents.map((c) => c.comboSize || undefined)));
      if (uniqueSizes.length === 0 || (uniqueSizes.length === 1 && uniqueSizes[0] === undefined)) {
        uniqueSizes.push(undefined);
      }

      let maxCost = 0;
      for (const col of uniqueColors) {
        for (const sz of uniqueSizes) {
          let pairCost = 0;
          let matchedAny = false;
          for (const comp of comboComponents) {
            const compProd = rawProds.find((cp) => String(cp.id) === String(comp.productId));
            if (compProd) {
              const colorMatch = !comp.comboColor || comp.comboColor === col;
              const sizeMatch = !comp.comboSize || comp.comboSize === sz;
              if (colorMatch && sizeMatch) {
                pairCost += Number(compProd.precioCompra || 0) * (Number(comp.quantity) || 1);
                matchedAny = true;
              }
            }
          }
          if (matchedAny && pairCost > maxCost) {
            maxCost = pairCost;
          }
        }
      }
      finalCost = maxCost;
    } else {
      const productQuantities: { [key: string]: number } = {};
      for (const comp of comboComponents) {
        const pid = String(comp.productId);
        const qty = Number(comp.quantity) || 1;
        if (!productQuantities[pid] || qty > productQuantities[pid]) {
          productQuantities[pid] = qty;
        }
      }

      let sumCost = 0;
      for (const pid of Object.keys(productQuantities)) {
        const compProd = rawProds.find((cp) => String(cp.id) === pid);
        if (compProd) {
          sumCost += Number(compProd.precioCompra || 0) * productQuantities[pid];
        }
      }
      finalCost = sumCost;
    }

    if (finalCost === 0 && comboComponents.length > 0) {
      let fallbackSum = 0;
      for (const comp of comboComponents) {
        const compProd = rawProds.find((cp) => String(cp.id) === String(comp.productId));
        if (compProd) {
          fallbackSum += Number(compProd.precioCompra || 0) * (Number(comp.quantity) || 1);
        }
      }
      finalCost = fallbackSum;
    }

    return Math.round(finalCost);
  };

  const calculateMargins = (compra: number, venta: number, comision: number = 0) => {
    const pCompra = Number(compra || 0);
    const pVenta = Number(venta || 0);
    const pComision = Number(comision || 0);

    if (pCompra <= 0 || pVenta <= 0) return { profit: 0, marginPercent: 0, markupPercent: 0 };

    const netVenta = pVenta - pComision;
    const profit = netVenta - pCompra;
    const marginPercent = Number(((profit / pVenta) * 100).toFixed(1));
    const markupPercent = Number(((profit / pCompra) * 100).toFixed(1));

    return { profit, marginPercent, markupPercent };
  };

  const getProductActualStock = (p: any) => {
    if (!p) return 0;
    return getProductAvailableStock(p);
  };

  const filteredAdminProducts = useMemo(() => {
    let filtered = displayProducts;

    if (adminProductCategoryFilter !== "all") {
      filtered = filtered.filter(
        (p) =>
          p.categoria_id === adminProductCategoryFilter ||
          p.categorias_adicionales?.includes(adminProductCategoryFilter)
      );
    }

    if (adminProductStockFilter === "instock") {
      filtered = filtered.filter((p) => getProductActualStock(p) > 0);
    } else if (adminProductStockFilter === "outofstock") {
      filtered = filtered.filter((p) => getProductActualStock(p) === 0);
    }

    if (adminProductStatusFilter === "active") {
      filtered = filtered.filter((p) => !p.paused);
    } else if (adminProductStatusFilter === "paused") {
      filtered = filtered.filter((p) => !!p.paused);
    }

    if (adminProductFeaturedFilter === "featured") {
      filtered = filtered.filter((p) => !!p.featured);
    } else if (adminProductFeaturedFilter === "notfeatured") {
      filtered = filtered.filter((p) => !p.featured);
    }

    if (!adminProductSearchQuery.trim()) return filtered;
    const normalizedQuery = normalizeText(adminProductSearchQuery);
    const collapsedQuery = normalizedQuery.replace(/\s+/g, "");

    return filtered.filter((p) => {
      const pCode = p.codigo ? normalizeText(String(p.codigo)) : "";
      const pName = p.name ? normalizeText(String(p.name)) : "";
      const pCategory = p.category ? normalizeText(String(p.category)) : "";
      const pDesc = p.description ? normalizeText(String(p.description)) : "";

      const codeMatch =
        pCode.includes(normalizedQuery) ||
        (collapsedQuery.length >= 2 && pCode.replace(/\s+/g, "").includes(collapsedQuery));
      const nameMatch =
        pName.includes(normalizedQuery) ||
        (collapsedQuery.length >= 2 && pName.replace(/\s+/g, "").includes(collapsedQuery));
      const categoryMatch = pCategory.includes(normalizedQuery);
      const descMatch = pDesc.includes(normalizedQuery);

      const additionalCatsMatch = !!p.categorias_adicionales?.some((catId) => {
        const cat = (store.dbCategories || []).find((c) => c.id === catId);
        if (!cat?.nombre) return false;
        return normalizeText(cat.nombre).includes(normalizedQuery);
      });

      const subcatsMatch = !!(
        p.subcategoria_id &&
        normalizeText(
          String((store.dbSubcategories || []).find((s) => s.id === p.subcategoria_id)?.nombre || "")
        ).includes(normalizedQuery)
      );

      const additionalSubcatsMatch = !!p.subcategorias_adicionales?.some((subId) => {
        const subcat = (store.dbSubcategories || []).find((s) => s.id === subId);
        if (!subcat?.nombre) return false;
        return normalizeText(subcat.nombre).includes(normalizedQuery);
      });

      const variantsMatch = !!p.variants?.some((v) => {
        const vSku = v.sku ? normalizeText(String(v.sku)) : "";
        const vColor = v.color ? normalizeText(String(v.color)) : "";
        const vSize = v.size ? normalizeText(String(v.size)) : "";
        return (
          vSku.includes(normalizedQuery) ||
          (collapsedQuery.length >= 2 && vSku.replace(/\s+/g, "").includes(collapsedQuery)) ||
          vColor.includes(normalizedQuery) ||
          vSize.includes(normalizedQuery)
        );
      });

      return (
        codeMatch ||
        nameMatch ||
        categoryMatch ||
        descMatch ||
        additionalCatsMatch ||
        subcatsMatch ||
        additionalSubcatsMatch ||
        variantsMatch
      );
    });
  }, [
    displayProducts,
    adminProductSearchQuery,
    adminProductCategoryFilter,
    adminProductStockFilter,
    adminProductStatusFilter,
    adminProductFeaturedFilter,
    store.dbCategories,
    store.dbSubcategories
  ]);

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setTimeout(() => {
      const element = document.getElementById("admin-categories-editor-form-row");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 300, behavior: "smooth" });
      }
    }, 80);
  };

  const handleStartEditSubcategory = (sub: Subcategory) => {
    setEditingSubcategory(sub);
    setTimeout(() => {
      const element = document.getElementById("admin-categories-editor-form-row");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 300, behavior: "smooth" });
      }
    }, 80);
  };

  const executeBulkStockTransfer = async (
    items: Array<{
      productId: string;
      productName: string;
      variantId?: string;
      variantName?: string;
      quantity: number;
    }>,
    fromDep: "Pinamar" | "Montevideo",
    toDep: "Pinamar" | "Montevideo"
  ) => {
    setTransfersLoading(true);
    try {
      const activeToken = localStorage.getItem("apex_admin_token") || authToken;
      const itemsPayload = items.map((item) => {
        const prod = (store.products || []).find((p) => String(p.id) === String(item.productId));
        const variant = prod?.variants?.find((v) => String(v.id) === String(item.variantId));
        return {
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantName: item.variantName,
          sku: variant?.sku || prod?.codigo,
          imageUrl: variant?.imageUrl || prod?.imageUrl || prod?.imagenes?.[0],
          quantity: item.quantity
        };
      });

      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          fromDeposito: fromDep,
          toDeposito: toDep,
          items: itemsPayload
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `¡Traslado ${data.transferCode} registrado exitosamente (${data.totalItems} artículos, ${data.totalQuantity} unidades)!`,
          "success"
        );
        fetchStoreData(true);
        await fetchStockTransfers();
        setTransferItems([]);
        setTransferProductId("");
        setTransferVariantId("");
        setTransferQty(1);
        setTransferStep(1);
        setStockSubSection("history");
      } else {
        showToast(data.message || "Error al registrar el traslado múltiple.", "error");
      }
    } catch (e: any) {
      console.error("Error executing bulk transfer", e);
      showToast("Error de conexión al registrar la transferencia múltiple.", "error");
    } finally {
      setTransfersLoading(false);
    }
  };

  const revertStockTransfer = async (identifier: string) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas anular este traslado (${identifier})? Esto revertirá los niveles de stock (sumará las unidades al depósito de origen y las restará del depósito de destino) y eliminará el registro.`
      )
    ) {
      return;
    }
    setTransfersLoading(true);
    try {
      const activeToken = localStorage.getItem("apex_admin_token") || authToken;
      const res = await fetch(`/api/stock-transfers/${encodeURIComponent(identifier)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.success) {
        showToast("¡Traslado anulado exitosamente y existencias restablecidas!", "success");
        if (
          selectedTransferGroup &&
          (selectedTransferGroup.transferCode === identifier || selectedTransferGroup.batchId === identifier)
        ) {
          setSelectedTransferGroup(null);
        }
        fetchStoreData(true);
        await fetchStockTransfers();
      } else {
        showToast(data.message || "Error al anular el traslado", "error");
      }
    } catch (e: any) {
      console.error("Error reverting stock transfer", e);
      showToast("Error de conexión al revertir el traslado", "error");
    } finally {
      setTransfersLoading(false);
    }
  };

  const handleStartEditTransfer = (group?: any) => {
    const target = group || selectedTransferGroup;
    if (!target) return;
    setSelectedTransferGroup(target);
    setEditTransferItems(
      target.items.map((it: any) => ({
        id: it.id,
        productId: String(it.productId),
        productName: it.productName,
        variantId: it.variantId ? String(it.variantId) : undefined,
        variantName: it.variantName ? String(it.variantName) : undefined,
        sku: it.sku,
        imageUrl: it.imageUrl,
        quantity: Number(it.quantity) || 1
      }))
    );
    setEditAddProductId("");
    setEditAddVariantId("");
    setEditAddQty(1);
    setEditSearchProduct("");
    setHasUnsavedTransferEdits(false);
    setIsEditingTransfer(true);
  };

  const handleCancelEditTransfer = () => {
    setIsEditingTransfer(false);
    setHasUnsavedTransferEdits(false);
    setEditTransferItems([]);
    setEditAddProductId("");
    setEditAddVariantId("");
    setEditAddQty(1);
    setEditSearchProduct("");
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const item = editTransferItems[index];
    if (item && selectedTransferGroup) {
      const prod = store.products.find((p) => String(p.id) === String(item.productId));
      const variant = item.variantId
        ? prod?.variants?.find((v) => String(v.id) === String(item.variantId))
        : undefined;
      const fromDep = selectedTransferGroup.fromDeposito || "Pinamar";
      const currentStock =
        fromDep === "Pinamar"
          ? variant
            ? variant.stockPinamar || 0
            : prod?.stockPinamar || 0
          : variant
          ? variant.stockMontevideo || 0
          : prod?.stockMontevideo || 0;

      const origItem = selectedTransferGroup.items.find(
        (oi) => String(oi.productId) === String(item.productId) && String(oi.variantId || "") === String(item.variantId || "")
      );
      const origQty = origItem ? Number(origItem.quantity) : 0;
      const maxAvailableForTransfer = currentStock + origQty;

      if (newQty > maxAvailableForTransfer) {
        showToast(
          `Stock insuficiente en ${fromDep}: Solo dispones de ${maxAvailableForTransfer}u en total para "${item.productName}${
            item.variantName ? ` (${item.variantName})` : ""
          }".`,
          "error"
        );
        setEditTransferItems((prev) => {
          const copy = [...prev];
          copy[index] = { ...copy[index], quantity: Math.max(1, maxAvailableForTransfer) };
          return copy;
        });
        setHasUnsavedTransferEdits(true);
        return;
      }
    }
    setHasUnsavedTransferEdits(true);
    setEditTransferItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], quantity: Math.floor(newQty) };
      return copy;
    });
  };

  const handleRemoveTransferItem = (index: number) => {
    if (editTransferItems.length <= 1) {
      showToast(
        "El traslado debe contener al menos un artículo. Si deseas anularlo por completo, usa 'Anular Traslado'.",
        "info"
      );
      return;
    }
    setHasUnsavedTransferEdits(true);
    setEditTransferItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddProductToTransfer = () => {
    if (!editAddProductId) {
      showToast("Selecciona un artículo para agregar al traslado.", "info");
      return;
    }
    const product = store.products.find((p) => String(p.id) === String(editAddProductId));
    if (!product) return;

    if (product.variants && product.variants.length > 0 && !editAddVariantId) {
      showToast("Selecciona la variante correspondiente del artículo.", "info");
      return;
    }

    const variant = editAddVariantId ? product.variants?.find((v) => String(v.id) === String(editAddVariantId)) : undefined;
    const variantDisplayName = variant ? [variant.size, variant.color].filter(Boolean).join(" / ") : "";
    const qty = Math.max(1, Math.floor(Number(editAddQty) || 1));

    const fromDep = selectedTransferGroup?.fromDeposito || "Pinamar";
    const availableOriginStock =
      fromDep === "Pinamar"
        ? variant
          ? variant.stockPinamar || 0
          : product.stockPinamar || 0
        : variant
        ? variant.stockMontevideo || 0
        : product.stockMontevideo || 0;

    if (availableOriginStock <= 0) {
      showToast(
        `No hay stock disponible en ${fromDep} para "${product.name}${
          variantDisplayName ? ` (${variantDisplayName})` : ""
        }". Stock actual en origen: 0u.`,
        "error"
      );
      return;
    }

    const existingIndex = editTransferItems.findIndex(
      (it) => String(it.productId) === String(editAddProductId) && String(it.variantId || "") === String(editAddVariantId || "")
    );
    const existingQty = existingIndex >= 0 ? editTransferItems[existingIndex].quantity : 0;

    if (existingQty + qty > availableOriginStock) {
      showToast(
        `Stock insuficiente en ${fromDep}. Dispones de ${availableOriginStock}u y ya tienes ${existingQty}u en la orden.`,
        "error"
      );
      return;
    }

    setHasUnsavedTransferEdits(true);

    if (existingIndex >= 0) {
      setEditTransferItems((prev) => {
        const copy = [...prev];
        copy[existingIndex] = { ...copy[existingIndex], quantity: copy[existingIndex].quantity + qty };
        return copy;
      });
      showToast(
        `Se sumaron +${qty}u a "${product.name}${
          variantDisplayName ? ` (${variantDisplayName})` : ""
        }". ⚠️ Recuerda pulsar "Guardar Cambios y Actualizar Stock" para guardar en la base de datos.`,
        "info"
      );
    } else {
      setEditTransferItems((prev) => [
        ...prev,
        {
          id: "item-" + Math.random().toString(36).substring(2, 8),
          productId: String(product.id),
          productName: product.name,
          variantId: variant ? String(variant.id) : undefined,
          variantName: variant ? variantDisplayName : undefined,
          sku: variant?.sku || product.codigo,
          imageUrl: variant?.imageUrl || product.imageUrl,
          quantity: qty
        }
      ]);
      showToast(
        `"${product.name}${
          variantDisplayName ? ` (${variantDisplayName})` : ""
        }" añadido a la lista. ⚠️ Recuerda pulsar "Guardar Cambios y Actualizar Stock" para aplicar en la base de datos.`,
        "success"
      );
    }

    setEditAddProductId("");
    setEditAddVariantId("");
    setEditAddQty(1);
    setEditSearchProduct("");
  };

  const handleSaveTransferModifications = async () => {
    if (!selectedTransferGroup) return;
    if (editTransferItems.length === 0) {
      showToast("El traslado debe contener al menos un artículo.", "error");
      return;
    }

    setIsSavingTransferEdit(true);
    try {
      const activeToken = localStorage.getItem("apex_admin_token") || authToken;
      const res = await fetch(`/api/stock-transfers/${encodeURIComponent(selectedTransferGroup.transferCode)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: editTransferItems.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            variantId: it.variantId,
            variantName: it.variantName,
            sku: it.sku,
            imageUrl: it.imageUrl,
            quantity: it.quantity
          }))
        })
      });

      const data = await res.json();
      if (data.success) {
        setHasUnsavedTransferEdits(false);
        showToast(data.message || "¡Traslado modificado y stock actualizado con éxito!", "success");
        const updatedItems = editTransferItems.map((it, idx) => ({
          id: it.id || `item-${idx}`,
          productId: it.productId,
          productName: it.productName,
          variantId: it.variantId,
          variantName: it.variantName,
          sku: it.sku,
          imageUrl: it.imageUrl,
          quantity: it.quantity
        }));
        setSelectedTransferGroup({
          ...selectedTransferGroup,
          items: updatedItems,
          totalItems: updatedItems.length,
          totalQuantity: updatedItems.reduce((acc, curr) => acc + curr.quantity, 0)
        });
        setIsEditingTransfer(false);
        fetchStoreData(true);
        await fetchStockTransfers();
      } else {
        showToast(data.message || "Error al modificar el traslado.", "error");
      }
    } catch (err: any) {
      console.error("Error modifying transfer:", err);
      showToast("Error de conexión al modificar el traslado.", "error");
    } finally {
      setIsSavingTransferEdit(false);
    }
  };

  const groupedStockTransfers = useMemo(() => {
    const groups: {
      [key: string]: {
        transferCode: string;
        batchId?: string;
        createdAt: string;
        fromDeposito: "Pinamar" | "Montevideo";
        toDeposito: "Pinamar" | "Montevideo";
        items: Array<{
          id: string;
          productId: string;
          productName: string;
          variantId?: string;
          variantName?: string;
          sku?: string;
          imageUrl?: string;
          quantity: number;
        }>;
        totalQuantity: number;
        totalItems: number;
      };
    } = {};

    for (const t of stockTransfers) {
      let code = t.transferCode;
      const legacyIdList = [
        "trans-60kvgp4h",
        "trans-ygue0ccv",
        "trans-9riqcj59",
        "trans-ik468slw",
        "trans-rvmzg3rs",
        "trans-95v4rygp",
        "trans-9zgyss41",
        "trans-uszc038q",
        "trans-poyjvfv7",
        "trans-usruo2nv"
      ];

      const isLegacyFirstTransfer =
        legacyIdList.includes(t.id) ||
        (code &&
          (code === "TRF-20260912-0001" ||
            code.startsWith("TRF-TRANS-") ||
            code.includes("USRU") ||
            code.includes("POYJ") ||
            code.includes("USZC") ||
            code.includes("9ZGY") ||
            code.includes("95V4") ||
            code.includes("RVMZ") ||
            code.includes("IK46") ||
            code.includes("9RIQ") ||
            code.includes("YGUE") ||
            code.includes("60KV")));

      if (!code || isLegacyFirstTransfer) {
        code = "TRF-0001";
      }

      const timeMinute = t.createdAt ? t.createdAt.substring(0, 16) : "batch-1";
      const groupKey = code || t.batchId || `${t.fromDeposito}-${t.toDeposito}-${timeMinute}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          transferCode: code,
          batchId: t.batchId || (code ? `batch-${code.replace("TRF-", "")}` : "batch-0001"),
          createdAt: t.createdAt,
          fromDeposito: t.fromDeposito,
          toDeposito: t.toDeposito,
          items: [],
          totalQuantity: 0,
          totalItems: 0
        };
      }

      const pMatch =
        (store.products || []).find((p) => String(p.id) === String(t.productId)) ||
        (store.products || []).find(
          (p) => p.name && t.productName && p.name.trim().toLowerCase() === t.productName.trim().toLowerCase()
        );
      const vMatch = (pMatch?.variants || []).find((v) => String(v.id) === String(t.variantId));
      const skuVal = t.sku || vMatch?.sku || pMatch?.codigo;
      const imgVal = t.imageUrl || vMatch?.imageUrl || pMatch?.imageUrl || pMatch?.imagenes?.[0];

      groups[groupKey].items.push({
        id: t.id,
        productId: t.productId,
        productName: t.productName,
        variantId: t.variantId,
        variantName: t.variantName,
        sku: skuVal,
        imageUrl: imgVal,
        quantity: t.quantity
      });
      groups[groupKey].totalQuantity += Number(t.quantity) || 0;
      groups[groupKey].totalItems += 1;
    }

    return Object.values(groups).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [stockTransfers, store.products]);

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      showAdminToast("Por favor, ingresa un destinatario válido.", "error");
      return;
    }
    setSendingTest(true);
    try {
      const activeToken = localStorage.getItem("apex_admin_token") || authToken;
      const res = await fetch("/api/admin/emails/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          toEmail: testEmailAddress.trim(),
          smtpConfig: {
            emailSenderEnabled: editingSettings.emailSenderEnabled,
            emailSenderProvider: editingSettings.emailSenderProvider || "smtp",
            resendApiKey: editingSettings.resendApiKey,
            mailgunApiKey: editingSettings.mailgunApiKey,
            mailgunDomain: editingSettings.mailgunDomain,
            mailgunRegion: editingSettings.mailgunRegion,
            emailSenderSmtpHost: editingSettings.emailSenderSmtpHost,
            emailSenderSmtpPort: editingSettings.emailSenderSmtpPort,
            emailSenderSmtpUser: editingSettings.emailSenderSmtpUser,
            emailSenderSmtpPass: editingSettings.emailSenderSmtpPass,
            emailSenderFromAddress: editingSettings.emailSenderFromAddress,
            siteTitle: editingSettings.siteTitle
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.status === "simulated") {
          showAdminToast("¡Envío simulado correctamente! (Revisa el historial de correos abajo)", "success");
        } else {
          showAdminToast("¡Prueba de conexión SMTP ejecutada con éxito!", "success");
        }
        fetchEmailLogs();
      } else {
        showAdminToast(`Fallo: ${data.message}`, "error");
      }
    } catch {
      showAdminToast("Error en la conexión con el servidor.", "error");
    } finally {
      setSendingTest(false);
    }
  };

  const handleClearEmailLogs = async () => {
    if (!window.confirm("¿Seguro que deseas vaciar el historial de correos?")) return;
    try {
      const activeToken = localStorage.getItem("apex_admin_token") || authToken;
      const res = await fetch("/api/admin/emails/logs", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        showAdminToast("Historial vaciado correctamente", "success");
        setEmailLogs([]);
      }
    } catch {
      showAdminToast("Error al vaciar historial", "error");
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const trimmedUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();
    if (!trimmedUser || !cleanPass) {
      setLoginError("Por favor ingresa tu usuario y contraseña.");
      return;
    }
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUser, password: cleanPass })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAuthToken(data.token);
        localStorage.setItem("apex_admin_token", data.token);
        localStorage.setItem("apex_admin_login_time", Date.now().toString());
        const fresh = await fetchStoreData(true, data.token);
        if (fresh?.settings) {
          setEditingSettings({ ...DEFAULT_SETTINGS, ...fresh.settings });
        }
        setActiveTab("admin");
        setUsernameInput("");
        setPasswordInput("");
        setShowLoginPassword(false);
        window.history.pushState(null, "", `/admin/${adminSection}`);
        showAdminToast("¡Sincronización de Sesión Establecida!", "success");
      } else {
        setLoginError(data.message || "Credenciales incorrectas.");
      }
    } catch {
      setLoginError("Error de conexión al servidor de autenticación.");
    }
  };

  const saveStateToServer = async (updatedStore: ShopState, isBackground = false): Promise<boolean> => {
    const activeToken = authToken || localStorage.getItem("apex_admin_token");
    if (!activeToken) return false;
    if (!authToken && activeToken) {
      setAuthToken(activeToken);
    }
    if (!isBackground) {
      setSyncStatus("syncing");
      setSaving(true);
    }
    try {
      const res = await fetch("/api/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify(updatedStore)
      });

      if (!res.ok) {
        if (res.status === 403) {
          onLogout();
          throw new Error("Sesión vencida. Por favor, vuelve a iniciar sesión.");
        }
        throw new Error("No se pudo guardar la información en la base de datos.");
      }

      const resData = await res.json();
      if (resData.success && resData.state) {
        setStore(resData.state);
        if (resData.state.settings) {
          setEditingSettings({ ...DEFAULT_SETTINGS, ...resData.state.settings });
        }
      } else {
        setStore(updatedStore);
        if (updatedStore.settings) {
          setEditingSettings({ ...DEFAULT_SETTINGS, ...updatedStore.settings });
        }
      }
      if (!isBackground) {
        setSyncStatus("synced");
      }
      return true;
    } catch (err: any) {
      console.error(err);
      if (!isBackground) {
        setSyncStatus("error");
        showCustomAlert("Error de sincronización", err.message || "Error al sincronizar con el servidor. Por favor, reintenta.");
      }
      return false;
    } finally {
      if (!isBackground) {
        setSaving(false);
      }
    }
  };

  const getNextAvailableSKUNumber = (products: Product[], additionalSkus: string[]): number => {
    let maxNum = 0;
    products.forEach((p) => {
      if (p.codigo) {
        const match = p.codigo.trim().match(/^J(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      if (p.variants) {
        p.variants.forEach((v) => {
          if (v.sku) {
            const match = v.sku.trim().match(/^J(\d+)/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        });
      }
    });
    additionalSkus.forEach((sku) => {
      if (sku) {
        const match = sku.trim().match(/^J(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    return maxNum === 0 ? 1 : maxNum + 1;
  };

  const getNextAutoSKU = (products: Product[]): string => {
    const nextNum = getNextAvailableSKUNumber(products, []);
    return `J${String(nextNum).padStart(3, "0")}`;
  };

  const getSmartVariantSku = (baseSku: string, size: string, color: string): string => {
    const cleanBase = (baseSku || "").trim().toUpperCase();

    let sizeAbbr = (size || "").trim().toUpperCase();
    if (sizeAbbr === "ÚNICO" || sizeAbbr === "UNICO" || sizeAbbr === "GENERAL" || sizeAbbr === "") {
      sizeAbbr = "";
    } else {
      if (sizeAbbr.startsWith("TALLE ")) {
        sizeAbbr = sizeAbbr.replace("TALLE ", "").trim();
      }
      const sizeMap: { [key: string]: string } = {
        TALLES: "S",
        S: "S",
        M: "M",
        L: "L",
        XL: "XL",
        XXL: "XXL",
        XXXL: "XXXL",
        XS: "XS",
        SMALL: "S",
        MEDIUM: "M",
        LARGE: "L",
        "EXTRA LARGE": "XL",
        ÚNICA: "U",
        UNICA: "U"
      };
      if (sizeMap[sizeAbbr]) {
        sizeAbbr = sizeMap[sizeAbbr];
      } else {
        sizeAbbr = sizeAbbr.replace(/[^A-Z0-9]/g, "");
        if (sizeAbbr.length > 4) {
          sizeAbbr = sizeAbbr.slice(0, 3);
        }
      }
    }

    let colorAbbr = (color || "").trim().toUpperCase();
    if (colorAbbr === "GENERAL" || colorAbbr === "ÚNICO" || colorAbbr === "UNICO" || colorAbbr === "") {
      colorAbbr = "";
    } else {
      const colorMap: { [key: string]: string } = {
        NEGRO: "N",
        BLANCO: "B",
        ROJO: "R",
        AZUL: "AZ",
        VERDE: "V",
        GRIS: "G",
        BEIGE: "BG",
        ROSA: "RS",
        AMARILLO: "AM",
        NARANJA: "NA",
        MARRÓN: "M",
        MARRON: "M",
        CELESTE: "C",
        VIOLETA: "VT",
        LILA: "LI",
        FUXIA: "FX",
        FUCSIA: "FX",
        TURQUESA: "TQ",
        DORADO: "DR",
        PLATEADO: "PL"
      };
      if (colorMap[colorAbbr]) {
        colorAbbr = colorMap[colorAbbr];
      } else {
        colorAbbr = colorAbbr.replace(/[^A-Z0-9]/g, "");
        if (colorAbbr.length > 2) {
          colorAbbr = colorAbbr.slice(0, 2);
        }
      }
    }

    return `${cleanBase}${sizeAbbr}${colorAbbr}`;
  };

  const checkDuplicateSKU = (product: Product, isNew: boolean): string | null => {
    const baseCode = product.codigo?.trim().toUpperCase();
    const otherProducts = isNew
      ? store.products
      : store.products.filter((p) => String(p.id) !== String(product.id));

    const occupied = new Map<string, string>();
    otherProducts.forEach((p) => {
      const pCode = p.codigo?.trim().toUpperCase();
      if (pCode) {
        occupied.set(pCode, p.name);
      }
      if (p.variants) {
        p.variants.forEach((v) => {
          const vSku = v.sku?.trim().toUpperCase();
          if (vSku) {
            occupied.set(
              vSku,
              `${p.name} (Variante: ${v.size !== "Único" ? v.size : ""} ${v.color !== "General" ? v.color : ""}`.trim() +
                ")"
            );
          }
        });
      }
    });

    if (baseCode && occupied.has(baseCode)) {
      return `El código único "${baseCode}" ya está en uso por el producto "${occupied.get(baseCode)}".`;
    }

    if (product.variants) {
      for (const v of product.variants) {
        const vSku = v.sku?.trim().toUpperCase();
        if (vSku && occupied.has(vSku)) {
          return `El código de variante "${vSku}" ya está en uso por el producto "${occupied.get(vSku)}".`;
        }
      }
    }

    const selfVariantSKUs = new Set<string>();
    if (product.variants) {
      for (const v of product.variants) {
        const vSku = v.sku?.trim().toUpperCase();
        if (vSku) {
          if (selfVariantSKUs.has(vSku)) {
            return `Código de variante duplicado "${vSku}" detectado en múltiples variantes de este producto.`;
          }
          selfVariantSKUs.add(vSku);
        }
      }
    }

    return null;
  };

  const handleCreateProduct = async (e?: any) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    const errors: Record<string, string> = {};

    if (!newProduct.name || !newProduct.name.trim()) {
      errors.name = "El nombre del producto es obligatorio.";
    }

    let actualCategory = "Otros";
    let actualCategoryId = "";
    if (newProduct.categoria_id) {
      const match = (store.dbCategories || []).find((c) => c.id === newProduct.categoria_id);
      if (match) {
        actualCategory = match.nombre;
        actualCategoryId = match.id;
      }
    } else {
      const firstCat = (store.dbCategories || [])[0];
      if (firstCat) {
        actualCategory = firstCat.nombre;
        actualCategoryId = firstCat.id;
      }
    }

    if (!actualCategoryId) {
      errors.category = "Debes seleccionar o crear una categoría primero.";
    }

    if (!newProduct.codigo || !newProduct.codigo.trim()) {
      errors.codigo = "El Código Único / SKU Base es obligatorio.";
    }

    if (newProduct.price === undefined || isNaN(newProduct.price)) {
      errors.price = "El precio de venta es obligatorio.";
    } else if (newProduct.price <= 0) {
      errors.price = "El precio debe ser un número mayor a 0.";
    }

    if (newProduct.stock === undefined || isNaN(newProduct.stock)) {
      errors.stock = "El stock físico es obligatorio.";
    } else if (newProduct.stock < 0) {
      errors.stock = "El stock no puede ser un número negativo.";
    }

    if (Object.keys(errors).length > 0) {
      setNewProductErrors(errors);
      return;
    }

    setNewProductErrors({});

    const comboStocks = newProduct.isCombo
      ? getComboDynamicStocksAdmin(newProduct.comboComponents || [], newProduct.variants || [])
      : { stockPinamar: 0, stockMontevideo: 0, stockTotal: 0, updatedVariants: [] };
    const preparedVariants = newProduct.isCombo
      ? comboStocks.updatedVariants
      : newProduct.variants && newProduct.variants.length > 0
      ? newProduct.variants.map((v) => ({
          ...v,
          stockPinamar: Number(v.stockPinamar || 0),
          stockMontevideo: 0,
          stock: Number(v.stockPinamar || 0)
        }))
      : [];
    const finalStockPinamar = newProduct.isCombo
      ? comboStocks.stockPinamar
      : preparedVariants.length > 0
      ? preparedVariants.reduce((sum, v) => sum + v.stockPinamar, 0)
      : Number(newProduct.stockPinamar || 0);
    const finalStockMontevideo = newProduct.isCombo ? comboStocks.stockMontevideo : 0;
    const finalStockTotal = newProduct.isCombo ? comboStocks.stockTotal : finalStockPinamar;

    const created: Product = {
      id: "prod-" + Date.now(),
      codigo: newProduct.codigo || "",
      name: newProduct.name!.trim(),
      description: newProduct.description || "",
      price: Number(newProduct.price || 0),
      originalPrice: newProduct.originalPrice ? Number(newProduct.originalPrice) : undefined,
      category: actualCategory,
      categoria_id: actualCategoryId,
      subcategoria_id: newProduct.subcategoria_id || "all",
      categorias_adicionales: newProduct.categorias_adicionales || [],
      subcategorias_adicionales: newProduct.subcategorias_adicionales || [],
      imageUrl:
        newProduct.imageUrl ||
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80",
      stock: finalStockTotal,
      featured: !!newProduct.featured,
      is3D: !!newProduct.is3D,
      hoursPerUnit: newProduct.hoursPerUnit,
      consultOnly: !!newProduct.consultOnly,
      createdAt: new Date().toISOString(),
      sizes: newProduct.sizes || [],
      colors: newProduct.colors || [],
      variants: preparedVariants,
      imagenes: newProduct.imagenes || [],
      isCombo: !!newProduct.isCombo,
      comboComponents: newProduct.comboComponents || [],
      precioCompra: Number(newProduct.precioCompra || 0),
      precioCon40: Number(newProduct.precioCon40 || 0),
      comisionML: Number(newProduct.comisionML || 0),
      comisionMP: Number(
        newProduct.comisionMP !== undefined ? newProduct.comisionMP : (Number(newProduct.precioWeb || 0) * 0.12).toFixed(2)
      ),
      precioVentaML: Number(newProduct.precioVentaML || 0),
      precioWeb: Number(newProduct.precioWeb || 0),
      descuentoPorcentaje: Number(newProduct.descuentoPorcentaje || 0),
      stockPinamar: finalStockPinamar,
      stockMontevideo: finalStockMontevideo,
      stockTotalActual: finalStockTotal,
      sizeChartEnabled: newProduct.sizeChartEnabled !== false,
      sizeChartShowSuperior: newProduct.sizeChartShowSuperior !== false,
      sizeChartShowInferior: newProduct.sizeChartShowInferior !== false,
      sizeChartShowCalzado: newProduct.sizeChartShowCalzado !== false,
      sizeChartShowRecommender: newProduct.sizeChartShowRecommender !== false,
      sizeChartData: newProduct.sizeChartData || {
        columns: ["Talle", "Sisa / Ancho (cm)", "Largo Total (cm)"],
        rows: []
      }
    };

    const skuConflict = checkDuplicateSKU(created, true);
    if (skuConflict) {
      showAdminToast(skuConflict, "error");
      setNewProductErrors({ codigo: skuConflict });
      return;
    }

    const updatedProducts = [created, ...store.products];
    const updatedState = { ...store, products: updatedProducts };

    const success = await saveStateToServer(updatedState);
    if (success) {
      showAdminToast("¡Producto creado con éxito! 🚀", "success");
      setIsNewProductMode(false);
      setNewProduct({
        codigo: getNextAutoSKU(updatedState.products),
        name: "",
        description: "",
        price: 0,
        originalPrice: undefined,
        category: (store.dbCategories || [])[0]?.nombre || "",
        categoria_id: (store.dbCategories || [])[0]?.id || "",
        subcategoria_id: "all",
        categorias_adicionales: [],
        subcategorias_adicionales: [],
        imageUrl: "",
        stock: 0,
        featured: false,
        consultOnly: false,
        sizes: [],
        colors: [],
        variants: [],
        imagenes: [],
        precioCompra: 0,
        precioCon40: 0,
        comisionML: 0,
        comisionMP: 0,
        precioVentaML: 0,
        precioWeb: 0,
        calcWebPriceFromML: true,
        descuentoPorcentaje: 0,
        stockPinamar: 0,
        stockMontevideo: 0,
        stockTotalActual: 0
      });
    } else {
      showAdminToast("Error al guardar el nuevo producto.", "error");
    }
  };

  const handleUpdateProduct = async (e?: any) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!editingProduct) return;

    if (!editingProduct.name || !editingProduct.name.trim()) {
      showAdminToast("El nombre del producto es obligatorio.", "error");
      return;
    }

    if (!editingProduct.codigo || !editingProduct.codigo.trim()) {
      showAdminToast("El Código Único / SKU Base es obligatorio.", "error");
      return;
    }

    const skuConflict = checkDuplicateSKU(editingProduct, false);
    if (skuConflict) {
      showAdminToast(skuConflict, "error");
      return;
    }

    let finalProduct = { ...editingProduct };
    if (editingProduct.isCombo) {
      const comboStocks = getComboDynamicStocksAdmin(editingProduct.comboComponents || [], editingProduct.variants || []);
      finalProduct.stockPinamar = comboStocks.stockPinamar;
      finalProduct.stockMontevideo = comboStocks.stockMontevideo;
      finalProduct.stock = comboStocks.stockTotal;
      finalProduct.stockTotalActual = comboStocks.stockTotal;
      finalProduct.variants = comboStocks.updatedVariants;
    }

    const updatedProducts = store.products.map((p) => (String(p.id) === String(finalProduct.id) ? finalProduct : p));
    const updatedState = { ...store, products: updatedProducts };
    const success = await saveStateToServer(updatedState);
    if (success) {
      showAdminToast("¡Modificaciones guardadas correctamente! 💾", "success");
      setEditingProduct(null);
    } else {
      showAdminToast("Error al guardar las modificaciones del producto.", "error");
    }
  };

  const handleDeleteProduct = (productId: string | number) => {
    showCustomConfirm("Eliminar Producto", "¿Estás seguro de que deseas eliminar este producto?", async () => {
      const updatedProducts = store.products.filter((p) => String(p.id) !== String(productId));
      const updatedState = { ...store, products: updatedProducts };
      setStore(updatedState);
      const success = await saveStateToServer(updatedState);
      if (success) {
        showAdminToast("¡Producto eliminado correctamente! 🗑️", "success");
      } else {
        showAdminToast("Error al persistir la eliminación en el servidor.", "error");
      }
    });
  };

  const handleTogglePause = async (productId: string | number) => {
    const originalProducts = store.products;
    const updatedProducts = store.products.map((p) =>
      String(p.id) === String(productId) ? { ...p, paused: !p.paused } : p
    );
    const updatedState = { ...store, products: updatedProducts };
    setStore(updatedState);
    const success = await saveStateToServer(updatedState, true);
    if (success) {
      showAdminToast("Estado de pausa actualizado correctamente.", "success");
    } else {
      setStore({ ...store, products: originalProducts });
      showAdminToast("Error al guardar en el servidor. Revertiendo cambio.", "error");
    }
  };

  const handleToggleFeatured = async (productId: string | number) => {
    const originalProducts = store.products;
    const updatedProducts = store.products.map((p) =>
      String(p.id) === String(productId) ? { ...p, featured: !p.featured } : p
    );
    const updatedState = { ...store, products: updatedProducts };
    setStore(updatedState);
    const success = await saveStateToServer(updatedState, true);
    if (success) {
      showAdminToast("Estado destacado actualizado correctamente. ⭐", "success");
    } else {
      setStore({ ...store, products: originalProducts });
      showAdminToast("Error al guardar en el servidor. Revertiendo cambio.", "error");
    }
  };

  const handleUpdateStockItem = async (item: any, field: string, value: any, reasonStr?: string): Promise<boolean> => {
    let originalStock = 0;
    if (field === "stockMontevideo") {
      originalStock = Number(item.stockMontevideo) || 0;
    } else if (field === "stockPinamar") {
      originalStock = Number(item.stockPinamar) || 0;
    }

    const numValue = Math.max(0, Math.round(parseInt(value) || 0));

    const updatedProducts = store.products.map((p) => {
      if (String(p.id) !== String(item.productId)) return p;

      const updatedProduct = { ...p };

      if (item.isVariant) {
        let variantUpdated = false;
        updatedProduct.variants = (updatedProduct.variants || []).map((v) => {
          const match =
            (item.variantId && v.id && String(v.id) === String(item.variantId)) ||
            (item.sku && v.sku && String(v.sku).trim().toUpperCase() === String(item.sku).trim().toUpperCase()) ||
            (!item.variantId && v.sku && item.sku && v.sku === item.sku);

          if (!match) return v;
          variantUpdated = true;
          const updatedVariant = { ...v };

          if (field === "stockMontevideo") {
            updatedVariant.stockMontevideo = numValue;
            updatedVariant.stock = (updatedVariant.stockMontevideo || 0) + (Number(updatedVariant.stockPinamar) || 0);
          } else if (field === "stockPinamar") {
            updatedVariant.stockPinamar = numValue;
            updatedVariant.stock = (Number(updatedVariant.stockMontevideo) || 0) + (updatedVariant.stockPinamar || 0);
          } else if (field === "price") {
            updatedVariant.price = Math.max(0, Math.round(parseFloat(value) || 0));
          }
          return updatedVariant;
        });

        if (!variantUpdated && updatedProduct.variants && updatedProduct.variants.length === 1) {
          const v = updatedProduct.variants[0];
          const updatedVariant = { ...v };
          if (field === "stockMontevideo") {
            updatedVariant.stockMontevideo = numValue;
            updatedVariant.stock = (updatedVariant.stockMontevideo || 0) + (Number(updatedVariant.stockPinamar) || 0);
          } else if (field === "stockPinamar") {
            updatedVariant.stockPinamar = numValue;
            updatedVariant.stock = (Number(updatedVariant.stockMontevideo) || 0) + (updatedVariant.stockPinamar || 0);
          }
          updatedProduct.variants = [updatedVariant];
        }

        updatedProduct.stockMontevideo = (updatedProduct.variants || []).reduce(
          (sum, v) => sum + (v.stockMontevideo || 0),
          0
        );
        updatedProduct.stockPinamar = (updatedProduct.variants || []).reduce((sum, v) => sum + (v.stockPinamar || 0), 0);
        updatedProduct.stock = (updatedProduct.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
        updatedProduct.stockTotalActual = updatedProduct.stock;

        if (field === "precioCompra") {
          updatedProduct.precioCompra = Math.max(0, Math.round(parseFloat(value) || 0));
        } else if (field === "precioVentaML") {
          updatedProduct.precioVentaML = Math.max(0, Math.round(parseFloat(value) || 0));
        } else if (field === "comisionML") {
          updatedProduct.comisionML = Math.max(0, Math.round(parseFloat(value) || 0));
        } else if (field === "comisionMP") {
          updatedProduct.comisionMP = Math.max(0, Math.round(parseFloat(value) || 0));
        }
      } else {
        if (field === "stockMontevideo") {
          updatedProduct.stockMontevideo = numValue;
          updatedProduct.stock = (updatedProduct.stockMontevideo || 0) + (Number(updatedProduct.stockPinamar) || 0);
          updatedProduct.stockTotalActual = updatedProduct.stock;
        } else if (field === "stockPinamar") {
          updatedProduct.stockPinamar = numValue;
          updatedProduct.stock = (Number(updatedProduct.stockMontevideo) || 0) + (updatedProduct.stockPinamar || 0);
          updatedProduct.stockTotalActual = updatedProduct.stock;
        } else if (field === "precioCompra") {
          updatedProduct.precioCompra = Math.max(0, Math.round(parseFloat(value) || 0));
        } else if (field === "price") {
          updatedProduct.price = Math.max(0, Math.round(parseFloat(value) || 0));
        } else if (field === "precioVentaML") {
          updatedProduct.precioVentaML = Math.max(0, Math.round(parseFloat(value) || 0));
        } else if (field === "comisionML") {
          updatedProduct.comisionML = Math.max(0, Math.round(parseFloat(value) || 0));
        } else if (field === "comisionMP") {
          updatedProduct.comisionMP = Math.max(0, Math.round(parseFloat(value) || 0));
        }

        if (updatedProduct.variants && updatedProduct.variants.length === 1) {
          const v = { ...updatedProduct.variants[0] };
          v.stockMontevideo = updatedProduct.stockMontevideo;
          v.stockPinamar = updatedProduct.stockPinamar;
          v.stock = updatedProduct.stock;
          updatedProduct.variants = [v];
        }
      }

      return updatedProduct;
    });

    let updatedAdjustments = store.stockAdjustments || [];
    if (field === "stockMontevideo" || field === "stockPinamar") {
      const adjustment: StockAdjustment = {
        id: `ADJ-${Date.now()}-${Math.floor(Math.random() * 900) + 100}`,
        sku: item.sku || "SIN-SKU",
        productName: item.name,
        variantName: item.variantName || undefined,
        deposito: field === "stockMontevideo" ? "Montevideo" : "Pinamar",
        stockAnterior: originalStock,
        stockNuevo: numValue,
        motivo: reasonStr || "Ajuste Directo de Almacén",
        usuario: "Administrador",
        createdAt: new Date().toISOString()
      };
      updatedAdjustments = [adjustment, ...updatedAdjustments];
    }

    const updatedState = {
      ...store,
      products: updatedProducts,
      stockAdjustments: updatedAdjustments
    };

    setStore(updatedState);
    if (field === "stockMontevideo") item.stockMontevideo = numValue;
    if (field === "stockPinamar") item.stockPinamar = numValue;

    const activeToken = authToken || localStorage.getItem("apex_admin_token");
    if ((field === "stockMontevideo" || field === "stockPinamar") && activeToken) {
      try {
        const res = await fetch("/api/stock/adjust", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`
          },
          body: JSON.stringify({
            productId: item.productId,
            variantId: item.variantId,
            sku: item.sku,
            field,
            value: numValue,
            reason: reasonStr
          })
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.state) {
            setStore(resData.state);
          }
          return true;
        }
      } catch (e) {
        console.warn("Stock fast-adjust fallback triggered:", e);
      }
    }

    return await saveStateToServer(updatedState, true);
  };

  const requestStockAdjustment = (item: any, field: string, newValue: number) => {
    if (item.productObj?.isCombo) {
      showToast("No se puede ajustar directamente el stock de un artículo compuesto (combo).", "error");
      return;
    }
    const currentVal = field === "stockMontevideo" ? item.stockMontevideo || 0 : item.stockPinamar || 0;
    const targetVal = Math.max(0, Math.round(newValue !== undefined ? newValue : currentVal));
    setPendingStockItem(item);
    setPendingStockField(field);
    setPendingStockValue(targetVal);
    if (targetVal > currentVal) {
      setStockAdjustmentReason("Ingreso / Recepción de mercadería");
    } else if (targetVal < currentVal) {
      setStockAdjustmentReason("Venta directa en mostrador / Local");
    } else {
      setStockAdjustmentReason("Auditoría / Conteo Físico Conforme");
    }
    setCustomStockAdjustmentReason("");
    setShowStockAdjustmentModal(true);
  };

  const handleGenerateRandomCouponCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const prefixes = ["JUEM", "DESCUENTO", "PROMO", "SALE", "COUPON", "UYU", "REGALO"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let randomSuffix = "";
    for (let i = 0; i < 4; i++) {
      randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `${randomPrefix}${randomSuffix}`;
    setNewCouponCode(code);
    showAdminToast(`Código generado: ${code}`, "success");
  };

  const handleStartEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setEditCouponCode(coupon.code);
    setEditCouponType(coupon.discount_type || "percentage");
    setEditCouponDiscount(coupon.discount_percent || 10);
    setEditCouponAmount(coupon.discount_amount || 200);
    if (coupon.expiration_date) {
      const d = new Date(coupon.expiration_date);
      setEditCouponExpiration(d.toISOString().split("T")[0]);
    } else {
      setEditCouponExpiration("");
    }
    setEditCouponMaxUses(coupon.max_uses ? String(coupon.max_uses) : "");
    setEditCouponActive(coupon.active !== false);
  };

  const handleSaveEditCoupon = (e: FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;
    const newCode = editCouponCode.trim().toUpperCase();
    if (!newCode) {
      showAdminToast("El código del cupón es obligatorio", "error");
      return;
    }

    if (newCode !== editingCoupon.code.toUpperCase()) {
      const exists = (store.coupons || []).some((c) => c.code.toUpperCase() === newCode);
      if (exists) {
        showAdminToast(`El código ${newCode} ya pertenece a otro cupón`, "error");
        return;
      }
    }

    if (editCouponType === "percentage") {
      if (editCouponDiscount <= 0 || editCouponDiscount > 100) {
        showAdminToast("El porcentaje debe estar entre 1 y 100", "error");
        return;
      }
    } else if (editCouponType === "fixed") {
      if (editCouponAmount <= 0) {
        showAdminToast("El monto fijo debe ser mayor a $0", "error");
        return;
      }
    }

    const maxUsesInt = editCouponMaxUses ? parseInt(editCouponMaxUses, 10) : undefined;

    const updatedCoupon: Coupon = {
      ...editingCoupon,
      code: newCode,
      discount_type: editCouponType,
      discount_percent: editCouponType === "percentage" ? Number(editCouponDiscount) : 0,
      discount_amount: editCouponType === "fixed" ? Number(editCouponAmount) : 0,
      expiration_date: editCouponExpiration ? new Date(`${editCouponExpiration}T23:59:59`).toISOString() : undefined,
      active: editCouponActive,
      max_uses: maxUsesInt && !isNaN(maxUsesInt) ? maxUsesInt : undefined
    };

    const updatedCoupons = (store.coupons || []).map((c) => (c.code === editingCoupon.code ? updatedCoupon : c));
    const updatedState = { ...store, coupons: updatedCoupons };
    saveStateToServer(updatedState);
    setEditingCoupon(null);
    showAdminToast("¡Cupón modificado con éxito!", "success");
  };

  const handleAddCoupon = (e: FormEvent) => {
    e.preventDefault();
    const code = newCouponCode.trim().toUpperCase();
    if (!code) {
      showAdminToast("El código del cupón es obligatorio", "error");
      return;
    }

    if (newCouponType === "percentage" && (newCouponDiscount <= 0 || newCouponDiscount > 100)) {
      showAdminToast("El porcentaje de descuento debe estar entre 1 y 100", "error");
      return;
    }
    if (newCouponType === "fixed" && newCouponAmount <= 0) {
      showAdminToast("El monto fijo debe ser mayor a $0", "error");
      return;
    }

    const exists = (store.coupons || []).some((c) => c.code.toUpperCase() === code);
    if (exists) {
      showAdminToast("Este código de cupón ya existe", "error");
      return;
    }

    const maxUsesInt = newCouponMaxUses ? parseInt(newCouponMaxUses, 10) : undefined;

    const newC: Coupon = {
      code,
      discount_type: newCouponType,
      discount_percent: newCouponType === "percentage" ? Number(newCouponDiscount) : 0,
      discount_amount: newCouponType === "fixed" ? Number(newCouponAmount) : 0,
      expiration_date: newCouponExpiration ? new Date(`${newCouponExpiration}T23:59:59`).toISOString() : undefined,
      active: true,
      max_uses: maxUsesInt && !isNaN(maxUsesInt) ? maxUsesInt : undefined,
      uses_count: 0
    };

    const updatedCoupons = [...(store.coupons || []), newC];
    const updatedState = { ...store, coupons: updatedCoupons };
    saveStateToServer(updatedState);
    setNewCouponCode("");
    setNewCouponType("percentage");
    setNewCouponDiscount(10);
    setNewCouponAmount(200);
    setNewCouponExpiration("");
    setNewCouponMaxUses("");
    showAdminToast("¡Cupón agregado con éxito!", "success");
  };

  const handleDeleteCoupon = (code: string) => {
    showCustomConfirm("Eliminar Cupón", `¿Estás seguro de que deseas eliminar el cupón ${code}?`, () => {
      const updatedCoupons = (store.coupons || []).filter((c) => c.code !== code);
      const updatedState = { ...store, coupons: updatedCoupons };
      saveStateToServer(updatedState);
      showAdminToast("¡Cupón eliminado correctamente!", "success");
    });
  };

  const handleAddCategory = (e: FormEvent) => {
    e.preventDefault();
    const nombre = newCategoryName.trim();
    if (!nombre) return;

    const id = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    if (!id) {
      showCustomAlert("Error de Categoría", "Nombre de categoría no válido.");
      return;
    }

    const exists = (store.dbCategories || []).some(
      (c) => c.id === id || c.nombre.toLowerCase() === nombre.toLowerCase()
    );
    if (exists) {
      showCustomAlert("Categoría Existente", "Esta categoría principal ya existe.");
      return;
    }

    const newCat: Category = {
      id,
      nombre,
      icono: newCategoryIcon,
      orden: Number(newCategoryOrder) || (store.dbCategories || []).length + 1,
      active: true,
      hide_on_home: newCategoryHideOnHome
    };

    const updatedDbCategories = [...(store.dbCategories || []), newCat];
    const updatedCategories = [...store.categories, nombre];
    const updatedState = {
      ...store,
      categories: updatedCategories,
      dbCategories: updatedDbCategories
    };

    saveStateToServer(updatedState);
    setNewCategoryName("");
    setNewCategoryIcon("Shirt");
    setNewCategoryOrder((store.dbCategories || []).length + 2);
    setNewCategoryHideOnHome(false);
  };

  const handleUpdateDynamicCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const nombre = editingCategory.nombre.trim();
    if (!nombre) return;

    const updatedDbCategories = (store.dbCategories || []).map((c) =>
      c.id === editingCategory.id ? editingCategory : c
    );

    const oldCatName = (store.dbCategories || []).find((c) => c.id === editingCategory.id)?.nombre || "";
    const updatedCategories = store.categories.map((c) => (c === oldCatName ? nombre : c));

    const updatedProducts = store.products.map((p) => {
      if (p.categoria_id === editingCategory.id || p.category === oldCatName) {
        return { ...p, category: nombre, categoria_id: editingCategory.id };
      }
      return p;
    });

    const updatedState = {
      ...store,
      products: updatedProducts,
      categories: updatedCategories,
      dbCategories: updatedDbCategories
    };

    saveStateToServer(updatedState);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (catIdOrName: string) => {
    const catObj = (store.dbCategories || []).find((c) => c.id === catIdOrName || c.nombre === catIdOrName);
    const catId = catObj ? catObj.id : catIdOrName;
    const catName = catObj ? catObj.nombre : catIdOrName;

    const assignedProducts = store.products.filter(
      (p) =>
        p.categoria_id === catId ||
        p.category === catName ||
        (p.categorias_adicionales && p.categorias_adicionales.includes(catId))
    );
    const hasProducts = assignedProducts.length > 0;

    const subcatsToDelete = (store.dbSubcategories || []).filter((s) => s.categoria_id === catId);
    const subcatIds = subcatsToDelete.map((s) => s.id);

    let confirmMsg = `¿Estás seguro de que deseas eliminar la categoría "${catName}"? Esto eliminará también todas sus subcategorías asociadas de forma irreversible.`;
    if (hasProducts) {
      confirmMsg = `La categoría "${catName}" tiene ${assignedProducts.length} producto(s) asignado(s). Si la eliminas, estos productos se desvincularán automáticamente de esta categoría y de sus subcategorías asociadas. ¿Deseas continuar?`;
    }

    showCustomConfirm("Eliminar Categoría", confirmMsg, () => {
      const updatedProducts = store.products.map((p) => {
        const updated = { ...p };
        let changed = false;

        if (p.categoria_id === catId || p.category === catName) {
          updated.categoria_id = "";
          updated.category = "";
          changed = true;
        }
        if (p.categorias_adicionales && p.categorias_adicionales.includes(catId)) {
          updated.categorias_adicionales = p.categorias_adicionales.filter((id) => id !== catId);
          changed = true;
        }
        if (p.subcategoria_id && subcatIds.includes(p.subcategoria_id)) {
          updated.subcategoria_id = "all";
          changed = true;
        }
        if (p.subcategorias_adicionales && p.subcategorias_adicionales.some((id) => subcatIds.includes(id))) {
          updated.subcategorias_adicionales = p.subcategorias_adicionales.filter((id) => !subcatIds.includes(id));
          changed = true;
        }
        return changed ? updated : p;
      });

      const updatedDbCategories = (store.dbCategories || []).filter((c) => c.id !== catId);
      const updatedDbSubcategories = (store.dbSubcategories || []).filter((s) => s.categoria_id !== catId);
      const updatedCategories = store.categories.filter((c) => c !== catName);

      const updatedState = {
        ...store,
        products: updatedProducts,
        categories: updatedCategories,
        dbCategories: updatedDbCategories,
        dbSubcategories: updatedDbSubcategories
      };

      saveStateToServer(updatedState);
      showAdminToast("¡Categoría y subcategorías asociadas eliminadas correctamente!", "success");
    });
  };

  const handleDragReorderCategory = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const cats = [...(store.dbCategories || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const draggedIndex = cats.findIndex((c) => c.id === draggedId);
    const targetIndex = cats.findIndex((c) => c.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedItem] = cats.splice(draggedIndex, 1);
    cats.splice(targetIndex, 0, draggedItem);
    const remapped = cats.map((c, i) => ({ ...c, orden: i + 1 }));

    saveStateToServer({
      ...store,
      dbCategories: remapped
    });
  };

  const handleCreateSubcategory = (e: FormEvent) => {
    e.preventDefault();
    const nombre = newSubcategoryName.trim();
    if (!nombre) return;
    if (!newSubcategoryParent) {
      showCustomAlert("Falta Categoría", "Por favor selecciona una categoría principal para esta subcategoría.");
      return;
    }

    const id = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    if (!id) {
      showCustomAlert("Error de Subcategoría", "Nombre de subcategoría no válido.");
      return;
    }

    const exists = (store.dbSubcategories || []).some(
      (s) => s.categoria_id === newSubcategoryParent && (s.id === id || s.nombre.toLowerCase() === nombre.toLowerCase())
    );
    if (exists) {
      showCustomAlert("Subcategoría Existente", "Esta subcategoría ya existe en la categoría seleccionada.");
      return;
    }

    const newSub: Subcategory = {
      id,
      nombre,
      categoria_id: newSubcategoryParent
    };

    const updatedDbSubcategories = [...(store.dbSubcategories || []), newSub];
    const updatedState = { ...store, dbSubcategories: updatedDbSubcategories };
    saveStateToServer(updatedState);
    setNewSubcategoryName("");
    showAdminToast("¡Subcategoría creada con éxito!", "success");
  };

  const handleUpdateSubcategory = (e: FormEvent) => {
    e.preventDefault();
    if (!editingSubcategory) return;
    const nombre = editingSubcategory.nombre.trim();
    if (!nombre) return;

    const updatedDbSubcategories = (store.dbSubcategories || []).map((s) =>
      s.id === editingSubcategory.id ? editingSubcategory : s
    );

    const updatedState = { ...store, dbSubcategories: updatedDbSubcategories };
    saveStateToServer(updatedState);
    setEditingSubcategory(null);
    showAdminToast("¡Subcategoría modificada con éxito!", "success");
  };

  const handleDeleteSubcategory = (subId: string) => {
    const subObj = (store.dbSubcategories || []).find((s) => s.id === subId);
    const subName = subObj ? subObj.nombre : subId;

    const assignedProducts = store.products.filter(
      (p) => p.subcategoria_id === subId || (p.subcategorias_adicionales && p.subcategorias_adicionales.includes(subId))
    );
    const hasProducts = assignedProducts.length > 0;

    let confirmMsg = `¿Estás seguro de que deseas eliminar la subcategoría "${subName}"?`;
    if (hasProducts) {
      confirmMsg = `La subcategoría "${subName}" tiene ${assignedProducts.length} producto(s) asignado(s). Si la eliminas, estos productos se desvincularán automáticamente de esta subcategoría. ¿Deseas continuar?`;
    }

    showCustomConfirm("Eliminar Subcategoría", confirmMsg, () => {
      const updatedProducts = store.products.map((p) => {
        const updated = { ...p };
        let changed = false;
        if (p.subcategoria_id === subId) {
          updated.subcategoria_id = "all";
          changed = true;
        }
        if (p.subcategorias_adicionales && p.subcategorias_adicionales.includes(subId)) {
          updated.subcategorias_adicionales = p.subcategorias_adicionales.filter((id) => id !== subId);
          changed = true;
        }
        return changed ? updated : p;
      });

      const updatedDbSubcategories = (store.dbSubcategories || []).filter((s) => s.id !== subId);
      const updatedState = {
        ...store,
        products: updatedProducts,
        dbSubcategories: updatedDbSubcategories
      };
      saveStateToServer(updatedState);
      showAdminToast("¡Subcategoría eliminada correctamente!", "success");
    });
  };

  const handleSaveSettings = () => {
    const updatedState = { ...store, settings: editingSettings };
    saveStateToServer(updatedState);
    showAdminToast("¡Todos los ajustes se han guardado con éxito! 💾", "success");
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch("/api/auth/google-reviews/url");
      if (!res.ok) {
        showAdminToast("Fallo al obtener la ruta de Google de tu servidor.", "error");
        return;
      }
      const { url } = await res.json();
      const authWindow = window.open(
        url,
        "google_oauth_popup",
        "width=580,height=720,status=no,resizable=yes,scrollbars=yes"
      );
      if (!authWindow) {
        showAdminToast(
          "⚠️ Ventana emergente bloqueada. Por favor, habilita las ventanas emergentes en tu navegador para conectar Tu Comercio.",
          "error"
        );
      }
    } catch (err) {
      console.error("Error initiating Google OAuth workflow:", err);
      showAdminToast("Ocurrió un error al contactar al servidor de autenticación Google.", "error");
    }
  };

  const handleSearchGooglePlace = async () => {
    if (!googlePlaceSearchQuery.trim()) {
      setGooglePlaceSearchError("Por favor ingresa el nombre de tu negocio para buscarlo.");
      return;
    }
    setGooglePlaceSearchLoading(true);
    setGooglePlaceSearchError("");
    setGooglePlaceSearchResults([]);
    try {
      const res = await fetch(`/api/google-places/search?query=${encodeURIComponent(googlePlaceSearchQuery)}`);
      if (!res.ok) {
        throw new Error("Respuesta de servidor inválida al buscar el local.");
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setGooglePlaceSearchResults(data.results);
        if (data.results.length === 0) {
          setGooglePlaceSearchError("No se encontraron coincidencias para este comercio.");
        }
      } else {
        setGooglePlaceSearchError(data.message || "Error al buscar el local en Google Maps.");
      }
    } catch (err: any) {
      console.error("Error searching Google Place ID:", err);
      setGooglePlaceSearchError(
        "Ocurrió un error de conexión al buscar en Google Maps. Asegúrate de configurar la Clave API de Google Places primero."
      );
    } finally {
      setGooglePlaceSearchLoading(false);
    }
  };

  const lowStockThresholdSetting = typeof store.settings?.lowStockThreshold === "number" ? store.settings.lowStockThreshold : 5;
  const outOfStockProducts = displayProducts.filter((p) => p.active !== false && getProductAvailableStock(p) <= 0);
  const lowStockProducts = displayProducts.filter((p) => {
    const st = getProductAvailableStock(p);
    return p.active !== false && st > 0 && st <= lowStockThresholdSetting;
  });
  const totalStockAlerts = outOfStockProducts.length + lowStockProducts.length;

  const isChristmasTheme =
    store.settings?.activeTheme === "navidad" ||
    (editingSettings?.activeTheme === "navidad" && activeTab === "admin") ||
    (store.settings?.primaryColor?.toLowerCase() === "#e11d48" &&
      store.settings?.accentColor?.toLowerCase() === "#10b981");

  const shouldRenderAdminConsole =
    activeTab === "admin" || cloudinarySelectorConfig?.isOpen || (showStockAdjustmentModal && pendingStockItem);

  return (
    <>
      {shouldRenderAdminConsole && (
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#D4A55A] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <AdminConsole
            ctx={{
              activeTab,
              adminProductCategoryFilter,
              adminProductFeaturedFilter,
              adminProductSearchQuery,
              adminProductStatusFilter,
              adminProductStockFilter,
              adminProductsPage,
              adminSection,
              adminTasks,
              authToken,
              bannerProductSearch,
              calculateMargins,
              cloudinarySelectorConfig,
              customStockAdjustmentReason,
              dragOverCategoryId,
              draggedCategoryId,
              editAddProductId,
              editAddQty,
              editAddVariantId,
              editCouponActive,
              editCouponAmount,
              editCouponCode,
              editCouponDiscount,
              editCouponExpiration,
              editCouponMaxUses,
              editCouponType,
              editFilterOnlyWithStock,
              editProductErrors,
              editSearchProduct,
              editShowSuggestions,
              editSubSecCategoryFilter,
              editTransferItems,
              editVarColor,
              editVarSize,
              editingCategory,
              editingCoupon,
              editingProduct,
              editingProductStep,
              editingSettings,
              editingSubcategory,
              emailLogs,
              emailLogsLoading,
              emailPreviewTab,
              executeBulkStockTransfer,
              expandedCategoryIds,
              fetchAdminTasks,
              fetchEmailLogs,
              fetchStockTransfers,
              fetchStoreData,
              filteredAdminProducts,
              getComboDynamicStocks: getComboDynamicStocksAdmin,
              getComboPurchaseCost,
              getNextAutoSKU,
              getProductActualStock,
              getSmartVariantSku,
              googlePlaceSearchError,
              googlePlaceSearchLoading,
              googlePlaceSearchQuery,
              googlePlaceSearchResults,
              groupedStockTransfers,
              handleAddCategory,
              handleAddCoupon,
              handleAddProductToTransfer,
              handleCancelEditTransfer,
              handleClearEmailLogs,
              handleCreateProduct,
              handleCreateSubcategory,
              handleDeleteCategory,
              handleDeleteCoupon,
              handleDeleteProduct,
              handleDeleteSubcategory,
              handleDragReorderCategory,
              handleGenerateRandomCouponCode,
              handleGoogleConnect,
              handleLoginSubmit,
              handleRemoveTransferItem,
              handleSaveEditCoupon,
              handleSaveSettings,
              handleSaveTransferModifications,
              handleSearchGooglePlace,
              handleSendTestEmail,
              handleStartEditCategory,
              handleStartEditCoupon,
              handleStartEditSubcategory,
              handleStartEditTransfer,
              handleToggleFeatured,
              handleTogglePause,
              handleUpdateDynamicCategory,
              handleUpdateItemQty,
              handleUpdateProduct,
              handleUpdateStockItem,
              handleUpdateSubcategory,
              hasUnsavedTransferEdits,
              isAureaAccordionOpen,
              isChristmasTheme,
              isEditingTransfer,
              isJuemAccordionOpen,
              isNavidadAccordionOpen,
              isNewProductMode,
              isSavingTransferEdit,
              isTransferModalMaximized,
              loginError,
              mobileAdminMenuOpen,
              navigateAdminSection,
              navigateToProductRoute,
              newCategoryIcon,
              newCategoryName,
              newCategoryOrder,
              newCouponAmount,
              newCouponCode,
              newCouponDiscount,
              newCouponExpiration,
              newCouponMaxUses,
              newCouponType,
              newProduct,
              newProductErrors,
              newProductStep,
              newSubSecCategoryFilter,
              newSubcategoryName,
              newSubcategoryParent,
              newVarColor,
              newVarSize,
              outOfStockProducts,
              passwordInput,
              pendingStockField,
              pendingStockItem,
              pendingStockValue,
              prepareProductForEditing,
              requestStockAdjustment,
              revertStockTransfer,
              salesInitialFilter,
              salesInitialOrderId,
              saveStateToServer,
              saving,
              scrollAdminToTop,
              selectedTransferGroup,
              sendingTest,
              setAdminProductCategoryFilter,
              setAdminProductFeaturedFilter,
              setAdminProductSearchQuery,
              setAdminProductStatusFilter,
              setAdminProductStockFilter,
              setAdminProductsPage,
              setAuthToken,
              setBannerProductSearch,
              setCloudinarySelectorConfig,
              setCustomStockAdjustmentReason,
              setDragOverCategoryId,
              setDraggedCategoryId,
              setEditAddProductId,
              setEditAddQty,
              setEditAddVariantId,
              setEditCouponActive,
              setEditCouponAmount,
              setEditCouponCode,
              setEditCouponDiscount,
              setEditCouponExpiration,
              setEditCouponMaxUses,
              setEditCouponType,
              setEditFilterOnlyWithStock,
              setEditProductErrors,
              setEditSearchProduct,
              setEditShowSuggestions,
              setEditSubSecCategoryFilter,
              setEditVarColor,
              setEditVarSize,
              setEditingCategory,
              setEditingCoupon,
              setEditingProduct,
              setEditingProductStep,
              setEditingSettings,
              setEditingSubcategory,
              setEmailPreviewTab,
              setExpandedCategoryIds,
              setGooglePlaceSearchQuery,
              setIsAureaAccordionOpen,
              setIsEditingTransfer,
              setIsJuemAccordionOpen,
              setIsNavidadAccordionOpen,
              setIsNewProductMode,
              setIsTransferModalMaximized,
              setLightboxImage,
              setMobileAdminMenuOpen,
              setNewCategoryIcon,
              setNewCategoryName,
              setNewCategoryOrder,
              setNewCouponAmount,
              setNewCouponCode,
              setNewCouponDiscount,
              setNewCouponExpiration,
              setNewCouponMaxUses,
              setNewCouponType,
              setNewProduct,
              setNewProductErrors,
              setNewProductStep,
              setNewSubSecCategoryFilter,
              setNewSubcategoryName,
              setNewSubcategoryParent,
              setNewVarColor,
              setNewVarSize,
              setPasswordInput,
              setPendingStockField,
              setPendingStockItem,
              setPendingStockValue,
              setSalesInitialFilter,
              setSalesInitialOrderId,
              setSelectedTransferGroup,
              setShowLoginPassword,
              setShowMpAccessToken,
              setShowMpPublicKey,
              setShowStockAdjustmentModal,
              setStockAdjustmentReason,
              setStockFilterTab,
              setStockMarginFilter,
              setStockPage,
              setStockSearchQuery,
              setStockSubSection,
              setStore,
              setTestEmailAddress,
              setTraceabilityProductId,
              setTraceabilitySku,
              setTransferFrom,
              setTransferHistorySearch,
              setTransferItems,
              setTransferProductId,
              setTransferQty,
              setTransferSearchQuery,
              setTransferStep,
              setTransferStockAlert,
              setTransferTo,
              setTransferVariantId,
              setUploadingEmailHeader,
              setUploadingLogo,
              setUploadingSlideIdx,
              setUsernameInput,
              showAdminToast,
              showLoginPassword,
              showMpAccessToken,
              showMpPublicKey,
              showStockAdjustmentModal,
              showToast,
              sortDirection,
              sortField,
              stockAdjustmentReason,
              stockCostFilter,
              stockLocalFilter,
              stockMarginFilter,
              stockMlFilter,
              stockMvdFilter,
              stockNameFilter,
              stockPage,
              stockPinFilter,
              stockSearchQuery,
              stockSkuFilter,
              stockSubSection,
              store,
              syncStatus,
              testEmailAddress,
              toggleSort,
              totalStockAlerts,
              traceabilityProductId,
              traceabilitySku,
              transferBackdropMouseDownRef,
              transferFrom,
              transferHistorySearch,
              transferItems,
              transferProductId,
              transferQty,
              transferSearchQuery,
              transferStep,
              transferStockAlert,
              transferTo,
              transferVariantId,
              transfersLoading,
              updateProductCalculations,
              uploadingEmailHeader,
              uploadingLogo,
              uploadingSlideIdx,
              usernameInput
            }}
          />
        </Suspense>
      )}

      {customAlert && customAlert.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in animate-duration-150">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-500">
              <span className="p-2 bg-amber-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5" />
              </span>
              <h4 className="font-bold text-sm text-slate-950 dark:text-white uppercase tracking-wider">
                {customAlert.title}
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-semibold">{customAlert.message}</p>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {customConfirm && customConfirm.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in animate-duration-150">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-zinc-800 dark:text-white">
              <span className="p-2 bg-neutral-500/10 rounded-lg">
                <HelpCircle className="h-5 w-5 text-blue-500" />
              </span>
              <h4 className="font-bold text-sm text-slate-950 dark:text-white uppercase tracking-wider">
                {customConfirm.title}
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-semibold">{customConfirm.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setCustomConfirm(null)}
                className="flex-1 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-800 dark:text-white font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(null);
                }}
                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md cursor-zoom-out animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row cursor-default"
          >
            <div className="relative flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden min-h-[260px] md:min-h-[400px]">
              {lightboxImage.src && (
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-25">
                  <img
                    src={lightboxImage.src}
                    alt=""
                    className="w-full h-full object-cover blur-2xl scale-125"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              {lightboxImage.src ? (
                <img
                  src={lightboxImage.src}
                  alt={lightboxImage.name}
                  className="relative z-10 max-h-[75vh] md:max-h-[80vh] w-full object-contain p-1 drop-shadow-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Package className="h-16 w-16 text-zinc-600" />
              )}
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition cursor-pointer md:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="w-full md:w-80 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                      Vista Detallada
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-zinc-100 mt-1 leading-snug">
                      {lightboxImage.name}
                    </h4>
                  </div>
                  <button
                    onClick={() => setLightboxImage(null)}
                    className="hidden md:flex bg-slate-200 hover:bg-slate-300 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-full p-1.5 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <hr className="border-slate-200 dark:border-zinc-800" />

                <div className="space-y-3">
                  {lightboxImage.sku && (
                    <div>
                      <span className="block text-[10px] text-zinc-400 uppercase font-semibold">SKU / Código</span>
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 py-1 px-2 rounded mt-1 inline-block">
                        {lightboxImage.sku}
                      </span>
                    </div>
                  )}

                  {lightboxImage.extraInfo && (
                    <div>
                      <span className="block text-[10px] text-zinc-400 uppercase font-semibold">Detalle</span>
                      <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium mt-1">
                        {lightboxImage.extraInfo}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 mt-6 flex flex-col gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = lightboxImage.src;
                    link.target = "_blank";
                    link.download = lightboxImage.name || "imagen";
                    link.click();
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs border border-slate-200 dark:border-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir en pestaña nueva</span>
                </button>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer"
                >
                  Cerrar Vista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
