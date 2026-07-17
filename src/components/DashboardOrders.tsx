import React, { useState } from "react";
import { ShopState, Order, Product, ProductVariant } from "../types";
import { normalizeText } from "../utils/shopLogic.tsx";
import { 
  Search, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Phone, 
  Mail, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  ShoppingBag,
  ExternalLink,
  Tag as TagIcon,
  Trash2,
  Plus,
  X,
  Percent,
  Store,
  Filter,
  ArrowRight,
  User,
  MapPin,
  AlertCircle,
  Edit,
  Truck
} from "lucide-react";

interface DashboardOrdersProps {
  store: ShopState;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  onOrderCreated?: (newOrder: Order) => void;
  onOrderUpdated?: (updatedOrder: Order) => void;
  onRefreshStore?: () => Promise<void>;
}

export const DashboardOrders: React.FC<DashboardOrdersProps> = ({ 
  store, 
  onUpdateStatus, 
  onDeleteOrder,
  onOrderCreated,
  onOrderUpdated,
  onRefreshStore
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const nowRef = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(nowRef.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(nowRef.getFullYear());
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New sale modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [newSaleCustomerName, setNewSaleCustomerName] = useState("Cliente WhatsApp / Consumidor final");
  const [newSaleCustomerEmail, setNewSaleCustomerEmail] = useState("");
  const [newSaleCustomerPhone, setNewSaleCustomerPhone] = useState("");
  const [newSaleCustomerAddress, setNewSaleCustomerAddress] = useState("");
  const [newSaleDeliveryHours, setNewSaleDeliveryHours] = useState("");
  const [newSaleShippingStatus, setNewSaleShippingStatus] = useState<string>("Pendiente");
  const [newSaleShippingCost, setNewSaleShippingCost] = useState<number>(0);
  const [newSaleCouponCode, setNewSaleCouponCode] = useState("");
  const [newSaleNotes, setNewSaleNotes] = useState("");
  const [newSaleDeposito, setNewSaleDeposito] = useState<"Pinamar" | "Montevideo">("Pinamar");
  const [newSaleCanal, setNewSaleCanal] = useState("WhatsApp");
  const [newSaleStatus, setNewSaleStatus] = useState<"pago_aprobado" | "pago_pendiente" | "pago_rechazado">("pago_aprobado");
  const [newSaleBypassStockDeduction, setNewSaleBypassStockDeduction] = useState(false);
  const [newSaleDate, setNewSaleDate] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
  });
  const [newSaleItems, setNewSaleItems] = useState<any[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSubmittingNewSale, setIsSubmittingNewSale] = useState(false);
  const [newSaleErrorMessage, setNewSaleErrorMessage] = useState<string | null>(null);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState<string | null>(null);

  const orders: Order[] = store.orders || [];
  const productsList: Product[] = store.products || [];

  // Formula helper to compute cost, net profit, and shipping cost for an order
  const getOrderCostAndProfit = (order: Order, products: Product[]) => {
    let totalCost = 0;
    let totalComisionML = 0;
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        const prod = products.find(p => String(p.id) === String(item.productId));
        const itemCostPerUnit = prod?.precioCompra || 0;
        totalCost += (item.quantity * itemCostPerUnit);

        const isML = order.canal && order.canal.toLowerCase() === "mercado libre";
        if (isML) {
          const commPerUnit = item.comisionML !== undefined ? item.comisionML : (prod?.comisionML || 0);
          totalComisionML += (item.quantity * commPerUnit);
        }
      }
    }
    const totalPriceProducts = order.subtotal - order.discountAmount;
    const gananciaNeta = totalPriceProducts - totalCost - totalComisionML;
    return { totalCost, gananciaNeta, totalPriceProducts, totalComisionML };
  };

  // Metrics (computed over ALL APPROVED sales)
  const approvedOrders = orders.filter(o => o.status === "pago_aprobado");
  
  // REGISTROS (Approved sales count)
  const totalApprovedCount = approvedOrders.length;

  // TOTAL FACTURADO (Sum of sold products price = subtotal - discountAmount)
  const totalFacturado = approvedOrders.reduce((acc, o) => {
    const { totalPriceProducts } = getOrderCostAndProfit(o, productsList);
    return acc + totalPriceProducts;
  }, 0);

  // GANANCIA NETA (Sum of gananciaNeta = totalPriceProducts - productCost)
  const totalGananciaNeta = approvedOrders.reduce((acc, o) => {
    const { gananciaNeta } = getOrderCostAndProfit(o, productsList);
    return acc + gananciaNeta;
  }, 0);

  // Split calculations
  let totalFranquicia = 0;
  let totalJuem = 0;

  for (const o of approvedOrders) {
    const { totalCost, gananciaNeta, totalPriceProducts, totalComisionML } = getOrderCostAndProfit(o, productsList);
    const isMontevideo = o.depositoOrigen === "Montevideo";
    
    if (isMontevideo) {
      // Montevideo (Franquicia): 40% of net profit + 100% of shipping cost
      totalFranquicia += (0.4 * gananciaNeta) + (o.shippingCost || 0);
      // Pinamar (JUEM): product cost + 60% of net profit
      totalJuem += totalCost + (0.6 * gananciaNeta);
    } else {
      // Pinamar (JUEM): 100% of net profit + product cost + shipping cost = totalPriceProducts + shippingCost
      // (Deduct Mercado Libre commission from JUEM's total if sold via Mercado Libre)
      totalFranquicia += 0;
      totalJuem += totalPriceProducts - totalComisionML + (o.shippingCost || 0);
    }
  }

  // MONTHLY METRICS CALCULATIONS (Selected Month & Year)
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const selectedMonthName = monthNames[selectedMonth];

  // Dynamic selector options based on existing orders
  const monthYearOptions = React.useMemo(() => {
    const options: { year: number; month: number; label: string }[] = [];
    const seen = new Set<string>();

    // Always include current month/year
    const curY = nowRef.getFullYear();
    const curM = nowRef.getMonth();
    const curKey = `${curY}-${curM}`;
    options.push({
      year: curY,
      month: curM,
      label: `${monthNames[curM]} ${curY}`
    });
    seen.add(curKey);

    // Scan approved orders
    for (const o of approvedOrders) {
      if (!o.createdAt) continue;
      const d = new Date(o.createdAt);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${m}`;
      if (!seen.has(key)) {
        seen.add(key);
        options.push({
          year: y,
          month: m,
          label: `${monthNames[m]} ${y}`
        });
      }
    }

    // Sort descending chronologically
    return options.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [approvedOrders]);

  const monthlyApprovedOrders = approvedOrders.filter(o => {
    if (!o.createdAt) return false;
    const d = new Date(o.createdAt);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  const monthlyApprovedCount = monthlyApprovedOrders.length;

  const monthlyFacturado = monthlyApprovedOrders.reduce((acc, o) => {
    const { totalPriceProducts } = getOrderCostAndProfit(o, productsList);
    return acc + totalPriceProducts;
  }, 0);

  const monthlyGananciaNeta = monthlyApprovedOrders.reduce((acc, o) => {
    const { gananciaNeta } = getOrderCostAndProfit(o, productsList);
    return acc + gananciaNeta;
  }, 0);

  let monthlyFranquicia = 0;
  let monthlyJuem = 0;

  for (const o of monthlyApprovedOrders) {
    const { totalCost, gananciaNeta, totalPriceProducts, totalComisionML } = getOrderCostAndProfit(o, productsList);
    const isMontevideo = o.depositoOrigen === "Montevideo";
    
    if (isMontevideo) {
      monthlyFranquicia += (0.4 * gananciaNeta) + (o.shippingCost || 0);
      monthlyJuem += totalCost + (0.6 * gananciaNeta);
    } else {
      monthlyFranquicia += 0;
      monthlyJuem += totalPriceProducts - totalComisionML + (o.shippingCost || 0);
    }
  }

  // Human-readable status badges
  const getStatusLabelAndStyle = (status: string) => {
    switch (status) {
      case "pago_aprobado":
        return {
          label: "Aprobado ✓",
          colors: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50",
          icon: <CheckCircle className="h-3 w-3 inline mr-1" />
        };
      case "pago_pendiente":
        return {
          label: "Pendiente ⌚",
          colors: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50",
          icon: <Clock className="h-3 w-3 inline mr-1" />
        };
      case "pedido_iniciado":
        return {
          label: "Lead 📝",
          colors: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50",
          icon: <Clock className="h-3 w-3 inline mr-1" />
        };
      case "pago_rechazado":
        return {
          label: "Rechazado ✗",
          colors: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50",
          icon: <XCircle className="h-3 w-3 inline mr-1" />
        };
      default:
        return {
          label: status || "Registrado",
          colors: "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
          icon: null
        };
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await onUpdateStatus(orderId, newStatus);
      if (newStatus === "pago_pendiente") {
        const targetOrder = (store.orders || []).find(o => o.id === orderId);
        if (targetOrder) {
          // Explicitly pass the updated status so the WhatsApp generator uses the correct template
          handleWhatsAppChat({ ...targetOrder, status: newStatus as any });
        }
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // Autocomplete / suggestions search inside the modal
  const handleProductSearch = (query: string) => {
    setProductSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const matches: any[] = [];
    const normalizedQuery = query.toLowerCase();

    for (const prod of productsList) {
      if (prod.active === false) continue;
      
      const prodNameMatches = prod.name.toLowerCase().includes(normalizedQuery);
      const prodCodeMatches = (prod.codigo || "").toLowerCase().includes(normalizedQuery);

      if (prod.variants && prod.variants.length > 0) {
        // Search in variants
        for (const variant of prod.variants) {
          const varSkuMatches = (variant.sku || "").toLowerCase().includes(normalizedQuery);
          if (prodNameMatches || prodCodeMatches || varSkuMatches) {
            matches.push({
              product: prod,
              variant: variant,
              displayName: `${prod.name} (${variant.size} / ${variant.color})`,
              sku: variant.sku || prod.codigo,
              price: variant.price || prod.precioWeb || prod.price || 0,
              cost: prod.precioCompra || 0
            });
          }
        }
      } else {
        if (prodNameMatches || prodCodeMatches) {
          matches.push({
            product: prod,
            variant: null,
            displayName: prod.name,
            sku: prod.codigo,
            price: prod.precioWeb || prod.price || 0,
            cost: prod.precioCompra || 0
          });
        }
      }
    }

    setSearchResults(matches.slice(0, 8)); // Max 8 suggestions
  };

  // Add suggestion to transaction cart
  const handleAddProductToSale = (item: any) => {
    const isML = newSaleCanal && newSaleCanal.toLowerCase() === "mercado libre";
    const initialPrice = (isML && item.product.precioVentaML) ? item.product.precioVentaML : item.price;

    const isAlreadyAdded = newSaleItems.some(
      i => i.productId === item.product.id && 
           (!item.variant || i.variantId === item.variant.id)
    );

    if (isAlreadyAdded) {
      // Just increment quantity of existing item
      setNewSaleItems(prev => prev.map(i => {
        if (i.productId === item.product.id && (!item.variant || i.variantId === item.variant.id)) {
          const newQty = i.quantity + 1;
          const numPrice = Number(i.unitPrice) || 0;
          return { ...i, quantity: newQty, totalPrice: newQty * numPrice };
        }
        return i;
      }));
    } else {
      setNewSaleItems(prev => [
        ...prev,
        {
          productId: item.product.id,
          variantId: item.variant?.id || undefined,
          productName: item.product.name,
          sku: item.sku || undefined,
          sizeSelected: item.variant?.size || undefined,
          colorSelected: item.variant?.color || undefined,
          unitPrice: initialPrice,
          costPrice: item.cost, // kept for preview calculation
          comisionML: item.product.comisionML || 0,
          quantity: 1,
          totalPrice: initialPrice
        }
      ]);
    }

    setProductSearchQuery("");
    setSearchResults([]);
  };

  // Remove item from transaction cart
  const handleRemoveItemFromSale = (index: number) => {
    setNewSaleItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Update item price or quantity in transaction cart
  const handleUpdateSaleItem = (index: number, field: "quantity" | "unitPrice", value: string | number) => {
    setNewSaleItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        let updatedVal = value;
        if (field === "quantity") {
          updatedVal = Math.max(0, parseInt(value as string) || 0);
        }
        const updatedItem = { ...item, [field]: updatedVal };
        const numPrice = Number(updatedItem.unitPrice) || 0;
        updatedItem.totalPrice = updatedItem.quantity * numPrice;
        return updatedItem;
      }
      return item;
    }));
  };

  // Set up modal state to edit an existing order
  const handleEditOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setNewSaleCustomerName(order.customerName || "");
    setNewSaleCustomerEmail(order.customerEmail === "cliente@gmail.com" ? "" : (order.customerEmail || ""));
    setNewSaleCustomerPhone(order.customerPhone || "");
    
    const existingShip = store.shippings?.find(s => s.orderId === order.id);
    setNewSaleCustomerAddress(existingShip ? existingShip.deliveryAddress : "");
    setNewSaleDeliveryHours(existingShip ? (existingShip.deliveryHours || "") : "");
    setNewSaleShippingStatus(existingShip ? (existingShip.status || "Pendiente") : "Pendiente");

    setNewSaleShippingCost(order.shippingCost || 0);
    setNewSaleCouponCode(order.couponCode || "");
    setNewSaleNotes(order.notes || "");
    setNewSaleDeposito(order.depositoOrigen || "Pinamar");
    setNewSaleCanal(order.canal || "WhatsApp");
    setNewSaleStatus(order.status as any || "pago_aprobado");
    setNewSaleBypassStockDeduction(!!order.bypassStockDeduction);
    
    if (order.createdAt) {
      setNewSaleDate(order.createdAt.split("T")[0]);
    }

    const prefilledItems = (order.items || []).map(i => {
      const prod = productsList.find(p => String(p.id) === String(i.productId));
      return {
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        sku: i.sku,
        sizeSelected: i.sizeSelected,
        colorSelected: i.colorSelected,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        quantity: i.quantity,
        costPrice: i.costPrice || (prod ? prod.precioCompra : 0) || 0,
        comisionML: i.comisionML !== undefined ? i.comisionML : (prod ? (prod.comisionML || 0) : 0)
      };
    });
    setNewSaleItems(prefilledItems);
    setNewSaleErrorMessage(null);
    setIsModalOpen(true);
  };

  // Dispatch sale/invoice creation
  const handleDispatchSale = async () => {
    if (newSaleItems.length === 0) {
      setNewSaleErrorMessage("Debe agregar al menos un artículo a la transacción.");
      return;
    }

    if (!newSaleCustomerName.trim()) {
      setNewSaleErrorMessage("El nombre del cliente es obligatorio.");
      return;
    }

    setIsSubmittingNewSale(true);
    setNewSaleErrorMessage(null);

    const subtotal = newSaleItems.reduce((acc, it) => acc + it.totalPrice, 0);
    // Discount amount calculation helper
    const discountAmount = 0; // standard manual cart discount is 0 unless coupon applied

    const finalCreatedAt = newSaleDate ? new Date(newSaleDate + "T12:00:00").toISOString() : new Date().toISOString();

    const payload = {
      customerName: newSaleCustomerName.trim(),
      customerEmail: newSaleCustomerEmail.trim(),
      customerPhone: newSaleCustomerPhone.trim() || undefined,
      shippingCost: newSaleShippingCost,
      couponCode: newSaleCouponCode || undefined,
      notes: newSaleNotes,
      paymentMethod: "Venta Directa",
      depositoOrigen: newSaleDeposito,
      canal: newSaleCanal,
      status: newSaleStatus, // converted server-side or immediate deduction
      bypassStockDeduction: newSaleBypassStockDeduction,
      createdAt: finalCreatedAt,
      items: newSaleItems.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        sku: i.sku,
        sizeSelected: i.sizeSelected,
        colorSelected: i.colorSelected,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        totalPrice: i.totalPrice
      }))
    };

    const isEdit = !!editingOrderId;
    const url = isEdit ? `/api/orders/${editingOrderId}` : "/api/orders";
    const method = isEdit ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const orderId = isEdit ? editingOrderId! : data.orderId;
        const orderNumber = orderId ? orderId.substring(0, 6).toUpperCase() : "MANUAL";

        if (orderId) {
          const existingShip = store.shippings?.find(s => s.orderId === orderId);
          if (newSaleCustomerAddress.trim()) {
            const shipPayload = {
              orderNumber: orderNumber,
              customerName: payload.customerName,
              customerPhone: payload.customerPhone || "",
              deliveryHours: newSaleDeliveryHours.trim(),
              deliveryAddress: newSaleCustomerAddress.trim(),
              comments: payload.notes || "",
              branch: payload.depositoOrigen,
              shippingCost: payload.shippingCost,
              status: newSaleShippingStatus,
              orderId: orderId
            };

            try {
              const shipUrl = existingShip ? `/api/shippings/${existingShip.id}` : "/api/shippings";
              const shipMethod = existingShip ? "PUT" : "POST";
              await fetch(shipUrl, {
                method: shipMethod,
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
                },
                body: JSON.stringify(shipPayload)
              });
            } catch (shipErr) {
              console.error("Error creating/updating shipping record auto:", shipErr);
            }
          } else if (existingShip) {
            // If address is cleared, delete associated shipping record
            try {
              await fetch(`/api/shippings/${existingShip.id}`, {
                method: "DELETE",
                headers: {
                  "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
                }
              });
            } catch (delShipErr) {
              console.error("Error deleting shipping record auto:", delShipErr);
            }
          }
        }

        // Trigger parent state synchronization for real-time update
        if (onRefreshStore) {
          try {
            await onRefreshStore();
          } catch (refreshErr) {
            console.error("Error invoking onRefreshStore:", refreshErr);
          }
        }

        if (isEdit) {
          const updatedOrder: Order = {
            id: editingOrderId!,
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            customerPhone: payload.customerPhone || undefined,
            subtotal: subtotal,
            discountAmount: discountAmount,
            shippingCost: Number(payload.shippingCost),
            total: subtotal + Number(payload.shippingCost),
            couponCode: payload.couponCode,
            status: payload.status,
            notes: payload.notes || undefined,
            bypassStockDeduction: payload.bypassStockDeduction,
            paymentMethod: payload.paymentMethod,
            depositoOrigen: payload.depositoOrigen,
            canal: payload.canal,
            createdAt: finalCreatedAt,
            items: payload.items.map((it, idx) => {
              const orig = newSaleItems[idx] || {};
              return {
                id: `edited-item-${idx}`,
                productId: String(it.productId),
                variantId: it.variantId ? String(it.variantId) : undefined,
                productName: it.productName,
                sku: it.sku || undefined,
                sizeSelected: it.sizeSelected || undefined,
                colorSelected: it.colorSelected || undefined,
                unitPrice: it.unitPrice,
                quantity: it.quantity,
                totalPrice: it.totalPrice,
                comisionML: orig.comisionML,
                costPrice: orig.costPrice
              };
            })
          };

          if (onOrderUpdated) {
            onOrderUpdated(updatedOrder);
          }
          setEditingOrderId(null);
        } else {
          // Construct Order object for local React state inclusion
          const createdOrder: Order = {
            id: data.orderId || "manual-" + Math.random().toString(36).substring(2, 9),
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            customerPhone: payload.customerPhone || undefined,
            subtotal: subtotal,
            discountAmount: discountAmount,
            shippingCost: Number(payload.shippingCost),
            total: subtotal + Number(payload.shippingCost),
            couponCode: payload.couponCode,
            status: payload.status,
            notes: payload.notes || undefined,
            bypassStockDeduction: payload.bypassStockDeduction,
            paymentMethod: payload.paymentMethod,
            depositoOrigen: payload.depositoOrigen,
            canal: payload.canal,
            createdAt: finalCreatedAt,
            items: payload.items.map((it, idx) => {
              const orig = newSaleItems[idx] || {};
              return {
                id: `manual-item-${idx}`,
                productId: String(it.productId),
                variantId: it.variantId ? String(it.variantId) : undefined,
                productName: it.productName,
                sku: it.sku || undefined,
                sizeSelected: it.sizeSelected || undefined,
                colorSelected: it.colorSelected || undefined,
                unitPrice: it.unitPrice,
                quantity: it.quantity,
                totalPrice: it.totalPrice,
                comisionML: orig.comisionML,
                costPrice: orig.costPrice
              };
            })
          };

          if (onOrderCreated) {
            onOrderCreated(createdOrder);
          }
        }

        // Reset state
        setNewSaleItems([]);
        setNewSaleCustomerPhone("");
        setNewSaleCustomerAddress("");
        setNewSaleDeliveryHours("");
        setNewSaleShippingStatus("Pendiente");
        setNewSaleNotes("");
        setNewSaleShippingCost(0);
        setNewSaleCouponCode("");
        setNewSaleBypassStockDeduction(false);
        const todayStr = (() => {
          const d = new Date();
          const offset = d.getTimezoneOffset();
          const localDate = new Date(d.getTime() - (offset * 60 * 1000));
          return localDate.toISOString().split("T")[0];
        })();
        setNewSaleDate(todayStr);
        setIsModalOpen(false);
      } else {
        setNewSaleErrorMessage(data.message || "Error al registrar la venta en el servidor.");
      }
    } catch (err: any) {
      setNewSaleErrorMessage("Error de comunicación con el servidor. Verifique su conexión.");
    } finally {
      setIsSubmittingNewSale(false);
    }
  };

  // Filter orders according to UI dropdowns
  const filteredOrders = orders.filter(order => {
    // Search filter
    let matchesSearch = true;
    if (searchTerm.trim() !== "") {
      const normQ = normalizeText(searchTerm);
      const collapsedQ = normQ.replace(/\s+/g, "");

      const orderIdNorm = normalizeText(order.id || "");
      const customerNameNorm = normalizeText(order.customerName || "");
      const customerEmailNorm = normalizeText(order.customerEmail || "");
      const customerPhoneNorm = normalizeText(order.customerPhone || "");
      const couponCodeNorm = normalizeText(order.couponCode || "");
      const canalNorm = normalizeText(order.canal || "");

      matchesSearch = 
        orderIdNorm.includes(normQ) ||
        (collapsedQ.length >= 2 && orderIdNorm.replace(/\s+/g, "").includes(collapsedQ)) ||
        customerNameNorm.includes(normQ) ||
        (collapsedQ.length >= 2 && customerNameNorm.replace(/\s+/g, "").includes(collapsedQ)) ||
        customerEmailNorm.includes(normQ) ||
        customerPhoneNorm.includes(normQ) ||
        (collapsedQ.length >= 2 && customerPhoneNorm.replace(/\s+/g, "").includes(collapsedQ)) ||
        couponCodeNorm.includes(normQ) ||
        canalNorm.includes(normQ);
    }

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== "all") {
      if (statusFilter === "aprobado") matchesStatus = order.status === "pago_aprobado";
      else if (statusFilter === "pendiente") matchesStatus = order.status === "pago_pendiente" || order.status === "pedido_iniciado";
      else if (statusFilter === "rechazado") matchesStatus = order.status === "pago_rechazado";
    }

    // Branch filter (Sucursal)
    let matchesBranch = true;
    if (branchFilter !== "all") {
      const orderBranch = order.depositoOrigen || "Pinamar";
      matchesBranch = orderBranch.toLowerCase() === branchFilter.toLowerCase();
    }

    // Channel filter (Canal)
    let matchesChannel = true;
    if (channelFilter !== "all") {
      const orderChannel = order.canal || "Web";
      matchesChannel = orderChannel.toLowerCase() === channelFilter.toLowerCase();
    }

    return matchesSearch && matchesStatus && matchesBranch && matchesChannel;
  });

  // Pagination Logic
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  // Adjust page index if filters reduce item count below page threshold
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const toggleRow = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const handleWhatsAppChat = (order: Order) => {
    const rawNum = order.customerPhone || "";
    const cleanNum = rawNum.replace(/[^0-9]/g, "");
    const shortId = (order.id || "").substring(0, 6).toUpperCase();
    const siteTitle = store.settings?.siteTitle || "Juem";
    const totalAmount = order.total || 0;

    let textMsg = `Hola ${order.customerName}, nos contactamos de la tienda por tu pedido N° ${shortId}.`;

    if (order.status === "pago_pendiente") {
      const bankDetails = store.settings?.transferDetails || "Numero de cuenta \nMercado Pago : 1004278620163\nRed pagos y abitab\nJoana Baptista : 4.051.645-7";
      textMsg = `¡Hola ${order.customerName}! Nos contactamos de *${siteTitle}* con respecto a tu pedido *N° ${shortId}* por un importe total de *UYU $${totalAmount.toLocaleString("es-AR")}*.\n\nActualmente tu compra se encuentra *pendiente de pago* ⌚.\n\nPuedes realizar tu transferencia directa utilizando los siguientes datos bancarios:\n\n${bankDetails}\n\nAl completar el pago, por favor envíanos la captura o comprobante por aquí para despachar tu envío de inmediato. ¡Muchas gracias!`;
    } else if (order.status === "pedido_iniciado") {
      textMsg = `¡Hola ${order.customerName}! Nos contactamos de *${siteTitle}* sobre tu pedido iniciado *N° ${shortId}* por un total de *UYU $${totalAmount.toLocaleString("es-AR")}*.\n\nQueríamos saber si tienes alguna duda sobre el calzado/indumentaria o si deseas coordinar el pago. ¡Quedamos a las órdenes para ayudarte!`;
    } else if (order.status === "pago_aprobado") {
      textMsg = `¡Hola ${order.customerName}! Te confirmamos de *${siteTitle}* que recibimos tu pago con éxito para el pedido *N° ${shortId}*.\n\nTu compra ha sido aprobada ✓ y pasa de inmediato al sector de embalaje para coordinar el envío. ¡Muchas gracias por tu preferencia!`;
    }

    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(textMsg)}`, "_blank");
  };

  // Page index helper array generator
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", safeCurrentPage, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="w-full space-y-6 animate-fade-in relative">
      
      {/* MONTH & YEAR SELECTOR FOR MONTHLY SALES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-850/80 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#D4A55A]/10 text-[#E6BF76] rounded-xl border border-[#D4A55A]/15">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Período de Ventas</h4>
            <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Explora las métricas mensuales de la tienda</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Previous Month button */}
          <button
            onClick={() => {
              const currentIndex = monthYearOptions.findIndex(o => o.year === selectedYear && o.month === selectedMonth);
              if (currentIndex < monthYearOptions.length - 1) {
                const prevOpt = monthYearOptions[currentIndex + 1];
                setSelectedYear(prevOpt.year);
                setSelectedMonth(prevOpt.month);
              }
            }}
            disabled={monthYearOptions.findIndex(o => o.year === selectedYear && o.month === selectedMonth) === monthYearOptions.length - 1}
            className="px-3 py-1.5 bg-zinc-950/40 hover:bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all text-[11px] font-bold cursor-pointer flex items-center gap-1"
          >
            &larr; Anterior
          </button>

          {/* Select dropdown */}
          <select
            value={`${selectedYear}-${selectedMonth}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setSelectedYear(y);
              setSelectedMonth(m);
            }}
            className="bg-zinc-950/80 border border-zinc-800 text-zinc-200 text-[11px] rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#D4A55A]/60 font-semibold cursor-pointer"
          >
            {monthYearOptions.map(opt => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Next Month button */}
          <button
            onClick={() => {
              const currentIndex = monthYearOptions.findIndex(o => o.year === selectedYear && o.month === selectedMonth);
              if (currentIndex > 0) {
                const nextOpt = monthYearOptions[currentIndex - 1];
                setSelectedYear(nextOpt.year);
                setSelectedMonth(nextOpt.month);
              }
            }}
            disabled={monthYearOptions.findIndex(o => o.year === selectedYear && o.month === selectedMonth) === 0}
            className="px-3 py-1.5 bg-zinc-950/40 hover:bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all text-[11px] font-bold cursor-pointer flex items-center gap-1"
          >
            Siguiente &rarr;
          </button>
        </div>
      </div>

      {/* 5 METRIC KPI HEADER OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1 - Registros */}
        <div className="bg-zinc-900/50 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 hover:border-indigo-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-3 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500/20 group-hover:bg-indigo-500/50 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Registros</span>
            <div className="p-2 bg-indigo-950/40 text-indigo-400 rounded-lg border border-indigo-900/30 group-hover:scale-110 transition-transform duration-300">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-white font-sans">
                {monthlyApprovedCount}
              </h3>
              <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-wider font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/25">
                {selectedMonthName}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold mt-1.5">
              Total histórico: <span className="text-zinc-300 font-black">{totalApprovedCount}</span>
            </p>
          </div>
        </div>

        {/* Metric 2 - Facturado */}
        <div className="bg-zinc-900/50 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 hover:border-emerald-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-3 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500/20 group-hover:bg-emerald-500/50 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Facturado</span>
            <div className="p-2 bg-emerald-950/40 text-emerald-400 rounded-lg border border-emerald-900/30 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-white font-sans">
                $ {monthlyFacturado.toLocaleString("es-AR")}
              </h3>
              <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25">
                {selectedMonthName}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold mt-1.5">
              Total histórico: <span className="text-zinc-300 font-black">$ {totalFacturado.toLocaleString("es-AR")}</span>
            </p>
          </div>
        </div>

        {/* Metric 3 - Ganancia Neta */}
        <div className="bg-zinc-900/50 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 hover:border-sky-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(14,165,233,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-3 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-sky-500/20 group-hover:bg-sky-500/50 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Ganancia Neta</span>
            <div className="p-2 bg-sky-950/40 text-sky-400 rounded-lg border border-sky-900/30 group-hover:scale-110 transition-transform duration-300">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-white font-sans">
                $ {monthlyGananciaNeta.toLocaleString("es-AR")}
              </h3>
              <span className="text-[9px] font-extrabold text-sky-400 uppercase tracking-wider font-mono bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/25">
                {selectedMonthName}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold mt-1.5">
              Total histórico: <span className="text-zinc-300 font-black">$ {totalGananciaNeta.toLocaleString("es-AR")}</span>
            </p>
          </div>
        </div>

        {/* Metric 4 - Total Franquicia */}
        <div className="bg-zinc-900/50 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 hover:border-amber-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-3 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500/20 group-hover:bg-amber-500/50 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Franquicia</span>
            <div className="p-2 bg-amber-950/40 text-amber-400 rounded-lg border border-amber-900/30 group-hover:scale-110 transition-transform duration-300">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-white font-sans">
                $ {monthlyFranquicia.toLocaleString("es-AR")}
              </h3>
              <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-wider font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25">
                {selectedMonthName}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold mt-1.5">
              Total histórico: <span className="text-zinc-300 font-black">$ {totalFranquicia.toLocaleString("es-AR")}</span>
            </p>
          </div>
        </div>

        {/* Metric 5 - Total Juem */}
        <div className="bg-zinc-900/50 backdrop-blur-md p-5 rounded-2xl border border-zinc-850/85 hover:border-[#D4A55A]/40 shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(212,165,90,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-3 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4A55A]/20 group-hover:bg-[#D4A55A]/50 transition-colors duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total JUEM</span>
            <div className="p-2 bg-[#D4A55A]/10 text-[#E6BF76] rounded-lg border border-[#D4A55A]/20 group-hover:scale-110 transition-transform duration-300">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-white font-sans">
                $ {monthlyJuem.toLocaleString("es-AR")}
              </h3>
              <span className="text-[9px] font-extrabold text-[#E6BF76] uppercase tracking-wider font-mono bg-[#D4A55A]/10 px-1.5 py-0.5 rounded border border-[#D4A55A]/25">
                {selectedMonthName}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold mt-1.5">
              Total histórico: <span className="text-zinc-300 font-black">$ {totalJuem.toLocaleString("es-AR")}</span>
            </p>
          </div>
        </div>

      </div>

      {/* REGISTRAR NUEVA VENTA CONTROL PANEL */}
      <div className="p-6 bg-indigo-950/15 backdrop-blur-md border border-indigo-900/35 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-[0_0_15px_rgba(79,70,229,0.3)] group-hover:scale-105 transition-transform duration-300">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>Registrar Nueva Venta Manual</span>
              <span className="px-2 py-0.5 text-[8px] bg-indigo-500/10 text-indigo-300 rounded border border-indigo-500/25">ASISTENTE</span>
            </h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-3xl font-semibold">
              Inicia un nuevo registro, calcula comisiones según depósito, selecciona el canal de venta y descuenta stock en tiempo real.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingOrderId(null);
            setNewSaleCustomerName("Cliente WhatsApp / Consumidor final");
            setNewSaleCustomerEmail("");
            setNewSaleCustomerPhone("");
            setNewSaleCustomerAddress("");
            setNewSaleDeliveryHours("");
            setNewSaleShippingStatus("Pendiente");
            setNewSaleShippingCost(0);
            setNewSaleCouponCode("");
            setNewSaleNotes("");
            setNewSaleDeposito("Pinamar");
            setNewSaleCanal("WhatsApp");
            setNewSaleStatus("pago_aprobado");
            setNewSaleBypassStockDeduction(false);
            setNewSaleItems([]);
            setIsModalOpen(true);
          }}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(79,70,229,0.25)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] cursor-pointer flex items-center gap-2 shrink-0 relative z-10"
        >
          <Plus className="h-4.5 w-4.5 stroke-[3px]" />
          <span>Iniciar Registro de Venta</span>
        </button>
      </div>

      {/* FILTER & CONTAINER HEADER */}
      <div className="bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-850/85 shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden">
        
        {/* Controls bar */}
        <div className="p-5 border-b border-zinc-800/80 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-zinc-950/20">
          
          {/* Status Tabs Navigation */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-indigo-600 text-white font-extrabold shadow-[0_0_12px_rgba(79,70,229,0.25)]"
                  : "bg-zinc-950/40 border border-zinc-800 text-zinc-400 hover:text-white shadow-sm hover:border-zinc-700/60"
              }`}
            >
              Todos ({orders.length})
            </button>
            <button
              onClick={() => { setStatusFilter("aprobado"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                statusFilter === "aprobado"
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  : "bg-zinc-950/40 border border-zinc-800 text-zinc-400 hover:text-white shadow-sm hover:border-zinc-700/60"
              }`}
            >
              ✓ Aprobados ({orders.filter(o => o.status === "pago_aprobado").length})
            </button>
            <button
              onClick={() => { setStatusFilter("pendiente"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                statusFilter === "pendiente"
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                  : "bg-zinc-950/40 border border-zinc-800 text-zinc-400 hover:text-white shadow-sm hover:border-zinc-700/60"
              }`}
            >
              ⌚ Pendientes ({orders.filter(o => o.status === "pago_pendiente" || o.status === "pedido_iniciado").length})
            </button>
            <button
              onClick={() => { setStatusFilter("rechazado"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                statusFilter === "rechazado"
                  ? "bg-rose-500/20 border border-rose-500/40 text-rose-400 font-extrabold shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                  : "bg-zinc-950/40 border border-zinc-800 text-zinc-400 hover:text-white shadow-sm hover:border-zinc-700/60"
              }`}
            >
              ✗ Cancelados ({orders.filter(o => o.status === "pago_rechazado").length})
            </button>
          </div>

          {/* Quick Select Dropdowns and Search */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5">
            
            {/* Search Box */}
            <div className="relative w-full md:w-64 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar cliente, ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-white shadow-inner font-bold"
              />
            </div>

            {/* Branch filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-zinc-500 uppercase shrink-0">Sucursal</span>
              <select
                value={branchFilter}
                onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200 shadow-sm font-bold cursor-pointer"
                style={{ color: "inherit", backgroundColor: "inherit" }}
              >
                <option value="all" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Todas</option>
                <option value="pinamar" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Pinamar</option>
                <option value="montevideo" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Montevideo</option>
              </select>
            </div>

            {/* Channel filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-zinc-500 uppercase shrink-0">Canal</span>
              <select
                value={channelFilter}
                onChange={(e) => { setChannelFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200 shadow-sm font-bold cursor-pointer"
                style={{ color: "inherit", backgroundColor: "inherit" }}
              >
                <option value="all" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Todos</option>
                <option value="whatsapp" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>WhatsApp</option>
                <option value="mercado libre" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Mercado Libre</option>
                <option value="venta directa" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Venta Directa</option>
                <option value="web" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Web</option>
              </select>
            </div>

          </div>

        </div>

        {/* LIST TABLE CONTAINER */}
        {paginatedOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="h-10 w-10 text-zinc-600 mx-auto mb-3 animate-pulse" />
            <p className="text-zinc-400 text-sm font-bold">No se encontraron ventas registradas con los filtros seleccionados.</p>
            <p className="text-zinc-500 text-[11px] mt-1.5 font-semibold">Ajuste los criterios de búsqueda, sucursal o canal para ubicar las órdenes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/40 border-b border-zinc-800/80">
                  <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider">ID / FECHA</th>
                  <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider">CANAL / ORIGEN</th>
                  <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider">CLIENTE</th>
                  <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider">ITEMS</th>
                  <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider text-right">COSTO ENVÍO</th>
                  <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider text-right">P. VENTA</th>
                  <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider text-right">COSTO PROD.</th>
                  <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider text-right">GANANCIA NETA</th>
                  <th className="p-4 text-[10px] font-black text-emerald-400 uppercase tracking-wider text-right bg-emerald-500/[0.02]">TOTAL FRAN</th>
                  <th className="p-4 text-[10px] font-black text-indigo-400 uppercase tracking-wider text-right bg-indigo-500/[0.02]">TOTAL JUEM</th>
                  <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider text-center">ESTADO</th>
                  <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60">
                {paginatedOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const statusInfo = getStatusLabelAndStyle(order.status);
                  
                  // Math breakdowns
                  const { totalCost, gananciaNeta, totalPriceProducts } = getOrderCostAndProfit(order, productsList);
                  const isMvd = (order.depositoOrigen || "Pinamar") === "Montevideo";
                  
                  const rowFran = isMvd ? ((0.4 * gananciaNeta) + (order.shippingCost || 0)) : 0;
                  const rowJuem = isMvd ? (totalCost + (0.6 * gananciaNeta)) : (totalPriceProducts + (order.shippingCost || 0));

                  const itemsCount = order.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;

                  return (
                    <React.Fragment key={order.id}>
                      <tr 
                        className={`hover:bg-zinc-800/30 cursor-pointer transition-all duration-300 border-b border-zinc-850/45 ${isExpanded ? 'bg-indigo-500/[0.04]' : ''}`} 
                        onClick={() => toggleRow(order.id)}
                      >
                        {/* ID / FECHA */}
                        <td className="p-4 font-mono">
                          <p className="text-xs font-bold text-zinc-100">
                            #{order.id.substring(0, 6).toUpperCase()}
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1 font-bold">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric"
                            }) : "N/A"}
                          </p>
                        </td>

                        {/* CANAL / ORIGEN */}
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-zinc-950/60 border border-zinc-800 text-zinc-400">
                            {order.canal || "Web"}
                          </span>
                          <span className="block text-[10px] font-bold text-zinc-400 mt-1.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3 inline text-rose-500" />
                            {order.depositoOrigen || "Pinamar"}
                          </span>
                        </td>

                        {/* CLIENTE */}
                        <td className="p-4">
                          <p className="text-xs font-bold text-zinc-100 max-w-[150px] truncate">{order.customerName}</p>
                          <p className="text-[10px] text-zinc-500 truncate max-w-[150px] mt-0.5 font-semibold">{order.customerEmail}</p>
                        </td>

                        {/* ITEMS */}
                        <td className="p-4">
                          <span className="text-xs font-mono font-black text-zinc-300">
                            {itemsCount} {itemsCount === 1 ? "art." : "arts."}
                          </span>
                        </td>

                        {/* COSTO ENVÍO */}
                        <td className="p-4 text-right font-mono text-xs text-zinc-400 font-semibold">
                          $ {(order.shippingCost || 0).toLocaleString("es-AR")}
                        </td>

                        {/* P. VENTA */}
                        <td className="p-4 text-right font-mono text-xs font-black text-zinc-100">
                          $ {totalPriceProducts.toLocaleString("es-AR")}
                        </td>

                        {/* COSTO PROD. */}
                        <td className="p-4 text-right font-mono text-xs text-zinc-400 font-semibold">
                          $ {totalCost.toLocaleString("es-AR")}
                        </td>

                        {/* GANANCIA NETA */}
                        <td className={`p-4 text-right font-mono text-xs font-black ${gananciaNeta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          $ {gananciaNeta.toLocaleString("es-AR")}
                        </td>

                        {/* TOTAL FRAN */}
                        <td className="p-4 text-right font-mono text-xs font-black bg-emerald-500/[0.01] text-emerald-400">
                          $ {rowFran.toLocaleString("es-AR")}
                        </td>

                        {/* TOTAL JUEM */}
                        <td className="p-4 text-right font-mono text-xs font-black bg-indigo-500/[0.01] text-indigo-400">
                          $ {rowJuem.toLocaleString("es-AR")}
                        </td>

                        {/* ESTADO */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-xl text-[9.5px] font-black border ${statusInfo.colors}`}>
                            {statusInfo.label}
                          </span>
                        </td>

                        {/* ACCIONES */}
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            
                            {/* WhatsApp */}
                            <button
                              onClick={() => handleWhatsAppChat(order)}
                              title="Contactar por WhatsApp"
                              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-transform hover:scale-105 cursor-pointer border border-emerald-500/20"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.998h.003c4.368 0 7.927-3.558 7.93-7.926a7.86 7.86 0 0 0-2.33-5.596ZM7.994 14.52a6.57 6.57 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                              </svg>
                            </button>

                            {/* Editar venta */}
                            <button
                              onClick={() => handleEditOrder(order)}
                              title="Editar venta / factura"
                              className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-transform hover:scale-105 cursor-pointer border border-indigo-500/20"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete Confirmation workflow */}
                            {deletingId === order.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={async () => {
                                    setIsDeletingLoading(order.id);
                                    try {
                                      await onDeleteOrder(order.id);
                                    } finally {
                                      setIsDeletingLoading(null);
                                      setDeletingId(null);
                                    }
                                  }}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[9.5px] uppercase font-black rounded-lg cursor-pointer"
                                >
                                  {isDeletingLoading === order.id ? "..." : "Sí"}
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="px-2 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-[9.5px] font-bold rounded-lg cursor-pointer border border-zinc-800"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(order.id)}
                                title="Eliminar venta"
                                className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all cursor-pointer border border-rose-500/20"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Expand toggle */}
                            <button
                              onClick={() => toggleRow(order.id)}
                              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg cursor-pointer transition-all border border-zinc-750"
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>

                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED SECTION */}
                      {isExpanded && (
                        <tr className="bg-zinc-950/45 border-l-2 border-indigo-500">
                          <td colSpan={12} className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                              
                              {/* Items Breakdown list */}
                              <div className="lg:col-span-8 space-y-3">
                                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider border-b border-zinc-800 pb-2 flex items-center gap-1.5">
                                  <ShoppingBag className="h-4 w-4 text-indigo-500" />
                                  <span>Desglose de Artículos de la Venta</span>
                                </h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                  {order.items && order.items.map((item, idx) => {
                                    const p = productsList.find(x => String(x.id) === String(item.productId));
                                    const c = p?.precioCompra || 0;
                                    const n = item.unitPrice - c;
                                    return (
                                      <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-850 gap-3 shadow-md hover:border-zinc-800 transition-all">
                                        <div>
                                          <p className="text-xs font-bold text-zinc-100">
                                            {item.productName}
                                          </p>
                                          <div className="flex flex-wrap gap-2 text-[10px] text-zinc-400 font-bold mt-1.5">
                                            {item.sku && <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">SKU: {item.sku}</span>}
                                            {item.sizeSelected && <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">Talle: {item.sizeSelected}</span>}
                                            {item.colorSelected && <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">Color: {item.colorSelected}</span>}
                                            <span className="bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 font-mono">
                                              {item.quantity} x $ {item.unitPrice.toLocaleString("es-AR")}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0 w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-0 pt-2 sm:pt-0 border-zinc-850">
                                          <p className="text-xs font-mono font-black text-zinc-100">
                                            $ {item.totalPrice.toLocaleString("es-AR")} P. Venta
                                          </p>
                                          <p className="text-[10px] font-mono text-zinc-500 font-bold mt-0.5">
                                            Costo: $ {(c * item.quantity).toLocaleString("es-AR")}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="p-3.5 bg-zinc-950/80 border border-zinc-850 rounded-xl flex flex-wrap gap-4 text-[11px] text-zinc-400 justify-between items-center font-bold">
                                  <p>Subtotal: <span className="font-mono text-xs text-zinc-100 font-black">$ {order.subtotal?.toLocaleString("es-AR")}</span></p>
                                  {order.discountAmount > 0 && (
                                    <p className="text-rose-400">
                                      Descuento: <span className="font-mono font-black">-$ {order.discountAmount?.toLocaleString("es-AR")}</span>
                                    </p>
                                  )}
                                  <p className="text-white font-extrabold text-xs">
                                    Total Facturado: <span className="font-mono text-sm text-indigo-400 font-black">$ {order.total?.toLocaleString("es-AR")}</span>
                                  </p>
                                  {order.couponCode && (
                                    <p className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-mono font-extrabold">
                                      Cupón: {order.couponCode}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Manual Status updates and other data */}
                              <div className="lg:col-span-4 space-y-4">
                                <div>
                                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider border-b border-zinc-800 pb-2 flex items-center gap-1.5">
                                    <User className="h-4 w-4 text-indigo-500" />
                                    <span>Datos de la Operación</span>
                                  </h4>
                                  <div className="mt-2.5 text-xs text-zinc-300 space-y-2 font-bold">
                                    <p><strong className="text-zinc-500 mr-1">Cliente:</strong> {order.customerName}</p>
                                    <p><strong className="text-zinc-500 mr-1">Email:</strong> {order.customerEmail || "Sin email registrado"}</p>
                                    {order.customerPhone && <p><strong className="text-zinc-500 mr-1">Teléfono:</strong> {order.customerPhone}</p>}
                                    {order.notes && <p className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-850 text-[10.5px] italic mt-1 font-semibold text-zinc-400">"{order.notes}"</p>}
                                    
                                    {/* Display shipping/delivery details if any associated record exists */}
                                    {(() => {
                                      const existingShip = store.shippings?.find(s => s.orderId === order.id);
                                      if (!existingShip) return null;
                                      return (
                                        <div className="mt-3.5 p-3 bg-indigo-950/20 rounded-xl border border-indigo-500/10 space-y-1.5 text-xs text-zinc-300 font-bold">
                                          <p className="text-[10.5px] uppercase tracking-wider text-indigo-400 border-b border-zinc-800/40 pb-1 flex items-center gap-1.5">
                                            <Truck className="h-3.5 w-3.5" />
                                            <span>Detalles de Envío</span>
                                          </p>
                                          <p><strong className="text-zinc-400 mr-1">Dirección:</strong> {existingShip.deliveryAddress}</p>
                                          {existingShip.deliveryHours && <p><strong className="text-zinc-400 mr-1">Horario:</strong> {existingShip.deliveryHours}</p>}
                                          <p className="flex items-center gap-1.5">
                                            <strong className="text-zinc-400 mr-1">Reparto:</strong>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold ${
                                              existingShip.status === 'Entregado' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                                              existingShip.status === 'Cancelado' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
                                              existingShip.status === 'En Viaje' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20' :
                                              'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                            }`}>
                                              {existingShip.status}
                                            </span>
                                          </p>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h5 className="text-[10px] text-zinc-455 font-extrabold uppercase tracking-wider">
                                    Modificar Estado Manualmente
                                  </h5>

                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      disabled={updatingId !== null}
                                      onClick={() => handleUpdateStatus(order.id, "pago_aprobado")}
                                      className={`px-3 py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                        order.status === "pago_aprobado"
                                          ? "bg-emerald-600/25 border border-emerald-500/40 text-emerald-400 font-extrabold scale-[1.01] shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                                          : "bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                                      }`}
                                    >
                                      ✓ Aprobado
                                    </button>
                                    
                                    <button
                                      disabled={updatingId !== null}
                                      onClick={() => handleUpdateStatus(order.id, "pago_pendiente")}
                                      className={`px-3 py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                        order.status === "pago_pendiente"
                                          ? "bg-amber-500/20 border border-amber-500/30 text-amber-400 font-extrabold scale-[1.01] shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                                          : "bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                                      }`}
                                    >
                                      ⌚ Pendiente
                                    </button>

                                    <button
                                      disabled={updatingId !== null}
                                      onClick={() => handleUpdateStatus(order.id, "pago_rechazado")}
                                      className={`px-3 py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                        order.status === "pago_rechazado"
                                          ? "bg-rose-500/20 border border-rose-500/30 text-rose-400 font-extrabold scale-[1.01] shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                                          : "bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                                      }`}
                                    >
                                      ✗ Rechazado
                                    </button>

                                    <button
                                      disabled={updatingId !== null}
                                      onClick={() => handleUpdateStatus(order.id, "pedido_iniciado")}
                                      className={`px-3 py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                        order.status === "pedido_iniciado"
                                          ? "bg-sky-500/20 border border-sky-500/30 text-sky-400 font-extrabold scale-[1.01] shadow-[0_0_10px_rgba(14,165,233,0.15)]"
                                          : "bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                                      }`}
                                    >
                                      📝 Lead
                                    </button>
                                  </div>
                                </div>

                                {order.status === "pago_pendiente" && (
                                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/35 rounded-xl space-y-2 mt-2 animate-fade-in text-left">
                                    <h6 className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                                      <span className="text-xs">📢</span>
                                      <span>Acción Recomendada: Recordatorio de Pago</span>
                                    </h6>
                                    <p className="text-[11px] text-zinc-300 font-bold leading-relaxed">
                                      Este pedido está en estado <strong>Pendiente de Pago</strong>. Puedes contactar al cliente con un mensaje personalizado y las instrucciones bancarias haciendo clic en el siguiente botón:
                                    </p>
                                    <button
                                      onClick={() => handleWhatsAppChat(order)}
                                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(245,158,11,0.2)]"
                                    >
                                      <Phone className="h-4 w-4 mr-1.5" />
                                      <span>Enviar Recordatorio de Pago por WhatsApp</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/20 flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-400 font-bold">
              Mostrando registros <strong className="text-zinc-100">{startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)}</strong> de un total de <strong className="text-zinc-100">{totalItems}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              {/* Prev */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                  safeCurrentPage === 1
                    ? "bg-zinc-950/20 border-zinc-900 text-zinc-600 cursor-not-allowed"
                    : "bg-zinc-950/40 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700/60"
                }`}
              >
                Anterior
              </button>

              {/* Page Numbers */}
              {getPageNumbers().map((p, idx) => {
                if (p === "...") {
                  return <span key={`dots-${idx}`} className="px-2 text-zinc-600 font-bold">...</span>;
                }
                const pageNum = p as number;
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      safeCurrentPage === pageNum
                        ? "bg-indigo-600 text-white font-extrabold shadow-[0_0_12px_rgba(79,70,229,0.25)]"
                        : "bg-zinc-950/40 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={safeCurrentPage === totalPages}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                  safeCurrentPage === totalPages
                    ? "bg-zinc-950/20 border-zinc-900 text-zinc-600 cursor-not-allowed"
                    : "bg-zinc-950/40 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700/60"
                }`}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

      </div>

      {/* REGISTRAR NUEVA VENTA MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900/95 backdrop-blur-xl w-full max-w-4xl rounded-2xl border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800/85 flex justify-between items-center bg-zinc-950/40">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5 w-5 text-indigo-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-100">
                  {editingOrderId ? "Editar Venta / Factura" : "Registrar Nueva Venta (Asistente de Facturación)"}
                </h3>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setEditingOrderId(null); }}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all cursor-pointer border border-transparent hover:border-zinc-700/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {newSaleErrorMessage && (
                <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2.5 font-bold animate-pulse">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{newSaleErrorMessage}</span>
                </div>
              )}

              {/* 1. PRODUCT AUTOCOMPLETE SEARCH */}
              <div className="space-y-2">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-indigo-400" />
                  <span>1. Buscar Artículo a Agregar</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => handleProductSearch(e.target.value)}
                    placeholder="Escriba nombre de producto, código o SKU para agregar..."
                    className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs outline-none text-white placeholder-zinc-500 font-bold shadow-inner transition-all"
                  />
                  
                  {/* Suggestions List */}
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-[110] max-h-60 overflow-y-auto divide-y divide-zinc-900 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                      {searchResults.map((res, idx) => {
                        const productImg = res.variant?.imageUrl || res.product?.imageUrl;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleAddProductToSale(res)}
                            className="p-3 hover:bg-indigo-500/10 cursor-pointer text-xs flex justify-between items-center transition-colors border-b border-zinc-900/50"
                          >
                            <div className="flex items-center gap-3">
                              {/* Product Thumbnail */}
                              <div className="h-10 w-10 rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-900 shrink-0 flex items-center justify-center">
                                {productImg ? (
                                  <img 
                                    src={productImg} 
                                    alt={res.displayName} 
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <ShoppingBag className="h-4 w-4 text-zinc-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-zinc-100">{res.displayName}</p>
                                <p className="text-[9.5px] text-zinc-500 font-mono mt-0.5">SKU: {res.sku || "N/A"}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-indigo-400 font-mono">
                                $ {((newSaleCanal && newSaleCanal.toLowerCase() === "mercado libre" && res.product.precioVentaML) ? res.product.precioVentaML : res.price).toLocaleString("es-AR")}
                              </span>
                              {newSaleCanal && newSaleCanal.toLowerCase() === "mercado libre" && res.product.precioVentaML && (
                                <span className="block text-[8px] uppercase tracking-wider text-amber-500 font-black mt-0.5">Precio ML</span>
                              )}
                              <span className="block text-[8px] uppercase tracking-wider text-zinc-500 mt-0.5 font-bold">
                                Stock: {res.variant ? (res.variant.stock ?? res.product.stock) : res.product.stock}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. ADDED ITEMS IN THIS TRANSACTION */}
              <div className="space-y-2">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-indigo-400" />
                  <span>2. Artículos en esta Transacción ({newSaleItems.length})</span>
                </label>

                {newSaleItems.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-zinc-800 rounded-xl text-center bg-zinc-950/30">
                    <ShoppingBag className="h-8 w-8 text-zinc-600 mx-auto mb-2.5 animate-pulse" />
                    <p className="text-xs text-zinc-400 font-bold">La transacción está vacía.</p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-semibold">Busque y agregue artículos utilizando el buscador de arriba.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {newSaleItems.map((item, idx) => {
                      const itemSubtotal = item.quantity * item.unitPrice;
                      const itemCostoTotal = item.quantity * item.costPrice;
                      const itemProfit = itemSubtotal - itemCostoTotal;
                      
                      // Find matched product to retrieve its thumbnail image
                      const matchedProduct = productsList.find(p => String(p.id) === String(item.productId));
                      let matchedImgUrl = matchedProduct?.imageUrl;
                      if (item.sizeSelected || item.colorSelected) {
                        const matchedVariant = matchedProduct?.variants?.find(v => 
                          (!item.sizeSelected || v.size === item.sizeSelected) && 
                          (!item.colorSelected || v.color === item.colorSelected)
                        );
                        if (matchedVariant?.imageUrl) {
                          matchedImgUrl = matchedVariant.imageUrl;
                        }
                      }

                      return (
                        <div key={idx} className="p-3.5 bg-zinc-950/40 rounded-xl border border-zinc-800/70 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:border-zinc-750 transition-all">
                          <div className="flex items-center gap-3">
                            {/* Product Thumbnail inside cart list */}
                            <div className="h-10 w-10 rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-900 shrink-0 flex items-center justify-center">
                              {matchedImgUrl ? (
                                <img 
                                  src={matchedImgUrl} 
                                  alt={item.productName} 
                                  className="h-full w-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <ShoppingBag className="h-4 w-4 text-zinc-600" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-zinc-100">{item.productName}</p>
                              <div className="flex flex-wrap gap-1.5 text-[9.5px] text-zinc-450 font-bold">
                                {item.sku && <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">SKU: {item.sku}</span>}
                                {item.sizeSelected && <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">Talle: {item.sizeSelected}</span>}
                                {item.colorSelected && <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">Color: {item.colorSelected}</span>}
                                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-mono">Costo Unit: $ {item.costPrice}</span>
                              </div>
                            </div>
                          </div>

                          {/* Controls (quantity and price override) */}
                          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:shrink-0 justify-between md:justify-end">
                            
                            {/* Quantity */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] font-extrabold uppercase text-zinc-500">Cant</span>
                              <div className="flex items-center border border-zinc-800 rounded-xl bg-zinc-950 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSaleItem(idx, "quantity", item.quantity - 1)}
                                  className="px-2.5 py-1 text-xs hover:bg-zinc-800 text-zinc-300 rounded-l cursor-pointer transition-colors"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateSaleItem(idx, "quantity", parseInt(e.target.value) || 0)}
                                  className="w-10 text-center text-xs font-bold outline-none border-x border-zinc-800 bg-zinc-950/60 text-white font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSaleItem(idx, "quantity", item.quantity + 1)}
                                  className="px-2.5 py-1 text-xs hover:bg-zinc-800 text-zinc-300 rounded-r cursor-pointer transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Custom selling price override */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] font-extrabold uppercase text-zinc-500">P. Venta UYU</span>
                              <input
                                type="text"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "" || /^[0-9]+([.,][0-9]*)?$/.test(val)) {
                                    const normalized = val.replace(",", ".");
                                    handleUpdateSaleItem(idx, "unitPrice", normalized);
                                  }
                                }}
                                className="w-24 px-2 py-1 text-xs font-bold outline-none border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl font-mono text-right bg-zinc-950/60 text-white shadow-inner"
                              />
                            </div>

                            {/* Subtotal of row */}
                            <div className="text-right min-w-[95px] font-mono">
                              <span className="block text-xs font-black text-zinc-100">
                                $ {itemSubtotal.toLocaleString("es-AR")}
                              </span>
                              <span className="block text-[9.5px] text-emerald-400 font-bold">
                                Profit: +$ {itemProfit.toLocaleString("es-AR")}
                              </span>
                            </div>

                            {/* Remove item button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromSale(idx)}
                              className="p-2 text-rose-400 hover:bg-rose-500/15 rounded-lg transition-all border border-rose-500/10 hover:border-rose-500/30 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. TRANSACTION OPERATION METADATA */}
              <div className="space-y-4">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 border-b pb-1.5 border-zinc-800">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>3. Datos de la Operación de Venta</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Customer name */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Cliente Comprador</span>
                    <input
                      type="text"
                      value={newSaleCustomerName}
                      onChange={(e) => setNewSaleCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-white placeholder-zinc-500 outline-none shadow-inner"
                    />
                  </div>

                  {/* Customer email */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Correo Electrónico</span>
                    <input
                      type="email"
                      value={newSaleCustomerEmail}
                      onChange={(e) => setNewSaleCustomerEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-white placeholder-zinc-500 outline-none shadow-inner"
                    />
                  </div>

                  {/* Customer phone */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Teléfono de Contacto</span>
                    <input
                      type="text"
                      value={newSaleCustomerPhone}
                      placeholder="e.g. +598 99123456"
                      onChange={(e) => setNewSaleCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-white placeholder-zinc-500 outline-none shadow-inner"
                    />
                  </div>

                  {/* SECCIÓN DE ENVÍOS - COORDENADAS COMPLETAS */}
                  <div className="md:col-span-3 p-4 bg-zinc-900/30 border border-zinc-800/80 rounded-xl space-y-3 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 border-b border-zinc-800/40 pb-1.5">
                      <Truck className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                      <span>Planificación y Logística de Envío</span>
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* Dirección de Entrega */}
                      <div className="space-y-1 md:col-span-3">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Dirección de Entrega (Opcional)</span>
                        <input
                          type="text"
                          value={newSaleCustomerAddress}
                          placeholder="Luis Batlle Berres 4284, Montevideo (Se registrará en Envíos si se completa)"
                          onChange={(e) => setNewSaleCustomerAddress(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-white placeholder-zinc-600 outline-none shadow-inner"
                        />
                      </div>

                      {/* Horario Coordinado de Delivery */}
                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Horario de Entrega / Delivery</span>
                        <input
                          type="text"
                          value={newSaleDeliveryHours}
                          placeholder="e.g. Después de las 17:00 hs o Coordinar por WhatsApp"
                          onChange={(e) => setNewSaleDeliveryHours(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-white placeholder-zinc-600 outline-none shadow-inner"
                        />
                      </div>

                      {/* Estado del Reparto */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Estado del Reparto</span>
                        <select
                          value={newSaleShippingStatus}
                          onChange={(e) => setNewSaleShippingStatus(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-zinc-200 outline-none cursor-pointer shadow-sm"
                          style={{ color: "inherit", backgroundColor: "inherit" }}
                        >
                          <option value="Pendiente" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Pendiente</option>
                          <option value="En Viaje" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>En Viaje</option>
                          <option value="Entregado" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Entregado</option>
                          <option value="Cancelado" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Cancelado</option>
                        </select>
                      </div>
                    </div>
                    
                    <p className="text-[9px] text-zinc-500 font-semibold leading-relaxed">
                      * Al ingresar una dirección de entrega, se creará o actualizará automáticamente una ficha correspondiente en <strong>Planificación de Envíos</strong> con todos los campos especificados aquí.
                    </p>
                  </div>

                  {/* Deposito origen (Sucursal/Origen) */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Depósito de Origen</span>
                    <select
                      value={newSaleDeposito}
                      onChange={(e) => setNewSaleDeposito(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-zinc-200 outline-none cursor-pointer shadow-sm"
                      style={{ color: "inherit", backgroundColor: "inherit" }}
                    >
                      <option value="Pinamar" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Pinamar (Uruguay Principal)</option>
                      <option value="Montevideo" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Montevideo (Franquicia)</option>
                    </select>
                  </div>

                  {/* Canal de venta */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Canal de Venta</span>
                    <select
                      value={newSaleCanal}
                      onChange={(e) => {
                        const nextCanal = e.target.value;
                        setNewSaleCanal(nextCanal);
                        
                        // Automatically update prices of existing items in the sale transaction based on the new canal
                        const isML = nextCanal && nextCanal.toLowerCase() === "mercado libre";
                        setNewSaleItems(prev => prev.map(item => {
                          const prod = productsList.find(p => String(p.id) === String(item.productId));
                          if (!prod) return item;
                          
                          let updatedPrice = item.unitPrice;
                          if (isML) {
                            if (prod.precioVentaML && prod.precioVentaML > 0) {
                              updatedPrice = prod.precioVentaML;
                            }
                          } else {
                            // Restore to web price or variant override price
                            let basePrice = prod.precioWeb || prod.price || 0;
                            if (item.variantId) {
                              const variant = prod.variants?.find(v => v.id === item.variantId);
                              if (variant && variant.price !== undefined) {
                                basePrice = variant.price;
                              }
                            }
                            updatedPrice = basePrice;
                          }
                          
                          return {
                            ...item,
                            unitPrice: updatedPrice,
                            totalPrice: item.quantity * updatedPrice
                          };
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-zinc-200 outline-none cursor-pointer shadow-sm"
                      style={{ color: "inherit", backgroundColor: "inherit" }}
                    >
                      <option value="WhatsApp" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>WhatsApp</option>
                      <option value="Mercado Libre" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Mercado Libre</option>
                      <option value="Venta Directa" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Venta Directa</option>
                      <option value="Web" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Página Web</option>
                    </select>
                  </div>

                  {/* Shipping Cost */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Costo Envío de Orden ($ UYU)</span>
                    <input
                      type="number"
                      value={newSaleShippingCost}
                      onChange={(e) => setNewSaleShippingCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold font-mono text-right text-white outline-none shadow-inner"
                    />
                  </div>

                  {/* Coupon optional */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Cupón Aplicado (Opcional)</span>
                    <input
                      type="text"
                      placeholder="e.g. APEX50"
                      value={newSaleCouponCode}
                      onChange={(e) => setNewSaleCouponCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-indigo-400 placeholder-zinc-500 outline-none shadow-inner"
                    />
                  </div>

                  {/* Operational status */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Estado de Aprobación</span>
                    <select
                      value={newSaleStatus}
                      onChange={(e) => setNewSaleStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold text-zinc-200 outline-none cursor-pointer shadow-sm"
                      style={{ color: "inherit", backgroundColor: "inherit" }}
                    >
                      <option value="pago_aprobado" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Aprobado (Descuenta Stock)</option>
                      <option value="pago_pendiente" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Pendiente (No descuenta stock)</option>
                      <option value="pago_rechazado" style={{ color: "#ffffff", backgroundColor: "#18181b" }}>Rechazado</option>
                    </select>
                  </div>

                  {/* Fecha de la Venta */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Fecha de la Venta</span>
                    <input
                      type="date"
                      value={newSaleDate}
                      onChange={(e) => setNewSaleDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs font-bold font-mono text-white outline-none shadow-inner"
                    />
                  </div>

                  {/* Bypass Stock toggle (Historical/Old Sales) */}
                  <div className="flex items-center space-x-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3.5 select-none md:col-span-3 shadow-inner">
                    <input
                      id="bypass-stock-deduction"
                      type="checkbox"
                      checked={newSaleBypassStockDeduction}
                      onChange={(e) => setNewSaleBypassStockDeduction(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-500/30 text-amber-500 focus:ring-amber-500/40 bg-zinc-950 cursor-pointer"
                    />
                    <label htmlFor="bypass-stock-deduction" className="text-xs font-bold text-amber-400 cursor-pointer">
                      <strong>Venta Histórica (Sin Descontar Stock):</strong> Marque esta opción para registrar ventas antiguas sin alterar los niveles de stock actuales.
                    </label>
                  </div>

                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Notas Adicionales de la Venta</span>
                  <textarea
                    rows={2}
                    value={newSaleNotes}
                    onChange={(e) => setNewSaleNotes(e.target.value)}
                    placeholder="Escriba especificaciones del despacho, aclaraciones, etc..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs text-zinc-200 outline-none placeholder-zinc-500 font-semibold shadow-inner"
                  />
                </div>
              </div>

              {/* LIVE SIMULATED REVENUE DISTRIBUTION PREVIEW */}
              {newSaleItems.length > 0 && (() => {
                const totalMontoVenta = newSaleItems.reduce((acc, it) => acc + it.totalPrice, 0);
                const totalCostoProd = newSaleItems.reduce((acc, it) => acc + (it.quantity * it.costPrice), 0);
                const isMLCanal = newSaleCanal.toLowerCase() === "mercado libre";
                const totalComisionML = isMLCanal ? newSaleItems.reduce((acc, it) => acc + (it.quantity * (it.comisionML || 0)), 0) : 0;
                
                const netMontoVenta = totalMontoVenta - totalComisionML;
                const netProfit = netMontoVenta - totalCostoProd;
                
                return (
                  <div className="p-5 bg-indigo-500/5 backdrop-blur-md border border-indigo-500/15 rounded-xl space-y-3">
                    <p className="text-[10.5px] font-black uppercase tracking-wider text-indigo-400">
                      Simulación de Distribución de Comisión para esta Operación {isMLCanal && "(Teniendo en cuenta Comisión ML)"}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-1 font-mono">
                      <div>
                        <span className="block text-[9.5px] text-zinc-500 uppercase font-sans font-bold">Monto Venta</span>
                        <span className="text-sm font-black text-zinc-100">
                          $ {totalMontoVenta.toLocaleString("es-AR")} UYU
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9.5px] text-zinc-500 uppercase font-sans font-bold">Costo de Prod</span>
                        <span className="text-sm font-black text-zinc-100">
                          $ {totalCostoProd.toLocaleString("es-AR")} UYU
                        </span>
                      </div>
                      {isMLCanal && (
                        <div>
                          <span className="block text-[9.5px] text-amber-500 uppercase font-sans font-bold">Comisión ML</span>
                          <span className="text-sm font-black text-amber-500">
                            $ {totalComisionML.toLocaleString("es-AR")} UYU
                          </span>
                        </div>
                      )}
                      {newSaleDeposito === "Montevideo" ? (
                        <>
                          <div>
                            <span className="block text-[9.5px] text-emerald-400 uppercase font-sans font-bold">40% Fran. + Envíos</span>
                            <span className="text-sm font-black text-emerald-400">
                              $ {Math.round(
                                0.4 * netProfit + Number(newSaleShippingCost)
                              ).toLocaleString("es-AR")} UYU
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9.5px] text-indigo-400 uppercase font-sans font-bold font-sans">Cost + 60% JUEM</span>
                            <span className="text-sm font-black text-indigo-400">
                              $ {Math.round(
                                totalCostoProd + 0.6 * netProfit
                              ).toLocaleString("es-AR")} UYU
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="block text-[9.5px] text-emerald-500/40 uppercase font-sans font-bold">Total Fran</span>
                            <span className="text-sm font-black text-zinc-500">$ 0 UYU</span>
                          </div>
                          <div>
                            <span className="block text-[9.5px] text-indigo-400 uppercase font-sans font-bold">100% JUEM + Envío</span>
                            <span className="text-sm font-black text-indigo-400">
                              $ {Math.round(
                                netMontoVenta + Number(newSaleShippingCost)
                              ).toLocaleString("es-AR")} UYU
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-zinc-800/80 bg-zinc-950/40 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingOrderId(null); }}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-xl transition-all w-full sm:w-auto text-center border border-transparent hover:border-zinc-800 cursor-pointer"
              >
                {editingOrderId ? "Cancelar" : "Cerrar (Mantener Borrador)"}
              </button>
              
              <button
                type="button"
                disabled={isSubmittingNewSale || newSaleItems.length === 0}
                onClick={handleDispatchSale}
                className={`px-6 py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto shadow-lg transition-all active:scale-[0.98] ${
                  isSubmittingNewSale || newSaleItems.length === 0
                    ? "bg-zinc-850 text-zinc-500 border border-zinc-800/80 cursor-not-allowed shadow-none"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.45)] border border-indigo-500/50"
                }`}
              >
                {isSubmittingNewSale ? (
                  <span>{editingOrderId ? "Guardando cambios..." : "Procesando venta..."}</span>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>{editingOrderId ? "Guardar Cambios" : "Despachar Factura"} ({newSaleItems.reduce((acc, it) => acc + it.quantity, 0)} items)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
