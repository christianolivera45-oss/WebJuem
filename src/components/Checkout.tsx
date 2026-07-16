import { useState, useEffect, useMemo, FormEvent, DragEvent } from "react";
import { 
  ArrowLeft, 
  CreditCard, 
  Landmark, 
  Truck, 
  HelpCircle, 
  ArrowRight, 
  Loader2, 
  Minus, 
  Plus, 
  Trash2, 
  User, 
  Phone, 
  MapPin, 
  Building, 
  Edit, 
  PlusCircle, 
  Check, 
  X, 
  FileText,
  Home,
  Mail,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  GripVertical,
  Copy,
  MessageSquare
} from "lucide-react";
import { CartItem, SiteSettings, Coupon, is3DProduct } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { InteractiveMap } from "./InteractiveMap";

interface AddressItem {
  id: string;
  dept: string;
  zone: string;
  street: string;
  doorNumber: string;
  apartment?: string;
  solar?: string;
  manzana?: string;
  additionalData?: string;
}

const DEPT_ZONES: Record<string, string[]> = {
  Artigas: [
    "Artigas (Capital)",
    "Bella Unión",
    "Tomás Gomensoro",
    "Baltasar Brum",
    "Las Piedras (Artigas)",
    "Paso Campamento"
  ],
  Canelones: [
    "Aguas Corrientes",
    "Araminda",
    "Atlántida",
    "Balneario Argentino",
    "Barros Blancos",
    "Bello Horizonte",
    "Canelones (Capital)",
    "Cerrillos",
    "Ciudad de la Costa",
    "Colinas de Solymar",
    "Colonia Nicolich",
    "Costa Azul",
    "Cuchilla Alta",
    "El Fortín",
    "El Pinar",
    "Empalme Olmos",
    "Estación Atlántida",
    "Guazuvirá",
    "Jaureguiberry",
    "Joaquín Suárez",
    "La Floresta",
    "La Paz",
    "Lagomar",
    "Las Piedras",
    "Las Toscas",
    "Lomas de Solymar",
    "Marindia",
    "Migues",
    "Montes",
    "Neptunia",
    "Pando",
    "Parque de Solymar",
    "Parque del Plata",
    "Paso Carrasco",
    "Pinamar",
    "Progreso",
    "Salinas",
    "San Jacinto",
    "San José de Carrasco",
    "San Luis",
    "San Ramón",
    "Santa Lucía",
    "Santa Rosa",
    "Sauce",
    "Shangrilá",
    "Soca",
    "Solymar",
    "Tala",
    "Toledo",
    "Villa Aeroparque"
  ],
  "Cerro Largo": [
    "Melo (Capital)",
    "Río Branco",
    "Fraile Muerto",
    "Isidoro Noblía",
    "Aceguá",
    "Ramón Trigo",
    "Tupambaé"
  ],
  Colonia: [
    "Colonia del Sacramento",
    "Carmelo",
    "Nueva Helvecia",
    "Juan Lacaze",
    "Rosario",
    "Tarariras",
    "Nueva Palmira",
    "Colonia Valdense",
    "Florencio Sánchez",
    "Conchillas",
    "Ombúes de Lavalle"
  ],
  Durazno: [
    "Durazno (Capital)",
    "Sarandí del Yí",
    "Villa del Carmen",
    "La Paloma (Durazno)",
    "Centenario",
    "Blanquillo",
    "Carlos Reyles"
  ],
  Flores: [
    "Trinidad (Capital)",
    "Ismael Cortinas"
  ],
  Florida: [
    "Florida (Capital)",
    "Sarandí Grande",
    "Casupá",
    "Fray Marcos",
    "Cardal",
    "25 de Mayo",
    "25 de Agosto",
    "Chamizo",
    "Nico Pérez"
  ],
  Lavalleja: [
    "Minas (Capital)",
    "José Pedro Varela",
    "Solís de Mataojo",
    "Mariscala",
    "José Batlle y Ordóñez",
    "Pirarajá",
    "Villa Serrana"
  ],
  Maldonado: [
    "Maldonado Centro",
    "Punta del Este",
    "Piriápolis",
    "San Carlos",
    "José Ignacio",
    "Manantiales",
    "Pinares",
    "La Barra",
    "Portezuelo",
    "Aiguá",
    "Pan de Azúcar",
    "Punta Ballena",
    "Las Flores",
    "Bella Vista"
  ],
  Montevideo: [
    "Aguada",
    "Aires Puros",
    "Atahualpa",
    "Bañados de Carrasco",
    "Barrio Sur",
    "Belvedere",
    "Brazo Oriental",
    "Buceo",
    "Capurro, Bella Vista, Arroyo Seco",
    "Carrasco",
    "Carrasco Norte",
    "Casabó, Pajas Blancas",
    "Casavalle, Barrio Borro",
    "Castro Castellanos",
    "Centro",
    "Cerrito de la Victoria",
    "Ciudad Vieja",
    "Colón Centro y Noroeste",
    "Colón Sureste, Abayubá",
    "Conciliación",
    "Cordón",
    "Flor de Maroñas",
    "Ituzaingó",
    "Jacinto Vera",
    "Jardines del Hipódromo",
    "La Blanqueada",
    "La Comercial",
    "La Figurita",
    "La Paloma, Tomkinson, Rincón del Cerro",
    "La Teja",
    "Larrañaga",
    "Las Acacias",
    "Las Canteras",
    "Lezica, Melilla",
    "Malvín",
    "Malvín Norte",
    "Manga",
    "Manga, Toledo Chico",
    "Maroñas, Parque Guaraní",
    "Mercado Modelo, Bolívar",
    "Nuevo París",
    "Palermo",
    "Parque Batlle, Villa Dolores",
    "Parque Rodó",
    "Paso de la Arena, Los Bulevares, Santiago Vázquez",
    "Paso de las Duranas",
    "Peñarol, Lavalleja",
    "Piedras Blancas",
    "Pocitos",
    "Prado, Nueva Savona",
    "Punta Carretas",
    "Punta Gorda",
    "Punta de Rieles, Bella Italia",
    "Reducto",
    "Sayago",
    "Tres Cruces",
    "Tres Ombúes, Pueblo Victoria",
    "Unión",
    "Villa García, Manga Rural",
    "Villa Muñoz, Goes, Retiro",
    "Villa del Cerro",
    "Villa Española"
  ],
  Paysandú: [
    "Paysandú (Capital)",
    "Guichón",
    "Quebracho",
    "Lorenzo Geyres",
    "Piedras Coloradas",
    "Gallinal",
    "Tambores (Paysandú)"
  ],
  "Río Negro": [
    "Fray Bentos (Capital)",
    "Young",
    "Nuevo Berlín",
    "San Javier",
    "Algorta",
    "Bellaco"
  ],
  Rivera: [
    "Rivera (Capital)",
    "Tranqueras",
    "Minas de Corrales",
    "Vichadero",
    "Masoller"
  ],
  Rocha: [
    "Rocha (Capital)",
    "Chuy",
    "Castillos",
    "Lascano",
    "La Paloma",
    "Punta del Diablo",
    "La Pedrera",
    "Barra de Valizas",
    "Cabo Polonio",
    "Aguas Dulces",
    "San Luis al Medio",
    "18 de Julio"
  ],
  Salto: [
    "Salto (Capital)",
    "Constitución",
    "Belén",
    "Daymán",
    "San Antonio",
    "Termas del Arapey"
  ],
  "San José": [
    "San José de Mayo",
    "Ciudad del Plata",
    "Libertad",
    "Ecilda Paullier",
    "Rodríguez",
    "Puntas de Valdez",
    "Capurro",
    "Mal Abrigo"
  ],
  Soriano: [
    "Mercedes (Capital)",
    "Dolores",
    "Cardona",
    "Chacras de Dolores",
    "José Enrique Rodó",
    "Palmitas",
    "Villa Soriano"
  ],
  Tacuarembó: [
    "Tacuarembó (Capital)",
    "Paso de los Toros",
    "San Gregorio de Polanco",
    "Ansina",
    "Curtina",
    "Caraguatá"
  ],
  "Treinta y Tres": [
    "Treinta y Tres (Capital)",
    "Vergara",
    "Santa Clara de Olimar",
    "Cerro Chato",
    "General Enrique Martínez (Charqueada)",
    "Rincón"
  ]
};

interface CheckoutProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, size?: string, color?: string) => void;
  onRemoveItem: (productId: string, size?: string, color?: string) => void;
  settings: SiteSettings;
  onClearCart: () => void;
  onBackToCatalog: () => void;
  coupons?: Coupon[];
}

