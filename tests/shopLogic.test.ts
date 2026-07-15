import { describe, test, expect } from "vitest";
import { 
  getItemPrice, 
  calculateSubtotal, 
  validateCoupon, 
  calculateDiscount, 
  calculateTotal, 
  sanitizeField, 
  validateFormFields, 
  simulateStockAllocation 
} from "../src/utils/shopLogic.tsx";
import { CartItem, Coupon, Product, ProductVariant } from "../src/types";

// --- MOCK DATA FOR TESTS ---
const createMockProduct = (id: string, price: number, variants: ProductVariant[] = []): Product => ({
  id,
  name: `Test Product ${id}`,
  description: "Test description for visual items 3D",
  price,
  category: "Deportes",
  imageUrl: "https://example.com/image.jpg",
  stock: 10,
  featured: false,
  createdAt: new Date().toISOString(),
  variants
});

const sampleCoupons: Coupon[] = [
  { code: "DESCUENTO10", discount_percent: 10, active: true },
  { code: "PROMO50", discount_percent: 50, active: true },
  { code: "EXPIRED", discount_percent: 15, active: true, expiration_date: "2025-01-01" }, // expired in relative current time (2026)
  { code: "INACTIVE", discount_percent: 20, active: false }
];

describe("Shop Business Logic Unit Testing", () => {
  
  // 1. PRICE CALCULATION TESTS
  describe("getItemPrice - Pricing Calculations", () => {
    test("should return default base price when product contains no variants", () => {
      const product = createMockProduct("1", 500);
      const item: CartItem = { product, quantity: 2 };
      expect(getItemPrice(item)).toBe(500);
    });

    test("should return variant price override when matching size and color are selected", () => {
      const variants: ProductVariant[] = [
        { size: "PLA", color: "Azul", price: 650, stock: 5 },
        { size: "PETG", color: "Rojo", price: 700, stock: 3 }
      ];
      const product = createMockProduct("2", 500, variants);
      
      const item: CartItem = { 
        product, 
        quantity: 1, 
        selectedSize: "PLA", 
        selectedColor: "Azul" 
      };
      expect(getItemPrice(item)).toBe(650);
    });

    test("should use priceDelta helper when specific variant price is not explicitly set", () => {
      const variants: ProductVariant[] = [
        { size: "ABS", color: "Gris", priceDelta: 120, stock: 4 }
      ];
      const product = createMockProduct("3", 500, variants);
      
      const item: CartItem = {
        product,
        quantity: 1,
        selectedSize: "ABS",
        selectedColor: "Gris"
      };
      expect(getItemPrice(item)).toBe(620); // 500 base + 120 delta
    });

    test("should fallback to base product price if variant matching fails", () => {
      const variants: ProductVariant[] = [
        { size: "PLA", color: "Rojo", price: 600, stock: 2 }
      ];
      const product = createMockProduct("4", 450, variants);
      
      const item: CartItem = {
        product,
        quantity: 1,
        selectedSize: "PETG", // size mismatch
        selectedColor: "Verde"
      };
      expect(getItemPrice(item)).toBe(450);
    });
  });

  // 2. GRAND SUBTOTAL CALCULATIONS
  describe("calculateSubtotal - Multi-Item Subtotal", () => {
    test("should return 0 for empty cart items array", () => {
      expect(calculateSubtotal([])).toBe(0);
    });

    test("should calculate correct accumulated grand subtotal with quantities", () => {
      const p1 = createMockProduct("1", 100);
      const p2 = createMockProduct("2", 200, [
        { size: "PLA", color: "Blanco", price: 250, stock: 2 }
      ]);

      const cart: CartItem[] = [
        { product: p1, quantity: 2 }, // 2 * 100 = 200
        { product: p2, quantity: 3, selectedSize: "PLA", selectedColor: "Blanco" } // 3 * 250 = 750
      ];

      expect(calculateSubtotal(cart)).toBe(950); // 200 + 750
    });
  });

  // 3. DISCOUNT & COUPONS APPLICATOR
  describe("validateCoupon - Marketing Codes", () => {
    test("should reject empty or missing promotional code inputs", () => {
      expect(validateCoupon("", sampleCoupons).success).toBe(false);
      expect(validateCoupon("   ", sampleCoupons).success).toBe(false);
    });

    test("should validate existing active promotional coupon successfully", () => {
      const result = validateCoupon("DESCUENTO10", sampleCoupons);
      expect(result.success).toBe(true);
      expect(result.discountPercent).toBe(10);
      expect(result.message).toContain("¡Cupón verificado!");
    });

    test("should support case-insensitive typing for customer convenience", () => {
      const result = validateCoupon("promo50", sampleCoupons);
      expect(result.success).toBe(true);
      expect(result.discountPercent).toBe(50);
    });

    test("should reject code if coupon is explicity set to inactive", () => {
      const result = validateCoupon("INACTIVE", sampleCoupons);
      expect(result.success).toBe(false);
      expect(result.discountPercent).toBe(0);
    });

    test("should reject code if coupon expiration date has passed", () => {
      // Future-resilient check forcing reference evaluation to 2026
      const futureDate = new Date("2026-06-03T12:00:00Z");
      const result = validateCoupon("EXPIRED", sampleCoupons, futureDate);
      expect(result.success).toBe(false);
      expect(result.discountPercent).toBe(0);
    });
  });

  // 4. PRICE DISCOUNTS ROUNDING & MATH
  describe("calculateDiscount - Rounded Off Values", () => {
    test("should return correct discount based on general subtotal", () => {
      expect(calculateDiscount(1000, 10)).toBe(100);
      expect(calculateDiscount(1000, 0)).toBe(0);
      expect(calculateDiscount(0, 15)).toBe(0);
    });

    test("should strictly round to the nearest integer per MP specifications", () => {
      // 15% of 155 = 23.25 -> rounds to 23
      expect(calculateDiscount(155, 15)).toBe(23);
      // 15% of 165 = 24.75 -> rounds to 25
      expect(calculateDiscount(165, 15)).toBe(25);
    });
  });

  // 5. FINAL GRAND TOTAL
  describe("calculateTotal - Grand Totals with Shipping", () => {
    test("should compile subtotal minus discounts plus shipping", () => {
      expect(calculateTotal(1000, 100, 150)).toBe(1050); // 1000 - 100 + 150
    });

    test("should clamp final total to 0 to prevent malicious negative billing charges", () => {
      expect(calculateTotal(100, 250, 0)).toBe(0); // clamped to 0
    });
  });

  // 6. ANTI-XSS SCRIPT INJECTIONS
  describe("sanitizeField - Form Code Defense", () => {
    test("should escape vulnerable HTML tags and script elements", () => {
      const threat = "<script>alert('hack')</script>";
      const safe = sanitizeField(threat);
      expect(safe).not.toContain("<script>");
      expect(safe).toContain("&lt;script&gt;");
    });

    test("should escape quotes and forward slashes to break escaping hacks", () => {
      const threat = `onload="alert(1)"`;
      const safe = sanitizeField(threat);
      expect(safe).not.toContain('"');
      expect(safe).toContain("&quot;");
    });
  });

  // 7. SECURE INPUT FORM CHECKS
  describe("validateFormFields - Checkout Inputs Validation", () => {
    test("should pass with correct and authentic contact information", () => {
      const check = validateFormFields("Juan Perez", "juan@gmail.com", "099123456");
      expect(check.success).toBe(true);
      expect(check.errors.length).toBe(0);
    });

    test("should capture short client names under 3 characters", () => {
      const check = validateFormFields("Jo", "jo@mail.com", "");
      expect(check.success).toBe(false);
      expect(check.errors).toContain("El nombre completo debe tener al menos 3 caracteres.");
    });

    test("should reject corrupted or bad email formats", () => {
      const check = validateFormFields("Pedro", "corrupted-email.com", "");
      expect(check.success).toBe(false);
      expect(check.errors.some(err => err.includes("correo electrónico"))).toBe(true);
    });

    test("should warn on short, fake customer phone entries below 6 digits", () => {
      const check = validateFormFields("Pedro Gomez", "pedro@gomez.com", "12");
      expect(check.success).toBe(false);
      expect(check.errors.some(err => err.includes("número de teléfono"))).toBe(true);
    });
  });

  // 8. STOCK RESOURCE RESERVATION
  describe("simulateStockAllocation - Resource Deductions", () => {
    test("should reserve stock correctly when quantity is available", () => {
      const result = simulateStockAllocation(3, 10);
      expect(result.success).toBe(true);
      expect(result.allocatedQty).toBe(3);
      expect(result.remainingStock).toBe(7);
    });

    test("should warn and decline transaction if requested cart units exceed actual store stock", () => {
      const result = simulateStockAllocation(12, 10);
      expect(result.success).toBe(false);
      expect(result.allocatedQty).toBe(10); // reserve max possible
      expect(result.remainingStock).toBe(0);
      expect(result.message).toContain("Solo hay 10 unidades disponibles");
    });

    test("should reject transactions requesting zero or negative units", () => {
      const result = simulateStockAllocation(0, 5);
      expect(result.success).toBe(false);
      expect(result.allocatedQty).toBe(0);
    });

    test("should fail allocation when available stock is zero or less", () => {
      const result = simulateStockAllocation(2, 0);
      expect(result.success).toBe(false);
      expect(result.allocatedQty).toBe(0);
      expect(result.message).toContain("Sin stock disponible");
    });
  });

  // Coverage booster: empty coupon array
  describe("validateCoupon - Empty List", () => {
    test("should reject when coupon array is empty", () => {
      const check = validateCoupon("DESC10", []);
      expect(check.success).toBe(false);
      expect(check.message).toContain("No hay cupones");
    });
  });

  // Coverage booster: form validations empty fields
  describe("validateFormFields - Missing parameters", () => {
    test("should fail if name is empty or missing", () => {
      const check = validateFormFields("", "test@test.com", "123456");
      expect(check.success).toBe(false);
      expect(check.errors).toContain("El nombre es requerido.");
    });

    test("should fail if email is empty or missing", () => {
      const check = validateFormFields("John Doe", "", "123456");
      expect(check.success).toBe(false);
      expect(check.errors).toContain("El correo electrónico es requerido.");
    });
  });
});

