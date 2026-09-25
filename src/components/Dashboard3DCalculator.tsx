import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Printer,
  Calculator,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Sparkles,
  Search,
  Clock,
  DollarSign,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Save,
  Zap,
  X,
  FileText,
  Building2
} from "lucide-react";
import {
  Printer3D,
  Filament3D,
  Settings3D,
  Quote3D,
  CommercialQuote3D,
  CommercialQuoteItem,
  CompanyQuoteSettings
} from "../types";
import { CommercialQuoteModal } from "./CommercialQuoteModal";
import { CompanyQuoteSettingsModal } from "./CompanyQuoteSettingsModal";
import { CommercialQuotesListView } from "./CommercialQuotesListView";
import { ProductSearchProModal, SelectedProductPayload } from "./ProductSearchProModal";

interface Dashboard3DCalculatorProps {
  authToken: string;
  onNavigateSection?: (section: string) => void;
  onProductCreated?: () => void;
}

export const Dashboard3DCalculator: React.FC<Dashboard3DCalculatorProps> = ({
  authToken,
  onNavigateSection,
  onProductCreated
}) => {
  // Navigation tabs (channels removed, commercial quotes added)
  const [activeTab, setActiveTab] = useState<"calculator" | "commercial_quotes" | "quotes" | "printers" | "filaments" | "settings">("calculator");

  // State data
  const [printers, setPrinters] = useState<Printer3D[]>([]);
  const [filaments, setFilaments] = useState<Filament3D[]>([]);
  const [settings, setSettings] = useState<Settings3D>({
    id: "default",
    electricityKwhPrice: 8.5,
    laborHourlyRate: 250,
    defaultFailureRatePercent: 5,
    targetMarginPercent: 50,
    defaultMarkupPercent: 100,
    pricingMode: "margin",
    defaultPackagingCost: 25,
    currency: "UYU",
    exchangeRateUsdUyu: 42.5
  });
  const [quotes, setQuotes] = useState<Quote3D[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Quote form state - piece centric
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");

  const [selectedPrinterId, setSelectedPrinterId] = useState("");
  const [selectedFilamentId, setSelectedFilamentId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [filamentWeightGrams, setFilamentWeightGrams] = useState(35);
  const [printHours, setPrintHours] = useState(2);
  const [printMinutes, setPrintMinutes] = useState(15);
  const [prepMinutes, setPrepMinutes] = useState(5);
  const [postMinutes, setPostMinutes] = useState(5);
  const [packagingCost, setPackagingCost] = useState(25);
  const [pricingMode, setPricingMode] = useState<"margin" | "markup">("margin");
  const [targetRatePercent, setTargetRatePercent] = useState(50);
  const [customFinalPrice, setCustomFinalPrice] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [extras, setExtras] = useState<{ id: string; name: string; unitCost: number; quantity: number }[]>([]);

  // Modals state for CRUD
  const [editingPrinter, setEditingPrinter] = useState<Partial<Printer3D> | null>(null);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [editingFilament, setEditingFilament] = useState<Partial<Filament3D> | null>(null);
  const [showFilamentModal, setShowFilamentModal] = useState(false);

  // Quotes filter
  const [quotesSearch, setQuotesSearch] = useState("");
  const [quotesFilterPrinter, setQuotesFilterPrinter] = useState("");

  // Delete confirmation modal state (replaces window.confirm for iframe resilience)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "printer" | "filament" | "quote";
    id: string;
    title: string;
    description?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Commercial Multi-Item PDF Quotes state
  const [showCommercialModal, setShowCommercialModal] = useState(false);
  const [showProProductSearchModal, setShowProProductSearchModal] = useState(false);
  const [selectedCommercialQuote, setSelectedCommercialQuote] = useState<CommercialQuote3D | null>(null);
  const [commercialCartItems, setCommercialCartItems] = useState<CommercialQuoteItem[]>([]);
  const [showCompanySettingsModal, setShowCompanySettingsModal] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanyQuoteSettings | undefined>(undefined);
  const [commercialRefreshTrigger, setCommercialRefreshTrigger] = useState(0);

  const getActiveToken = () => authToken || localStorage.getItem("apex_admin_token") || "";

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUpdateElectricityKwh = (val: number) => {
    const valid = Math.max(0, isNaN(val) ? 0 : val);
    setSettings((prev) => ({ ...prev, electricityKwhPrice: valid }));
    // Persist silently in background
    try {
      const token = getActiveToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      fetch("/api/3d/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...settings, electricityKwhPrice: valid })
      }).catch(() => {});
    } catch {}
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const activeToken = getActiveToken();
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }

      let url = "";
      if (deleteTarget.type === "printer") {
        url = `/api/3d/printers/${deleteTarget.id}`;
      } else if (deleteTarget.type === "filament") {
        url = `/api/3d/filaments/${deleteTarget.id}`;
      } else if (deleteTarget.type === "quote") {
        url = `/api/3d/quotes/${deleteTarget.id}`;
      }

      const res = await fetch(url, {
        method: "DELETE",
        headers
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (deleteTarget.type === "printer") {
          const remaining = printers.filter((p) => p.id !== deleteTarget.id);
          setPrinters(remaining);
          if (selectedPrinterId === deleteTarget.id) {
            setSelectedPrinterId(remaining[0]?.id || "");
          }
          showToast("Impresora eliminada con éxito");
        } else if (deleteTarget.type === "filament") {
          const remaining = filaments.filter((f) => f.id !== deleteTarget.id);
          setFilaments(remaining);
          if (selectedFilamentId === deleteTarget.id) {
            setSelectedFilamentId(remaining[0]?.id || "");
          }
          showToast("Filamento eliminado con éxito");
        } else if (deleteTarget.type === "quote") {
          setQuotes(quotes.filter((q) => q.id !== deleteTarget.id));
          showToast("Cotización eliminada con éxito");
        }
        setDeleteTarget(null);
      } else {
        showToast(data.message || "Error al eliminar el elemento", "error");
      }
    } catch (err: any) {
      console.error("Error deleting item:", err);
      showToast(err.message || "Error al procesar la eliminación", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Bootstrap initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/3d/bootstrap");
      const data = await res.json();
      if (data.success) {
        setPrinters(data.printers || []);
        setFilaments(data.filaments || []);
        if (data.settings) {
          setSettings(data.settings);
          setPricingMode(data.settings.pricingMode || "margin");
          setTargetRatePercent(
            data.settings.pricingMode === "markup"
              ? data.settings.defaultMarkupPercent
              : data.settings.targetMarginPercent
          );
          setPackagingCost(data.settings.defaultPackagingCost || 25);
        }
        setQuotes(data.quotes || []);

        // Preselect first active printer & filament if not selected
        if (data.printers?.length > 0 && !selectedPrinterId) {
          const activeP = data.printers.find((p: Printer3D) => p.status === "active") || data.printers[0];
          setSelectedPrinterId(activeP.id);
        }
        if (data.filaments?.length > 0 && !selectedFilamentId) {
          const activeF = data.filaments.find((f: Filament3D) => f.status === "active") || data.filaments[0];
          setSelectedFilamentId(activeF.id);
        }
      }
    } catch (err) {
      console.error("Error loading 3D data:", err);
      showToast("Error al cargar los datos de la calculadora 3D", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedPrinterId, selectedFilamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Selected entities
  const currentPrinter = useMemo(
    () => printers.find((p) => p.id === selectedPrinterId) || printers[0],
    [printers, selectedPrinterId]
  );
  const currentFilament = useMemo(
    () => filaments.find((f) => f.id === selectedFilamentId) || filaments[0],
    [filaments, selectedFilamentId]
  );

  // Effective failure rate (%) from current printer profile (or workshop default)
  const effectiveFailureRate = useMemo(() => {
    return currentPrinter ? Number(currentPrinter.failureRatePercent) : (Number(settings.defaultFailureRatePercent) || 5);
  }, [currentPrinter, settings.defaultFailureRatePercent]);

  // Extras total cost
  const extrasTotal = useMemo(() => {
    return extras.reduce((acc, item) => acc + (Number(item.unitCost) || 0) * (Number(item.quantity) || 1), 0);
  }, [extras]);

  // ==========================================
  // REAL COST & PRICING CALCULATIONS ENGINE (SIN COMISIONES)
  // ==========================================
  const calculation = useMemo(() => {
    const totalPrintHours = Math.max(0.01, Number(printHours) + Number(printMinutes) / 60);
    const fxRate = Number(settings.exchangeRateUsdUyu) || 42.5;

    // 1. FILAMENT COST
    const costPerGram = currentFilament ? Number(currentFilament.costPerGram) : 0.85;
    const filamentCostBase = Math.max(0, Number(filamentWeightGrams)) * costPerGram;

    // 2. ELECTRICITY COST
    const printerWatts = currentPrinter ? Number(currentPrinter.powerWatts) : 100;
    const kwhPrice = Number(settings.electricityKwhPrice) || 8.5;
    const electricityKwh = (printerWatts / 1000) * totalPrintHours;
    const electricityCost = electricityKwh * kwhPrice;

    // 3. MACHINE DEPRECIATION / WEAR
    const printerPurchasePrice = currentPrinter ? Number(currentPrinter.purchasePrice) : 350;
    const printerCurrency = currentPrinter?.currency || "USD";
    const printerPriceUYU = printerCurrency === "USD" ? printerPurchasePrice * fxRate : printerPurchasePrice;
    const lifespanHours = currentPrinter ? Math.max(100, Number(currentPrinter.lifespanHours)) : 3000;
    const machinePerHourCost = printerPriceUYU / lifespanHours;
    const machineDepreciationCost = machinePerHourCost * totalPrintHours;

    // 4. MAINTENANCE
    const maintenancePerHour = currentPrinter ? Number(currentPrinter.maintenanceCostPerHour) : 5;
    const maintenanceCost = maintenancePerHour * totalPrintHours;

    // 5. LABOR
    const laborHourly = Number(settings.laborHourlyRate) || 250;
    const laborHours = (Math.max(0, Number(prepMinutes)) + Math.max(0, Number(postMinutes))) / 60;
    const laborCost = laborHours * laborHourly;

    // 6. PACKAGING & EXTRAS
    const packCost = Math.max(0, Number(packagingCost));
    const extraCost = Math.max(0, extrasTotal);

    // 7. FAILURES & SCRAP (Margen de fallo sobre material)
    const failureRate = Math.max(0, Number(effectiveFailureRate) || 0) / 100;
    const failureCost = filamentCostBase * failureRate;
    const materialTotalCost = filamentCostBase + failureCost;

    // 8. DIRECT MACHINE OPERATIONAL COSTS (Luz + Desgaste + Mantenimiento)
    const machineOperatingCost = electricityCost + machineDepreciationCost + maintenanceCost;

    // TOTAL REAL UNIT COST
    const unitRealCost = materialTotalCost + machineOperatingCost + laborCost + packCost + extraCost;
    const safeQty = Math.max(1, Number(quantity) || 1);
    const totalRealCost = unitRealCost * safeQty;

    // PRICING CALCULATIONS DIRECT (SIN COMISIONES DE CANAL)
    const calcPriceWithMargin = (cost: number, marginPct: number) => {
      const m = marginPct / 100;
      if (m >= 0.95) return cost / 0.05;
      return cost / (1 - m);
    };

    const calcPriceWithMarkup = (cost: number, markupPct: number) => {
      return cost * (1 + markupPct / 100);
    };

    // Preset tiers:
    const minPrice =
      pricingMode === "margin"
        ? Math.ceil(calcPriceWithMargin(unitRealCost, 25))
        : Math.ceil(calcPriceWithMarkup(unitRealCost, 50));

    const recommendedPrice =
      pricingMode === "margin"
        ? Math.ceil(calcPriceWithMargin(unitRealCost, targetRatePercent))
        : Math.round(calcPriceWithMarkup(unitRealCost, targetRatePercent) * 100) / 100;

    const targetPrice =
      pricingMode === "margin"
        ? Math.ceil(calcPriceWithMargin(unitRealCost, 65))
        : Math.ceil(calcPriceWithMarkup(unitRealCost, 200));

    // Final price
    const finalPrice = customFinalPrice !== null ? customFinalPrice : recommendedPrice;

    // Direct profit
    const unitProfit = Math.round((finalPrice - unitRealCost) * 100) / 100;
    const totalProfit = Math.round(unitProfit * safeQty * 100) / 100;

    // Effective margin & markup
    const effectiveMarginPercent = finalPrice > 0 ? Math.round(((finalPrice - unitRealCost) / finalPrice) * 1000) / 10 : 0;
    const effectiveMarkupPercent = unitRealCost > 0 ? Math.round(((finalPrice - unitRealCost) / unitRealCost) * 1000) / 10 : 0;

    return {
      totalPrintHours,
      filamentCost: Math.round(filamentCostBase * 100) / 100,
      electricityCost: Math.round(electricityCost * 100) / 100,
      machineDepreciationCost: Math.round(machineDepreciationCost * 100) / 100,
      maintenanceCost: Math.round(maintenanceCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      packagingCost: packCost,
      extrasCost: extraCost,
      failureCost: Math.round(failureCost * 100) / 100,
      materialTotalCost: Math.round(materialTotalCost * 100) / 100,
      machineOperatingCost: Math.round(machineOperatingCost * 100) / 100,
      kwhPrice,
      unitRealCost: Math.round(unitRealCost * 100) / 100,
      totalRealCost: Math.round(totalRealCost * 100) / 100,
      minPrice,
      recommendedPrice,
      targetPrice,
      finalPrice,
      channelCommissionCost: 0,
      unitProfit,
      totalProfit,
      grossProfit: unitProfit,
      actualMarginPercent: effectiveMarginPercent,
      effectiveMarginPercent,
      effectiveMarkupPercent
    };
  }, [
    printHours,
    printMinutes,
    currentFilament,
    currentPrinter,
    filamentWeightGrams,
    prepMinutes,
    postMinutes,
    packagingCost,
    extrasTotal,
    quantity,
    pricingMode,
    targetRatePercent,
    customFinalPrice,
    effectiveFailureRate,
    settings
  ]);

  // Handle saving quote - NO mandatory name or SKU, NO commissions
  const handleSaveQuote = async () => {
    try {
      setActionLoading(true);
      const generatedName = productName.trim() || `Pieza 3D ${filamentWeightGrams}g (${(calculation?.totalPrintHours ?? 0).toFixed(1)}h)`;
      const generatedSku = sku.trim() || `3D-${Date.now().toString().slice(-6)}`;

      const payload = {
        productName: generatedName,
        sku: generatedSku,
        printerId: selectedPrinterId || undefined,
        filamentId: selectedFilamentId || undefined,
        quantity,
        filamentWeightGrams,
        printTimeHours: printHours,
        printTimeMinutes: printMinutes,
        prepTimeMinutes: prepMinutes,
        postProcessTimeMinutes: postMinutes,
        packagingCost,
        extrasTotalCost: extrasTotal,
        pricingMode,
        targetRatePercent,
        costFilament: calculation.filamentCost,
        costElectricity: calculation.electricityCost,
        costMachineDepreciation: calculation.machineDepreciationCost,
        costMaintenance: calculation.maintenanceCost,
        costFailures: calculation.failureCost,
        costLabor: calculation.laborCost,
        costPackaging: calculation.packagingCost,
        totalRealCost: calculation.totalRealCost,
        unitRealCost: calculation.unitRealCost,
        channelCommissionCost: 0,
        minPrice: calculation.minPrice,
        recommendedPrice: calculation.recommendedPrice,
        targetPrice: calculation.targetPrice,
        finalPrice: calculation.finalPrice,
        profit: calculation.totalProfit,
        marginPercent: calculation.effectiveMarginPercent,
        status: "quoted",
        notes,
        extras,
        calculationSnapshot: {
          printerName: currentPrinter?.name,
          filamentName: `${currentFilament?.brand} ${currentFilament?.material} ${currentFilament?.color}`,
          calculatedAt: new Date().toISOString(),
          settingsUsed: settings,
          breakdown: calculation
        }
      };

      const token = getActiveToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/3d/quotes", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast("¡Cotización 3D guardada exitosamente!");
        setQuotes([data.quote, ...quotes]);
      } else {
        showToast(data.message || "Error al guardar cotización", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al guardar cotización", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Commercial Quote PDF modal with current piece or existing cart
  const handleOpenCommercialQuoteModal = (includeCurrentPiece: boolean = true) => {
    let itemsToPass: CommercialQuoteItem[] = [...commercialCartItems];
    if (includeCurrentPiece) {
      const unitP = calculation?.finalPrice && quantity > 0
        ? Number((calculation.finalPrice / quantity).toFixed(2))
        : 350;
      const currentPieceItem: CommercialQuoteItem = {
        itemIndex: itemsToPass.length + 1,
        pieceName: productName.trim() || `Pieza 3D (${currentFilament?.material || "PLA+"})`,
        internalCode: sku.trim() || undefined,
        quantity: Math.max(1, quantity),
        material: currentFilament?.material || "PLA+",
        color: currentFilament?.color || "Estándar",
        weightPerUnitGrams: filamentWeightGrams,
        totalWeightGrams: filamentWeightGrams * quantity,
        printTimeHours: printHours + printMinutes / 60,
        printTimeFormatted: `${printHours}h ${printMinutes}m`,
        totalPrintTimeHours: (printHours + printMinutes / 60) * quantity,
        unitPrice: unitP,
        subtotalPrice: unitP * quantity,
        internalCostBreakdown: calculation || {}
      };

      if (itemsToPass.length === 0) {
        itemsToPass = [currentPieceItem];
      }
    }
    setSelectedCommercialQuote(null);
    setCommercialCartItems(itemsToPass);
    setShowCommercialModal(true);
  };

  const handleAddCurrentPieceToCommercialQuote = () => {
    const unitP = calculation?.finalPrice && quantity > 0
      ? Number((calculation.finalPrice / quantity).toFixed(2))
      : 350;
    const newItem: CommercialQuoteItem = {
      itemIndex: commercialCartItems.length + 1,
      pieceName: productName.trim() || `Pieza #${commercialCartItems.length + 1} (${currentFilament?.material || "PLA+"})`,
      internalCode: sku.trim() || undefined,
      quantity: Math.max(1, quantity),
      material: currentFilament?.material || "PLA+",
      color: currentFilament?.color || "Estándar",
      weightPerUnitGrams: filamentWeightGrams,
      totalWeightGrams: filamentWeightGrams * quantity,
      printTimeHours: printHours + printMinutes / 60,
      printTimeFormatted: `${printHours}h ${printMinutes}m`,
      totalPrintTimeHours: (printHours + printMinutes / 60) * quantity,
      unitPrice: unitP,
      subtotalPrice: unitP * quantity,
      internalCostBreakdown: calculation || {}
    };
    setCommercialCartItems((prev) => [...prev, newItem]);
    showToast(`¡Pieza agregada a la cotización multi-pieza! (${commercialCartItems.length + 1} en total)`);
  };

  const handleAddProductFromProSearchToCart = (payload: SelectedProductPayload) => {
    const unitP = Number(payload.price || 0);
    const qty = Number(payload.quantity || 1);
    const newItem: CommercialQuoteItem = {
      itemIndex: commercialCartItems.length + 1,
      pieceName: payload.name,
      internalCode: payload.sku || undefined,
      quantity: qty,
      material: payload.material || "PLA+",
      color: payload.variant?.color || "Estándar",
      weightPerUnitGrams: 0,
      totalWeightGrams: 0,
      printTimeHours: 0,
      printTimeFormatted: "0h",
      totalPrintTimeHours: 0,
      unitPrice: unitP,
      subtotalPrice: unitP * qty,
      imageUrl: payload.imageUrl,
      internalCostBreakdown: {}
    };
    setCommercialCartItems((prev) => [...prev, newItem]);
    showToast(`Artículo "${payload.name}" con foto agregado a la cotización (${commercialCartItems.length + 1} piezas)`);
  };



  // Duplicate quote into calculator
  const handleLoadQuoteIntoCalculator = (q: Quote3D) => {
    setProductName(q.productName || "");
    setSku(q.sku || "");
    if (q.printerId) setSelectedPrinterId(q.printerId);
    if (q.filamentId) setSelectedFilamentId(q.filamentId);
    setQuantity(q.quantity || 1);
    setFilamentWeightGrams(q.filamentWeightGrams || 35);
    setPrintHours(q.printTimeHours || 0);
    setPrintMinutes(q.printTimeMinutes || 0);
    setPrepMinutes(q.prepTimeMinutes || 0);
    setPostMinutes(q.postProcessTimeMinutes || 0);
    setPackagingCost(q.packagingCost || 25);
    setPricingMode(q.pricingMode || "margin");
    setTargetRatePercent(q.targetRatePercent || 50);
    setCustomFinalPrice(q.finalPrice || null);
    setNotes(q.notes || "");
    if (q.extras && q.extras.length > 0) {
      setExtras(q.extras.map((e) => ({ id: e.id, name: e.name, unitCost: e.unitCost, quantity: e.quantity })));
    } else {
      setExtras([]);
    }
    setActiveTab("calculator");
    showToast("Parámetros cargados en la calculadora");
  };

  // Add extra component
  const addExtra = () => {
    setExtras([...extras, { id: `ext-${Date.now()}`, name: "Inserto metálico / Imán", unitCost: 10, quantity: 1 }]);
  };

  const removeExtra = (id: string) => {
    setExtras(extras.filter((e) => e.id !== id));
  };

  const updateExtra = (id: string, field: "name" | "unitCost" | "quantity", val: any) => {
    setExtras(extras.map((e) => (e.id === id ? { ...e, [field]: val } : e)));
  };

  // Filtered quotes list (without channel)
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchSearch =
        !quotesSearch.trim() ||
        q.productName.toLowerCase().includes(quotesSearch.toLowerCase()) ||
        (q.sku && q.sku.toLowerCase().includes(quotesSearch.toLowerCase()));
      const matchPrinter = !quotesFilterPrinter || q.printerId === quotesFilterPrinter;
      return matchSearch && matchPrinter;
    });
  }, [quotes, quotesSearch, quotesFilterPrinter]);

  return (
    <div className="space-y-6 text-[#F4EAD7]">
      {/* HEADER & BANNER - ÁUREA NOCTURNA PRO */}
      <div className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/30 p-6 md:p-8 text-[#F4EAD7] shadow-[0_4px_30px_rgba(212,165,90,0.12)] relative overflow-hidden">
        {/* Glow de fondo áureo */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-[#D4A55A]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-[#E6BF76]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4A55A]/15 border border-[#D4A55A]/30 text-[#E6BF76] text-xs font-mono font-bold tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#E6BF76]" />
              <span>Calculadora 3D</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-[#F4EAD7] flex items-center gap-3">
              <span>Cálculo de Pieza Impresa 3D</span>
            </h2>
            <p className="text-xs md:text-sm text-[#C5B499] max-w-2xl leading-relaxed">
              Calcula directamente el costo real de fabricación de la pieza, electricidad, desgaste de máquina y precio de venta en pesos uruguayos (UYU).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenCommercialQuoteModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#D4A55A] via-[#E6BF76] to-[#D4A55A] text-[#050B1A] text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(212,165,90,0.25)] hover:shadow-[0_4px_25px_rgba(230,191,118,0.4)] hover:brightness-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Generar Cotización PDF</span>
            </button>
          </div>
        </div>

        {/* SUBTABS DE NAVEGACIÓN - ÁUREA NOCTURNA PRO (CON COTIZACIONES PDF) */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#D4A55A]/20 pt-4">
          {[
            { id: "calculator", label: "Calculadora de Pieza", icon: Calculator },
            { id: "commercial_quotes", label: "Cotizaciones PDF", icon: FileText },
            { id: "quotes", label: `Historial Interno (${quotes.length})`, icon: Clock },
            { id: "printers", label: `Impresoras (${printers.length})`, icon: Printer },
            { id: "filaments", label: `Filamentos (${filaments.length})`, icon: Layers },
            { id: "settings", label: "Ajustes de Taller", icon: Sliders }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  isActive
                    ? "bg-[#D4A55A] text-[#050B1A] border-[#E6BF76] shadow-[0_2px_15px_rgba(212,165,90,0.3)] font-extrabold"
                    : "bg-[#050B1A]/70 text-[#C5B499] border-[#D4A55A]/20 hover:bg-[#D4A55A]/10 hover:text-[#F4EAD7]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#050B1A]" : "text-[#E6BF76]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TOAST FEEDBACK - ÁUREA NOCTURNA */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedback.type === "success"
              ? "bg-[#0B1730] border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              : "bg-[#0B1730] border-rose-500/40 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-[#A0AEC0] hover:text-[#F4EAD7] cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ==========================================
          TAB 1: CALCULADORA RÁPIDA DE LA PIEZA (DIRECTA)
          ========================================== */}
      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* PANEL IZQUIERDO: PARÁMETROS DE LA PIEZA (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/30 p-6 md:p-7 shadow-[0_4px_25px_rgba(5,11,26,0.5)] space-y-6">
              
              {/* Cabecera del calculador */}
              <div className="flex items-center justify-between border-b border-[#D4A55A]/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-[#D4A55A]/15 border border-[#D4A55A]/30 text-[#E6BF76] flex items-center justify-center shadow-inner">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-serif font-bold text-[#F4EAD7] tracking-wide">
                      Parámetros de la Pieza Impresa
                    </h3>
                    <p className="text-[11px] text-[#C5B499]">Ajusta peso y tiempo para conocer el costo y precio en tiempo real</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFilamentWeightGrams(35);
                    setPrintHours(2);
                    setPrintMinutes(15);
                    setPrepMinutes(5);
                    setPostMinutes(5);
                    setPackagingCost(25);
                    setTargetRatePercent(50);
                    setCustomFinalPrice(null);
                    setExtras([]);
                    setProductName("");
                    setSku("");
                    showToast("Valores reiniciados a los predeterminados");
                  }}
                  className="text-xs text-[#C5B499] hover:text-[#E6BF76] flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Restablecer</span>
                </button>
              </div>

              {/* SECCIÓN 1 Y 2: PESO (GRAMOS) Y TIEMPO EN LA MISMA LÍNEA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SECCIÓN 1: PESO DE LA PIEZA (GRAMOS) */}
                <div className="bg-[#050B1A]/80 border border-[#D4A55A]/25 rounded-2xl p-4 md:p-5 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-serif font-bold text-[#E6BF76] flex items-center gap-2">
                        <Layers className="h-4 w-4 text-[#D4A55A]" />
                        <span>1. Peso de la Pieza (Gramos)</span>
                      </label>
                      <span className="text-[11px] font-mono text-[#C5B499]">
                        Costo: <strong className="text-[#E6BF76]">${calculation.filamentCost} UYU</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={filamentWeightGrams}
                          onChange={(e) => setFilamentWeightGrams(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-base font-mono font-bold bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] focus:ring-1 focus:ring-[#E6BF76]"
                        />
                        <span className="absolute right-3 top-3 text-xs font-mono font-bold text-[#D4A55A]">
                          g
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setFilamentWeightGrams((g) => Math.max(0, Number((g - 5).toFixed(1))))}
                          className="px-2.5 py-2.5 rounded-xl bg-[#0B1730] border border-[#D4A55A]/30 text-[#C5B499] hover:text-[#F4EAD7] hover:border-[#D4A55A] font-bold text-xs cursor-pointer active:scale-95 transition-all"
                          title="Restar 5 gramos"
                        >
                          -5g
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilamentWeightGrams((g) => Number((g + 5).toFixed(1)))}
                          className="px-2.5 py-2.5 rounded-xl bg-[#0B1730] border border-[#D4A55A]/30 text-[#C5B499] hover:text-[#F4EAD7] hover:border-[#D4A55A] font-bold text-xs cursor-pointer active:scale-95 transition-all"
                          title="Sumar 5 gramos"
                        >
                          +5g
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilamentWeightGrams((g) => Number((g + 10).toFixed(1)))}
                          className="px-2.5 py-2.5 rounded-xl bg-[#0B1730] border border-[#D4A55A]/30 text-[#E6BF76] hover:border-[#E6BF76] font-bold text-xs cursor-pointer active:scale-95 transition-all"
                          title="Sumar 10 gramos"
                        >
                          +10g
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Presets rápidos de peso */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#D4A55A]/10">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#A0AEC0]">Atajos:</span>
                    {[15, 30, 50, 75, 120, 200, 350].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFilamentWeightGrams(preset)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                          filamentWeightGrams === preset
                            ? "bg-[#D4A55A] text-[#050B1A] shadow-sm"
                            : "bg-[#0B1730] text-[#C5B499] hover:text-[#F4EAD7] border border-[#D4A55A]/20"
                        }`}
                      >
                        {preset}g
                      </button>
                    ))}
                  </div>
                </div>

                {/* SECCIÓN 2: TIEMPO DE IMPRESIÓN */}
                <div className="bg-[#050B1A]/80 border border-[#D4A55A]/25 rounded-2xl p-4 md:p-5 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-serif font-bold text-[#E6BF76] flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#D4A55A]" />
                        <span>2. Tiempo de Impresión</span>
                      </label>
                      <span className="text-[11px] font-mono text-[#C5B499]">
                        Total: <strong className="text-[#E6BF76]">{(calculation?.totalPrintHours ?? 0).toFixed(2)}h</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#A0AEC0]">Horas</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={printHours}
                            onChange={(e) => setPrintHours(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full pl-3.5 pr-8 py-2.5 rounded-xl text-base font-mono font-bold bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                          />
                          <span className="absolute right-3 top-3 text-xs font-mono text-[#A0AEC0]">h</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#A0AEC0]">Minutos</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={printMinutes}
                            onChange={(e) => setPrintMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-base font-mono font-bold bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                          />
                          <span className="absolute right-3 top-3 text-xs font-mono text-[#A0AEC0]">min</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Presets rápidos de tiempo */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#D4A55A]/10">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#A0AEC0]">Atajos:</span>
                    {[
                      { h: 0, m: 45, label: "45m" },
                      { h: 1, m: 30, label: "1h 30" },
                      { h: 2, m: 15, label: "2h 15" },
                      { h: 4, m: 0, label: "4h" },
                      { h: 6, m: 30, label: "6h 30" },
                      { h: 10, m: 0, label: "10h" }
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPrintHours(p.h);
                          setPrintMinutes(p.m);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                          printHours === p.h && printMinutes === p.m
                            ? "bg-[#D4A55A] text-[#050B1A] shadow-sm"
                            : "bg-[#0B1730] text-[#C5B499] hover:text-[#F4EAD7] border border-[#D4A55A]/20"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: IMPRESORA, FILAMENTO Y ELECTRICIDAD */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Filamento */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-serif font-bold text-[#E6BF76] flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-[#D4A55A]" />
                      <span>Material / Filamento</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFilament({
                          brand: "eSun",
                          material: "PLA+",
                          color: "Negro",
                          spoolWeightGrams: 1000,
                          spoolPrice: 900,
                          currency: "UYU",
                          status: "active"
                        });
                        setShowFilamentModal(true);
                      }}
                      className="text-[11px] text-[#E6BF76] hover:underline font-bold cursor-pointer"
                    >
                      + Nuevo
                    </button>
                  </div>
                  <select
                    value={selectedFilamentId}
                    onChange={(e) => setSelectedFilamentId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] font-medium cursor-pointer"
                  >
                    {filaments.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.color} - {f.brand} {f.material} (${f.costPerGram} UYU/g)
                      </option>
                    ))}
                  </select>
                  {currentFilament && (
                    <div className="text-[10px] text-[#A0AEC0] flex items-center gap-2 pt-0.5">
                      <span>Bobina: {currentFilament.spoolWeightGrams}g (${currentFilament.spoolPrice} {currentFilament.currency})</span>
                      <span>•</span>
                      <span className="text-[#E6BF76] font-mono">${currentFilament.costPerGram} / g</span>
                    </div>
                  )}
                </div>

                {/* Impresora */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-serif font-bold text-[#E6BF76] flex items-center gap-1.5">
                      <Printer className="h-3.5 w-3.5 text-[#D4A55A]" />
                      <span>Impresora 3D</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {currentPrinter && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPrinter({ ...currentPrinter });
                            setShowPrinterModal(true);
                          }}
                          className="text-[11px] text-[#C5B499] hover:text-[#E6BF76] hover:underline font-medium cursor-pointer"
                          title="Editar parámetros permanentes de esta impresora"
                        >
                          Editar
                        </button>
                      )}
                      <span className="text-[#A0AEC0]/30">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPrinter({
                            name: "",
                            brand: "Bambu Lab",
                            model: "",
                            purchasePrice: 400,
                            currency: "USD",
                            lifespanHours: 3500,
                            powerWatts: 120,
                            maintenanceCostPerHour: 5,
                            failureRatePercent: 4,
                            buildVolumeX: 256,
                            buildVolumeY: 256,
                            buildVolumeZ: 256,
                            status: "active"
                          });
                          setShowPrinterModal(true);
                        }}
                        className="text-[11px] text-[#E6BF76] hover:underline font-bold cursor-pointer"
                      >
                        + Nueva
                      </button>
                    </div>
                  </div>
                  <select
                    value={selectedPrinterId}
                    onChange={(e) => setSelectedPrinterId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] font-medium cursor-pointer"
                  >
                    {printers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.powerWatts}W) • Fallas: {p.failureRatePercent}%
                      </option>
                    ))}
                  </select>
                  {currentPrinter && (
                    <div className="text-[10px] text-[#A0AEC0] flex items-center gap-1.5 pt-0.5 truncate">
                      <span>Fallas: <strong className="text-[#E6BF76]">{currentPrinter.failureRatePercent}%</strong></span>
                      <span>•</span>
                      <span>Vida: <strong className="text-[#F4EAD7]">{currentPrinter.lifespanHours}h</strong></span>
                      <span>•</span>
                      <span>Mant: <strong className="text-[#F4EAD7]">${currentPrinter.maintenanceCostPerHour}/h</strong></span>
                    </div>
                  )}
                </div>

                {/* Costo kWh (Electricidad) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-serif font-bold text-[#E6BF76] flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-[#D4A55A]" />
                      <span>Costo kWh (Luz)</span>
                    </label>
                    <span className="text-[10px] text-[#A0AEC0]">UTE / Tarifa eléctrica</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={settings.electricityKwhPrice}
                      onChange={(e) => handleUpdateElectricityKwh(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] font-mono font-bold pr-20"
                      placeholder="12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#A0AEC0] font-mono pointer-events-none">
                      $ UYU/kWh
                    </span>
                  </div>
                  <div className="flex items-center gap-1 pt-0.5">
                    {[8.5, 10, 12, 14].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleUpdateElectricityKwh(rate)}
                        className={`flex-1 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                          settings.electricityKwhPrice === rate
                            ? "bg-[#D4A55A] text-[#050B1A] border-[#E6BF76]"
                            : "bg-[#050B1A] text-[#C5B499] border-[#D4A55A]/20 hover:text-white"
                        }`}
                        title={`Fijar costo de electricidad en $${rate} UYU / kWh`}
                      >
                        ${rate}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-[#A0AEC0] flex items-center justify-between pt-0.5">
                    <span>Consumo: <strong className="text-[#F4EAD7]">{currentPrinter?.powerWatts || 100}W</strong></span>
                    <span>•</span>
                    <span>Hora luz: <strong className="text-[#E6BF76] font-mono">${(((currentPrinter?.powerWatts || 100) / 1000) * (settings.electricityKwhPrice || 12)).toFixed(2)}/h</strong></span>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4 Y 5: MARGEN DE GANANCIA Y OPCIONES ADICIONALES EN LA MISMA LÍNEA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SECCIÓN 4: MARGEN DIRECTO DE GANANCIA */}
                <div className="bg-[#050B1A]/80 border border-[#D4A55A]/25 rounded-2xl p-4 md:p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#D4A55A]/15">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-[#D4A55A]" />
                        <span className="text-xs font-serif font-bold text-[#E6BF76]">Fijación de Margen:</span>
                      </div>

                      <div className="inline-flex rounded-xl border border-[#D4A55A]/30 p-0.5 bg-[#0B1730]">
                        <button
                          type="button"
                          onClick={() => {
                            setPricingMode("margin");
                            setTargetRatePercent(50);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            pricingMode === "margin"
                              ? "bg-[#D4A55A] text-[#050B1A] font-extrabold shadow-sm"
                              : "text-[#C5B499] hover:text-[#F4EAD7]"
                          }`}
                        >
                          Margen % Venta
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPricingMode("markup");
                            setTargetRatePercent(100);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            pricingMode === "markup"
                              ? "bg-[#D4A55A] text-[#050B1A] font-extrabold shadow-sm"
                              : "text-[#C5B499] hover:text-[#F4EAD7]"
                          }`}
                        >
                          Markup % Costo
                        </button>
                      </div>
                    </div>

                    {/* Slider de porcentaje */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#C5B499] text-[11px]">
                          {pricingMode === "margin"
                            ? "Margen libre deseado en mano:"
                            : `Multiplicador de costo (x${(1 + targetRatePercent / 100).toFixed(1)}):`}
                        </span>
                        <span className="font-mono font-black text-[#E6BF76] text-base">
                          {pricingMode === "markup" ? `x${(1 + targetRatePercent / 100).toFixed(1)} ` : ""}({targetRatePercent}%)
                        </span>
                      </div>

                      <input
                        type="range"
                        min={pricingMode === "margin" ? 15 : 25}
                        max={pricingMode === "margin" ? 85 : 400}
                        step="5"
                        value={targetRatePercent}
                        onChange={(e) => setTargetRatePercent(parseInt(e.target.value) || 50)}
                        className="w-full accent-[#D4A55A] cursor-pointer"
                      />

                      {/* Botones de preset de margen */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {(pricingMode === "margin" ? [30, 40, 50, 60, 70] : [100, 150, 200, 300, 400]).map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setTargetRatePercent(pct)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              targetRatePercent === pct
                                ? "bg-[#D4A55A] text-[#050B1A]"
                                : "bg-[#0B1730] text-[#C5B499] hover:text-[#F4EAD7] border border-[#D4A55A]/20"
                            }`}
                          >
                            {pricingMode === "margin"
                              ? `${pct}%`
                              : pct === 100
                              ? "x2"
                              : pct === 150
                              ? "x2.5"
                              : pct === 200
                              ? "x3"
                              : pct === 300
                              ? "x4"
                              : "x5"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B1730] border border-[#D4A55A]/15 text-[11px] text-[#C5B499] space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Ganancia bruta estimada:</span>
                      <strong className="font-mono text-[#E6BF76]">${calculation?.grossProfit ?? calculation?.unitProfit ?? 0} UYU</strong>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#A0AEC0]">
                      <span>Margen neto resultante:</span>
                      <span className="font-mono">{(calculation?.actualMarginPercent ?? calculation?.effectiveMarginPercent ?? 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 5: AJUSTES ADICIONALES (YA NO OCULTO - DIRECTAMENTE VISIBLE) */}
                <div className="bg-[#050B1A]/80 border border-[#D4A55A]/25 rounded-2xl p-4 md:p-5 flex flex-col justify-between space-y-3.5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#D4A55A]/15">
                      <div className="flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-[#D4A55A]" />
                        <span className="text-xs font-serif font-bold text-[#E6BF76]">
                          Opciones Adicionales
                        </span>
                      </div>
                      <span className="text-[10px] text-[#A0AEC0]">Mano de obra, packaging y extras</span>
                    </div>

                    {/* Mano de obra y packaging en 3 columnas */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#A0AEC0] uppercase truncate block" title="Preparación de archivo y cama en minutos">
                          Prep. (min)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={prepMinutes}
                          onChange={(e) => setPrepMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#A0AEC0] uppercase truncate block" title="Postprocesado y limpieza en minutos">
                          Postproc. (min)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={postMinutes}
                          onChange={(e) => setPostMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#A0AEC0] uppercase truncate block" title="Costo de caja o bolsa">
                          Pack ($ UYU)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={packagingCost}
                          onChange={(e) => setPackagingCost(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
                        />
                      </div>
                    </div>

                    {/* Extras / Insumos no 3D */}
                    <div className="space-y-2 pt-1 border-t border-[#D4A55A]/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#C5B499]">Insumos no 3D:</span>
                        <button
                          type="button"
                          onClick={addExtra}
                          className="text-[11px] text-[#E6BF76] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Agregar componente</span>
                        </button>
                      </div>

                      {extras.length > 0 ? (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {extras.map((ex) => (
                            <div key={ex.id} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={ex.name}
                                onChange={(e) => updateExtra(ex.id, "name", e.target.value)}
                                placeholder="Nombre (ej. Imán)"
                                className="flex-1 min-w-0 px-2.5 py-1 text-xs rounded-lg bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7]"
                              />
                              <div className="flex items-center gap-1 w-20 shrink-0">
                                <span className="text-[10px] text-[#A0AEC0]">$</span>
                                <input
                                  type="number"
                                  value={ex.unitCost}
                                  onChange={(e) => updateExtra(ex.id, "unitCost", parseFloat(e.target.value) || 0)}
                                  className="w-full px-1.5 py-1 text-xs rounded-lg bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] text-right font-mono"
                                />
                              </div>
                              <div className="flex items-center gap-1 w-14 shrink-0">
                                <span className="text-[10px] text-[#A0AEC0]">x</span>
                                <input
                                  type="number"
                                  value={ex.quantity}
                                  onChange={(e) => updateExtra(ex.id, "quantity", parseInt(e.target.value) || 1)}
                                  className="w-full px-1.5 py-1 text-xs rounded-lg bg-[#0B1730] border border-[#D4A55A]/30 text-[#F4EAD7] text-right font-mono"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeExtra(ex.id)}
                                className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer shrink-0"
                                title="Eliminar componente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#A0AEC0] italic">
                          Opcional: agrega imanes, tornillos, inserts o adhesivos.
                        </p>
                      )}
                    </div>
                  </div>


                </div>
              </div>

            </div>
          </div>

          {/* PANEL DERECHO: RESULTADO & VALOR DE LA PIEZA (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/35 p-6 md:p-7 shadow-[0_4px_35px_rgba(212,165,90,0.15)] space-y-6 sticky top-6">
              
              {/* Cabecera del Resumen */}
              <div className="flex items-center justify-between border-b border-[#D4A55A]/20 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#E6BF76]" />
                  <span className="text-xs font-serif font-black uppercase tracking-wider text-[#E6BF76]">
                    Valor de la Pieza 3D
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4A55A]/15 text-[#E6BF76] border border-[#D4A55A]/30 text-[10px] font-mono font-bold">
                  {filamentWeightGrams}g • {(calculation?.totalPrintHours ?? 0).toFixed(1)}h
                </span>
              </div>

              {/* CARD DESTACADA: COSTO REAL DE FABRICACIÓN */}
              <div className="bg-[#050B1A] rounded-2xl p-5 border border-[#D4A55A]/30 shadow-inner space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#A0AEC0] block">
                  Costo Real de Fabricación
                </span>
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-serif font-black text-[#F4EAD7]">
                    ${calculation.unitRealCost} <span className="text-xs font-sans font-normal text-[#C5B499]">UYU / pieza</span>
                  </div>
                  <span className="px-2 py-1 rounded-xl bg-[#D4A55A]/15 border border-[#D4A55A]/30 text-[10px] font-mono font-bold text-[#E6BF76]">
                    {currentFilament?.material || "PLA"}
                  </span>
                </div>
                <p className="text-[11px] text-[#A0AEC0] pt-1">
                  Incluye filamento, electricidad, desgaste de máquina, lubricación y margen de fallas.
                </p>
              </div>

              {/* 3 PRECIOS SUGERIDOS: MÍNIMO, RECOMENDADO Y OBJETIVO */}
              <div className="grid grid-cols-3 gap-2">
                {/* Precio Mínimo */}
                <button
                  type="button"
                  onClick={() => setCustomFinalPrice(calculation.minPrice)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    calculation.finalPrice === calculation.minPrice
                      ? "bg-[#D4A55A]/25 border-[#E6BF76] text-[#F4EAD7] shadow-[0_0_15px_rgba(212,165,90,0.2)]"
                      : "bg-[#050B1A]/70 border-[#D4A55A]/20 hover:border-[#D4A55A]/40 text-[#C5B499]"
                  }`}
                >
                  <div className="text-[9px] uppercase font-bold text-[#A0AEC0]">Mínimo</div>
                  <div className="text-base font-serif font-black text-[#F4EAD7]">${calculation.minPrice}</div>
                  <div className="text-[9px] font-mono text-[#A0AEC0]">Punto equi.</div>
                </button>

                {/* Precio Recomendado (Destacado Áureo) */}
                <button
                  type="button"
                  onClick={() => setCustomFinalPrice(calculation.recommendedPrice)}
                  className={`p-3 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    calculation.finalPrice === calculation.recommendedPrice
                      ? "bg-[#D4A55A] text-[#050B1A] border-[#E6BF76] shadow-[0_0_20px_rgba(212,165,90,0.35)]"
                      : "bg-[#D4A55A]/15 border-[#D4A55A]/40 hover:border-[#E6BF76] text-[#E6BF76]"
                  }`}
                >
                  <div className={`text-[9px] uppercase font-black ${calculation.finalPrice === calculation.recommendedPrice ? "text-[#050B1A]" : "text-[#E6BF76]"}`}>
                    Recomendado
                  </div>
                  <div className="text-lg font-serif font-black">${calculation.recommendedPrice}</div>
                  <div className={`text-[9px] font-mono font-bold ${calculation.finalPrice === calculation.recommendedPrice ? "text-[#050B1A]" : "text-[#E6BF76]"}`}>
                    {targetRatePercent}% {pricingMode === "margin" ? "margen" : "mkp"}
                  </div>
                </button>

                {/* Precio Objetivo */}
                <button
                  type="button"
                  onClick={() => setCustomFinalPrice(calculation.targetPrice)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    calculation.finalPrice === calculation.targetPrice
                      ? "bg-[#D4A55A]/25 border-[#E6BF76] text-[#F4EAD7] shadow-[0_0_15px_rgba(212,165,90,0.2)]"
                      : "bg-[#050B1A]/70 border-[#D4A55A]/20 hover:border-[#D4A55A]/40 text-[#C5B499]"
                  }`}
                >
                  <div className="text-[9px] uppercase font-bold text-[#A0AEC0]">Objetivo</div>
                  <div className="text-base font-serif font-black text-[#F4EAD7]">${calculation.targetPrice}</div>
                  <div className="text-[9px] font-mono text-[#A0AEC0]">Alto margen</div>
                </button>
              </div>

              {/* PRECIO FINAL AJUSTABLE DIRECTO */}
              <div className="space-y-1.5 bg-[#050B1A]/90 p-4 rounded-2xl border border-[#D4A55A]/25">
                <div className="flex items-center justify-between text-xs font-serif font-bold text-[#E6BF76]">
                  <span>Precio de Venta Cobrado:</span>
                  <span className="text-[10px] font-sans font-normal text-[#C5B499]">Puedes escribir el valor directo</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-base font-mono font-bold text-[#D4A55A]">$</span>
                  <input
                    type="number"
                    value={calculation.finalPrice}
                    onChange={(e) => setCustomFinalPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-16 py-2 rounded-xl text-xl font-mono font-black bg-[#0B1730] border border-[#D4A55A]/40 text-[#E6BF76] focus:outline-none focus:border-[#E6BF76]"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-mono font-bold text-[#C5B499]">
                    UYU
                  </span>
                </div>
              </div>

              {/* GANANCIA NETA EN MANO */}
              <div className="grid grid-cols-2 gap-3 bg-[#050B1A] border border-emerald-500/30 rounded-2xl p-4 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400/80 block">
                    Ganancia Neta
                  </span>
                  <div className="text-2xl font-serif font-black text-emerald-400">
                    +${calculation.unitProfit} <span className="text-xs font-sans font-normal text-emerald-300">UYU</span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80">Limpia tras costos</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400/80 block">
                    Margen Real
                  </span>
                  <div className="text-2xl font-mono font-black text-emerald-400">
                    {calculation.effectiveMarginPercent}%
                  </div>
                  <span className="text-[10px] text-emerald-400/80">sobre precio final</span>
                </div>
              </div>

              {/* DESGLOSE TRANSPARENTE DEL COSTO DE LA PIEZA */}
              <div className="space-y-2 border-t border-[#D4A55A]/20 pt-4">
                <span className="text-[11px] uppercase tracking-wider font-serif font-bold text-[#E6BF76] block">
                  Desglose de Producción
                </span>
                <div className="space-y-2 text-xs text-[#C5B499]">
                  {/* Inversión Material */}
                  <div className="bg-[#050B1A]/70 p-2.5 rounded-xl border border-[#D4A55A]/15 space-y-1">
                    <div className="flex justify-between font-bold text-[#F4EAD7]">
                      <span className="flex items-center gap-1.5">
                        <Layers className="h-3 w-3 text-[#D4A55A]" />
                        <span>Inversión Material:</span>
                      </span>
                      <span className="font-mono text-[#E6BF76]">
                        ${(Number(calculation?.filamentCost || 0) + Number(calculation?.failureCost || 0)).toFixed(2)} UYU
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#A0AEC0] pl-4">
                      <span>• Filamento ({filamentWeightGrams}g):</span>
                      <span className="font-mono">${Number(calculation?.filamentCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#A0AEC0] pl-4">
                      <span>• Fallas estimadas ({effectiveFailureRate}%):</span>
                      <span className="font-mono text-[#E6BF76]">+${Number(calculation?.failureCost || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Luz, Desgaste y Mantenimiento */}
                  <div className="bg-[#050B1A]/70 p-2.5 rounded-xl border border-[#D4A55A]/15 space-y-1">
                    <div className="flex justify-between font-bold text-[#F4EAD7]">
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-[#D4A55A]" />
                        <span>Luz, Desgaste y Mantenimiento:</span>
                      </span>
                      <span className="font-mono text-[#E6BF76]">
                        ${(Number(calculation?.electricityCost || 0) + Number(calculation?.machineDepreciationCost || 0) + Number(calculation?.maintenanceCost || 0)).toFixed(2)} UYU
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#A0AEC0] pl-4">
                      <span>• Luz ({(calculation?.totalPrintHours ?? 0).toFixed(1)}h @ ${settings.electricityKwhPrice}/kWh):</span>
                      <span className="font-mono">${Number(calculation?.electricityCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#A0AEC0] pl-4">
                      <span>• Desgaste máquina:</span>
                      <span className="font-mono">${Number(calculation?.machineDepreciationCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#A0AEC0] pl-4">
                      <span>• Fondo repuestos:</span>
                      <span className="font-mono">${Number(calculation?.maintenanceCost || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Otros gastos / Extras */}
                  {(Number(calculation?.laborCost || 0) > 0 || Number(calculation?.packagingCost || 0) > 0 || Number(calculation?.extrasCost || 0) > 0) && (
                    <div className="bg-[#050B1A]/70 p-2.5 rounded-xl border border-[#D4A55A]/15 space-y-1">
                      <div className="flex justify-between font-bold text-[#F4EAD7]">
                        <span>Otros Gastos (Pack/Post/Extras):</span>
                        <span className="font-mono text-[#E6BF76]">
                          ${(Number(calculation?.laborCost || 0) + Number(calculation?.packagingCost || 0) + Number(calculation?.extrasCost || 0)).toFixed(2)} UYU
                        </span>
                      </div>
                      {Number(calculation?.laborCost || 0) > 0 && (
                        <div className="flex justify-between text-[10px] text-[#A0AEC0] pl-4">
                          <span>• Mano de obra:</span>
                          <span className="font-mono">${Number(calculation.laborCost).toFixed(2)}</span>
                        </div>
                      )}
                      {Number(calculation?.packagingCost || 0) > 0 && (
                        <div className="flex justify-between text-[10px] text-[#A0AEC0] pl-4">
                          <span>• Packaging:</span>
                          <span className="font-mono">${Number(calculation.packagingCost).toFixed(2)}</span>
                        </div>
                      )}
                      {Number(calculation?.extrasCost || 0) > 0 && (
                        <div className="flex justify-between text-[10px] text-[#A0AEC0] pl-4">
                          <span>• Insumos extras:</span>
                          <span className="font-mono">${Number(calculation.extrasCost).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between font-serif font-black text-[#F4EAD7] border-t border-[#D4A55A]/25 pt-2 text-sm">
                    <span>Costo Total Neto:</span>
                    <span className="font-mono text-[#E6BF76] text-base">${Number(calculation?.unitRealCost || 0).toFixed(2)} UYU</span>
                  </div>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN: GENERAR PDF, AGREGAR PIEZA, HISTORIAL */}
              <div className="space-y-2.5 pt-2 border-t border-[#D4A55A]/20">
                {/* 1. BOTÓN PRINCIPAL: GENERAR COTIZACIÓN PDF */}
                <button
                  type="button"
                  onClick={() => handleOpenCommercialQuoteModal(true)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D4A55A] via-[#E6BF76] to-[#D4A55A] text-[#050B1A] font-serif font-black text-xs uppercase tracking-wider transition-all shadow-[0_4px_25px_rgba(212,165,90,0.35)] hover:shadow-[0_4px_30px_rgba(230,191,118,0.5)] hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  <span>Generar Cotización PDF</span>
                </button>

                {/* 2. BOTÓN SECUNDARIO: AGREGAR A COTIZACIÓN MULTI-PIEZA */}
                <button
                  type="button"
                  onClick={handleAddCurrentPieceToCommercialQuote}
                  className="w-full py-2.5 rounded-2xl bg-[#050B1A] hover:bg-[#D4A55A]/15 text-[#E6BF76] border border-[#D4A55A]/40 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>
                    Agregar Pieza a Cotización {commercialCartItems.length > 0 && `(${commercialCartItems.length})`}
                  </span>
                </button>

                {/* BADGE SI HAY PIEZAS EN COLA */}
                {commercialCartItems.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#D4A55A]/10 border border-[#D4A55A]/30 flex items-center justify-between text-xs">
                    <span className="text-[#C5B499]">
                      📋 <strong className="text-[#E6BF76]">{commercialCartItems.length}</strong> {commercialCartItems.length === 1 ? "pieza lista" : "piezas listas"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenCommercialQuoteModal(false)}
                      className="text-[#E6BF76] hover:underline font-bold text-[11px] cursor-pointer"
                    >
                      Ver y Generar PDF →
                    </button>
                  </div>
                )}

                {/* 3. GUARDAR EN HISTORIAL */}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSaveQuote}
                  className="w-full py-2.5 rounded-2xl bg-[#050B1A]/80 hover:bg-white/5 text-[#A0AEC0] hover:text-[#F4EAD7] border border-[#D4A55A]/20 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{actionLoading ? "Guardando..." : "Guardar en Historial Interno"}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB: COTIZACIONES COMERCIALES PDF (JUEM)
          ========================================== */}
      {activeTab === "commercial_quotes" && (
        <CommercialQuotesListView
          onOpenModal={(quoteToEdit) => {
            setSelectedCommercialQuote(quoteToEdit || null);
            setShowCommercialModal(true);
          }}
          onOpenCompanySettings={() => setShowCompanySettingsModal(true)}
          companySettings={companySettings}
          authToken={authToken}
          showToast={(msg, type) => showToast(msg, type === "error" ? "error" : "success")}
          refreshTrigger={commercialRefreshTrigger}
        />
      )}

      {/* ==========================================
          TAB 2: HISTORIAL DE COTIZACIONES
          ========================================== */}
      {activeTab === "quotes" && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS */}
          <div className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/30 p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="relative w-full md:w-80">
              <Search className="h-4 w-4 absolute left-3.5 top-3 text-[#A0AEC0]" />
              <input
                type="text"
                placeholder="Buscar por pieza..."
                value={quotesSearch}
                onChange={(e) => setQuotesSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={quotesFilterPrinter}
                onChange={(e) => setQuotesFilterPrinter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/25 text-[#F4EAD7] focus:outline-none cursor-pointer"
              >
                <option value="">Todas las impresoras</option>
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* TABLA HISTORIAL */}
          <div className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/30 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050B1A] border-b border-[#D4A55A]/25 text-[11px] font-serif font-bold text-[#E6BF76] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Fecha</th>
                    <th className="px-4 py-3.5">Pieza</th>
                    <th className="px-4 py-3.5">Máquina & Filamento</th>
                    <th className="px-4 py-3.5">Gramos</th>
                    <th className="px-4 py-3.5">Costo Real</th>
                    <th className="px-4 py-3.5">Precio Cobrado</th>
                    <th className="px-4 py-3.5">Ganancia</th>
                    <th className="px-4 py-3.5">Margen</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4A55A]/15">
                  {filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-[#A0AEC0]">
                        No hay cotizaciones guardadas aún. Usa la calculadora para generar la primera.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((q) => (
                      <tr key={q.id} className="hover:bg-[#050B1A]/40 transition-colors">
                        <td className="px-4 py-3.5 text-[#A0AEC0] whitespace-nowrap">
                          {q.createdAt ? new Date(q.createdAt).toLocaleDateString("es-UY") : "-"}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-[#F4EAD7]">
                          <div>{q.productName}</div>
                          {q.sku && <div className="text-[10px] text-[#A0AEC0] font-mono">{q.sku}</div>}
                        </td>
                        <td className="px-4 py-3.5 text-[#C5B499]">
                          <div>{q.printerName || "Impresora"}</div>
                          <div className="text-[10px] text-[#A0AEC0]">{q.filamentName || "Material"}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#E6BF76]">{q.filamentWeightGrams}g</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-[#F4EAD7]">${q.unitRealCost}</td>
                        <td className="px-4 py-3.5 font-mono font-black text-[#E6BF76]">${q.finalPrice}</td>
                        <td className="px-4 py-3.5 font-mono text-emerald-400 font-bold">+${q.profit}</td>
                        <td className="px-4 py-3.5 font-mono">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            {q.marginPercent}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleLoadQuoteIntoCalculator(q)}
                              title="Cargar en Calculadora"
                              className="p-2 rounded-xl bg-[#050B1A] hover:bg-[#D4A55A] hover:text-[#050B1A] transition-all text-[#E6BF76] border border-[#D4A55A]/30 cursor-pointer"
                            >
                              <Calculator className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget({
                                  type: "quote",
                                  id: q.id,
                                  title: q.productName || "Cotización 3D",
                                  description: `Fecha: ${new Date(q.createdAt).toLocaleDateString()} • Total: $${q.finalPrice || q.recommendedPrice} UYU`
                                });
                              }}
                              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white transition-all text-rose-400 border border-rose-500/30 cursor-pointer"
                              title="Eliminar cotización"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: PERFIL DE IMPRESORAS 3D (CRUD)
          ========================================== */}
      {activeTab === "printers" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif font-bold text-[#F4EAD7]">Parque de Impresoras 3D</h3>
              <p className="text-xs text-[#C5B499]">Consumo eléctrico, amortización y costo de mantenimiento por hora</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingPrinter({
                  name: "",
                  brand: "Bambu Lab",
                  model: "",
                  purchasePrice: 400,
                  currency: "USD",
                  lifespanHours: 3500,
                  powerWatts: 120,
                  maintenanceCostPerHour: 5,
                  failureRatePercent: 4,
                  buildVolumeX: 256,
                  buildVolumeY: 256,
                  buildVolumeZ: 256,
                  status: "active"
                });
                setShowPrinterModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] text-[#050B1A] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Impresora</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {printers.map((p) => {
              const machineCostPerHour = (
                ((Number(p.purchasePrice) || 0) * (p.currency === "USD" ? (Number(settings?.exchangeRateUsdUyu) || 42.5) : 1)) /
                Math.max(1, Number(p.lifespanHours) || 3000)
              ).toFixed(1);

              return (
                <div
                  key={p.id}
                  className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/30 p-5 shadow-lg space-y-4 relative group"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-serif font-bold text-[#F4EAD7]">{p.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "active"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          {p.status === "active" ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                      <div className="text-xs text-[#A0AEC0]">
                        {p.brand} {p.model}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPrinter(p);
                          setShowPrinterModal(true);
                        }}
                        className="p-2 rounded-xl bg-[#050B1A] hover:bg-[#D4A55A] hover:text-[#050B1A] transition-all text-[#E6BF76] border border-[#D4A55A]/25 cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget({
                            type: "printer",
                            id: p.id,
                            title: p.name,
                            description: `Marca: ${p.brand} ${p.model || ""} (${p.powerWatts}W) • Depreciación: $${machineCostPerHour} UYU/h`
                          });
                        }}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white transition-all text-rose-400 border border-rose-500/30 cursor-pointer"
                        title="Eliminar impresora"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#050B1A] p-3 rounded-2xl border border-[#D4A55A]/20">
                    <div>
                      <span className="text-[10px] text-[#A0AEC0] block">Depreciación</span>
                      <span className="font-mono font-bold text-[#E6BF76]">${machineCostPerHour} UYU/h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#A0AEC0] block">Potencia</span>
                      <span className="font-bold text-[#F4EAD7]">{p.powerWatts}W</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#A0AEC0] block">Vida Útil</span>
                      <span className="font-bold text-[#F4EAD7]">{p.lifespanHours}h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#A0AEC0] block">Volumen</span>
                      <span className="font-bold text-[#F4EAD7]">{p.buildVolumeX}x{p.buildVolumeY}x{p.buildVolumeZ}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#A0AEC0] pt-1">
                    <span>Precio: ${p.purchasePrice} {p.currency}</span>
                    <span>Tasa fallas: {p.failureRatePercent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: PERFIL DE FILAMENTOS (CRUD)
          ========================================== */}
      {activeTab === "filaments" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif font-bold text-[#F4EAD7]">Filamentos y Materiales</h3>
              <p className="text-xs text-[#C5B499]">Costo automático por gramo calculado a partir del precio y peso del carrete</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingFilament({
                  brand: "eSun",
                  material: "PLA+",
                  color: "Negro",
                  spoolWeightGrams: 1000,
                  spoolPrice: 900,
                  currency: "UYU",
                  status: "active"
                });
                setShowFilamentModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] text-[#050B1A] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Filamento</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filaments.map((f) => (
              <div
                key={f.id}
                className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/30 p-4 shadow-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-serif font-bold text-[#F4EAD7]">{f.color}</span>
                    <div className="text-[11px] text-[#A0AEC0]">{f.brand} {f.material}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFilament(f);
                        setShowFilamentModal(true);
                      }}
                      className="p-1.5 rounded-xl bg-[#050B1A] text-[#E6BF76] hover:bg-[#D4A55A] hover:text-[#050B1A] border border-[#D4A55A]/25 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget({
                          type: "filament",
                          id: f.id,
                          title: `${f.brand} ${f.material} - ${f.color}`,
                          description: `Carrete de ${f.spoolWeightGrams}g a $${f.costPerGram} UYU/gramo`
                        });
                      }}
                      className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 cursor-pointer"
                      title="Eliminar filamento"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="bg-[#050B1A] p-3 rounded-2xl border border-[#D4A55A]/20 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#A0AEC0]">Costo por gramo:</span>
                    <span className="font-mono font-black text-[#E6BF76]">${f.costPerGram} UYU</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#C5B499]">
                    <span>Precio carrete:</span>
                    <span>${f.spoolPrice} {f.currency}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#C5B499]">
                    <span>Peso carrete:</span>
                    <span>{f.spoolWeightGrams}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 5: CONFIGURACIÓN GENERAL
          ========================================== */}
      {activeTab === "settings" && (
        <div className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/30 p-6 md:p-8 shadow-xl max-w-3xl space-y-6">
          <div className="border-b border-[#D4A55A]/20 pb-4">
            <h3 className="text-lg font-serif font-bold text-[#F4EAD7]">Configuración General del Taller 3D</h3>
            <p className="text-xs text-[#C5B499]">Parámetros aplicados por defecto a los cálculos rápidos de piezas</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#C5B499]">Precio Electricidad (UTE $ / kWh)</label>
              <input
                type="number"
                step="0.1"
                value={settings.electricityKwhPrice}
                onChange={(e) => setSettings({ ...settings, electricityKwhPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#C5B499]">Valor Hora Mano de Obra ($ / hora)</label>
              <input
                type="number"
                value={settings.laborHourlyRate}
                onChange={(e) => setSettings({ ...settings, laborHourlyRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#C5B499]">Tasa de Fallas Predeterminada (%)</label>
              <input
                type="number"
                value={settings.defaultFailureRatePercent}
                onChange={(e) => setSettings({ ...settings, defaultFailureRatePercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#C5B499]">Margen Objetivo Predeterminado (%)</label>
              <input
                type="number"
                value={settings.targetMarginPercent}
                onChange={(e) => setSettings({ ...settings, targetMarginPercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#E6BF76] focus:outline-none focus:border-[#E6BF76] font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#C5B499]">Packaging Predeterminado ($ UYU)</label>
              <input
                type="number"
                value={settings.defaultPackagingCost}
                onChange={(e) => setSettings({ ...settings, defaultPackagingCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#C5B499]">Tipo de Cambio USD / UYU</label>
              <input
                type="number"
                step="0.1"
                value={settings.exchangeRateUsdUyu}
                onChange={(e) => setSettings({ ...settings, exchangeRateUsdUyu: parseFloat(e.target.value) || 42.5 })}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] focus:outline-none focus:border-[#E6BF76] font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#D4A55A]/20 flex justify-end">
            <button
              type="button"
              disabled={actionLoading}
              onClick={async () => {
                try {
                  setActionLoading(true);
                  const token = getActiveToken();
                  const headers: Record<string, string> = { "Content-Type": "application/json" };
                  if (token) headers["Authorization"] = `Bearer ${token}`;

                  const res = await fetch("/api/3d/settings", {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(settings)
                  });
                  const d = await res.json();
                  if (d.success) {
                    showToast("Configuración guardada correctamente");
                  }
                } catch (err: any) {
                  showToast(err.message || "Error al guardar", "error");
                } finally {
                  setActionLoading(false);
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] text-[#050B1A] font-serif font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CREAR / EDITAR IMPRESORA
          ========================================== */}
      {showPrinterModal && editingPrinter && (
        <div className="fixed inset-0 bg-[#050B1A]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/40 p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-[#F4EAD7]">
            <div className="flex items-center justify-between border-b border-[#D4A55A]/20 pb-3">
              <h3 className="text-sm font-serif font-bold text-[#E6BF76]">
                {editingPrinter.id ? "Editar Impresora 3D" : "Nueva Impresora 3D"}
              </h3>
              <button onClick={() => setShowPrinterModal(false)} className="text-[#A0AEC0] hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2 space-y-1">
                <label className="font-bold text-[#C5B499]">Nombre de la Impresora *</label>
                <input
                  type="text"
                  value={editingPrinter.name || ""}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, name: e.target.value })}
                  placeholder="Ej. Bambu Lab A1 Mini"
                  className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#C5B499]">Marca</label>
                <input
                  type="text"
                  value={editingPrinter.brand || ""}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, brand: e.target.value })}
                  placeholder="Bambu Lab"
                  className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#C5B499]">Modelo</label>
                <input
                  type="text"
                  value={editingPrinter.model || ""}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, model: e.target.value })}
                  placeholder="A1 Mini"
                  className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#C5B499]">Precio de Compra</label>
                <input
                  type="number"
                  value={editingPrinter.purchasePrice || 0}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, purchasePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#C5B499]">Moneda</label>
                <select
                  value={editingPrinter.currency || "USD"}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, currency: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="UYU">UYU ($)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#C5B499]">Vida Útil (Horas)</label>
                <input
                  type="number"
                  value={editingPrinter.lifespanHours || 3000}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, lifespanHours: parseFloat(e.target.value) || 3000 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#C5B499]">Consumo (Watts)</label>
                <input
                  type="number"
                  value={editingPrinter.powerWatts || 100}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, powerWatts: parseFloat(e.target.value) || 100 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#C5B499]">Tasa de Fallas Estimada (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={editingPrinter.failureRatePercent ?? 4}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, failureRatePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#E6BF76] font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#C5B499]">Mantenimiento ($ / hora)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editingPrinter.maintenanceCostPerHour ?? 5}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, maintenanceCostPerHour: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="font-bold text-[#C5B499]">Volumen de Impresión (X x Y x Z mm)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={editingPrinter.buildVolumeX ?? 180}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, buildVolumeX: parseInt(e.target.value) || 0 })}
                    placeholder="X (mm)"
                    className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                  />
                  <input
                    type="number"
                    value={editingPrinter.buildVolumeY ?? 180}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, buildVolumeY: parseInt(e.target.value) || 0 })}
                    placeholder="Y (mm)"
                    className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                  />
                  <input
                    type="number"
                    value={editingPrinter.buildVolumeZ ?? 180}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, buildVolumeZ: parseInt(e.target.value) || 0 })}
                    placeholder="Z (mm)"
                    className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#D4A55A]/20">
              <button
                type="button"
                onClick={() => setShowPrinterModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#A0AEC0] hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const isEdit = !!editingPrinter.id;
                    const url = isEdit ? `/api/3d/printers/${editingPrinter.id}` : "/api/3d/printers";
                    const method = isEdit ? "PUT" : "POST";
                    const token = getActiveToken();
                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    if (token) headers["Authorization"] = `Bearer ${token}`;

                    const res = await fetch(url, {
                      method,
                      headers,
                      body: JSON.stringify(editingPrinter)
                    });
                    const d = await res.json();
                    if (d.success) {
                      showToast(isEdit ? "Impresora actualizada" : "Impresora agregada");
                      setShowPrinterModal(false);
                      fetchData();
                    } else {
                      showToast(d.message, "error");
                    }
                  } catch (err: any) {
                    showToast(err.message, "error");
                  }
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] text-[#050B1A] font-bold text-xs cursor-pointer shadow-md"
              >
                Guardar Impresora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CREAR / EDITAR FILAMENTO
          ========================================== */}
      {showFilamentModal && editingFilament && (
        <div className="fixed inset-0 bg-[#050B1A]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1730] rounded-3xl border border-[#D4A55A]/40 p-6 w-full max-w-md shadow-2xl space-y-4 text-[#F4EAD7]">
            <div className="flex items-center justify-between border-b border-[#D4A55A]/20 pb-3">
              <h3 className="text-sm font-serif font-bold text-[#E6BF76]">
                {editingFilament.id ? "Editar Filamento" : "Nuevo Carrete de Filamento"}
              </h3>
              <button onClick={() => setShowFilamentModal(false)} className="text-[#A0AEC0] hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#C5B499]">Marca</label>
                  <input
                    type="text"
                    value={editingFilament.brand || ""}
                    onChange={(e) => setEditingFilament({ ...editingFilament, brand: e.target.value })}
                    placeholder="eSun, Sunlu..."
                    className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#C5B499]">Material</label>
                  <input
                    type="text"
                    value={editingFilament.material || ""}
                    onChange={(e) => setEditingFilament({ ...editingFilament, material: e.target.value })}
                    placeholder="PLA+, PETG..."
                    className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#C5B499]">Color</label>
                <input
                  type="text"
                  value={editingFilament.color || ""}
                  onChange={(e) => setEditingFilament({ ...editingFilament, color: e.target.value })}
                  placeholder="Negro Mate, Blanco..."
                  className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-[#C5B499]">Peso Carrete (g)</label>
                  <input
                    type="number"
                    value={editingFilament.spoolWeightGrams || 1000}
                    onChange={(e) => setEditingFilament({ ...editingFilament, spoolWeightGrams: parseFloat(e.target.value) || 1000 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#C5B499]">Precio Carrete ($ UYU)</label>
                  <input
                    type="number"
                    value={editingFilament.spoolPrice || 900}
                    onChange={(e) => setEditingFilament({ ...editingFilament, spoolPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#F4EAD7] font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#D4A55A]/20">
              <button
                type="button"
                onClick={() => setShowFilamentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#A0AEC0] hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const isEdit = !!editingFilament.id;
                    const url = isEdit ? `/api/3d/filaments/${editingFilament.id}` : "/api/3d/filaments";
                    const method = isEdit ? "PUT" : "POST";
                    const token = getActiveToken();
                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    if (token) headers["Authorization"] = `Bearer ${token}`;

                    const res = await fetch(url, {
                      method,
                      headers,
                      body: JSON.stringify(editingFilament)
                    });
                    const d = await res.json();
                    if (d.success) {
                      showToast(isEdit ? "Filamento actualizado" : "Filamento agregado");
                      setShowFilamentModal(false);
                      fetchData();
                    } else {
                      showToast(d.message, "error");
                    }
                  } catch (err: any) {
                    showToast(err.message, "error");
                  }
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] text-[#050B1A] font-bold text-xs cursor-pointer shadow-md"
              >
                Guardar Filamento
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ==========================================
          MODAL DE CONFIRMACIÓN DE ELIMINACIÓN (Áurea Nocturna Pro)
      ========================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0B1730] border border-[#D4A55A]/40 rounded-3xl p-6 md:p-7 shadow-[0_10px_50px_rgba(5,11,26,0.9)] space-y-5 text-[#F4EAD7] relative">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-[#F4EAD7]">
                  {deleteTarget.type === "printer"
                    ? "¿Eliminar Impresora 3D?"
                    : deleteTarget.type === "filament"
                    ? "¿Eliminar Filamento / Carrete?"
                    : "¿Eliminar Cotización?"}
                </h3>
                <p className="text-xs text-[#C5B499]">Esta acción es permanente y no se puede deshacer.</p>
              </div>
            </div>

            <div className="bg-[#050B1A] border border-[#D4A55A]/20 rounded-2xl p-4 space-y-1">
              <span className="text-xs font-bold text-[#E6BF76] block">{deleteTarget.title}</span>
              {deleteTarget.description && (
                <span className="text-[11px] text-[#A0AEC0] block">{deleteTarget.description}</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-[#050B1A] border border-[#D4A55A]/30 text-[#C5B499] hover:text-[#F4EAD7] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executeDelete}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(244,63,94,0.35)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirmar Eliminación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COTIZACIÓN COMERCIAL PDF (MULTI-PIEZA) */}
      <CommercialQuoteModal
        isOpen={showCommercialModal}
        onClose={() => {
          setShowCommercialModal(false);
          setSelectedCommercialQuote(null);
        }}
        quote={selectedCommercialQuote}
        initialItems={commercialCartItems.length > 0 ? commercialCartItems : undefined}
        companySettings={companySettings}
        authToken={authToken}
        showToast={(msg, type) => showToast(msg, type === "error" ? "error" : "success")}
        onSaveSuccess={(savedQuote) => {
          setSelectedCommercialQuote(savedQuote);
          setCommercialCartItems([]);
          setCommercialRefreshTrigger((prev) => prev + 1);
        }}
        onConvertToOrder={async (quoteId) => {
          try {
            const token = getActiveToken();
            const res = await fetch(`/api/3d/commercial-quotes/${quoteId}/convert-to-order`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
              showToast(data.message || "Cotización convertida en pedido con éxito.", "success");
              setShowCommercialModal(false);
              setCommercialRefreshTrigger((prev) => prev + 1);
              if (onProductCreated) onProductCreated();
            } else {
              showToast(data.message || "Error al convertir", "error");
            }
          } catch (err: any) {
            showToast(err.message || "Error", "error");
          }
        }}
      />

      {/* MODAL DE CONFIGURACIÓN DE JUEM (LOGO, CONTACTO, CONDICIONES) */}
      <CompanyQuoteSettingsModal
        isOpen={showCompanySettingsModal}
        onClose={() => setShowCompanySettingsModal(false)}
        authToken={authToken}
        onSaved={(updated) => setCompanySettings(updated)}
        showToast={(msg, type) => showToast(msg, type === "error" ? "error" : "success")}
      />

      {/* BUSCADOR PRO DE ARTÍCULOS CON FOTO */}
      <ProductSearchProModal
        isOpen={showProProductSearchModal}
        onClose={() => setShowProProductSearchModal(false)}
        onSelectProduct={handleAddProductFromProSearchToCart}
        existingItems={commercialCartItems}
        title="Buscador Pro de Artículos — Catálogo JUEM con Fotos"
      />
    </div>
  );
};
