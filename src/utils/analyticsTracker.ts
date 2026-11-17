import { CartItem, Product, SiteSettings } from "../types";

export function injectAnalyticsScripts(gaId: string, gtmId: string, pixelId: string) {
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
}

export function trackAnalyticsTransition(params: {
  settings: SiteSettings;
  activeTab: "storefront" | "admin" | "checkout";
  selectedProduct: Product | null;
  cart: CartItem[];
  generateSlug: (text: string) => string;
}) {
  const { settings, activeTab, selectedProduct, cart, generateSlug } = params;
  if (typeof window === "undefined") return;
  const w = window as any;

  const pixelId = settings?.metaPixelId;
  if (pixelId && w.fbq) {
    try {
      w.fbq("track", "PageView");
      if (activeTab === "checkout") {
        w.fbq("track", "InitiateCheckout", {
          content_ids: cart.map((c) => c.product.id),
          content_type: "product",
          value: cart.reduce((acc, c) => acc + c.product.price * c.quantity, 0),
          currency: "UYU"
        });
      }
      if (selectedProduct) {
        w.fbq("track", "ViewContent", {
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
  }

  const gaId = settings?.googleAnalyticsId;
  if (gaId && w.gtag) {
    const baseTitle = settings.siteTitle || "Ventas Juem";
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
      w.gtag("event", "page_view", {
        page_title: title,
        page_location: window.location.href,
        page_path: path
      });

      if (activeTab === "checkout") {
        w.gtag("event", "begin_checkout", {
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
        w.gtag("event", "view_item", {
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
  }
}

export function trackAddToCartEvents(params: {
  settings: SiteSettings;
  product: Product;
  qtyAdded: number;
  size?: string;
  color?: string;
}) {
  if (typeof window === "undefined") return;
  const w = window as any;
  const { settings, product, qtyAdded, size, color } = params;

  if (settings?.googleAnalyticsId && w.gtag) {
    try {
      w.gtag("event", "add_to_cart", {
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

  if (settings?.metaPixelId && w.fbq) {
    try {
      w.fbq("track", "AddToCart", {
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
}