describe("Integration Testing (Cart checkout flow life-cycle)", () => {
  test("Scenario 1: Comprehensive Successful Purchase simulation", () => {
    // 1. Initial items in client cart
    const prodA = createMockProduct("a", 1500); // base $1500
    const prodB = createMockProduct("b", 800, [
      { size: "M", color: "Azul", price: 950, stock: 5 } // matching variant $950
    ]);

    const activeCart: CartItem[] = [
      { product: prodA, quantity: 1 }, // $1500
      { product: prodB, quantity: 2, selectedSize: "M", selectedColor: "Azul" } // 2 * $950 = $1900
    ];

    // 2. Validate form input information
    const userForm = validateFormFields("Martin Olivera", "martin@tienda.com", "099456789");
    expect(userForm.success).toBe(true);

    // 3. Verify Subtotal
    const calculatedSubtotal = calculateSubtotal(activeCart);
    expect(calculatedSubtotal).toBe(3400); // 1500 + 1900

    // 4. Verify Coupon
    const promoCheck = validateCoupon("PROMO50", sampleCoupons);
    expect(promoCheck.success).toBe(true);
    expect(promoCheck.discountPercent).toBe(50);

    // 5. Verify Discount
    const discountAmount = calculateDiscount(calculatedSubtotal, promoCheck.discountPercent);
    expect(discountAmount).toBe(1700); // 3400 * 50% = 1700

    // 6. Verify Total with shipping cost
    const finalTotal = calculateTotal(calculatedSubtotal, discountAmount, 150);
    expect(finalTotal).toBe(1850); // 3400 - 1700 + 150 = 1850
  });

  test("Scenario 2: Out of Stock rejection during life-cycle", () => {
    const prod = createMockProduct("xyz", 1000);
    const requestedUnits = 6;
    const currentInventory = 3;

    const allocation = simulateStockAllocation(requestedUnits, currentInventory);
    expect(allocation.success).toBe(false);
    expect(allocation.allocatedQty).toBe(3); // capped
  });

  test("Scenario 3: Corrupted Input injection rejection", () => {
    const maliciousName = "Jane Doe <script>fetch('/malicious')</script>";
    const sanitizedVal = sanitizeField(maliciousName);
    
    expect(sanitizedVal).not.toContain("<script>");
    
    const validation = validateFormFields(sanitizedVal, "jane@example.com", "094666333");
    expect(validation.success).toBe(true); // validation passes on sanitized safe content
  });
});