export default function Checkout({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  settings,
  onClearCart,
  onBackToCatalog,
  coupons
}: CheckoutProps) {
  // Client details states (Clean/empty on start as requested, loaded from localStorage if exists)
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleCopyText = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Could not copy text: ", err);
    }
  };
  const [firstName, setFirstName] = useState(() => {
    try {
      return localStorage.getItem("checkout_firstName") || "";
    } catch (_) {
      return "";
    }
  });
  const [lastName, setLastName] = useState(() => {
    try {
      return localStorage.getItem("checkout_lastName") || "";
    } catch (_) {
      return "";
    }
  });
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem("checkout_email") || "";
    } catch (_) {
      return "";
    }
  });
  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem("checkout_phone") || "";
    } catch (_) {
      return "";
    }
  });
  const [wantsInvoice, setWantsInvoice] = useState(() => {
    try {
      return localStorage.getItem("checkout_wantsInvoice") === "true";
    } catch (_) {
      return false;
    }
  });
  const [rutNumber, setRutNumber] = useState(() => {
    try {
      return localStorage.getItem("checkout_rutNumber") || "";
    } catch (_) {
      return "";
    }
  });
  const [companyName, setCompanyName] = useState(() => {
    try {
      return localStorage.getItem("checkout_companyName") || "";
    } catch (_) {
      return "";
    }
  });
  const [fiscalAddress, setFiscalAddress] = useState(() => {
    try {
      return localStorage.getItem("checkout_fiscalAddress") || "";
    } catch (_) {
      return "";
    }
  });

  // Validation States for real-time error handling
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Uruguayan RUT Checksum Validation (Module 11)
  const validateRUTUruguay = (rut: string): boolean => {
    const cleanRut = rut.replace(/\D/g, "");
    if (cleanRut.length !== 12) return false;
    
    // First two digits represent department code 01-21 in Uruguay
    const dptoCode = parseInt(cleanRut.substring(0, 2), 10);
    if (dptoCode < 1 || dptoCode > 21) return false;
    
    // Verify branch suffix is valid (usually non-zero)
    const branch = parseInt(cleanRut.substring(8, 11), 10);
    if (branch < 1) return false;
    
    // Checksum Weights: 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2
    const weights = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(cleanRut.charAt(i), 10) * weights[i];
    }
    const mod = sum % 11;
    const digitoVerificadorCalculado = mod === 0 ? 0 : 11 - mod;
    const digitoVerificadorReal = parseInt(cleanRut.charAt(11), 10);
    
    if (digitoVerificadorCalculado === 10) {
      return false;
    }
    return digitoVerificadorCalculado === digitoVerificadorReal;
  };

  const validateField = (fieldName: string, value: string, currentWantsInvoice?: boolean): string => {
    const activeWantsInvoice = currentWantsInvoice !== undefined ? currentWantsInvoice : wantsInvoice;
    const sanitize = (val: string) => {
      return val.replace(/<[^>]*>/g, "").trim();
    };

    switch (fieldName) {
      case "firstName": {
        const clean = sanitize(value);
        if (!clean) return "El nombre es obligatorio.";
        if (clean.length < 2) return "El nombre debe tener un mínimo de 2 caracteres.";
        const lettersOnly = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\'\.]+(\s[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\'\.]+)*$/;
        if (!lettersOnly.test(clean)) {
          return "El nombre sólo debe contener letras, espacios y caracteres acentuados.";
        }
        return "";
      }
      case "lastName": {
        const clean = sanitize(value);
        if (!clean) return "El apellido es obligatorio.";
        if (clean.length < 2) return "El apellido debe tener un mínimo de 2 caracteres.";
        const lettersOnly = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\'\.]+(\s[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\'\.]+)*$/;
        if (!lettersOnly.test(clean)) {
          return "El apellido sólo debe contener letras, espacios y caracteres acentuados.";
        }
        return "";
      }
      case "email": {
        const clean = sanitize(value);
        if (!clean) return "El correo electrónico es obligatorio.";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(clean)) {
          return "Por favor ingresa una dirección de correo electrónico válida.";
        }
        return "";
      }
      case "phone": {
        const cleanVal = value.trim();
        if (!cleanVal) return "El teléfono de contacto es obligatorio.";
        
        const digitsOnly = cleanVal.replace(/\D/g, "");
        if (digitsOnly.length < 8) return "El teléfono debe tener un mínimo de 8 dígitos.";
        if (digitsOnly.length > 9) return "El teléfono no puede tener más de 9 dígitos.";

        // Validar fijos (8 dígitos) o celulares (9 dígitos) de Uruguay
        let isUruguayFormat = false;
        if (/^09\d{7}$/.test(digitsOnly)) {
          isUruguayFormat = true; // celular Uruguay (ej: 099123456)
        } else if (/^[24]\d{7}$/.test(digitsOnly)) {
          isUruguayFormat = true; // fijo Uruguay (ej: 24001234)
        } else if (/^9\d{7}$/.test(digitsOnly)) {
          isUruguayFormat = true; // celular uruguayo sin el 0 inicial (ej: 99123456)
        }

        if (!isUruguayFormat) {
          return "Debe ser un teléfono uruguayo válido: fijos (8 dígitos, ej: 24001234) o celulares (9 dígitos, ej: 099123456).";
        }
        return "";
      }
      case "rutNumber": {
        if (!activeWantsInvoice) return "";
        const cleanVal = value.replace(/\D/g, "");
        if (!value.trim()) return "El RUT es obligatorio.";
        if (cleanVal.length !== 12) return `El RUT debe tener exactamente 12 dígitos (se detectaron ${cleanVal.length}). Al escribir puedes incluir puntos, guiones o espacios.`;

        const isValidRut = validateRUTUruguay(cleanVal);
        if (!isValidRut) {
          return "El RUT ingresado no es válido para Uruguay (dígito verificador incorrecto).";
        }
        return "";
      }
      case "companyName": {
        if (!activeWantsInvoice) return "";
        const clean = sanitize(value);
        if (!clean) return "La Razón Social es obligatoria.";
        if (clean.length < 2) return "La Razón Social debe tener un mínimo de 2 caracteres.";
        return "";
      }
      case "fiscalAddress": {
        if (!activeWantsInvoice) return "";
        const clean = sanitize(value);
        if (!clean) return "La Dirección Fiscal es obligatoria.";
        if (clean.length < 3) return "La Dirección Fiscal debe tener un mínimo de 3 caracteres.";
        return "";
      }
      default:
        return "";
    }
  };

  const handleFieldChange = (name: string, val: string) => {
    // Basic tag-cleaning sanitization
    let sanitizedVal = val.replace(/<[^>]*>/g, "");
    
    if (name === "phone") {
      // Permitir únicamente números y descartar cualquier otro carácter, limitado a máximo 9 dígitos
      sanitizedVal = sanitizedVal.replace(/\D/g, "").slice(0, 9);
    }
    
    if (name === "firstName") setFirstName(sanitizedVal);
    else if (name === "lastName") setLastName(sanitizedVal);
    else if (name === "email") setEmail(sanitizedVal);
    else if (name === "phone") setPhone(sanitizedVal);
    else if (name === "rutNumber") setRutNumber(sanitizedVal);
    else if (name === "companyName") setCompanyName(sanitizedVal);
    else if (name === "fiscalAddress") setFiscalAddress(sanitizedVal);

    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const err = validateField(name, sanitizedVal);
    setValidationErrors(prev => ({ ...prev, [name]: err }));
  };

  const hasPickup = settings.pickupActive !== false && (settings.pickupMontevideoActive !== false || settings.pickupPinamarActive !== false);
  const hasDelivery = settings.deliveryActive !== false;

  // Stored Addresses (empty by default as requested by the user, but persistent offline)
  const [addresses, setAddresses] = useState<AddressItem[]>(() => {
    try {
      const stored = localStorage.getItem("checkout_addresses");
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string>(() => {
    try {
      return localStorage.getItem("checkout_selectedAddressId") || "";
    } catch (_) {
      return "";
    }
  });

  // Delivery options states
  const [shippingType, setShippingType] = useState<"pickup" | "delivery">(( ) => {
    try {
      const stored = localStorage.getItem("checkout_shippingType") as "pickup" | "delivery" | null;
      if (stored) return stored;
    } catch (_) {}
    return hasDelivery ? "delivery" : "pickup";
  });

  const [selectedPickupBranch, setSelectedPickupBranch] = useState<"montevideo" | "pinamar">(() => {
    try {
      const stored = localStorage.getItem("checkout_selectedPickupBranch") as "montevideo" | "pinamar" | null;
      if (stored === "montevideo" && settings.pickupMontevideoActive === false) {
        return "pinamar";
      }
      if (stored === "pinamar" && settings.pickupPinamarActive === false) {
        return "montevideo";
      }
      if (stored) return stored;
    } catch (_) {}
    return settings.pickupMontevideoActive !== false ? "montevideo" : "pinamar";
  });
  
  // Structured physical address states for Uruguay
  const [dept, setDept] = useState(() => {
    try {
      return localStorage.getItem("checkout_dept") || "Montevideo";
    } catch (_) {
      return "Montevideo";
    }
  });
  const [city, setCity] = useState(() => {
    try {
      return localStorage.getItem("checkout_city") || "";
    } catch (_) {
      return "";
    }
  });
  const [street, setStreet] = useState(() => {
    try {
      return localStorage.getItem("checkout_street") || "";
    } catch (_) {
      return "";
    }
  });
  const [doorNumber, setDoorNumber] = useState(() => {
    try {
      return localStorage.getItem("checkout_doorNumber") || "";
    } catch (_) {
      return "";
    }
  });
  const [apartment, setApartment] = useState(() => {
    try {
      return localStorage.getItem("checkout_apartment") || "";
    } catch (_) {
      return "";
    }
  });
  const [solar, setSolar] = useState(() => {
    try {
      return localStorage.getItem("checkout_solar") || "";
    } catch (_) {
      return "";
    }
  });
  const [manzana, setManzana] = useState(() => {
    try {
      return localStorage.getItem("checkout_manzana") || "";
    } catch (_) {
      return "";
    }
  });
  const [neighborhood, setNeighborhood] = useState(() => {
    try {
      return localStorage.getItem("checkout_neighborhood") || "";
    } catch (_) {
      return "";
    }
  });
  const [deliveryPreference, setDeliveryPreference] = useState<"home" | "agency">(() => {
    try {
      return (localStorage.getItem("checkout_deliveryPreference") as "home" | "agency") || "home";
    } catch (_) {
      return "home";
    }
  });
  const [shippingNotes, setShippingNotes] = useState(() => {
    try {
      return localStorage.getItem("checkout_shippingNotes") || "";
    } catch (_) {
      return "";
    }
  });

  // Delivery carrier selection state
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<string>(() => {
    try {
      return localStorage.getItem("checkout_selectedDeliveryMethod") || "";
    } catch (_) {
      return "";
    }
  });

  const [customAgency, setCustomAgency] = useState<string>(() => {
    try {
      return localStorage.getItem("checkout_customAgency") || "";
    } catch (_) {
      return "";
    }
  });



  useEffect(() => {
    try {
      localStorage.setItem("checkout_customAgency", customAgency);
    } catch (_) {}
  }, [customAgency]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("checkout_shippingType") as "pickup" | "delivery" | null;
      if (stored) {
        if (stored === "pickup" && hasPickup) {
          setShippingType("pickup");
          return;
        }
        if (stored === "delivery" && hasDelivery) {
          setShippingType("delivery");
          return;
        }
      }
    } catch (_) {}
    if (!hasDelivery && hasPickup) {
      setShippingType("pickup");
    } else if (!hasPickup && hasDelivery) {
      setShippingType("delivery");
    }
  }, [settings.pickupActive, settings.deliveryActive, hasPickup, hasDelivery]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_selectedPickupBranch", selectedPickupBranch);
    } catch (_) {}
  }, [selectedPickupBranch]);

  useEffect(() => {
    if (settings.pickupMontevideoActive === false && selectedPickupBranch === "montevideo") {
      setSelectedPickupBranch("pinamar");
    } else if (settings.pickupPinamarActive === false && selectedPickupBranch === "pinamar") {
      setSelectedPickupBranch("montevideo");
    }
  }, [settings.pickupMontevideoActive, settings.pickupPinamarActive, selectedPickupBranch]);

  const isCovered = (() => {
    const activeAddress = addresses.find((a) => a.id === selectedAddressId);
    const currentDept = activeAddress ? activeAddress.dept : dept;
    const currentZone = activeAddress ? activeAddress.zone : neighborhood;

    const d = (currentDept || "").trim();
    const n = (currentZone || "").trim().toLowerCase();
    
    if (d === "Montevideo") return true;

    const zone8Zones = ["las piedras", "la paz", "progreso"];
    const zone9Zones = [
      "barros blancos", "pando", "toledo", "suarez", "suárez", 
      "joaquin suarez", "joaquín suárez", "joaquin suárez", "joaquín suarez"
    ];
    const zone10Zones = [
      "pinamar", "salinas", "marindia", "neptunia", 
      "ciudad de la costa", "shangrila", "shangrilá", "lagomar", "solymar", "el pinar"
    ];

    if (d === "Canelones" && (zone10Zones.includes(n) || zone8Zones.includes(n) || zone9Zones.includes(n))) {
      return true;
    }
    return false;
  })();

  const isMvd = (() => {
    const activeAddress = addresses.find((a) => a.id === selectedAddressId);
    const currentDept = activeAddress ? activeAddress.dept : dept;
    return (currentDept || "").trim() === "Montevideo";
  })();

  const getDeliveryMethodStatus = (methodId: string, title: string, subtext?: string) => {
    const activeAddress = addresses.find((a) => a.id === selectedAddressId);
    const currentDept = activeAddress ? activeAddress.dept : dept;
    const currentZone = activeAddress ? activeAddress.zone : neighborhood;

    const d = (currentDept || "").trim();
    const n = (currentZone || "").trim().toLowerCase();

    const isPinamarMethod = methodId === "cadeteria_juem_coast" || 
      methodId.toLowerCase().includes("coast") || 
      methodId.toLowerCase().includes("pinamar") || 
      title.toLowerCase().includes("pinamar") || 
      title.toLowerCase().includes("canelones") ||
      title.toLowerCase().includes("costa") ||
      (subtext || "").toLowerCase().includes("pinamar") ||
      (subtext || "").toLowerCase().includes("canelones") ||
      (subtext || "").toLowerCase().includes("costa");

    const isMvdMethod = methodId === "cadeteria_juem_mvd" || 
      methodId === "mvd_normal" ||
      methodId.toLowerCase().includes("mvd") || 
      title.toLowerCase().includes("montevideo") ||
      (subtext || "").toLowerCase().includes("montevideo");

    if (isMvdMethod) {
      if (d !== "Montevideo") {
        return {
          disabled: true,
          reason: "Solo disponible para envíos dentro de Montevideo"
        };
      }
    }

    if (isPinamarMethod) {
      const zone8Zones = ["las piedras", "la paz", "progreso"];
      const zone9Zones = [
        "barros blancos", "pando", "toledo", "suarez", "suárez", 
        "joaquin suarez", "joaquín suárez", "joaquin suárez", "joaquín suarez"
      ];
      const zone10Zones = [
        "pinamar", "salinas", "marindia", "neptunia", 
        "ciudad de la costa", "shangrila", "shangrilá", "lagomar", "solymar", "el pinar"
      ];

      const isPinamarZone = d === "Canelones" && (zone10Zones.includes(n) || zone8Zones.includes(n) || zone9Zones.includes(n));
      if (!isPinamarZone) {
        return {
          disabled: true,
          reason: "Solo para zonas habilitadas de Canelones (Costa de Oro, Zona 8, Zona 9)"
        };
      }
    }

    return { disabled: false, reason: "" };
  };

  const costMontevideo = settings.shippingCostMontevideo !== undefined ? settings.shippingCostMontevideo : 200;
  const costPinamar = settings.shippingCostPinamar !== undefined ? settings.shippingCostPinamar : 199;

  const getDynamicDeliveryMethods = () => {
    const configured = settings.deliveryMethods && settings.deliveryMethods.length > 0
      ? settings.deliveryMethods
      : [
          {
            id: "cadeteria_juem_mvd",
            title: `Cadetería Juem (Montevideo)`,
            subtext: "*Envío directo en Montevideo",
            iconType: "motorcycle"
          },
          {
            id: "cadeteria_juem_coast",
            title: `Cadetería Juem (Pinamar)`,
            subtext: "*Envío directo a Pinamar, Salinas, Marindia, Neptunia",
            iconType: "motorcycle"
          },
          {
            id: "ues",
            title: "Envío por UES",
            subtext: "Cobro en destino",
            iconType: "ues"
          },
          {
            id: "dac",
            title: "Envío por DAC",
            subtext: "Cobro en destino",
            iconType: "dac"
          },
          {
            id: "depunta",
            title: "Envío por De Punta",
            subtext: "Cobro en destino",
            iconType: "depunta"
          }
        ];

    const hasOtras = configured.some(m => m.id === "otras_agencias");
    if (!hasOtras) {
      return [
        ...configured,
        {
          id: "otras_agencias",
          title: "Otras Agencias (Terminal Tres Cruces)",
          subtext: "Cobro en destino - Elige tu agencia",
          iconType: "otras_agencias"
        }
      ];
    }
    return configured;
  };

  const deliveryMethods = getDynamicDeliveryMethods();

  const getBestDeliveryMethodId = (covered: boolean, mvd: boolean): string => {
    if (covered) {
      if (mvd) {
        const mvdMethod = deliveryMethods.find(m => 
          m.id === "cadeteria_juem_mvd" || 
          m.id === "mvd_normal" ||
          (m.id || "").toLowerCase().includes("mvd") || 
          (m.title || "").toLowerCase().includes("montevideo")
        );
        if (mvdMethod) return mvdMethod.id;
      } else {
        const coastMethod = deliveryMethods.find(m => 
          m.id === "cadeteria_juem_coast" || 
          (m.id || "").toLowerCase().includes("coast") || 
          (m.id || "").toLowerCase().includes("pinamar") || 
          (m.title || "").toLowerCase().includes("pinamar") || 
          (m.title || "").toLowerCase().includes("canelones") ||
          (m.title || "").toLowerCase().includes("costa")
        );
        if (coastMethod) return coastMethod.id;
      }
      const directMethod = deliveryMethods.find(m => 
        m.iconType === "motorcycle" || 
        m.iconType === "truck_orange" || 
        m.iconType === "truck"
      );
      if (directMethod) return directMethod.id;
    }

    const agencyMethod = deliveryMethods.find(m => 
      m.id === "ues" || 
      m.id === "dac" || 
      m.iconType === "ues" || 
      m.iconType === "dac"
    );
    if (agencyMethod) return agencyMethod.id;

    return deliveryMethods[0]?.id || "";
  };

  useEffect(() => {
    if (deliveryMethods.length > 0 && !selectedDeliveryMethod) {
      const bestId = getBestDeliveryMethodId(isCovered, isMvd);
      if (bestId) {
        setSelectedDeliveryMethod(bestId);
      }
    }
  }, [selectedDeliveryMethod, isCovered, isMvd, deliveryMethods]);

  const [lastSyncAddressKey, setLastSyncAddressKey] = useState<string>("");

  // Automatic shipping method sync based on address coverage zone transition
  useEffect(() => {
    if (shippingType !== "delivery") return;
    
    const currentAddressKey = `${selectedAddressId}-${dept}-${neighborhood}-${shippingType}`;
    
    // Only perform automatic syncing when the address actually changes!
    if (currentAddressKey !== lastSyncAddressKey) {
      const bestId = getBestDeliveryMethodId(isCovered, isMvd);
      if (bestId) {
        setSelectedDeliveryMethod(bestId);
      }
      setLastSyncAddressKey(currentAddressKey);
    }
  }, [selectedAddressId, dept, neighborhood, shippingType, isCovered, isMvd, deliveryMethods, lastSyncAddressKey]);

  const [shakeStep, setShakeStep] = useState(false);

  // Address Modal editing state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [modalDept, setModalDept] = useState("Montevideo");
  const [modalZone, setModalZone] = useState("Paso de la Arena");
  const [modalStreet, setModalStreet] = useState("");
  const [modalDoorNumber, setModalDoorNumber] = useState("");
  const [modalApartment, setModalApartment] = useState("");
  const [modalSolar, setModalSolar] = useState("");
  const [modalManzana, setModalManzana] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalAdditionalData, setModalAdditionalData] = useState("");
  const [showModalInlineMap, setShowModalInlineMap] = useState(false);
  const [isCheckoutDeliveryMapOpen, setIsCheckoutDeliveryMapOpen] = useState(false);

  // Lock body scroll when the checkout delivery map or inline map is open
  useEffect(() => {
    if (isCheckoutDeliveryMapOpen || showModalInlineMap) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCheckoutDeliveryMapOpen, showModalInlineMap]);

  // Synchronize active address state fields with the selected list item
  useEffect(() => {
    const activeAddress = addresses.find((a) => a.id === selectedAddressId);
    if (activeAddress) {
      setDept(activeAddress.dept);
      setCity(activeAddress.zone || activeAddress.dept);
      setStreet(activeAddress.street);
      setDoorNumber(activeAddress.doorNumber);
      setApartment(activeAddress.apartment || "");
      setSolar(activeAddress.solar || "");
      setManzana(activeAddress.manzana || "");
      setNeighborhood(activeAddress.zone);
    }
  }, [selectedAddressId, addresses]);

  // Sync carrier default department if carrier requires it
  useEffect(() => {
    if (selectedDeliveryMethod === "cadeteria_juem_mvd") {
      // Just check if active address is in covered zone. If not, auto-select a compatible address if exists
      const fallbackMvd = addresses.find(a => a.dept === "Montevideo");
      if (fallbackMvd && dept !== "Montevideo") {
        setSelectedAddressId(fallbackMvd.id);
      }
    } else if (selectedDeliveryMethod === "cadeteria_juem_coast") {
      const zone8 = ["las piedras", "la paz", "progreso"];
      const zone9 = [
        "barros blancos", "pando", "toledo", "suarez", "suárez", 
        "joaquin suarez", "joaquín suárez", "joaquin suárez", "joaquín suarez"
      ];
      const zone10 = [
        "pinamar", "salinas", "marindia", "neptunia", 
        "ciudad de la costa", "shangrila", "shangrilá", "lagomar", "solymar", "el pinar"
      ];
      const allCanelones = [...zone8, ...zone9, ...zone10];
      const fallbackCanelones = addresses.find(a => a.dept === "Canelones" && allCanelones.includes((a.zone || "").trim().toLowerCase()));
      if (fallbackCanelones && dept !== "Canelones") {
        setSelectedAddressId(fallbackCanelones.id);
      }
    } else if (selectedDeliveryMethod === "depunta") {
      const fallbackMaldonado = addresses.find(a => a.dept === "Maldonado");
      if (fallbackMaldonado && dept !== "Maldonado") {
        setSelectedAddressId(fallbackMaldonado.id);
      }
    }
  }, [selectedDeliveryMethod]);

  // Payment methods states & effects
  const [paymentMethod, setPaymentMethod] = useState<string>(() => {
    try {
      return localStorage.getItem("checkout_paymentMethod") || "";
    } catch (_) {
      return "";
    }
  });
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(() => {
    try {
      const stored = localStorage.getItem("checkout_checkoutStep");
      if (stored) {
        const step = parseInt(stored, 10);
        if (step === 1 || step === 2 || step === 3) return step as 1 | 2 | 3;
      }
    } catch (_) {}
    return 1;
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("checkout_paymentMethod");
      if (stored) {
        setPaymentMethod(stored);
        return;
      }
    } catch (_) {}
    if (settings.mercadopagoActive !== false) {
      setPaymentMethod("mercadopago");
    } else if (settings.transferActive !== false) {
      setPaymentMethod("transfer");
    } else if (settings.cashActive !== false) {
      setPaymentMethod("cash");
    } else {
      setPaymentMethod("coordinating");
    }
  }, [settings]);

  // Sync state changes with localStorage in real-time
  useEffect(() => {
    try {
      localStorage.setItem("checkout_firstName", firstName);
    } catch (_) {}
  }, [firstName]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_lastName", lastName);
    } catch (_) {}
  }, [lastName]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_email", email);
    } catch (_) {}
  }, [email]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_phone", phone);
    } catch (_) {}
  }, [phone]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_wantsInvoice", String(wantsInvoice));
    } catch (_) {}
  }, [wantsInvoice]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_rutNumber", rutNumber);
    } catch (_) {}
  }, [rutNumber]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_companyName", companyName);
    } catch (_) {}
  }, [companyName]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_fiscalAddress", fiscalAddress);
    } catch (_) {}
  }, [fiscalAddress]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_shippingType", shippingType);
    } catch (_) {}
  }, [shippingType]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_dept", dept);
    } catch (_) {}
  }, [dept]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_city", city);
    } catch (_) {}
  }, [city]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_street", street);
    } catch (_) {}
  }, [street]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_doorNumber", doorNumber);
    } catch (_) {}
  }, [doorNumber]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_apartment", apartment);
    } catch (_) {}
  }, [apartment]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_solar", solar);
    } catch (_) {}
  }, [solar]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_manzana", manzana);
    } catch (_) {}
  }, [manzana]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_neighborhood", neighborhood);
    } catch (_) {}
  }, [neighborhood]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_deliveryPreference", deliveryPreference);
    } catch (_) {}
  }, [deliveryPreference]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_shippingNotes", shippingNotes);
    } catch (_) {}
  }, [shippingNotes]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_selectedDeliveryMethod", selectedDeliveryMethod);
    } catch (_) {}
  }, [selectedDeliveryMethod]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_paymentMethod", paymentMethod);
    } catch (_) {}
  }, [paymentMethod]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_checkoutStep", String(checkoutStep));
    } catch (_) {}
  }, [checkoutStep]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_addresses", JSON.stringify(addresses));
    } catch (_) {}
  }, [addresses]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout_selectedAddressId", selectedAddressId);
    } catch (_) {}
  }, [selectedAddressId]);

  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0); // in percentage
  const [promoStatus, setPromoStatus] = useState<"none" | "success" | "invalid">("none");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Reset loading states when changing payment methods or when returning to this page from gateway
  useEffect(() => {
    setIsProcessing(false);
  }, [paymentMethod]);

  useEffect(() => {
    const handleReturn = () => {
      setIsProcessing(false);
    };

    window.addEventListener("pageshow", handleReturn);
    window.addEventListener("focus", handleReturn);
    
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setIsProcessing(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pageshow", handleReturn);
      window.removeEventListener("focus", handleReturn);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
  const [successOrder, setSuccessOrder] = useState<{ id: string; num: string; waUrl: string; paymentMethod: string; customerEmail: string; totalPrice: number } | null>(null);

  // Auto-open WhatsApp on successful order disabled to allow customers to view the purchase confirmation screen first
  // useEffect(() => {
  //   if (successOrder && successOrder.waUrl) {
  //     console.log("[Checkout] Pedido completado. Redirigiendo a WhatsApp de manera automatizada...");
  //     try {
  //       const opened = window.open(successOrder.waUrl, "_blank", "noopener,noreferrer");
  //       if (!opened || opened.closed || typeof opened.closed === "undefined") {
  //         // If popup is blocked by the browser, redirect current window or print a warning
  //         console.warn("[Checkout] Ventana emergente bloqueada por el navegador. El usuario puede hacer clic en el botón principal para proceder.");
  //       }
  //     } catch (err) {
  //       console.error("[Checkout] Error al redirigir automáticamente:", err);
  //     }
  //   }
  // }, [successOrder]);

  // Calculate prices
  const getItemPrice = (item: CartItem): number => {
    const p = item.product;
    if (p.variants && p.variants.length > 0 && item.selectedSize) {
      const exactMatch = item.selectedColor 
        ? p.variants.find(v => v.size === item.selectedSize && v.color === item.selectedColor)
        : null;
      const sizeMatch = p.variants.find(v => v.size === item.selectedSize);
      const match = exactMatch || sizeMatch;
      if (match && match.price !== undefined) {
        return match.price;
      }
    }
    return p.price;
  };

  const subtotalUYU = cartItems.reduce((acc, item) => acc + getItemPrice(item) * item.quantity, 0);
  const discountAmountUYU = Math.round((subtotalUYU * appliedDiscount) / 100);

  // Check if current delivery matches free shipping guidelines
  const checkIfFreeShipping = (): boolean => {
    if (settings.freeShippingActive === false) return false;
    if (shippingType !== "delivery") return false;

    const minAmount = settings.freeShippingMinAmount !== undefined ? settings.freeShippingMinAmount : 2000;
    if (subtotalUYU < minAmount) return false;

    const regionsStr = settings.freeShippingRegions || "Pinamar, Salinas, Marindia, Neptunia, Montevideo";
    const regions = regionsStr
      .split(",")
      .map(r => r.trim().toLowerCase())
      .filter(Boolean);

    if (regions.length === 0) return true;

    // Resolve active department and zone/neighborhood correctly (from saved address or form inputs)
    const activeAddress = addresses.find((a) => a.id === selectedAddressId);
    const activeDept = (activeAddress ? activeAddress.dept : dept || "").trim().toLowerCase();
    const activeZone = (activeAddress ? activeAddress.zone : neighborhood || "").trim().toLowerCase();

    const zone8 = ["las piedras", "la paz", "progreso"];
    const zone9 = [
      "barros blancos", "pando", "toledo", "suarez", "suárez", 
      "joaquin suarez", "joaquín suárez", "joaquin suárez", "joaquín suarez"
    ];

    // If the delivery is to Zone 8 or Zone 9 (the $290 special zones), they are excluded from free shipping
    if (zone8.includes(activeZone) || zone9.includes(activeZone)) {
      return false;
    }

    const zone10 = [
      "pinamar", "salinas", "marindia", "neptunia", 
      "ciudad de la costa", "shangrila", "shangrilá", "lagomar", "solymar", "el pinar"
    ];
    const allCanelonesCovered = [...zone8, ...zone9, ...zone10];

    const isCanelonesCoveredAndEligible = 
      allCanelonesCovered.includes(activeZone) && 
      regions.some(r => ["pinamar", "salinas", "marindia", "neptunia", "canelones"].includes(r));

    if (isCanelonesCoveredAndEligible) return true;

    // Check if either the active zone/neighborhood or the active department is in the free shipping regions
    const hasRegionMatch = regions.includes(activeZone) || regions.includes(activeDept);
    if (hasRegionMatch) return true;

    // Fallback: If department is Montevideo, and the promotion banner or custom texts mention Montevideo, grant free shipping
    const promoTextCombined = `${settings.promotionBannerText || ""} ${settings.promotionBannerText2 || ""} ${settings.freeShippingCustomText || ""}`.toLowerCase();
    if (activeDept === "montevideo" && (regions.includes("montevideo") || promoTextCombined.includes("montevideo"))) {
      return true;
    }

    return false;
  };

  const hasFreeShipping = checkIfFreeShipping();

  // Dynamic shipping cost calculation based on selected method, location and free shipping
  const getBaseShippingCost = (): number => {
    if (shippingType !== "delivery") return 0;

    const activeMethod = deliveryMethods.find(m => m.id === selectedDeliveryMethod);
    if (!activeMethod) return 0;

    // Check if the selected delivery method is an agency
    const isAgency = activeMethod.id === "ues" || 
      activeMethod.id === "dac" || 
      activeMethod.id === "depunta" || 
      activeMethod.id === "otras_agencias" ||
      activeMethod.iconType === "ues" || 
      activeMethod.iconType === "dac" || 
      activeMethod.iconType === "depunta" ||
      activeMethod.title.toLowerCase().includes("agencia") ||
      activeMethod.title.toLowerCase().includes("destino") ||
      activeMethod.title.toLowerCase().includes("tres cruces");

    if (isAgency) {
      // Agency shipments are "Cobro en destino" (returns 0 for order total since they pay agency)
      return 0;
    }

    // Direct non-agency shipping fallback based on location: Montevideo or Canelones covered zones
    const activeAddress = addresses.find((a) => a.id === selectedAddressId);
    const currentDept = activeAddress ? activeAddress.dept : dept;
    const currentZone = activeAddress ? activeAddress.zone : neighborhood;

    const d = (currentDept || "").trim();
    const n = (currentZone || "").trim().toLowerCase();

    // Check if it belongs to Zone 8 or Zone 9 (Canelones):
    const zone8Zones = ["las piedras", "la paz", "progreso"];
    const zone9Zones = [
      "barros blancos", "pando", "toledo", "suarez", "suárez", 
      "joaquin suarez", "joaquín suárez", "joaquin suárez", "joaquín suarez"
    ];

    if (d === "Canelones" && (zone8Zones.includes(n) || zone9Zones.includes(n))) {
      return 290;
    }

    // It's a direct delivery method (cadeteria).
    // Check if the method's title, subtext or ID suggests Pinamar / Canelones or Montevideo:
    const isPinamarMethod = activeMethod.id === "cadeteria_juem_coast" || 
      activeMethod.id.toLowerCase().includes("coast") || 
      activeMethod.id.toLowerCase().includes("pinamar") || 
      activeMethod.title.toLowerCase().includes("pinamar") || 
      activeMethod.title.toLowerCase().includes("canelones") ||
      activeMethod.title.toLowerCase().includes("costa") ||
      (activeMethod.subtext || "").toLowerCase().includes("pinamar") ||
      (activeMethod.subtext || "").toLowerCase().includes("canelones") ||
      (activeMethod.subtext || "").toLowerCase().includes("costa");

    const isMvdMethod = activeMethod.id === "cadeteria_juem_mvd" || 
      activeMethod.id === "mvd_normal" ||
      activeMethod.id.toLowerCase().includes("mvd") || 
      activeMethod.title.toLowerCase().includes("montevideo") ||
      (activeMethod.subtext || "").toLowerCase().includes("montevideo");

    if (isMvdMethod) {
      return settings.shippingCostMontevideo !== undefined ? settings.shippingCostMontevideo : 200;
    }

    if (isPinamarMethod) {
      return settings.shippingCostPinamar !== undefined ? settings.shippingCostPinamar : 199;
    }

    if (d === "Montevideo") {
      return settings.shippingCostMontevideo !== undefined ? settings.shippingCostMontevideo : 200;
    }

    if (d === "Canelones" && ["pinamar", "salinas", "marindia", "neptunia"].includes(n)) {
      return settings.shippingCostPinamar !== undefined ? settings.shippingCostPinamar : 199;
    }

    // Default local shipping cost fallback
    return settings.shippingCostMontevideo !== undefined ? settings.shippingCostMontevideo : 200;
  };

  const finalShippingCost = (hasFreeShipping || checkoutStep === 1) ? 0 : getBaseShippingCost();

  const baseTotalUYU = Math.max(0, subtotalUYU - discountAmountUYU + finalShippingCost);
  const mercadopagoSurchargePercent = Number(settings.mercadopagoSurchargePercent || 0);
  const mercadopagoSurchargeAmount = (paymentMethod === "mercadopago" && mercadopagoSurchargePercent > 0)
    ? Math.round((subtotalUYU - discountAmountUYU + finalShippingCost) * mercadopagoSurchargePercent / 100)
    : 0;

  const totalUYU = baseTotalUYU + mercadopagoSurchargeAmount;

  const exchangeRate = parseFloat(settings.exchangeRate as any) || 40;
  const totalUSD = totalUYU / exchangeRate;

  const handleApplyPromo = () => {
    if (!promoCode) {
      setPromoStatus("none");
      setAppliedDiscount(0);
      return;
    }
    const cleanPromo = promoCode.trim().toUpperCase();

    const matchedCoupon = coupons?.find(
      (c) => c.code.toUpperCase() === cleanPromo && c.active !== false
    );

    if (matchedCoupon) {
      let isExpired = false;
      let isExceededUses = false;
      if (matchedCoupon.expiration_date) {
        const expiration = new Date(matchedCoupon.expiration_date);
        if (expiration.getTime() < Date.now()) {
          isExpired = true;
        }
      }
      if (matchedCoupon.max_uses !== undefined && matchedCoupon.max_uses !== null && 
          matchedCoupon.uses_count !== undefined && matchedCoupon.uses_count !== null) {
        if (matchedCoupon.uses_count >= matchedCoupon.max_uses) {
          isExceededUses = true;
        }
      }

      if (isExceededUses) {
        setAppliedDiscount(0);
        setPromoStatus("invalid");
        setErrorMessage("Este cupón ha alcanzado su límite de usos permitido.");
        return;
      }

      if (isExpired) {
        setAppliedDiscount(0);
        setPromoStatus("invalid");
        setErrorMessage("Este cupón ha expirado/vencido.");
        return;
      }

      setAppliedDiscount(matchedCoupon.discount_percent);
      setPromoStatus("success");
      setErrorMessage("");
      return;
    }

    setAppliedDiscount(0);
    setPromoStatus("invalid");
  };

  const validateStep1 = (): boolean => {
    setErrorMessage("");

    const activeFields = ["firstName", "lastName", "phone", "email"];
    if (wantsInvoice) {
      activeFields.push("rutNumber", "companyName", "fiscalAddress");
    }

    const currentErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};
    let hasValidationError = false;

    activeFields.forEach((field) => {
      newTouched[field] = true;
      let val = "";
      if (field === "firstName") val = firstName;
      else if (field === "lastName") val = lastName;
      else if (field === "phone") val = phone;
      else if (field === "email") val = email;
      else if (field === "rutNumber") val = rutNumber;
      else if (field === "companyName") val = companyName;
      else if (field === "fiscalAddress") val = fiscalAddress;

      const err = validateField(field, val);
      if (err) {
        currentErrors[field] = err;
        hasValidationError = true;
      } else {
        currentErrors[field] = "";
      }
    });

    setTouchedFields(prev => ({ ...prev, ...newTouched }));
    setValidationErrors(prev => ({ ...prev, ...currentErrors }));

    if (hasValidationError) {
      setErrorMessage("Por favor corrige los campos inválidos marcados en rojo en el formulario.");
      setShakeStep(true);
      if (typeof window !== "undefined") {
        window.navigator?.vibrate?.([60, 40, 60]);
      }
      
      // Auto-scroller to the first field that fails validation
      setTimeout(() => {
        const firstErrorField = activeFields.find(field => currentErrors[field]);
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.focus();
          }
        }
      }, 100);
      
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    setErrorMessage("");
    let errorMsg = "";

    if (shippingType === "delivery") {
      const activeAddress = addresses.find((a) => a.id === selectedAddressId);
      if (!activeAddress) {
        errorMsg = "Por favor agrega y selecciona una dirección de envío obligatoria.";
      } else if (!selectedDeliveryMethod) {
        errorMsg = "Por favor selecciona una forma de envío a domicilio.";
      }
    }

    if (errorMsg) {
      setErrorMessage(errorMsg);
      setShakeStep(true);
      if (typeof window !== "undefined") {
        window.navigator?.vibrate?.([60, 40, 60]);
      }
      return false;
    }
    return true;
  };

  const validateDetails = (): boolean => {
    return validateStep1() && validateStep2();
  };

  const handleContinueToPayment = () => {
    if (checkoutStep === 1) {
      if (validateStep1()) {
        setCheckoutStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (checkoutStep === 2) {
      if (validateStep2()) {
        setCheckoutStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateDetails()) {
      return;
    }

    let finalShippingAddress = "";
    let deliveryCarrierInfo = "";

    if (shippingType === "pickup") {
      if (selectedPickupBranch === "pinamar") {
        const addr = settings.pickupAddressPinamar || "C. 54, 15100 Pinamar, Departamento de Canelones";
        finalShippingAddress = `Retiro en Empresa – Sucursal Canelones/Pinamar (${addr})`;
        deliveryCarrierInfo = "Retiro en Pinamar";
      } else {
        const addr = settings.pickupAddress || "Coruña 3038 Bis, Montevideo";
        finalShippingAddress = `Retiro en Empresa – Sucursal Montevideo (${addr})`;
        deliveryCarrierInfo = "Retiro en Montevideo";
      }
    }

    if (shippingType === "delivery") {
      const activeAddress = addresses.find((a) => a.id === selectedAddressId);
      if (!activeAddress) {
        setErrorMessage("Por favor agrega y selecciona una dirección de envío obligatoria.");
        return;
      }

      if (!selectedDeliveryMethod) {
        setErrorMessage("Por favor selecciona una forma de envío a domicilio.");
        return;
      }

      const currentDept = activeAddress.dept || "";
      const currentStreet = activeAddress.street || "";
      const currentDoor = activeAddress.doorNumber || "";
      const currentApartment = activeAddress.apartment || "";
      const currentZone = activeAddress.zone || "";
      const currentSolar = activeAddress.solar || "";
      const currentManzana = activeAddress.manzana || "";
      const currentAdditionalData = activeAddress.additionalData || "";

      const isMontevideo = currentDept === "Montevideo";

      let addressStr = "";
      if (deliveryPreference === "agency") {
        addressStr = `RETIRO EN SUCURSAL / AGENCIA - `;
      }

      const addrParts: string[] = [];
      if (currentStreet.trim()) {
        addrParts.push(`Calle: ${currentStreet.trim()}`);
      }
      if (deliveryPreference !== "agency" && currentDoor.trim()) {
        addrParts.push(`Nº: ${currentDoor.trim()}`);
      }
      if (deliveryPreference !== "agency" && currentApartment.trim()) {
        addrParts.push(`Apto: ${currentApartment.trim()}`);
      }
      if (!isMontevideo) {
        if (currentManzana.trim()) {
          addrParts.push(`Manzana: ${currentManzana.trim()}`);
        }
        if (currentSolar.trim()) {
          addrParts.push(`Solar: ${currentSolar.trim()}`);
        }
      }
      if (isMontevideo && currentZone.trim()) {
        addrParts.push(`Barrio: ${currentZone.trim()}`);
      }

      addressStr += addrParts.join(", ");
      
      const extraParts: string[] = [];
      if (currentZone.trim()) {
        extraParts.push(`Localidad: ${currentZone.trim()}`);
      }
      if (currentDept) {
        extraParts.push(`Dpto: ${currentDept}`);
      }
      if (extraParts.length > 0) {
        if (addressStr) addressStr += ", ";
        addressStr += extraParts.join(", ");
      }

      if (shippingNotes.trim()) {
        addressStr += ` (Ref: ${shippingNotes.trim()})`;
      }
      if (currentAdditionalData.trim()) {
        addressStr += ` (Datos adicionales: ${currentAdditionalData.trim()})`;
      }
      finalShippingAddress = addressStr;

      if (selectedDeliveryMethod === "otras_agencias") {
        if (!customAgency.trim()) {
          setErrorMessage("Por favor especifica la agencia de Tres Cruces que deseas.");
          return;
        }
        deliveryCarrierInfo = `Otras Agencias (Terminal Tres Cruces) - Agencia: ${customAgency.trim()}`;
      } else {
        const chosenMethod = deliveryMethods.find(m => m.id === selectedDeliveryMethod);
        deliveryCarrierInfo = chosenMethod ? chosenMethod.title : selectedDeliveryMethod;
      }
    }

    const compiledUserInformation = {
      name: `${firstName.trim()} ${lastName.trim()}`,
      phone: phone.trim(),
      rut: wantsInvoice ? `RUT: ${rutNumber.trim()} (${companyName.trim()}) - Dir. Fiscal: ${fiscalAddress.trim()}` : "Consumidor Final (No RUT)",
      address: finalShippingAddress,
      shippingType: shippingType === "pickup" 
        ? "Retiro en Local" 
        : `Envío a Domicilio (${deliveryCarrierInfo})${hasFreeShipping ? " 🎁 [¡ENVÍO GRATIS!]" : ""}`
    };

    setIsProcessing(true);
    try {
      // Map individual product options to order item interfaces
      const mappedOrderItems = cartItems.map((item) => {
        let basePrice = item.product.price;
        const p = item.product;
        let matchedVariantId: string | undefined = undefined;
        if (p.variants && p.variants.length > 0 && item.selectedSize) {
          const exactMatch = item.selectedColor 
            ? p.variants.find((v: any) => v.size === item.selectedSize && v.color === item.selectedColor)
            : null;
          const sizeMatch = p.variants.find((v: any) => v.size === item.selectedSize);
          const match = exactMatch || sizeMatch;
          if (match) {
            if (match.price !== undefined) {
              basePrice = match.price;
            }
            matchedVariantId = match.id;
          }
        }
        return {
          productId: item.product.id,
          variantId: matchedVariantId,
          productName: item.product.name,
          sku: item.product.variants?.[0]?.sku || undefined,
          sizeSelected: item.selectedSize || undefined,
          colorSelected: item.selectedColor || undefined,
          unitPrice: basePrice,
          quantity: item.quantity,
          totalPrice: basePrice * item.quantity
        };
      });

      // 1. Pre-register order in database to ensure we do not lose sales leads and trigger confirmation emails
      const orderRegResponse = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerName: compiledUserInformation.name,
          customerEmail: email.trim().toLowerCase(),
          customerPhone: compiledUserInformation.phone,
          subtotal: subtotalUYU,
          discountAmount: discountAmountUYU,
          shippingCost: finalShippingCost,
          total: totalUYU,
          couponCode: appliedDiscount > 0 ? promoCode.toUpperCase() : undefined,
          notes: `${
            shippingType === "pickup" 
              ? "Retiro en Local de la Empresa" 
              : `Envío - Agencia: ${deliveryCarrierInfo || "Por Definir"} | Dirección: ${finalShippingAddress}`
          } | ${compiledUserInformation.rut}${shippingNotes.trim() ? ` | Comentarios: ${shippingNotes.trim()}` : ""}`,
          items: mappedOrderItems,
          paymentMethod: paymentMethod
        })
      });

      if (!orderRegResponse.ok) {
        const errData = await orderRegResponse.json();
        throw new Error(errData.message || "Error al registrar tu orden en el sistema.");
      }

      const registeredOrder = await orderRegResponse.json();
      const serverOrderId = registeredOrder.orderId;

      if (paymentMethod === "mercadopago") {
        // 2. Generate checkout preference linking it to our brand new Order ID
        const response = await fetch("/api/payments/mercadopago/preference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            cartItems: cartItems,
            userInfo: {
              name: compiledUserInformation.name,
              address: `${shippingType === "pickup" ? "Retiro en Empresa" : "Envío a Domicilio: " + finalShippingAddress} | Tel: ${compiledUserInformation.phone} | ${compiledUserInformation.rut}`
            },
            discountPercent: appliedDiscount,
            appliedPromo: appliedDiscount > 0 ? promoCode.toUpperCase() : "",
            orderId: serverOrderId
          })
        });

        const data = await response.json();
        if (response.ok && data.success && data.initPoint) {
          // GA4 purchase tracking before MercadoPago redirect
          if (settings?.googleAnalyticsId && typeof window !== "undefined" && (window as any).gtag) {
            try {
              (window as any).gtag('event', 'purchase', {
                transaction_id: serverOrderId || `mp_${Date.now()}`,
                value: totalUYU,
                currency: 'UYU',
                items: cartItems.map(item => ({
                  item_id: item.product.id,
                  item_name: item.product.name,
                  price: item.product.price,
                  item_variant: `${item.selectedSize || 'estándar'}-${item.selectedColor || 'único'}`,
                  quantity: item.quantity
                }))
              });
            } catch (gaError) {
              console.warn("GA tracking error: ", gaError);
            }
          }

          // Meta Pixel purchase tracking before MercadoPago redirect
          if (settings?.metaPixelId && typeof window !== "undefined" && (window as any).fbq) {
            try {
              (window as any).fbq('track', 'Purchase', {
                value: totalUYU,
                currency: 'UYU',
                content_ids: cartItems.map(item => item.product.id),
                content_type: 'product'
              });
            } catch (pixelError) {
              console.warn("Meta Pixel Purchase tracking error: ", pixelError);
            }
          }
          // Send to official secure payment gateway
          window.location.href = data.initPoint;
        } else {
          const detailMsg = data.detail ? `${data.message} Detalles: ${data.detail}` : (data.message || "Error al iniciar el pago con Mercado Pago.");
          setErrorMessage(detailMsg);
          setIsProcessing(false);
        }
      } else {
        // WhatsApp manual/coordinated checkout text build
        let paymentLabel = "";
        if (paymentMethod === "transfer") {
          paymentLabel = "Transferencia Bancaria Uruguaya (BROU, Itaú, Santander) / Redes de cobranza";
        } else if (paymentMethod === "cash") {
          paymentLabel = "Efectivo Contraentrega (al recibir)";
        } else {
          paymentLabel = "Coordinar método especial";
        }

        const shortServerOrderId = serverOrderId ? serverOrderId.substring(0, 6).toUpperCase() : "";
        let message = `🛒 *NUEVO PEDIDO #${shortServerOrderId} - ${settings.siteTitle}*\n\n`;
        message += `👤 *Cliente:* ${compiledUserInformation.name}\n`;
        message += `📧 *Email:* ${email.trim().toLowerCase()}\n`;
        message += `📞 *Teléfono:* ${compiledUserInformation.phone}\n`;
        message += `📄 *Facturación:* ${compiledUserInformation.rut}\n`;
        message += `🚚 *Método de Envío:* ${compiledUserInformation.shippingType}\n`;
        if (shippingType === "delivery") {
          message += `📍 *Dirección de envío:* ${compiledUserInformation.address}\n`;
        }
        message += `💳 *Método de Pago:* ${paymentLabel}\n`;
        if (shippingNotes.trim()) {
          message += `💬 *Aclaraciones/Comentarios:* ${shippingNotes.trim()}\n`;
        }
        if (appliedDiscount > 0) {
          message += `🎟️ *Cupón Aplicado:* ${promoCode.toUpperCase()} (${appliedDiscount}% desc.)\n`;
        }
        message += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n\n`;

        cartItems.forEach((item, index) => {
          const is3D = is3DProduct(item.product);
          const options = [];
          if (item.selectedSize) {
            options.push(is3D ? `Material: ${item.selectedSize}` : `Talle: ${item.selectedSize}`);
          }
          if (item.selectedColor) {
            options.push(`Color: ${item.selectedColor}`);
          }
          
          const p = item.product;
          let activeSku = p.codigo || "";
          if (p.variants && p.variants.length > 0 && item.selectedSize) {
            const exactMatch = item.selectedColor 
              ? p.variants.find(v => v.size === item.selectedSize && v.color === item.selectedColor)
              : null;
            const sizeMatch = p.variants.find(v => v.size === item.selectedSize);
            const match = exactMatch || sizeMatch;
            if (match && match.sku) {
              activeSku = match.sku;
            }
          }
          
          if (activeSku) {
            options.push(`Código: ${activeSku}`);
          }
          
          const optionsStr = options.length > 0 ? ` (${options.join(", ")})` : "";
          const itemPrice = getItemPrice(item);
          
          message += `${index + 1}. *${item.product.name}*${optionsStr}\n`;
          message += `   👉 ${item.quantity} x UYU $${Math.round(itemPrice)} = *UYU $${Math.round(itemPrice * item.quantity)}*\n\n`;
        });

        message += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
        message += `🔹 *Subtotal:* UYU $${subtotalUYU}\n`;
        if (appliedDiscount > 0) {
          message += `🔹 *Descuento (${appliedDiscount}%):* -UYU $${discountAmountUYU}\n`;
        }
        
        const isSelectedMethodAgency = selectedDeliveryMethod === "ues" || 
          selectedDeliveryMethod === "dac" || 
          selectedDeliveryMethod === "depunta" || 
          selectedDeliveryMethod === "otras_agencias" ||
          (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.iconType === "ues") ||
          (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.iconType === "dac") ||
          (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.iconType === "depunta") ||
          (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.title || "").toLowerCase().includes("agencia") ||
          (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.title || "").toLowerCase().includes("destino") ||
          (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.title || "").toLowerCase().includes("tres cruces");

        if (shippingType === "delivery") {
          message += `🚚 *Envío:* ${hasFreeShipping ? "🎁 ¡GRATIS!" : finalShippingCost > 0 ? `UYU $${finalShippingCost}` : "Cobro en destino"}\n`;
          if (isSelectedMethodAgency) {
            message += `⚠️ *Nota Envío por Agencia:* El costo de la encomienda se paga directamente a la empresa transportista al recibir/retirar el pedido (cobro en destino).\n`;
          }
        }
        message += `🔥 *TOTAL NETO:* *UYU $${totalUYU}*\n\n`;
        
        if (paymentMethod === "transfer") {
          message += `🏦 _¡Hola! Acabo de realizar la compra (Pedido #${shortServerOrderId}). Recibí el mail de confirmación con los datos bancarios. Les escribo para pasárselo de nuevo por aquí, hacerles la transferencia/giro por UYU $${totalUYU} y coordinar la entrega despachando cuanto antes._`;
        } else {
          message += `🙌 _¡Hola! Acabo de coordinar este pedido (Pedido #${shortServerOrderId}) por la web. Quedo a la espera por aquí para coordinar los detalles de entrega de mi compra por UYU $${totalUYU}._`;
        }

        const encodedText = encodeURIComponent(message);
        const cleanPhone = settings.whatsappNumber.replace(/[^0-9]/g, "");
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
        
        // GA4 purchase tracking before WhatsApp redirect
        if (settings?.googleAnalyticsId && typeof window !== "undefined" && (window as any).gtag) {
          try {
            (window as any).gtag('event', 'purchase', {
              transaction_id: serverOrderId || `wa_${Date.now()}`,
              value: totalUYU,
              currency: 'UYU',
              items: cartItems.map(item => ({
                item_id: item.product.id,
                item_name: item.product.name,
                price: item.product.price,
                item_variant: `${item.selectedSize || 'estándar'}-${item.selectedColor || 'único'}`,
                quantity: item.quantity
              }))
            });
          } catch (gaError) {
            console.warn("GA tracking error: ", gaError);
          }
        }

        // Meta Pixel purchase tracking before WhatsApp redirect
        if (settings?.metaPixelId && typeof window !== "undefined" && (window as any).fbq) {
          try {
            (window as any).fbq('track', 'Purchase', {
              value: totalUYU,
              currency: 'UYU',
              content_ids: cartItems.map(item => item.product.id),
              content_type: 'product'
            });
          } catch (pixelError) {
            console.warn("Meta Pixel Purchase tracking error: ", pixelError);
          }
        }

        setSuccessOrder({
          id: serverOrderId,
          num: shortServerOrderId,
          waUrl: waUrl,
          paymentMethod: paymentMethod,
          customerEmail: email.trim().toLowerCase(),
          totalPrice: totalUYU
        });

        setIsProcessing(false);
        
        // Clean all checkout-related cache upon successful order completion
        try {
          const keys = [
            "checkout_firstName",
            "checkout_lastName",
            "checkout_email",
            "checkout_phone",
            "checkout_wantsInvoice",
            "checkout_rutNumber",
            "checkout_companyName",
            "checkout_fiscalAddress",
            "checkout_shippingType",
            "checkout_dept",
            "checkout_city",
            "checkout_street",
            "checkout_doorNumber",
            "checkout_apartment",
            "checkout_solar",
            "checkout_manzana",
            "checkout_neighborhood",
            "checkout_deliveryPreference",
            "checkout_shippingNotes",
            "checkout_selectedDeliveryMethod",
            "checkout_customAgency",
            "checkout_paymentMethod",
            "checkout_checkoutStep",
            "checkout_addresses",
            "checkout_selectedAddressId"
          ];
          keys.forEach(key => localStorage.removeItem(key));
        } catch (_) {}

        onClearCart();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Hubo un problema de conexión con el servidor de la tienda.");
      setIsProcessing(false);
    }
  };

  if (successOrder) {
    const isTransfer = successOrder.paymentMethod === "transfer";
    const paymentLabel = successOrder.paymentMethod === "transfer" 
      ? "Transferencia Bancaria / Abitab, Red Pagos" 
      : successOrder.paymentMethod === "cash"
        ? "Efectivo Contraentrega"
        : "Coordinar método especial";

    const defaultTransferDetails = "Numero de cuenta \nMercado Pago : 1004278620163\nRed pagos y abitab\nJoana Baptista : 4.051.645-7";
    const transferDetailsText = settings.transferDetails && settings.transferDetails.trim() 
      ? settings.transferDetails 
      : defaultTransferDetails;

    const isSelectedMethodAgency = selectedDeliveryMethod === "ues" || 
      selectedDeliveryMethod === "dac" || 
      selectedDeliveryMethod === "depunta" || 
      selectedDeliveryMethod === "otras_agencias" ||
      (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.iconType === "ues") ||
      (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.iconType === "dac") ||
      (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.iconType === "depunta") ||
      (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.title || "").toLowerCase().includes("agencia") ||
      (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.title || "").toLowerCase().includes("destino") ||
      (deliveryMethods.find(m => m.id === selectedDeliveryMethod)?.title || "").toLowerCase().includes("tres cruces");

    return (
      <div className="min-h-screen py-16 flex flex-col items-center justify-center px-4 font-sans text-[#F4EAD7] bg-[#050B1A]">
        <div className="max-w-xl w-full bg-[#0B1730] border border-[#D4A55A]/25 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#D4A55A]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center text-center font-sans">
            <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-6 border border-emerald-500/30 shadow-lg shadow-emerald-500/5 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-black text-zinc-100 tracking-tight leading-tight mb-2">
              ¡Tu compra está siendo procesada! 📦
            </h2>
            <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
              Hemos registrado tu pedido en nuestro sistema y te enviamos la confirmación por correo electrónico. Ahora puedes abrir WhatsApp para comunicarte directamente con nosotros y finalizar los detalles de entrega.
            </p>

            {/* Order status card info */}
            <div className="w-full bg-[#050B1A]/80 border border-[#D4A55A]/10 rounded-xl p-5 mb-6 text-left space-y-3.5">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800/50">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">ID del Pedido:</span>
                <span className="text-sm font-black text-[#E6BF76] font-mono select-all">#{successOrder.num}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800/50">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total del Pedido:</span>
                <span className="text-sm font-bold text-zinc-200">UYU ${successOrder.totalPrice}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800/50">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Forma de Pago:</span>
                <span className="text-xs font-bold text-[#E6BF76] bg-[#D4A55A]/5 px-2 py-0.5 rounded border border-[#D4A55A]/15">{paymentLabel}</span>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email de Confirmación:</span>
                <span className="text-xs text-zinc-300 font-medium break-all">{successOrder.customerEmail}</span>
                <p className="text-[10px] text-zinc-400 leading-normal mt-1 italic">
                  💡 Te hemos enviado un correo de confirmación de tu compra. Si no lo ves en tu bandeja de entrada en unos minutos, revisa tu casilla de Spam.
                </p>
              </div>
            </div>

            {/* Agency Shipping Info Card */}
            {isSelectedMethodAgency && (
              <div className="w-full bg-amber-950/20 border border-amber-500/30 rounded-xl p-5 mb-6 text-left">
                <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold text-sm">
                  <span>🚚</span>
                  <span>Envío por Agencia (Cobro en Destino):</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  Has seleccionado envío por agencia de encomiendas. El costo del envío <strong className="text-[#E6BF76]">lo pagarás directamente a la empresa transportista (DAC, UES o De Punta) al recibir o retirar tu paquete</strong>.
                </p>
              </div>
            )}

            {/* Bank Transfer Box */}
            {isTransfer && (
              <div className="w-full bg-[#0B1221] border border-[#D4A55A]/20 rounded-xl p-6 mb-8 text-left shadow-inner">
                <div className="flex items-center gap-2 mb-4 text-[#E6BF76] font-bold text-sm border-b border-[#D4A55A]/15 pb-2">
                  <Landmark className="h-4.5 w-4.5" />
                  <span>Datos de Cuenta para Transferencia / Giro:</span>
                </div>
                
                <div className="space-y-4">
                  {transferDetailsText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0).map((line, idx) => {
                    if (line.includes(":")) {
                      const index = line.indexOf(":");
                      const label = line.substring(0, index).trim();
                      const value = line.substring(index + 1).trim();
                      const isCopied = copiedText === value;
                      
                      return (
                        <div key={idx} className="bg-[#121E36] border border-zinc-800/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-[#D4A55A]/35">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">{label}</span>
                            <span className="text-sm font-bold font-mono text-white select-all">{value}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                              isCopied 
                                ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30" 
                                : "bg-[#0B1221] hover:bg-[#1A2E50] text-[#E6BF76] hover:text-white border border-[#D4A55A]/20"
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    } else {
                      // Standard or header line
                      const isHeader = line.toLowerCase().includes("cuenta") || 
                                       line.toLowerCase().includes("red pagos") || 
                                       line.toLowerCase().includes("abitab") || 
                                       line.toLowerCase().includes("bancaria") ||
                                       line.toLowerCase().includes("giro") ||
                                       line.toLowerCase().includes("datos");
                                       
                      if (isHeader) {
                        return (
                          <div key={idx} className="text-xs font-black uppercase text-[#E6BF76] tracking-widest pt-2 border-b border-zinc-800/40 pb-1">
                            {line}
                          </div>
                        );
                      } else {
                        return (
                          <div key={idx} className="text-xs text-zinc-300 font-medium leading-relaxed pl-1">
                            {line}
                          </div>
                        );
                      }
                    }
                  })}
                </div>

                <div className="mt-5 text-[10.5px] text-zinc-400 leading-relaxed border-t border-[#D4A55A]/15 pt-3 flex items-start gap-1.5">
                  <span className="text-amber-500">💡</span>
                  <p>
                    Realiza el pago por el total de <strong className="text-white font-bold">UYU ${successOrder.totalPrice}</strong> y luego envíanos la captura de pantalla o comprobante por WhatsApp presionando el botón de abajo.
                  </p>
                </div>
              </div>
            )}

            {/* Primary Action Button: Send WhatsApp */}
            <div className="w-full flex flex-row gap-3 items-stretch">
              <button
                onClick={() => window.open(successOrder.waUrl, "_blank", "noopener,noreferrer")}
                className="flex-1 py-3.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider bg-[#25D366] hover:bg-[#20ba5a] text-white transition-all cursor-pointer active:scale-98 shadow-lg shadow-[#25D366]/10 flex items-center justify-center gap-2 px-3"
              >
                <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.998h.003c4.368 0 7.927-3.558 7.93-7.926a7.86 7.86 0 0 0-2.33-5.596ZM7.994 14.52a6.57 6.57 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                </svg>
                <span>Enviar por WhatsApp</span>
              </button>
              
              <button
                onClick={() => window.location.href = "https://juem.com.uy"}
                className="flex-1 py-3.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider bg-[#D4A55A]/10 hover:bg-[#D4A55A]/20 hover:text-[#E6BF76] text-zinc-350 transition-all cursor-pointer active:scale-98 border border-[#D4A55A]/25 flex items-center justify-center px-3 text-center"
              >
                <span>Volver Principal 🛍️</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen py-16 flex flex-col items-center justify-center text-center px-4 font-sans text-[#F4EAD7] bg-[#050B1A]">
        <div className="h-16 w-16 bg-[#0B1730] rounded-full flex items-center justify-center text-[#E6BF76] mb-4 border border-[#D4A55A]/25 shadow-md shadow-[#D4A55A]/10">
          🛒
        </div>
        <h2 className="text-xl font-bold text-zinc-100 mb-2">Su carrito está vacío</h2>
        <p className="text-sm text-zinc-400 mb-6 max-w-sm">
          No hay artículos listados para iniciar el checkout. Elige tus favoritos en nuestra tienda.
        </p>
        <button
          onClick={() => window.location.href = "https://juem.com.uy"}
          className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A] transition cursor-pointer active:scale-95 shadow-md shadow-[#D4A55A]/10"
        >
          Volver a la Web Principal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-10 pb-28 sm:pb-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#050B1A] text-[#F4EAD7]">
      <div className="max-w-6xl mx-auto">
        


        {/* Stepper Wizard Indicator */}
        <div className="mb-8 flex items-center justify-between relative bg-[#0B1730]/40 p-3 sm:p-4 rounded-2xl border border-[#D4A55A]/10">
          {/* Background Connection Line */}
          <div className="absolute left-[10%] right-[10%] top-[40%] sm:top-[50%] -translate-y-1/2 h-[2px] bg-[#D4A55A]/10 z-0" />
          {/* Active Connection Line Fill */}
          <div 
            className="absolute left-[10%] top-[40%] sm:top-[50%] -translate-y-1/2 h-[2px] bg-[#D4A55A] transition-all duration-300 z-0"
            style={{ 
              width: checkoutStep === 1 ? "0%" : checkoutStep === 2 ? "40%" : "80%" 
            }}
          />

          {[
            { step: 1, label: "Mis Datos", shortLabel: "Datos", desc: "Comprador" },
            { step: 2, label: "Forma de Envío", shortLabel: "Envío", desc: "Entrega" },
            { step: 3, label: "Método de Pago", shortLabel: "Pago", desc: "Finalizar" }
          ].map((s) => {
            const isActive = checkoutStep === s.step;
            const isCompleted = checkoutStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                disabled={!isCompleted && checkoutStep !== s.step}
                onClick={() => {
                  if (s.step === 1 && checkoutStep > 1) {
                    setCheckoutStep(1);
                  } else if (s.step === 2 && checkoutStep > 2) {
                    if (validateStep1()) {
                      setCheckoutStep(2);
                    }
                  }
                }}
                className={`relative z-10 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 px-1 py-1 sm:px-3 sm:py-2 rounded-xl transition-all ${
                  isActive
                    ? "text-[#E6BF76] font-extrabold"
                    : isCompleted
                      ? "text-emerald-400 font-bold cursor-pointer"
                      : "text-zinc-550 cursor-not-allowed"
                }`}
              >
                <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300 ${
                  isActive
                    ? "bg-[#D4A55A] text-[#050B1A] shadow-md shadow-[#D4A55A]/25 scale-110"
                    : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-[#050B1A] text-zinc-500 border border-[#D4A55A]/20"
                }`}>
                  {isCompleted ? "✓" : s.step}
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider leading-none mb-0.5">
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="inline sm:hidden">{s.shortLabel}</span>
                  </p>
                  <p className="text-[9px] text-zinc-500 font-medium leading-none font-mono hidden sm:block">{s.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Main step form wizard */}
          <div className="lg:col-span-7 space-y-6">
            {checkoutStep === 1 && (
              <motion.div
                animate={shakeStep ? { x: [-8, 8, -6, 6, -4, 4, -2, 2, 0] } : {}}
                transition={{ duration: 0.4 }}
                onAnimationComplete={() => setShakeStep(false)}
                className="space-y-6"
              >
                {/* Box 1: DATOS DEL COMPRADOR */}
                <div className="p-6 rounded-2xl border bg-[#0B1730] border-[#D4A55A]/20 text-[#F4EAD7] shadow-xl shadow-black/35">
              <h2 className="text-base font-extrabold tracking-tight mb-4 uppercase flex items-center gap-2.5">
                <span className="p-1 px-2.5 bg-[#D4A55A]/10 text-[#E6BF76] rounded-lg text-xs font-black">1</span>
                Datos del Comprador
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 px-1 text-zinc-400">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#E6BF76]/70" />
                    <input
                      required
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Ej: Juan"
                      value={firstName}
                      onChange={(e) => handleFieldChange("firstName", e.target.value)}
                      className={`w-full text-xs pl-10 pr-4 py-3 rounded-xl border outline-none transition uppercase font-sans tracking-wide ${
                        touchedFields["firstName"]
                          ? validationErrors["firstName"]
                            ? "border-red-500 bg-red-950/20 text-white focus:border-red-400 focus:bg-[#050B1A]"
                            : "border-emerald-500 bg-emerald-950/10 text-white focus:border-emerald-400 focus:bg-[#050B1A]"
                          : "bg-[#050B1A] border-[#D4A55A]/25 text-[#F4EAD7] placeholder-zinc-500 focus:border-[#D4A55A] focus:ring-1 focus:ring-[#D4A55A]"
                      }`}
                    />
                  </div>
                  {touchedFields["firstName"] && validationErrors["firstName"] && (
                    <p className="text-[11px] text-red-500 font-bold mt-1 px-1 flex items-center gap-1 font-mono">
                      <span>⚠️</span> {validationErrors["firstName"]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 px-1 text-zinc-400">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#E6BF76]/70" />
                    <input
                      required
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      placeholder="Ej: Pérez"
                      value={lastName}
                      onChange={(e) => handleFieldChange("lastName", e.target.value)}
                      className={`w-full text-xs pl-10 pr-4 py-3 rounded-xl border outline-none transition uppercase font-sans tracking-wide ${
                        touchedFields["lastName"]
                          ? validationErrors["lastName"]
                            ? "border-red-500 bg-red-950/20 text-white focus:border-red-400 focus:bg-[#050B1A]"
                            : "border-emerald-500 bg-emerald-950/10 text-white focus:border-emerald-400 focus:bg-[#050B1A]"
                          : "bg-[#050B1A] border-[#D4A55A]/25 text-[#F4EAD7] placeholder-zinc-500 focus:border-[#D4A55A] focus:ring-1 focus:ring-[#D4A55A]"
                      }`}
                    />
                  </div>
                  {touchedFields["lastName"] && validationErrors["lastName"] && (
                    <p className="text-[11px] text-red-500 font-bold mt-1 px-1 flex items-center gap-1 font-mono">
                      <span>⚠️</span> {validationErrors["lastName"]}
                    </p>
                  )}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 px-1 text-zinc-400">
                    Teléfono de Contacto <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-[#E6BF76]/70" />
                    <input
                      required
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={9}
                      placeholder="Ej: 099123456"
                      value={phone}
                      onChange={(e) => handleFieldChange("phone", e.target.value)}
                      className={`w-full text-xs pl-10 pr-4 py-3 rounded-xl border outline-none transition font-sans tracking-wide ${
                        touchedFields["phone"]
                          ? validationErrors["phone"]
                            ? "border-red-500 bg-red-950/20 text-white focus:border-red-400 focus:bg-[#050B1A]"
                            : "border-emerald-500 bg-emerald-950/10 text-white focus:border-emerald-400 focus:bg-[#050B1A]"
                          : "bg-[#050B1A] border-[#D4A55A]/25 text-[#F4EAD7] placeholder-zinc-500 focus:border-[#D4A55A] focus:ring-1 focus:ring-[#D4A55A]"
                      }`}
                    />
                  </div>
                  <p className="text-[10px] mt-1 px-1 leading-normal text-zinc-500">
                    Ej: celular 099123456 o fijo 24001234.
                  </p>
                  {touchedFields["phone"] && validationErrors["phone"] && (
                    <p className="text-[11px] text-red-500 font-bold mt-1 px-1 flex items-center gap-1 font-mono">
                      <span>⚠️</span> {validationErrors["phone"]}
                    </p>
                  )}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 px-1 text-zinc-400">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[#E6BF76]/70" />
                    <input
                      required
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="Ej: nombre@correo.com"
                      value={email}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      className={`w-full text-xs pl-10 pr-4 py-3 rounded-xl border outline-none transition font-sans tracking-wide ${
                        touchedFields["email"]
                          ? validationErrors["email"]
                            ? "border-red-500 bg-red-950/20 text-white focus:border-red-400 focus:bg-[#050B1A]"
                            : "border-emerald-500 bg-emerald-950/10 text-white focus:border-emerald-400 focus:bg-[#050B1A]"
                          : "bg-[#050B1A] border-[#D4A55A]/25 text-[#F4EAD7] placeholder-zinc-500 focus:border-[#D4A55A] focus:ring-1 focus:ring-[#D4A55A]"
                      }`}
                    />
                  </div>
                  <p className="text-[10px] mt-1 px-1 leading-normal text-zinc-500">
                    Te enviaremos los detalles del pedido a este correo.
                  </p>
                  {touchedFields["email"] && validationErrors["email"] && (
                    <p className="text-[11px] text-red-500 font-bold mt-1 px-1 flex items-center gap-1 font-mono">
                      <span>⚠️</span> {validationErrors["email"]}
                    </p>
                  )}
                </div>

                {/* RUT Invoice details field */}
                {settings.invoiceOptionActive !== false && (
                  <div className="md:col-span-2 pt-2">
                    <div className="p-4 rounded-xl border bg-[#050B1A]/85 border-[#D4A55A]/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4.5 w-4.5 text-[#E6BF76]" />
                          <div>
                            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">Factura con RUT</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 bg-[#0b1730] p-0.5 rounded-lg border border-[#D4A55A]/20">
                          <button
                            type="button"
                            onClick={() => {
                              setWantsInvoice(false);
                              // clear errors for invoice fields since they are not used
                              setValidationErrors(prev => ({
                                ...prev,
                                rutNumber: "",
                                companyName: "",
                                fiscalAddress: ""
                              }));
                              setTouchedFields(prev => ({
                                ...prev,
                                rutNumber: false,
                                companyName: false,
                                fiscalAddress: false
                              }));
                            }}
                            className={`text-[10px] uppercase font-sans px-2.5 py-1 rounded-md transition font-black ${
                              !wantsInvoice 
                                ? "bg-[#D4A55A] text-[#050B1A]" 
                                : "text-zinc-405 hover:text-white"
                            }`}
                          >
                            No
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWantsInvoice(true);
                              // Clear errors and reset touched flags so the inputs appear clean of any warnings initially
                              setValidationErrors(prev => ({
                                ...prev,
                                rutNumber: "",
                                companyName: "",
                                fiscalAddress: ""
                              }));
                              setTouchedFields(prev => ({
                                ...prev,
                                rutNumber: false,
                                companyName: false,
                                fiscalAddress: false
                              }));
                            }}
                            className={`text-[10px] uppercase font-sans px-2.5 py-1 rounded-md transition font-black ${
                              wantsInvoice 
                                ? "bg-[#D4A55A] text-[#050B1A]" 
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            Sí
                          </button>
                        </div>
                      </div>

                      {wantsInvoice && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3 pt-3 border-t border-dashed border-[#D4A55A]/35">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">RUT (12 dígitos) <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="Ej: 219999990011"
                              value={rutNumber}
                              onChange={(e) => handleFieldChange("rutNumber", e.target.value)}
                              className={`w-full text-xs px-3 py-2 rounded-lg border outline-none font-sans ${
                                touchedFields["rutNumber"]
                                  ? validationErrors["rutNumber"]
                                    ? "border-red-500 bg-red-955/20 text-white focus:border-red-400 focus:bg-[#050B1A]"
                                    : "border-emerald-500 bg-emerald-950/10 text-white focus:border-emerald-400 focus:bg-[#050B1A]"
                                  : "bg-[#050B1A] border-[#D4A55A]/25 text-[#F4EAD7] placeholder-zinc-500 focus:border-[#D4A55A] focus:ring-1 focus:ring-[#D4A55A]"
                              }`}
                            />
                            {touchedFields["rutNumber"] && validationErrors["rutNumber"] && (
                              <p className="text-[10px] text-red-500 font-bold mt-1 px-1 flex items-center gap-1 font-mono">
                                <span>⚠️</span> {validationErrors["rutNumber"]}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Razón Social <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="Ej: Pérez Hnos S.A."
                              value={companyName}
                              onChange={(e) => handleFieldChange("companyName", e.target.value)}
                              className={`w-full text-xs px-3 py-2 rounded-lg border outline-none font-sans ${
                                touchedFields["companyName"]
                                  ? validationErrors["companyName"]
                                    ? "border-red-500 bg-red-955/20 text-white focus:border-red-400 focus:bg-[#050B1A]"
                                    : "border-emerald-500 bg-emerald-950/10 text-white focus:border-emerald-400 focus:bg-[#050B1A]"
                                  : "bg-[#050B1A] border-[#D4A55A]/25 text-[#F4EAD7] placeholder-zinc-500 focus:border-[#D4A55A] focus:ring-1 focus:ring-[#D4A55A]"
                              }`}
                            />
                            {touchedFields["companyName"] && validationErrors["companyName"] && (
                              <p className="text-[10px] text-red-500 font-bold mt-1 px-1 flex items-center gap-1 font-mono">
                                <span>⚠️</span> {validationErrors["companyName"]}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Dirección Fiscal <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="Ej: Av. Uruguay 1234, Montevideo"
                              value={fiscalAddress}
                              onChange={(e) => handleFieldChange("fiscalAddress", e.target.value)}
                              className={`w-full text-xs px-3 py-2 rounded-lg border outline-none font-sans ${
                                touchedFields["fiscalAddress"]
                                  ? validationErrors["fiscalAddress"]
                                    ? "border-red-500 bg-red-955/20 text-white focus:border-red-400 focus:bg-[#050B1A]"
                                    : "border-emerald-500 bg-emerald-950/10 text-white focus:border-emerald-400 focus:bg-[#050B1A]"
                                  : "bg-[#050B1A] border-[#D4A55A]/25 text-[#F4EAD7] placeholder-zinc-500 focus:border-[#D4A55A] focus:ring-1 focus:ring-[#D4A55A]"
                              }`}
                            />
                            {touchedFields["fiscalAddress"] && validationErrors["fiscalAddress"] && (
                              <p className="text-[10px] text-red-500 font-bold mt-1 px-1 flex items-center gap-1 font-mono">
                                <span>⚠️</span> {validationErrors["fiscalAddress"]}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Step 1 Inline Action Button */}
            <div className="pt-4 space-y-3">
              {errorMessage && (
                <div className="p-3 bg-red-950/35 border border-red-900/30 text-rose-400 text-xs rounded-xl text-center font-bold">
                  ⚠️ {errorMessage}
                </div>
              )}
              <div className="hidden sm:flex justify-end">
                <button
                  type="button"
                  onClick={handleContinueToPayment}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl text-xs font-extrabold uppercase tracking-widest bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A] shadow-md active:scale-95 transition cursor-pointer"
                >
                  <span>Continuar</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {checkoutStep === 2 && (
              <motion.div
                animate={shakeStep ? { x: [-8, 8, -6, 6, -4, 4, -2, 2, 0] } : {}}
                transition={{ duration: 0.4 }}
                onAnimationComplete={() => setShakeStep(false)}
                className="space-y-6"
              >

            {/* Box 2: FORMA DE ENVÍO */}
            {(settings.pickupActive !== false || settings.deliveryActive !== false) && (
              <div className="p-6 rounded-2xl border bg-[#0B1730] border-[#D4A55A]/20 text-[#F4EAD7] shadow-xl shadow-black/35">
                <h2 className="text-base font-extrabold tracking-tight mb-4 uppercase flex items-center gap-2.5">
                  <span className="p-1 px-2.5 bg-[#D4A55A]/10 text-[#E6BF76] rounded-lg text-xs font-black">2</span>
                  Forma de Envío
                </h2>

                {/* Toggle tabs to choose pickup vs delivery, only if both are enabled */}
                {(settings.pickupActive !== false && settings.deliveryActive !== false) && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShippingType("pickup");
                        setErrorMessage("");
                      }}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-bold font-sans transition cursor-pointer text-xs uppercase tracking-wider ${
                        shippingType === "pickup"
                          ? "border-[#D4A55A] bg-[#050B1A]/85 text-[#E6BF76]"
                          : "border-[#D4A55A]/10 bg-[#050B1A]/40 text-zinc-400 hover:border-[#D4A55A]/30 hover:text-white"
                      }`}
                    >
                      <Home className="h-4.5 w-4.5" />
                      <span>Retiro en empresa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShippingType("delivery");
                        setErrorMessage("");
                      }}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-bold font-sans transition cursor-pointer text-xs uppercase tracking-wider ${
                        shippingType === "delivery"
                          ? "border-[#D4A55A] bg-[#050B1A]/85 text-[#E6BF76]"
                          : "border-[#D4A55A]/10 bg-[#050B1A]/40 text-zinc-400 hover:border-[#D4A55A]/30 hover:text-white"
                      }`}
                    >
                      <Truck className="h-4.5 w-4.5" />
                      <span>Envío a domicilio</span>
                    </button>
                  </div>
                )}

                {/* Pickup view showing local business address */}
                {shippingType === "pickup" && (
                  <div className={`space-y-4 ${
                    (settings.pickupActive !== false && settings.deliveryActive !== false) ? "mt-5" : ""
                  }`}>
                    <p className="text-[11px] uppercase tracking-wider text-[#E6BF76] font-bold">
                      Selecciona la sucursal de retiro:
                    </p>
                    
                    <div className={`grid gap-4 ${
                      (settings.pickupMontevideoActive !== false && settings.pickupPinamarActive !== false)
                        ? "grid-cols-1 md:grid-cols-2"
                        : "grid-cols-1"
                    }`}>
                      {/* Branch 1: Montevideo */}
                      {settings.pickupMontevideoActive !== false && (
                        <div
                          onClick={() => setSelectedPickupBranch("montevideo")}
                          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 relative ${
                            selectedPickupBranch === "montevideo"
                              ? "border-[#D4A55A] bg-[#050B1A]/85 shadow-lg shadow-[#D4A55A]/5"
                              : "bg-[#050B1A]/40 border-[#D4A55A]/10 hover:border-[#D4A55A]/25"
                          }`}
                        >
                          <div className="flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              selectedPickupBranch === "montevideo" ? "border-[#D4A55A]" : "border-zinc-700"
                            }`}>
                              {selectedPickupBranch === "montevideo" && <div className="h-2 w-2 rounded-full bg-[#D4A55A]" />}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Building className={`h-4 w-4 ${selectedPickupBranch === "montevideo" ? "text-[#E6BF76]" : "text-zinc-500"}`} />
                              <h4 className="text-xs font-bold uppercase tracking-wide text-[#F4EAD7]">JUEM Montevideo</h4>
                            </div>
                            <p className="text-xs text-zinc-300 leading-normal">
                              📍 {settings.pickupAddress || "Coruña 3038 Bis, Montevideo"}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-1.5 italic">
                              Horario: {settings.pickupHours || "Lunes a Viernes de 10:00 a 18:00 hs y Sábados de 09:00 a 13:00 hs."}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Branch 2: Pinamar */}
                      {settings.pickupPinamarActive !== false && (
                        <div
                          onClick={() => setSelectedPickupBranch("pinamar")}
                          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 relative ${
                            selectedPickupBranch === "pinamar"
                              ? "border-[#D4A55A] bg-[#050B1A]/85 shadow-lg shadow-[#D4A55A]/5"
                              : "bg-[#050B1A]/40 border-[#D4A55A]/10 hover:border-[#D4A55A]/25"
                          }`}
                        >
                          <div className="flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              selectedPickupBranch === "pinamar" ? "border-[#D4A55A]" : "border-zinc-700"
                            }`}>
                              {selectedPickupBranch === "pinamar" && <div className="h-2 w-2 rounded-full bg-[#D4A55A]" />}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Building className={`h-4 w-4 ${selectedPickupBranch === "pinamar" ? "text-[#E6BF76]" : "text-zinc-500"}`} />
                              <h4 className="text-xs font-bold uppercase tracking-wide text-[#F4EAD7]">JUEM Canelones (Pinamar)</h4>
                            </div>
                            <p className="text-xs text-zinc-300 leading-normal">
                              📍 {settings.pickupAddressPinamar || "C. 54, 15100 Pinamar, Departamento de Canelones"}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-1.5 italic">
                              Horario: {settings.pickupHoursPinamar || "Lunes a Viernes de 9:00 a 17:00 hs y Sábados de 09:00 a 13:00 hs."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Box 3: DIRECCIÓN Y ENVÍO (Domicilio flow only) */}
            {shippingType === "delivery" && (
              <div className="p-6 rounded-2xl border bg-[#0B1730] border-[#D4A55A]/20 text-[#F4EAD7] shadow-xl shadow-black/35">
                <h2 className="text-base font-extrabold tracking-tight mb-4 uppercase flex items-center gap-2.5">
                  <span className="p-1 px-2.5 bg-[#D4A55A]/10 text-[#E6BF76] rounded-lg text-xs font-black">3</span>
                  Dirección y Envío
                </h2>

                {/* Delivery Map helper banner inside Checkout */}
                <div className="mb-4 p-3 rounded-xl border border-[#D4A55A]/25 bg-[#050B1A]/80 text-[#F4EAD7] flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🗺️</span>
                    <div className="flex flex-col">
                      <span className="font-bold text-[#E6BF76]">Zonas de Envío Directo</span>
                      <span className="text-[10px] text-zinc-400">Montevideo y Canelones con cadetería Juem</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCheckoutDeliveryMapOpen(true)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[#D4A55A]/10 border border-[#D4A55A]/40 text-[#E6BF76] hover:bg-[#D4A55A] hover:text-[#050B18] text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Ver Mapa de Envíos</span>
                  </button>
                </div>

                {/* Mis direcciones block */}
                <div className="flex items-center justify-between mb-4 border-t pt-4 border-dashed border-[#D4A55A]/20">
                  <h3 className="text-sm font-extrabold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="h-4.5 w-4.5 text-[#E6BF76]" />
                    Mis direcciones
                  </h3>
                  
                  {addresses.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalMode("add");
                        setEditingAddressId(null);
                        setModalDept("Montevideo");
                        setModalZone("Paso de la Arena");
                        setModalStreet("");
                        setModalDoorNumber("");
                        setModalApartment("");
                        setModalSolar("");
                        setModalManzana("");
                        setModalAdditionalData("");
                        setModalError("");
                        setIsAddressModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D4A55A]/20 text-xs font-bold transition duration-150 cursor-pointer bg-[#050B1A]/40 text-zinc-300 hover:border-[#D4A55A]/45 hover:bg-[#050B1A]/80"
                    >
                      <PlusCircle className="h-4 w-4 text-[#E6BF76]" />
                      Agregar dirección
                    </button>
                  )}
                </div>

                {/* Stored Address List */}
                <div className="flex flex-col gap-2 mb-4 w-full">
                  {addresses.length === 0 ? (
                    <div className="w-full text-center py-5 border border-dashed border-[#D4A55A]/20 rounded-xl bg-[#050B1A]/30 text-xs text-zinc-400">
                      No tienes una dirección ingresada. Presiona "Agregar dirección" para ingresar tu domicilio.
                    </div>
                  ) : (
                    addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      const hasStreet = !!addr.street.trim();
                      const hasDoor = !!addr.doorNumber.trim();
                      const hasMz = addr.dept !== "Montevideo" && addr.manzana && addr.manzana.trim();
                      const hasSl = addr.dept !== "Montevideo" && addr.solar && addr.solar.trim();
                      const hasAdditional = !!addr.additionalData?.trim();
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`p-2.5 px-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 w-full ${
                            isSelected
                              ? "border-[#D4A55A] bg-[#050B1A]/80 shadow-md shadow-black/20"
                              : "bg-[#050B1A]/30 border-[#D4A55A]/10 hover:border-[#D4A55A]/25"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="flex items-center justify-center flex-shrink-0">
                              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-[#D4A55A]" : "border-zinc-700"
                              }`}>
                                {isSelected && <div className="h-1.8 w-1.8 rounded-full bg-[#D4A55A]" />}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs sm:text-xs block font-bold uppercase tracking-wide text-[#F4EAD7] leading-snug">
                                {[
                                  hasStreet ? addr.street : "",
                                  hasDoor ? addr.doorNumber : "",
                                  addr.apartment ? `Apto ${addr.apartment}` : "",
                                  hasMz ? `Mz ${addr.manzana}` : "",
                                  hasSl ? `Sol ${addr.solar}` : ""
                                ].filter(Boolean).join(" ")}
                              </span>
                              {hasAdditional && (
                                <span className="text-[10px] text-[#D4A55A] font-semibold block mt-0.5 leading-tight">
                                  Datos adicionales: {addr.additionalData}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400 block font-mono leading-none mt-1">
                                {addr.zone}, {addr.dept}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <button
                               type="button"
                               onClick={() => {
                                 setModalMode("edit");
                                 setEditingAddressId(addr.id);
                                 setModalDept(addr.dept);
                                 setModalZone(addr.zone);
                                 setModalStreet(addr.street);
                                 setModalDoorNumber(addr.doorNumber);
                                 setModalApartment(addr.apartment || "");
                                 setModalSolar(addr.solar || "");
                                 setModalManzana(addr.manzana || "");
                                 setModalAdditionalData(addr.additionalData || "");
                                 setModalError("");
                                 setIsAddressModalOpen(true);
                               }}
                              className="p-1 rounded hover:bg-zinc-800/60 text-zinc-400 hover:text-white dark:text-zinc-500 transition"
                              title="Editar dirección"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 const filtered = addresses.filter(a => a.id !== addr.id);
                                 setAddresses(filtered);
                                 if (selectedAddressId === addr.id && filtered.length > 0) {
                                   setSelectedAddressId(filtered[0].id);
                                 } else if (filtered.length === 0) {
                                   setSelectedAddressId("");
                                 }
                               }}
                              className="p-1 rounded hover:bg-red-950/20 text-zinc-400 hover:text-red-400 dark:text-zinc-500 transition"
                              title="Eliminar dirección"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                  {/* Delivery Carrier Selection */}
                  <div className="space-y-4 pt-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E6BF76] block">
                      Selecciona la Forma de Envío
                    </span>

                      <div className="space-y-4">
                        {/* Local Deliveries (stacked vertically) */}
                        {(() => {
                          const localMethods = deliveryMethods.filter(m => {
                            const isAgency = m.id === "ues" || 
                              m.id === "dac" || 
                              m.id === "depunta" || 
                              m.id === "otras_agencias" ||
                              m.iconType === "ues" || 
                              m.iconType === "dac" || 
                              m.iconType === "depunta" ||
                              m.title.toLowerCase().includes("agencia") ||
                              m.title.toLowerCase().includes("destino") ||
                              m.title.toLowerCase().includes("tres cruces");
                            return !isAgency;
                          });

                          if (localMethods.length === 0) return null;

                          return (
                            <div className="space-y-2.5">
                              {localMethods.map((method) => {
                                const status = getDeliveryMethodStatus(method.id, method.title, method.subtext);
                                const isSelected = selectedDeliveryMethod === method.id;
                                
                                // Cost calculation for display
                                let costText = "";
                                if (hasFreeShipping) {
                                  costText = "Gratis";
                                } else {
                                  // Calculate cost for this specific method
                                  let cost = 0;
                                  const isPinamarMethod = method.id === "cadeteria_juem_coast" || 
                                    method.id.toLowerCase().includes("coast") || 
                                    method.id.toLowerCase().includes("pinamar") || 
                                    method.title.toLowerCase().includes("pinamar") || 
                                    method.title.toLowerCase().includes("canelones") ||
                                    method.title.toLowerCase().includes("costa") ||
                                    (method.subtext || "").toLowerCase().includes("pinamar") ||
                                    (method.subtext || "").toLowerCase().includes("canelones") ||
                                    (method.subtext || "").toLowerCase().includes("costa");

                                  const isMvdMethod = method.id === "cadeteria_juem_mvd" || 
                                    method.id === "mvd_normal" ||
                                    method.id.toLowerCase().includes("mvd") || 
                                    method.title.toLowerCase().includes("montevideo") ||
                                    (method.subtext || "").toLowerCase().includes("montevideo");

                                  const activeAddress = addresses.find((a) => a.id === selectedAddressId);
                                  const currentDept = activeAddress ? activeAddress.dept : dept;
                                  const currentZone = activeAddress ? activeAddress.zone : neighborhood;
                                  const d = (currentDept || "").trim();
                                  const n = (currentZone || "").trim().toLowerCase();

                                  const zone8Zones = ["las piedras", "la paz", "progreso"];
                                  const zone9Zones = [
                                    "barros blancos", "pando", "toledo", "suarez", "suárez", 
                                    "joaquin suarez", "joaquín suárez", "joaquin suárez", "joaquín suarez"
                                  ];

                                  if (d === "Canelones" && (zone8Zones.includes(n) || zone9Zones.includes(n))) {
                                    cost = 290;
                                  } else if (isMvdMethod) {
                                    cost = settings.shippingCostMontevideo !== undefined ? settings.shippingCostMontevideo : 200;
                                  } else if (isPinamarMethod) {
                                    cost = settings.shippingCostPinamar !== undefined ? settings.shippingCostPinamar : 199;
                                  } else {
                                    // fallback based on location
                                    cost = isMvd ? (settings.shippingCostMontevideo ?? 200) : (settings.shippingCostPinamar ?? 199);
                                  }
                                  costText = `$${cost}`;
                                }

                                return (
                                  <div
                                    key={method.id}
                                    onClick={() => {
                                      if (!status.disabled) {
                                        setSelectedDeliveryMethod(method.id);
                                      }
                                    }}
                                    className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-3 select-none relative ${
                                      status.disabled
                                        ? "bg-[#050B1A]/10 border-zinc-900/60 opacity-45 cursor-not-allowed"
                                        : isSelected
                                          ? "border-[#D4A55A] bg-[#050B1A]/85 shadow-md shadow-[#D4A55A]/5 cursor-pointer"
                                          : "bg-[#050B1A]/40 border-[#D4A55A]/10 hover:border-[#D4A55A]/25 cursor-pointer"
                                    }`}
                                  >
                                    {/* Left part: Icon and Text */}
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      {/* Card Logo / Drawing Image Container */}
                                      <div className={`flex-shrink-0 ${status.disabled ? "opacity-40 grayscale" : ""}`}>
                                        {method.iconType === "motorcycle" ? (
                                          <div className="w-[100px] sm:w-[105px] h-11 bg-white border border-zinc-200 rounded-lg overflow-hidden flex items-center justify-center p-1 shadow-sm">
                                            <svg className="max-w-full max-h-full object-contain" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <rect width="48" height="32" rx="6" fill="#FCE7F3" />
                                              <g transform="translate(6, 4)">
                                                <circle cx="9" cy="20" r="3.5" fill="#1F2937" />
                                                <circle cx="9" cy="20" r="1.2" fill="#FFFFFF" />
                                                <circle cx="27" cy="20" r="3.5" fill="#1F2937" />
                                                <circle cx="27" cy="20" r="1.2" fill="#FFFFFF" />
                                                <path d="M 9 20 L 13 16 L 22 16 L 27 20" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M 27 20 L 25 10 L 22 10" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
                                                <circle cx="18" cy="8" r="2.5" fill="#374151" />
                                                <path d="M 15 11 L 21 11 L 20 16 L 16 16 Z" fill="#3B82F6" />
                                                <path d="M 20 12 L 23 12" stroke="#374151" strokeWidth="1" />
                                                <rect x="7" y="7" width="7" height="7" rx="1" fill="#D97706" />
                                                <line x1="10.5" y1="7" x2="10.5" y2="14" stroke="#78350F" strokeWidth="0.8" />
                                              </g>
                                            </svg>
                                          </div>
                                        ) : (
                                          <div className="w-[100px] sm:w-[105px] h-11 bg-white border border-zinc-200 rounded-lg overflow-hidden flex items-center justify-center p-1 shadow-sm">
                                            <svg className="max-w-full max-h-full object-contain" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <rect width="48" height="32" rx="6" fill="#FFEDD5" />
                                              <g transform="translate(6, 4)">
                                                <circle cx="10" cy="20" r="3.5" fill="#1F2937" />
                                                <circle cx="10" cy="20" r="1.2" fill="#FFFFFF" />
                                                <circle cx="26" cy="20" r="3.5" fill="#1F2937" />
                                                <circle cx="26" cy="20" r="1.2" fill="#FFFFFF" />
                                                <rect x="4" y="6" width="16" height="11" rx="1.5" fill="#F97316" />
                                                <path d="M 20 8 L 26 8 L 30 12 L 30 17 L 20 17 Z" fill="#FB923C" />
                                                <path d="M 21 9 L 25 9 L 27 12 L 21 12 Z" fill="#E2E8F0" />
                                                <path d="M 7 17 A 4 4 0 0 1 13 17" stroke="#7C2D12" strokeWidth="1" fill="none" />
                                                <path d="M 23 17 A 4 4 0 0 1 29 17" stroke="#7C2D12" strokeWidth="1" fill="none" />
                                              </g>
                                            </svg>
                                          </div>
                                        )}
                                      </div>

                                      {/* Card Texts: Title & Subtext */}
                                      <div className="min-w-0 text-left">
                                        <span className={`text-[11px] sm:text-xs block font-extrabold leading-tight line-clamp-2 ${
                                          status.disabled ? "text-zinc-500" : "text-[#F4EAD7]"
                                        }`}>
                                          {method.title}
                                        </span>
                                        {status.disabled ? (
                                          <span className="text-[9px] sm:text-[10px] text-amber-500/80 font-semibold block mt-1 leading-tight flex items-center gap-1.5">
                                            <span className="inline-block w-1 h-1 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                                            {status.reason}
                                          </span>
                                        ) : (
                                          method.subtext && (
                                            <span className="text-[9px] sm:text-[10px] text-zinc-400 italic block mt-0.5 leading-tight line-clamp-1">
                                              {method.subtext}
                                            </span>
                                          )
                                        )}
                                      </div>
                                    </div>

                                    {/* Right part: Cost and Radio circle */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      {/* Cost / Badge */}
                                      <div>
                                        {hasFreeShipping ? (
                                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                            status.disabled 
                                              ? "bg-zinc-900/50 border border-zinc-800/60 text-zinc-600" 
                                              : "bg-emerald-950/40 border border-emerald-900/40 text-emerald-400"
                                          }`}>
                                            Gratis
                                          </span>
                                        ) : (
                                          <span className={`text-xs font-black inline-block ${
                                            status.disabled ? "text-zinc-600" : "text-[#E6BF76]"
                                          }`}>
                                            {costText}
                                          </span>
                                        )}
                                      </div>

                                      {/* Radio selector circle */}
                                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                        status.disabled
                                          ? "border-zinc-800 bg-transparent"
                                          : isSelected ? "border-[#D4A55A]" : "border-zinc-700"
                                      }`}>
                                        {isSelected && !status.disabled && <div className="h-1.8 w-1.8 rounded-full bg-[#D4A55A]" />}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Agency Deliveries (horizontal side-by-side buttons) */}
                        {(() => {
                          const agencyMethods = deliveryMethods.filter(m => {
                            const isAgency = m.id === "ues" || 
                              m.id === "dac" || 
                              m.id === "depunta" || 
                              m.id === "otras_agencias" ||
                              m.iconType === "ues" || 
                              m.iconType === "dac" || 
                              m.iconType === "depunta" ||
                              m.title.toLowerCase().includes("agencia") ||
                              m.title.toLowerCase().includes("destino") ||
                              m.title.toLowerCase().includes("tres cruces");
                            return isAgency;
                          });

                          if (agencyMethods.length === 0) return null;

                          return (
                            <div className="pt-1.5">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {agencyMethods.map((method) => {
                                  const isSelected = selectedDeliveryMethod === method.id;
                                  const isUes = method.id === "ues" || method.iconType === "ues";
                                  const isDac = method.id === "dac" || method.iconType === "dac";
                                  const isDePunta = method.id === "depunta" || method.iconType === "depunta";
                                  const isOtras = method.id === "otras_agencias" || method.iconType === "otras_agencias";

                                  return (
                                    <div
                                      key={method.id}
                                      onClick={() => setSelectedDeliveryMethod(method.id)}
                                      className={`p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center select-none relative h-13 ${
                                        isSelected
                                          ? "border-[#D4A55A] bg-[#050B1A]/85 shadow-md shadow-[#D4A55A]/5"
                                          : "bg-[#050B1A]/40 border-[#D4A55A]/10 hover:border-[#D4A55A]/25"
                                      }`}
                                    >
                                      {/* Absolute positioning of small radio selector */}
                                      <div className="absolute top-1 right-1">
                                        <div className={`h-3 w-3 rounded-full border flex items-center justify-center ${
                                          isSelected ? "border-[#D4A55A]" : "border-zinc-700"
                                        }`}>
                                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-[#D4A55A]" />}
                                        </div>
                                      </div>

                                      {/* Logo / Text Display */}
                                      <div className="w-full h-full flex items-center justify-center px-1 py-1">
                                        {isUes && (
                                          <div className="w-full h-full bg-white border border-zinc-200 rounded-lg flex items-center justify-center p-1 shadow-sm">
                                            <img 
                                              src="https://www.uesinternacional.com/img/logo-footer.svg"
                                              alt="UES"
                                              className="max-h-full object-contain filter brightness-100"
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                        )}

                                        {isDac && (
                                          <div className="w-full h-full bg-white border border-zinc-200 rounded-lg flex items-center justify-center p-1 shadow-sm">
                                            <img 
                                              src="https://fajabooks.uy/dac-logo.png"
                                              alt="DAC"
                                              className="max-h-full object-contain"
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                        )}

                                        {isDePunta && (
                                          <div className="w-full h-full bg-white border border-zinc-200 rounded-lg flex items-center justify-center p-1 shadow-sm">
                                            <img 
                                              src="https://www.depunta.com/img/logo.svg"
                                              alt="De Punta"
                                              className="max-h-full object-contain filter brightness-95"
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                        )}

                                        {isOtras && (
                                          <div className="w-full h-full bg-zinc-800 border border-zinc-700 rounded-lg flex flex-col items-center justify-center text-center p-0.5 shadow-sm">
                                            <span className="text-[8px] font-black text-[#E6BF76] uppercase leading-none">OTRAS</span>
                                            <span className="text-[7px] font-bold text-zinc-300 uppercase mt-0.5 leading-none">AGENCIAS</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                    {/* Display Warning / Input for Otras Agencias when active */}
                    {selectedDeliveryMethod === "otras_agencias" && (
                      <div className="mt-2.5 p-3 rounded-xl bg-[#050B1A]/60 border border-[#D4A55A]/30 space-y-2 animate-fade-in text-left">
                        <label className="block text-[10px] font-extrabold text-[#E6BF76] uppercase tracking-wider">
                          Especifica la Agencia de Tres Cruces que prefieras:
                        </label>
                        <input
                          type="text"
                          value={customAgency}
                          onChange={(e) => setCustomAgency(e.target.value)}
                          placeholder="Ej: Turil, Copay, Núñez, Cotmi, Bruno, etc."
                          className="w-full text-xs py-2 px-3 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#D4A55A] focus:border-[#D4A55A]"
                        />
                        <p className="text-[10px] text-zinc-400">
                          *Despacharemos tu paquete en Tres Cruces por la empresa de transporte especificada (cobro en destino).
                        </p>
                      </div>
                    )}

                    {/* Display warning only for active selected agency */}
                    {(() => {
                      const selectedMethod = deliveryMethods.find(m => m.id === selectedDeliveryMethod);
                      if (!selectedMethod) return null;
                      const isAgency = selectedMethod.id === "ues" || 
                        selectedMethod.id === "dac" || 
                        selectedMethod.id === "depunta" || 
                        selectedMethod.id === "otras_agencias" ||
                        selectedMethod.iconType === "ues" || 
                        selectedMethod.iconType === "dac" || 
                        selectedMethod.iconType === "depunta" ||
                        selectedMethod.title.toLowerCase().includes("agencia") ||
                        selectedMethod.title.toLowerCase().includes("destino") ||
                        selectedMethod.title.toLowerCase().includes("tres cruces");

                      if (isAgency) {
                        return (
                          <div className="p-3.5 rounded-xl border flex flex-col gap-2 mt-3 text-xs transition-all animate-fade-in bg-amber-950/25 border-amber-500/35 text-amber-200">
                            <div className="flex items-center gap-2">
                              <HelpCircle className="h-4.5 w-4.5 text-amber-400 flex-shrink-0 animate-pulse" />
                              <span className="font-extrabold uppercase tracking-wider text-[10px] text-[#E6BF76]">
                                Importante - Pago de Envío por Agencia
                              </span>
                            </div>
                            <p className="leading-normal font-semibold text-zinc-300 text-[11.5px] pl-6">
                              El costo del envío de la encomienda por <span className="text-[#E6BF76] font-black">
                                {selectedMethod.id === "ues" ? "UES" : selectedMethod.id === "dac" ? "DAC" : selectedMethod.id === "depunta" ? "De Punta" : selectedMethod.id === "otras_agencias" ? (customAgency.trim() || "Otras Agencias") : selectedMethod.title}
                              </span> <strong className="text-amber-350">lo paga el cliente directamente a la empresa transportista al recibir o retirar su pedido</strong> (cobro en destino). Nosotros despachamos tu paquete sin cargo adicional hasta la agencia de origen.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                {/* Free Shipping Alert Box */}
                {hasFreeShipping && (() => {
                  const activeAddress = addresses.find((a) => a.id === selectedAddressId);
                  const currentZone = activeAddress ? activeAddress.zone : neighborhood;
                  const currentDept = activeAddress ? activeAddress.dept : dept;
                  const displayZone = [currentZone, currentDept].filter(Boolean).join(", ");
                  return (
                    <div className="p-4 rounded-xl border flex items-start gap-3 mt-4 text-xs bg-emerald-950/30 border-emerald-500/40 text-emerald-300">
                      <span className="text-xl">🎁</span>
                      <div>
                        <span className="font-extrabold uppercase tracking-widest text-[10px] block text-emerald-400 mb-1">
                          ¡Envío Gratis Aplicado!
                        </span>
                        <p className="leading-relaxed">
                          Tu compra supera el monto de <strong>${settings.freeShippingMinAmount !== undefined ? settings.freeShippingMinAmount : 2000}</strong> y la zona de entrega (<strong>{displayZone || "Montevideo"}</strong>) califica para el beneficio de envío gratis. ¡Tu envío no tendrá costo!
                        </p>
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}

            {/* Box: COMENTARIOS ADICIONALES */}
            <div className="p-6 rounded-2xl border bg-[#0B1730] border-[#D4A55A]/20 text-[#F4EAD7] shadow-xl shadow-black/35">
              <h2 className="text-base font-extrabold tracking-tight mb-3.5 uppercase flex items-center gap-2.5">
                <span className="p-1 px-2.5 bg-[#D4A55A]/10 text-[#E6BF76] rounded-lg text-xs font-black">
                  <MessageSquare className="h-4 w-4" />
                </span>
                Aclaraciones o Comentarios del Pedido
              </h2>
              <textarea
                value={shippingNotes}
                onChange={(e) => setShippingNotes(e.target.value)}
                placeholder="Ej: Talle M, color Negro. El timbre no funciona, por favor llamarme al llegar..."
                rows={3}
                className="w-full rounded-xl bg-[#050B1A] border border-[#D4A55A]/20 hover:border-[#D4A55A]/40 focus:border-[#D4A55A] focus:ring-1 focus:ring-[#D4A55A] text-xs font-sans text-zinc-200 placeholder-zinc-500 p-3.5 outline-none transition resize-none leading-relaxed"
              />
            </div>

            {/* Step 2 Inline Actions */}
            <div className="pt-4 space-y-3">
              {errorMessage && (
                <div className="p-3 bg-red-950/35 border border-red-900/30 text-rose-400 text-xs rounded-xl text-center font-bold animate-pulse">
                  ⚠️ {errorMessage}
                </div>
              )}
              <div className="hidden sm:flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage("");
                    setCheckoutStep(1);
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-extrabold uppercase tracking-widest border border-[#D4A55A]/25 bg-[#050B1A]/60 text-zinc-350 hover:bg-[#050B1A]/90 hover:border-[#D4A55A]/50 hover:text-white transition active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 text-[#E6BF76]" />
                  <span>Volver</span>
                </button>
                <button
                  type="button"
                  onClick={handleContinueToPayment}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-extrabold uppercase tracking-widest bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A] shadow-md active:scale-95 transition cursor-pointer"
                >
                  <span>Continuar</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {checkoutStep === 3 && (
              <motion.div
                animate={shakeStep ? { x: [-8, 8, -6, 6, -4, 4, -2, 2, 0] } : {}}
                transition={{ duration: 0.4 }}
                onAnimationComplete={() => setShakeStep(false)}
                className="space-y-6"
              >
            {/* Box 4: OPCIÓN DE PAGO */}
            <div className="p-6 rounded-2xl border bg-[#0B1730] border-[#D4A55A]/20 text-[#F4EAD7] shadow-xl shadow-black/35">
              <h2 className="text-base font-extrabold tracking-tight mb-4 uppercase flex items-center gap-2.5">
                <span className="p-1 px-2.5 bg-[#D4A55A]/10 text-[#E6BF76] rounded-lg text-xs font-black">4</span>
                Método de Pago
              </h2>
              <p className="text-xs mb-6 font-medium text-zinc-300">
                Selecciona tu opción de pago preferida para completar tu compra:
              </p>

              <div className="space-y-4">
                {/* Option 1: Mercado Pago */}
                {settings.mercadopagoActive !== false && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("mercadopago")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 cursor-pointer ${
                      paymentMethod === "mercadopago"
                        ? "border-[#D4A55A] bg-[#050B1A]/85"
                        : "border-[#D4A55A]/10 bg-[#050B1A]/40 hover:border-[#D4A55A]/30"
                    }`}
                  >
                    <div className="flex items-center justify-center pt-0.5">
                      <div className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === "mercadopago" ? "border-[#D4A55A]" : "border-zinc-700"
                      }`}>
                        {paymentMethod === "mercadopago" && <div className="h-2 w-2 rounded-full bg-[#D4A55A]" />}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-black uppercase tracking-wider text-[#F4EAD7] whitespace-nowrap">
                          Mercado Pago
                        </span>
                        <div className="bg-white h-10 sm:h-11 px-2 rounded-lg flex items-center justify-center select-none flex-shrink-0 border border-zinc-200 shadow-xs">
                          <img 
                            src="https://res.cloudinary.com/dwqzjqjwz/image/upload/v1781615753/MP_RGB_HANDSHAKE_color_vertical_z5rbvz.png" 
                            alt="Mercado Pago Logo" 
                            className="h-8.5 sm:h-9.5 w-auto object-contain select-none animate-fade-in"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {/* Option 2: Transferencia Bancaria */}
                {settings.transferActive !== false && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("transfer")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 cursor-pointer ${
                      paymentMethod === "transfer"
                        ? "border-[#D4A55A] bg-[#050B1A]/85"
                        : "border-[#D4A55A]/10 bg-[#050B1A]/40 hover:border-[#D4A55A]/30"
                    }`}
                  >
                    <div className="flex items-center justify-center pt-0.5">
                      <div className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === "transfer" ? "border-[#D4A55A]" : "border-zinc-700"
                      }`}>
                        {paymentMethod === "transfer" && <div className="h-2 w-2 rounded-full bg-[#D4A55A]" />}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-[#F4EAD7]">
                          Transferencia o Giro
                        </span>
                        <span className="text-[9px] font-black uppercase bg-[#D4A55A]/10 text-[#E6BF76] px-2.5 py-0.5 rounded-md">
                          Abitab / Redpagos / MP
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed mt-1 font-semibold text-zinc-400">
                        Transfiere en línea. Te facilitamos nuestra cuenta bancaria uruguaya y envías el comprobante por WhatsApp.
                      </p>
                    </div>
                  </button>
                )}

                {/* Option 3: Efectivo Contraentrega */}
                {settings.cashActive !== false && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 cursor-pointer ${
                      paymentMethod === "cash"
                        ? "border-[#D4A55A] bg-[#050B1A]/85"
                        : "border-[#D4A55A]/10 bg-[#050B1A]/40 hover:border-[#D4A55A]/30"
                    }`}
                  >
                    <div className="flex items-center justify-center pt-0.5">
                      <div className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === "cash" ? "border-[#D4A55A]" : "border-zinc-700"
                      }`}>
                        {paymentMethod === "cash" && <div className="h-2 w-2 rounded-full bg-[#D4A55A]" />}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-[#F4EAD7]">
                          Efectivo Contraentrega
                        </span>
                        <span className="text-[9px] font-black uppercase bg-amber-500/10 text-amber-450 px-2.5 py-0.5 rounded-md">
                          Pagas al recibir
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed mt-1 font-semibold text-zinc-400">
                        Pagas directamente en mano al repartidor cuando recibas tu paquete en tu puerta.
                      </p>
                    </div>
                  </button>
                )}
              </div>

              {/* Payment Explanatory detail block */}
              <div className={`p-4 rounded-xl border mt-6 bg-[#050B1A]/85 border-[#D4A55A]/20 ${
                paymentMethod === "mercadopago" || paymentMethod === "transfer" ? "hidden sm:block" : ""
              }`}>
                {paymentMethod === "mercadopago" ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-[#E6BF76] tracking-wider">Detalles de Mercado Pago</span>
                    <p className="text-[11px] leading-relaxed font-semibold text-zinc-350">
                      Al dar clic en <strong className="text-[#D4A55A]">PAGAR CON MERCADO PAGO</strong>, se abrirá la pasarela oficial segura. Podrás pagar online con tarjeta de crédito en cómodas cuotas sin interés, débito directo, o solicitar un cupón para pagar en Abitab/Redpagos.
                    </p>
                  </div>
                ) : paymentMethod === "transfer" ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-[#E6BF76] tracking-wider">Detalles de Transferencia Bancaria</span>
                    <p className="text-[11px] leading-relaxed font-semibold text-zinc-350">
                      Al continuar a <strong className="text-[#D4A55A]">COMPRA</strong>, se registrará el detalle de tu compra en nuestro sistema y recibirás una notificación de confirmación con los datos bancarios.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-[#E6BF76] tracking-wider">Detalles de Efectivo Contraentrega</span>
                    <p className="text-[11px] leading-relaxed font-semibold text-zinc-350">
                      Al continuar a <strong className="text-[#D4A55A]">COMPRA</strong>, registraremos el envío de tu paquete por mensajería. Le abonas el total neto al repartidor cuando toque tu timbre.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 Inline Actions */}
            <div className="pt-4 space-y-3">
              {errorMessage && (
                <div className="p-3 bg-red-950/35 border border-red-900/30 text-rose-400 text-xs rounded-xl text-center font-bold">
                  ⚠️ {errorMessage}
                </div>
              )}
              <div className="hidden sm:flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setCheckoutStep(2);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-extrabold uppercase tracking-widest border border-[#D4A55A]/25 bg-[#050B1A]/60 text-zinc-350 hover:bg-[#050B1A]/90 hover:border-[#D4A55A]/50 hover:text-white transition active:scale-95 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4 text-[#E6BF76]" />
                    <span>Volver</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setCheckoutStep(2);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-extrabold uppercase tracking-widest border border-[#D4A55A]/25 bg-[#050B1A]/60 text-[#E6BF76] hover:bg-[#050B1A]/90 hover:border-[#D4A55A]/50 hover:text-white transition active:scale-95 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4 text-[#D4A55A]" />
                    <span>Editar Envío</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

          {/* RIGHT COLUMN: Order summary */}
          <div className="lg:col-span-5 order-first lg:order-none">
            <div className="p-4 sm:p-6 rounded-2xl border border-[#D4A55A]/20 bg-[#0B1730] text-[#F4EAD7] shadow-xl shadow-black/35 sticky top-2 sm:top-6 z-30">
              {/* Accordion Toggle Header for Mobile / Standard Header for Desktop */}
              <button
                type="button"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="w-full flex items-center justify-between border-b pb-3 border-zinc-800/80 uppercase text-left group lg:cursor-default"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4.5 w-4.5 text-[#E6BF76]" />
                  <span className="text-xs sm:text-sm md:text-base font-bold whitespace-nowrap">Resumen de Compra</span>
                  <span className="p-1 px-2.5 bg-zinc-850 rounded-lg text-[9px] font-semibold text-zinc-400 font-mono">
                    {cartItems.reduce((s, i) => s + i.quantity, 0)} {cartItems.reduce((s, i) => s + i.quantity, 0) === 1 ? "artículo" : "artículos"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <span className="lg:hidden text-xs sm:text-sm font-black font-mono text-emerald-400">
                    $ {totalUYU} UYU
                  </span>
                  <div className="lg:hidden p-1 rounded-md bg-[#050B1A] border border-[#D4A55A]/25 text-[#E6BF76] group-hover:text-white transition">
                    {isSummaryExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              </button>

              {/* Collapsed content container */}
              <div className={`mt-4 space-y-4 lg:space-y-4 lg:block ${isSummaryExpanded ? "block" : "hidden"}`}>

              {/* Items display list */}
              <div className="max-h-60 overflow-y-auto space-y-3.5 pr-1.5 mb-4 custom-scrollbar">
                {cartItems.map((item) => {
                  const is3D = is3DProduct(item.product);
                  const priceUYU = getItemPrice(item);
                  return (
                    <div key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`} className="flex items-start gap-3 text-xs">
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="h-14 w-11 object-cover rounded bg-zinc-800 border border-zinc-800/60 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold line-clamp-1 theme-text-primary text-zinc-100 dark:text-zinc-50 uppercase tracking-tight">
                          {item.product.name}
                        </h4>
                        
                        {(item.selectedSize || item.selectedColor) && (
                          <div className="flex gap-1.5 items-center mt-0.5 text-[9px] font-mono text-zinc-400">
                            {item.selectedSize && (
                              <span className="opacity-90">{is3D ? "Material" : "Talle"}: {item.selectedSize}</span>
                            )}
                            {item.selectedColor && (
                              <span className="opacity-90">Col: {item.selectedColor}</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between items-center mt-2.5">
                          <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-950 text-[10px] h-6 font-mono">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity > 1) {
                                  onUpdateQuantity(item.product.id, item.quantity - 1, item.selectedSize, item.selectedColor);
                                } else {
                                  onRemoveItem(item.product.id, item.selectedSize, item.selectedColor);
                                }
                              }}
                              className="px-1.5 text-zinc-550 hover:text-red-400 transition cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-1.5 text-zinc-200">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                              className="px-1.5 text-zinc-550 hover:text-emerald-450 transition cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-zinc-300 dark:text-zinc-200 text-xs">
                              UYU $ {Math.round(priceUYU * item.quantity)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.product.id, item.selectedSize, item.selectedColor)}
                              className="text-zinc-650 hover:text-red-400 p-0.5 transition cursor-pointer"
                              title="Borrar artículo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Promo code - Only in Step 1 */}
              {checkoutStep === 1 && (
                <>
                  <div className="flex gap-2 mb-4 pt-1">
                    <input
                      type="text"
                      placeholder="Código de cupón (BUELO15)"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 text-xs px-3 py-2.5 rounded-lg border border-[#D4A55A]/25 bg-[#050B1A] text-[#F4EAD7] placeholder-zinc-500 outline-none font-mono tracking-wide focus:border-[#D4A55A]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition whitespace-nowrap bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A]"
                    >
                      Aplicar
                    </button>
                  </div>

                  {promoStatus === "success" && (
                    <p className="text-[11px] text-emerald-400 font-semibold mb-3">✔️ ¡Descuento de {appliedDiscount}% aplicado con éxito!</p>
                  )}
                  {promoStatus === "invalid" && (
                    <p className="text-[11px] text-red-450 font-semibold mb-3">❌ Código de cupón no válido o inactivo.</p>
                  )}
                </>
              )}

              {/* Price Breakdown in UYU (strictly in Pesos Uruguayos) */}
              <div className="p-4 rounded-xl space-y-2 mb-6 bg-[#050B1A]/85 border border-[#D4A55A]/20">
                <div className="flex justify-between items-center text-xs text-zinc-400 uppercase tracking-wide">
                  <span>Subtotal</span>
                  <span className="font-mono text-xs font-bold text-zinc-300 dark:text-zinc-200">$ {subtotalUYU} UYU</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-450 uppercase tracking-wide">
                    <span>Descuento ({appliedDiscount}%)</span>
                    <span className="font-mono font-bold text-emerald-400">-$ {discountAmountUYU} UYU</span>
                  </div>
                )}
                {shippingType === "delivery" && checkoutStep > 1 && (
                  <div className="flex justify-between items-center text-xs text-zinc-400 uppercase tracking-wide pt-0.5">
                    <span>Costo de Envío</span>
                    {hasFreeShipping ? (
                      <span className="font-sans text-[10px] font-black tracking-wide text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full animate-pulse">
                        🎁 ¡GRATIS!
                      </span>
                    ) : finalShippingCost > 0 ? (
                      <span className="font-mono text-xs font-bold text-zinc-300 dark:text-zinc-200">
                        $ {finalShippingCost} UYU
                      </span>
                    ) : (
                      <span className="font-sans text-[10px] text-zinc-400 font-semibold italic">
                        Cobro en destino
                      </span>
                    )}
                  </div>
                )}
                
                {paymentMethod === "mercadopago" && mercadopagoSurchargeAmount > 0 && (
                  <div className="flex justify-between items-center text-xs text-amber-500 uppercase tracking-wide pt-0.5 font-semibold">
                    <span>Recargo Mercado Pago ({settings.mercadopagoSurchargePercent}%)</span>
                    <span className="font-mono text-xs font-bold">$ {mercadopagoSurchargeAmount} UYU</span>
                  </div>
                )}
                
                <hr className="border-dashed my-1 border-[#D4A55A]/20" />

                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-350 dark:text-zinc-200">TOTAL NETO A PAGAR</span>
                  <span className="text-xl font-black font-mono leading-none theme-text-primary text-emerald-400">
                    $ {totalUYU} UYU
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-950/35 border border-red-900/30 text-rose-400 text-xs rounded-xl mb-4 text-center font-semibold">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Submission button */}
              {checkoutStep === 3 && (
                <button
                  disabled={isProcessing}
                  onClick={handleSubmitOrder}
                  className="hidden sm:flex w-full items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-black/15 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>{paymentMethod === "mercadopago" ? "Iniciando Mercado Pago..." : "Procesando..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{paymentMethod === "mercadopago" ? "Pagar con Mercado Pago" : "Compra"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
              
              {isProcessing && paymentMethod === "mercadopago" && (
                <div id="mp-redirect-warning" className="p-3.5 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-450 rounded-xl text-center text-xs font-bold mt-3 animate-pulse">
                  🔒 Serás redirigido al entorno seguro de Mercado Pago para completar tu compra.
                </div>
              )}

              <p className="text-center text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-3.5 leading-normal">
                Proceso seguro e inmediato. Toda la información personal y datos bancarios están protegidos.
              </p>
              </div> {/* Close collapsed content container */}
            </div>
          </div>

        </div>
      </div>

      {/* Address Management Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-[2px]">
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="w-full max-w-md p-6 rounded-t-3xl sm:rounded-2xl border-t border-x sm:border border-[#D4A55A]/25 bg-[#0B1730] text-[#F4EAD7] shadow-2xl shadow-black max-h-[92vh] overflow-y-auto pb-10 sm:pb-6"
          >
            {/* Slide-Up Bottom Sheet Drag Handle (Mobile Only) */}
            <div className="w-12 h-1 bg-zinc-700/60 rounded-full mx-auto mb-4 sm:hidden block" />
            <div className="flex items-center justify-between pb-3.5 border-b border-dashed border-zinc-800/60 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5 text-[#E6BF76]" />
                {modalMode === "add" ? "Agregar nueva dirección" : "Editar dirección"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#050B1A]/40 text-[#E6BF76]/80 hover:text-[#E6BF76] transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setModalError("");

                if (!modalZone || !modalZone.trim()) {
                  setModalError("El Barrio o Zona es obligatorio.");
                  return;
                }
                if (!modalStreet || !modalStreet.trim()) {
                  setModalError("La Calle es obligatoria.");
                  return;
                }
                if (modalDept === "Montevideo") {
                  if (!modalDoorNumber || !modalDoorNumber.trim()) {
                    setModalError("El Número de Puerta es obligatorio.");
                    return;
                  }
                } else {
                  const hasDoor = modalDoorNumber && modalDoorNumber.trim();
                  const hasManzanaSolar = modalManzana && modalManzana.trim() && modalSolar && modalSolar.trim();
                  if (!hasDoor && !hasManzanaSolar) {
                    setModalError("Debes ingresar el Número de Puerta/Km o la Manzana y Solar.");
                    return;
                  }
                }

                if (modalMode === "add") {
                  const newId = `address-${Date.now()}`;
                  const newAddr: AddressItem = {
                    id: newId,
                    dept: modalDept,
                    zone: modalZone,
                    street: modalStreet,
                    doorNumber: modalDoorNumber,
                    apartment: modalApartment || undefined,
                    solar: modalDept !== "Montevideo" ? (modalSolar || undefined) : undefined,
                    manzana: modalDept !== "Montevideo" ? (modalManzana || undefined) : undefined,
                    additionalData: modalAdditionalData || undefined
                  };
                  setAddresses([newAddr]);
                  setSelectedAddressId(newId);
                } else if (modalMode === "edit" && editingAddressId) {
                  setAddresses(addresses.map(a => a.id === editingAddressId ? {
                    id: editingAddressId,
                    dept: modalDept,
                    zone: modalZone,
                    street: modalStreet,
                    doorNumber: modalDoorNumber,
                    apartment: modalApartment || undefined,
                    solar: modalDept !== "Montevideo" ? (modalSolar || undefined) : undefined,
                    manzana: modalDept !== "Montevideo" ? (modalManzana || undefined) : undefined,
                    additionalData: modalAdditionalData || undefined
                  } : a));
                }

                setIsAddressModalOpen(false);
              }}
              className="space-y-4"
            >
              {modalError && (
                <div className="p-2.5 rounded-lg bg-red-950/25 border border-red-900 text-red-100 text-xs font-semibold font-mono">
                  ⚠️ {modalError}
                </div>
              )}

              {/* Department field */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5 text-zinc-400">
                  Departamento
                </label>
                <select
                  value={modalDept}
                  onChange={(e) => {
                    const nextDept = e.target.value;
                    setModalDept(nextDept);
                    const defaultZones = DEPT_ZONES[nextDept];
                    if (defaultZones && defaultZones.length > 0) {
                      setModalZone(defaultZones[0]);
                    } else {
                      setModalZone("");
                    }
                  }}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#D4A55A]/25 bg-[#050B1A] text-[#F4EAD7] outline-none font-sans focus:border-[#D4A55A]"
                >
                  {Object.keys(DEPT_ZONES).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value="Otro">Otro departamento del Uruguay</option>
                </select>
              </div>

              {/* Zone / Barrio list selection depending on Department */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5 text-zinc-400">
                  Barrio o Zona
                </label>
                {DEPT_ZONES[modalDept] ? (
                  <select
                    value={modalZone}
                    onChange={(e) => setModalZone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#D4A55A]/25 bg-[#050B1A] text-[#F4EAD7] outline-none font-sans focus:border-[#D4A55A]"
                  >
                    {DEPT_ZONES[modalDept].map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Ej: Paysandú Centro, Colonia del Sacramento..."
                    value={modalZone}
                    onChange={(e) => setModalZone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#D4A55A]/25 bg-[#050B1A] text-[#F4EAD7] placeholder-zinc-500 outline-none font-sans focus:border-[#D4A55A]"
                  />
                )}
              </div>



              {/* Solar and Manzana - Only for Outside Montevideo */}
              {modalDept !== "Montevideo" && (
                <div className="grid grid-cols-2 gap-3.5 p-3 rounded-lg bg-[#050B1A]/80 border border-dashed border-[#D4A55A]/35 text-[#F4EAD7]">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5 text-sky-400 flex items-center gap-1">
                      Manzana
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 4"
                      value={modalManzana}
                      onChange={(e) => setModalManzana(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-[#D4A55A]/25 bg-[#050B1A] text-[#F4EAD7] placeholder-zinc-500 outline-none font-sans focus:border-[#D4A55A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5 text-sky-400 flex items-center gap-1">
                      Solar
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 12"
                      value={modalSolar}
                      onChange={(e) => setModalSolar(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-[#D4A55A]/25 bg-[#050B1A] text-[#F4EAD7] placeholder-zinc-500 outline-none font-sans focus:border-[#D4A55A]"
                    />
                  </div>
                </div>
              )}

              {/* Calle principal */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5 text-zinc-400">
                  Calle
                </label>
                <input
                  type="text"
                  autoComplete="street-address"
                  placeholder="Ej: Luis Batlle Berres"
                  value={modalStreet}
                  onChange={(e) => setModalStreet(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#D4A55A]/25 bg-[#050B1A] text-[#F4EAD7] placeholder-zinc-500 outline-none font-sans focus:border-[#D4A55A]"
                />
              </div>

              {/* Number and Apto */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5 text-zinc-400">
                    Nro. Puerta / Km
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej: 4282"
                    value={modalDoorNumber}
                    onChange={(e) => setModalDoorNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#D4A55A]/25 bg-[#050B1A] text-[#F4EAD7] placeholder-zinc-500 outline-none font-sans focus:border-[#D4A55A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5 text-zinc-400">
                    Apto / Piso / Bloque
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej: 4B"
                    value={modalApartment}
                    onChange={(e) => setModalApartment(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#D4A55A]/25 bg-[#050B1A] text-[#F4EAD7] placeholder-zinc-500 outline-none font-sans focus:border-[#D4A55A]"
                  />
                </div>
              </div>

              {/* Datos adicionales */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5 text-zinc-400">
                  Datos adicionales
                </label>
                <input
                  type="text"
                  placeholder="Ej: Portón de madera, golpear fuerte, timbre roto..."
                  value={modalAdditionalData}
                  onChange={(e) => setModalAdditionalData(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#D4A55A]/25 bg-[#050B1A] text-[#F4EAD7] placeholder-zinc-500 outline-none font-sans focus:border-[#D4A55A]"
                />
              </div>

              <div className="flex justify-end gap-3.5 pt-3.5 border-t border-dashed border-zinc-800/40">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wide cursor-pointer transition border border-[#D4A55A]/25 bg-[#050B1A]/60 text-zinc-300 hover:bg-[#050B1A]/90 hover:border-[#D4A55A]/55"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-md bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A]"
                >
                  Guardar dirección
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Dynamic Floating Sticky Bottom Bar for Mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B1730] border-t border-[#D4A55A]/25 p-4 flex items-center justify-between gap-4 pb-5 shadow-[0_-12px_30px_rgba(0,0,0,0.65)] hover:border-t-[#D4A55A]/50 transition-all duration-300">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-[#E6BF76] font-extrabold font-sans">Total UYU</span>
          <span className="text-base font-black text-emerald-400 font-mono leading-none">$ {totalUYU}</span>
          <span className="text-[8px] text-zinc-400 font-medium font-mono mt-0.5">Paso {checkoutStep} de 3</span>
        </div>
        
        <div className="flex items-center gap-2">
          {checkoutStep > 1 && (
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setCheckoutStep(checkoutStep - 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center justify-center w-11 h-10 rounded-xl border border-[#D4A55A]/30 bg-[#050B1A]/85 text-[#E6BF76] active:scale-95 transition-all shadow-md shadow-black/15 cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
          )}

          {checkoutStep === 1 && (
            <button
              type="button"
              onClick={handleContinueToPayment}
              className="flex items-center gap-1.5 px-5 py-3 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A] transition active:scale-95 shadow-md shadow-[#D4A55A]/15 cursor-pointer"
            >
              <span>Siguiente</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {checkoutStep === 2 && (
            <button
              type="button"
              onClick={handleContinueToPayment}
              className="flex items-center gap-1.5 px-5 py-3 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A] transition active:scale-95 shadow-md shadow-[#D4A55A]/15 cursor-pointer"
            >
              <span>Continuar</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {checkoutStep === 3 && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSubmitOrder}
              className="flex items-center gap-1.5 px-5 py-3 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#D4A55A] hover:bg-[#E6BF76] text-[#050B1A] transition active:scale-95 shadow-md shadow-[#D4A55A]/15 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#050B1A]" />
                  <span>Pagar...</span>
                </>
              ) : (
                <>
                  <span>{paymentMethod === "mercadopago" ? "Pagar" : "Comprar"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* CHECKOUT DELIVERY MAP MODAL */}
      <AnimatePresence>
        {isCheckoutDeliveryMapOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsCheckoutDeliveryMapOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-2 sm:p-4 overflow-y-auto cursor-pointer"
          >
            {/* Floating close button that is always visible on screen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCheckoutDeliveryMapOpen(false);
              }}
              className="fixed top-4 right-4 z-[60] bg-black/70 backdrop-blur-md hover:bg-black/90 text-white/90 hover:text-white p-2.5 rounded-full border border-white/20 shadow-2xl transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center"
              title="Cerrar Mapa"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-5xl my-4 sm:my-8 relative cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <InteractiveMap 
                onClose={() => setIsCheckoutDeliveryMapOpen(false)}
                showTitle={true}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADDRESS MAP SELECTOR MODAL (OVERLAY ABOVE THE ADDRESS MODAL) */}
      <AnimatePresence>
        {showModalInlineMap && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setShowModalInlineMap(false)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/92 p-2 sm:p-4 overflow-y-auto cursor-pointer"
          >
            {/* Floating close button that is always visible on screen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModalInlineMap(false);
              }}
              className="fixed top-4 right-4 z-[70] bg-black/70 backdrop-blur-md hover:bg-black/90 text-white/90 hover:text-white p-2.5 rounded-full border border-white/20 shadow-2xl transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center"
              title="Cerrar Mapa"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-5xl my-4 sm:my-8 relative cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <InteractiveMap 
                onClose={() => setShowModalInlineMap(false)}
                showTitle={true}
                onSelectNeighborhood={(n, zone) => {
                  if (zone.id === 8 || zone.id === 9 || zone.id === 10) {
                    setModalDept("Canelones");
                  } else {
                    setModalDept("Montevideo");
                  }
                  setModalZone(n);
                  setShowModalInlineMap(false);
                }}
                onSelectZone={(zone) => {
                  if (zone.id === 8 || zone.id === 9 || zone.id === 10) {
                    setModalDept("Canelones");
                    setModalZone(zone.neighborhoods[0]);
                  } else {
                    setModalDept("Montevideo");
                    setModalZone(zone.neighborhoods[0]);
                  }
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
