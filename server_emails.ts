import pg from "pg";
import nodemailer from "nodemailer";

export interface EmailLog {
  id: string;
  timestamp: string;
  to: string;
  orderId?: string;
  emailType?: string;
  subject: string;
  body: string;
  status: "success" | "failure" | "simulated" | "disabled";
  error?: string;
}

// Global in-memory log of sent/simulated emails as fallback
export const emailDeliveryLogs: EmailLog[] = [];

// Clean human-readable status labels
export const statusLabels: Record<string, string> = {
  "pedido_iniciado": "Pedido Iniciado",
  "pago_pendiente": "Pago Pendiente",
  "pago_aprobado": "Compra Aprobada / Pago Confirmado ✓",
  "pago_rechazado": "Pago Rechazado",
  "en_preparacion": "En Preparación",
  "listo_para_retirar": "Listo para Retirar",
  "despachado_correo": "Enviado / Despachado 🚚",
  "enviado": "Enviado / Despachado 🚚",
  "pedido_cancelado": "Cancelado ✕",
  "pedido_reembolsado": "Reembolsado ↺"
};

// Decoupled DB pool reference to prevent circular imports
let dbPoolInstance: pg.Pool | null = null;

export function setEmailDbPool(pool: pg.Pool) {
  dbPoolInstance = pool;
  // Initialize table
  initEmailLogsTable();
}

async function initEmailLogsTable() {
  if (!dbPoolInstance) return;
  try {
    await dbPoolInstance.query(`
      CREATE TABLE IF NOT EXISTS public.email_logs (
        id VARCHAR(100) PRIMARY KEY,
        order_id TEXT,
        email_type VARCHAR(50),
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("[Emails System] Tabla 'email_logs' garantizada en PostgreSQL.");
  } catch (err) {
    console.error("[Emails System] Error creando tabla de logs de correo:", err);
  }
}

/**
 * Check if a certain email type was already successfully sent for an order
 */
export async function isEmailAlreadySent(orderId: string, emailType: string): Promise<boolean> {
  const normId = String(orderId).trim();
  
  // 1. Check in-memory list
  const memoryDuplicate = emailDeliveryLogs.some(
    log => String(log.orderId).trim() === normId &&
           log.emailType === emailType &&
           (log.status === "success" || log.status === "simulated")
  );
  if (memoryDuplicate) return true;

  // 2. Check Database public.email_logs
  if (dbPoolInstance) {
    try {
      const res = await dbPoolInstance.query(
        "SELECT COUNT(*) FROM public.email_logs WHERE order_id = $1 AND email_type = $2 AND status IN ('success', 'simulated');",
        [normId, emailType]
      );
      return parseInt(res.rows[0].count, 10) > 0;
    } catch (err) {
      console.error("[Emails System] Error verificando envío duplicado en DB:", err);
    }
  }

  return false;
}

/**
 * Persist log entry in database and fallback list
 */
export async function logEmailDelivery(log: EmailLog & { emailType: string }) {
  emailDeliveryLogs.unshift(log);
  if (emailDeliveryLogs.length > 100) emailDeliveryLogs.pop();

  if (dbPoolInstance) {
    try {
      await dbPoolInstance.query(
        `INSERT INTO public.email_logs (id, order_id, email_type, recipient, subject, body, status, error, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO NOTHING;`,
        [
          log.id,
          log.orderId ? String(log.orderId).trim() : null,
          log.emailType,
          log.to,
          log.subject,
          log.body,
          log.status,
          log.error || null
        ]
      );
    } catch (err) {
      console.error("[Emails System] Error guardando log en base de datos:", err);
    }
  }
}

export async function getEmailLogs(): Promise<EmailLog[]> {
  if (dbPoolInstance) {
    try {
      const res = await dbPoolInstance.query(
        `SELECT id, order_id as "orderId", email_type as "emailType", recipient as "to", 
                subject, body, status, error, created_at as "timestamp" 
         FROM public.email_logs 
         ORDER BY created_at DESC 
         LIMIT 60;`
      );
      return res.rows.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
        to: row.to,
        orderId: row.orderId || undefined,
        emailType: row.emailType || undefined,
        subject: row.subject,
        body: row.body,
        status: row.status,
        error: row.error || undefined
      }));
    } catch (err) {
      console.error("[Emails System] Error obteniendo logs de DB, cayendo en memoria:", err);
    }
  }
  return emailDeliveryLogs;
}

export async function clearAllEmailLogs(): Promise<void> {
  emailDeliveryLogs.length = 0;
  if (dbPoolInstance) {
    try {
      await dbPoolInstance.query("TRUNCATE TABLE public.email_logs;");
    } catch (err) {
      console.error("[Emails System] Error vaciando tabla email_logs:", err);
    }
  }
}

/**
 * Replace template placeholders like {{customerName}}, {{orderId}}, etc.
 */
function replacePlaceholders(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), val || "");
  }
  return result;
}

/**
 * Core function to send or simulate sending an email via Resend API or SMTP (Nodemailer).
 */
export async function sendEmail(params: {
  settings: any;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; status: "success" | "failure" | "simulated" | "disabled"; error?: string }> {
  const { settings, to, subject, html, text } = params;

  // Guard: If email sender feature is explicitly disabled
  let isEnabled = settings.emailSenderEnabled;
  if (isEnabled === undefined || isEnabled === null) {
    isEnabled = process.env.EMAIL_SENDER_ENABLED === "true" || !!process.env.RESEND_API_KEY || !!process.env.EMAIL_SENDER_SMTP_USER;
  }

  if (!isEnabled) {
    return { success: true, status: "disabled" };
  }

  const provider = (settings.emailSenderProvider || process.env.EMAIL_SENDER_PROVIDER || "resend").toLowerCase();
  let from = (settings.emailSenderFromAddress || process.env.EMAIL_SENDER_FROM_ADDRESS || "").trim();
  if (!from) {
    from = "Ventas Juem <onboarding@resend.dev>";
  } else if (!from.includes("@")) {
    if (from.includes(".")) {
      from = `Ventas Juem <no-reply@${from}>`;
    } else {
      from = `Ventas Juem <no-reply@notificaciones.juem.com.uy>`;
    }
  }

  // --- SMTP PROVIDER (Nodemailer) ---
  if (provider === "smtp") {
    const smtpHost = (settings.emailSenderSmtpHost || process.env.EMAIL_SENDER_SMTP_HOST || "").trim() || "smtp.gmail.com";
    const smtpPort = parseInt(settings.emailSenderSmtpPort || process.env.EMAIL_SENDER_SMTP_PORT, 10) || 465;
    const smtpUser = (settings.emailSenderSmtpUser || process.env.EMAIL_SENDER_SMTP_USER || "").trim();
    const smtpPass = (settings.emailSenderSmtpPass || process.env.EMAIL_SENDER_SMTP_PASS || "").trim();

    if (!smtpUser || !smtpPass) {
      console.log(`[Email Simulator] Destinatario: ${to}. Asunto: "${subject}". SMTP no configurado completamente (falta usuario/contraseña).`);
      return { success: true, status: "simulated" };
    }

    console.log(`[SMTP Mailbox] Iniciando despacho vía SMTP (${smtpHost}:${smtpPort}) para: ${to}`);
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true para puerto 465, false para otros como 587 / 25
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: {
          rejectUnauthorized: false // Evita problemas raros de verificación de certificados locales auto-firmados
        }
      });

      // Asegurar que el remitente (from) tenga formato correcto. En SMTP, de preferencia, debe ser el usuario o tener su alias.
      let smtpFrom = from;
      if (!from.includes("@") || from.includes("onboarding@resend.dev") || from.includes("tienda.com")) {
        smtpFrom = `Ventas Juem <${smtpUser}>`;
      }

      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html,
        text: text || "Por favor, use un cliente de correo con soporte HTML para ver este mensaje."
      });

      console.log(`[SMTP Mailbox] Correo enviado exitosamente vía SMTP a: ${to}`);
      return { success: true, status: "success" };
    } catch (err: any) {
      const errMsg = String(err.message || err);
      console.error(`[SMTP Mailbox Error] Error al despachar vía SMTP a ${to}: ${errMsg}`);
      return { success: false, status: "failure", error: `Error SMTP: ${errMsg}` };
    }
  }

  // --- MAILGUN PROVIDER (API) ---
  if (provider === "mailgun") {
    const mgApiKey = (settings.mailgunApiKey || process.env.MAILGUN_API_KEY || "").trim();
    const mgDomain = (settings.mailgunDomain || process.env.MAILGUN_DOMAIN || "").trim();
    const mgRegion = (settings.mailgunRegion || process.env.MAILGUN_REGION || "us").toLowerCase().trim();

    if (!mgApiKey || !mgDomain) {
      console.log(`[Email Simulator] Destinatario: ${to}. Asunto: "${subject}". Mailgun no configurado completamente (falta API Key o Dominio).`);
      return { success: true, status: "simulated" };
    }

    const host = mgRegion === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
    const url = `https://${host}/v3/${mgDomain}/messages`;
    const authHeader = `Basic ${Buffer.from(`api:${mgApiKey}`).toString("base64")}`;

    console.log(`[Mailgun Mailbox] Despachando correo con dominio: ${mgDomain}, región: ${mgRegion}`);

    try {
      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);
      params.append("subject", subject);
      params.append("html", html);
      params.append("text", text || "Por favor, use un cliente de correo con soporte HTML para ver este mensaje.");

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
      });

      const responseData = await response.json() as any;
      if (response.ok && responseData && (responseData.id || responseData.message)) {
        console.log(`[Mailgun Mailbox] Correo enviado exitosamente a: ${to} (${responseData.message || "ID: " + responseData.id})`);
        return { success: true, status: "success" };
      } else {
        const errMsg = responseData?.message || JSON.stringify(responseData) || `Status ${response.status}`;
        console.error(`[Mailgun Mailbox Error] Error al despachar a ${to}: ${errMsg}`);
        return { success: false, status: "failure", error: errMsg };
      }
    } catch (err: any) {
      const errMsg = String(err.message || err);
      console.error(`[Mailgun Mailbox Error] Excepción al despachar a ${to}: ${errMsg}`);
      return { success: false, status: "failure", error: errMsg };
    }
  }

  // --- RESEND PROVIDER (API) ---
  const apiKey = (settings.resendApiKey || process.env.RESEND_API_KEY || "").trim();

  if (!apiKey) {
    console.log(`[Email Simulator] Destinatario: ${to}. Asunto: "${subject}". Resend no configurado (falta API Key).`);
    return { success: true, status: "simulated" };
  }

  const maskedKey = apiKey.substring(0, 7) + "..." + apiKey.substring(apiKey.length - 4);
  console.log(`[Resend Mailbox] dispatching. Usando API Key: ${maskedKey} (Largo: ${apiKey.length})`);

  try {
    console.log(`[Resend Mailbox] Enviando correo a través de la API de Resend para: ${to}`);
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text: text || "Por favor, use un cliente de correo con soporte HTML para ver este mensaje."
      })
    });

    const responseData = await response.json() as any;
    if (response.ok && responseData && responseData.id) {
      console.log(`[Resend Mailbox] Correo enviado exitosamente a: ${to} (ID: ${responseData.id})`);
      return { success: true, status: "success" };
    } else {
      const errMsg = responseData?.message || JSON.stringify(responseData) || `Status ${response.status}`;
      console.error(`[Resend Mailbox Error] Error al despachar a ${to}: ${errMsg}`);
      return { success: false, status: "failure", error: errMsg };
    }
  } catch (err: any) {
    const errMsg = String(err.message || err);
    console.error(`[Resend Mailbox Error] Excepción al despachar a ${to}: ${errMsg}`);
    return { success: false, status: "failure", error: errMsg };
  }
}

function getHumanReadablePaymentMethod(method: string): string {
  if (!method) return "Transferencia/Efectivo";
  const m = method.toLowerCase();
  if (m.includes("mercadopago") || m.includes("mercado_pago")) return "Mercado Pago Uruguay (Tarjeta de Crédito / Débito)";
  if (m.includes("transfer") || m.includes("transferencia")) return "Transferencia Bancaria / Abitab, Red Pagos";
  if (m.includes("cash") || m.includes("efectivo")) return "Efectivo contra Entrega / Retiro";
  if (m.includes("coordinating") || m.includes("coordinar")) return "A Coordinar por WhatsApp";
  return method;
}

export function formatTransferDetailsHtml(details: string): string {
  if (!details) return "";
  const lines = details.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  let html = `<div style="background-color: #fafafa; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-top: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">`;
  
  lines.forEach((line) => {
    if (line.includes(":")) {
      const index = line.indexOf(":");
      const label = line.substring(0, index).trim();
      const value = line.substring(index + 1).trim();
      
      html += `
        <div style="margin-bottom: 8px; display: block; border-bottom: 1px dashed #f1f5f9; padding-bottom: 6px;">
          <span style="font-size: 10px; color: #707b7c; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 2px;">${label}</span>
          <span style="font-size: 13px; color: #1c2833; font-weight: 700; font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace; background-color: #f2f4f4; padding: 3px 8px; border-radius: 4px; display: inline-block;">${value}</span>
        </div>
      `;
    } else {
      // It's a header or standard line
      const isHeader = line.toLowerCase().includes("cuenta") || 
                       line.toLowerCase().includes("red pagos") || 
                       line.toLowerCase().includes("abitab") || 
                       line.toLowerCase().includes("bancaria") ||
                       line.toLowerCase().includes("giro") ||
                       line.toLowerCase().includes("datos");
                       
      if (isHeader) {
        html += `
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1a5276; letter-spacing: 0.05em; margin-top: 12px; margin-bottom: 8px; padding-bottom: 2px; border-bottom: 2px solid #3498db; display: inline-block;">
            ${line}
          </div>
        `;
      } else {
        html += `
          <div style="font-size: 13px; color: #2c3e50; margin-bottom: 6px; font-weight: 600;">
            ${line}
          </div>
        `;
      }
    }
  });
  
  html += `</div>`;
  return html;
}

export function generateEmailPaymentDetailsBlock(settings: any): string {
  const details = settings.transferDetails && settings.transferDetails.trim() 
    ? settings.transferDetails 
    : "Numero de cuenta Bancaria \nMercado Pago : 1004278620163\nRed pagos y abitab\nJoana Baptista : 4.051.645-7";

  return `
    <!-- Payment / Transfer details block -->
    <div style="margin-top: 25px; margin-bottom: 25px; font-size: 13px; color: #0C1221; background-color: #FAF9F6; border: 1.5px solid #E6BF76; padding: 18px; border-radius: 8px; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 30px; font-size: 18px; vertical-align: middle; padding-bottom: 8px;">🏦</td>
          <td style="vertical-align: middle; padding-bottom: 8px;">
            <strong style="color: #0C1221; font-size: 13.5px; text-transform: uppercase; letter-spacing: 0.03em;">Datos de Cuenta para Transferencia & Giro:</strong>
          </td>
        </tr>
      </table>
      <div style="margin: 0 0 12px 0;">
        ${formatTransferDetailsHtml(details)}
      </div>
      <div style="margin-top: 12px; font-size: 11.5px; color: #B45309; font-weight: bold; border-top: 1px dashed #E6BF76; padding-top: 8px; font-style: italic; line-height: 1.4;">
        💡 RECUERDA: Una vez hecho el pago o giro, envía el comprobante de pago por WhatsApp para armar y despachar de inmediato tu pedido.
      </div>
    </div>
  `;
}

/**
 * 1. Generate COMPRA CONFIRMADA Email HTML
 */
export function generateOrderCreatedEmailHtml(order: any, settings: any): { subject: string; html: string } {
  const rawOrderId = order.id || "";
  const orderId = rawOrderId.length > 8 ? rawOrderId.substring(0, 6).toUpperCase() : rawOrderId;
  const customerName = order.customerName || "Cliente";
  const items = order.items || [];
  const subtotal = order.subtotal || 0;
  const discount = order.discountAmount || 0;
  const shippingCost = order.shippingCost || 0;
  const total = order.total || 0;
  const coupon = order.couponCode || "Ninguno";
  const notes = order.notes || "Ninguna";
  const paymentMethod = getHumanReadablePaymentMethod(order.paymentMethod || order.payment_method);
  const siteTitle = settings.siteTitle || "Ventas Juem";

  const isAgencyShipment = notes && (
    notes.toLowerCase().includes("agencia") || 
    notes.toLowerCase().includes("dac") || 
    notes.toLowerCase().includes("ues") || 
    notes.toLowerCase().includes("depunta")
  );

  // Fecha format
  const creationDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const fechaCompraCompilada = creationDate.toLocaleString("es-UY", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const defaultSubject = `¡Gracias por tu compra! Tu pedido #${orderId} ha sido recibido`;
  const customSubjectTemplate = settings.emailTemplateOrderCreatedSubject;
  const subject = customSubjectTemplate 
    ? replacePlaceholders(customSubjectTemplate, { orderId, customerName, total: `$${total}`, siteTitle })
    : defaultSubject;

  const defaultBody = "Muchas gracias por realizar tu compra con nosotros. Tu pago ha sido recibido y tu pedido ya está en cola de procesamiento para ser armado por nuestro equipo. Aquí tienes la hoja de detalles de tu compra:";
  const customBodyTemplate = settings.emailTemplateOrderCreatedBody;
  const bodyText = customBodyTemplate
    ? replacePlaceholders(customBodyTemplate, { orderId, customerName, total: `$${total}`, siteTitle })
    : defaultBody;

  const itemsRows = items.map((item: any) => {
    const sizeStr = item.sizeSelected ? `<span style="display:inline-block; background-color: #FAF5EB; color: #B45309; border: 1px solid #FCD34D; font-weight: bold; padding: 2px 5px; border-radius: 4px; font-size: 10px; margin-right: 4px; white-space: nowrap;">Talle: ${item.sizeSelected}</span>` : "";
    const colorStr = item.colorSelected ? `<span style="display:inline-block; background-color: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; font-weight: bold; padding: 2px 5px; border-radius: 4px; font-size: 10px; white-space: nowrap;">Color: ${item.colorSelected}</span>` : "";
    
    return `
      <tr>
        <td style="padding: 10px 6px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0C1221; text-align: left; vertical-align: middle; word-break: break-word;">
          <div style="font-weight: 700; color: #0C1221; margin-bottom: 3px; line-height: 1.3;">${item.productName}</div>
          <div style="margin-top: 4px; line-height: 1.2;">${sizeStr} ${colorStr}</div>
        </td>
        <td style="padding: 10px 4px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #0C1221; vertical-align: middle;">
          <span style="background-color: #0C1221; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 800; display: inline-block; min-width: 12px; text-align: center; border: 1.5px solid #D4A55A;">
            ${item.quantity}
          </span>
        </td>
        <td style="padding: 10px 4px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; color: #475569; text-align: right; font-family: monospace; vertical-align: middle; white-space: nowrap;">
          $${item.unitPrice}
        </td>
        <td style="padding: 10px 6px; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; color: #0C1221; text-align: right; font-weight: bold; font-family: monospace; vertical-align: middle; white-space: nowrap;">
          $${item.totalPrice}
        </td>
      </tr>
    `;
  }).join("");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF9F6; padding: 25px 8px; color: #0C1221; line-height: 1.5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1.5px solid #E6BF76; overflow: hidden; box-shadow: 0 4px 20px rgba(12, 18, 33, 0.08);">
        
        <!-- Header Container with gold stroke -->
        ${settings.emailHeaderImageUrl ? `
          <div style="background-color: #0c1221; text-align: center; border-bottom: 4px solid #D4A55A; overflow: hidden; line-height: 0;">
            <img src="${settings.emailHeaderImageUrl}" alt="${siteTitle}" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; object-fit: cover;" />
          </div>
        ` : `
          <div style="background-color: #0C1221; padding: 30px 16px; text-align: center; color: #ffffff; border-bottom: 4px solid #D4A55A;">
            ${settings.logoType === "image" && settings.logoImageUrl ? `
              <div style="margin-bottom: 12px; text-align: center;">
                <img src="${settings.logoImageUrl}" alt="${siteTitle}" style="max-height: 60px; max-width: 220px; object-fit: contain; display: inline-block; vertical-align: middle; border-radius: 4px; background-color: rgba(255, 255, 255, 0.1); padding: 4px;" />
              </div>
            ` : `
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.01em; color: #ffffff;">${siteTitle}</h1>
            `}
            <p style="margin: 8px 0 0 0; font-size: 13.5px; color: #E6BF76; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">✓ Compra Recibida • Preparando Pedido</p>
          </div>
        `}

        <!-- Body -->
        <div style="padding: 22px 16px;">
          ${settings.emailHeaderImageUrl && settings.logoType === "image" && settings.logoImageUrl ? `
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="${settings.logoImageUrl}" alt="${siteTitle}" style="max-height: 55px; max-width: 180px; object-fit: contain;" />
            </div>
          ` : ""}
          <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 750; color: #0C1221; ${settings.emailHeaderImageUrl ? 'text-align: center;' : ''}">¡Hola, ${customerName}!</h2>
          <p style="margin: 0 0 25px 0; font-size: 14px; color: #475569; white-space: pre-wrap; line-height: 1.6;">
            ${bodyText}
          </p>

          <!-- Order Summary Dashboard Card (Zebra look, very readable) -->
          <div style="background-color: #FAF9F6; border: 1.5px solid #E6BF76; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
            <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <tr>
                <td style="padding: 6px 0; color: #475569; font-weight: 600; text-align: left;">Número de Pedido:</td>
                <td style="padding: 6px 0; color: #0C1221; font-weight: 800; text-align: right; font-family: monospace; font-size: 14.5px;">#${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569; font-weight: 600; text-align: left; border-top: 1px solid #E6BF76; border-top-style: dashed;">Fecha de Compra:</td>
                <td style="padding: 6px 0; color: #0C1221; font-weight: 500; text-align: right; border-top: 1px solid #E6BF76; border-top-style: dashed;">${fechaCompraCompilada}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569; font-weight: 600; text-align: left; border-top: 1px solid #E6BF76; border-top-style: dashed;">Método de Pago:</td>
                <td style="padding: 6px 0; color: #D4A55A; font-weight: bold; text-align: right; border-top: 1px solid #E6BF76; border-top-style: dashed;">${paymentMethod}</td>
              </tr>
            </table>
          </div>

          <!-- Items Title -->
          <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #0C1221; border-bottom: 2px solid #D4A55A; padding-bottom: 6px;">Artículos Solicitados</h3>
          
          <!-- Items Table -->
          <div style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; min-width: 280px;">
              <thead>
                <tr style="background-color: #0C1221; color: #E6BF76;">
                  <th style="padding: 10px 6px; text-align: left; font-size: 11px; font-weight: 750; text-transform: uppercase; border-radius: 4px 0 0 4px; border: 1px solid #0C1221;">Artículo</th>
                  <th style="padding: 10px 4px; text-align: center; font-size: 11px; font-weight: 750; text-transform: uppercase; width: 45px; border: 1px solid #0C1221;">Cant.</th>
                  <th style="padding: 10px 4px; text-align: right; font-size: 11px; font-weight: 750; text-transform: uppercase; width: 65px; border: 1px solid #0C1221;">Precio</th>
                  <th style="padding: 10px 6px; text-align: right; font-size: 11px; font-weight: 750; text-transform: uppercase; width: 75px; border-radius: 0 4px 4px 0; border: 1px solid #0C1221;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <!-- Financial summary block in Gold/Bone palette (Using nested stable table instead of flex blocks) -->
          <table align="right" border="0" cellpadding="0" cellspacing="0" style="width: 270px; margin-bottom: 30px; background-color: #FAF9F6; border: 1.5px solid #E6BF76; padding: 14px; border-radius: 8px; border-collapse: collapse; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
            <tr>
              <td style="padding: 4px 0; font-size: 13px; color: #475569; text-align: left;">Subtotal:</td>
              <td style="padding: 4px 0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; font-family: monospace;">$${subtotal}</td>
            </tr>
            ${discount > 0 ? `
            <tr>
              <td style="padding: 4px 0; font-size: 13px; color: #b91c1c; font-weight: bold; text-align: left;">Descuento (Cupón: ${coupon}):</td>
              <td style="padding: 4px 0; font-size: 13px; color: #b91c1c; font-weight: bold; text-align: right; font-family: monospace;">-$${discount}</td>
            </tr>
            ` : ""}
            <tr>
              <td style="padding: 4px 0; font-size: 13px; color: #475569; text-align: left;">Envío:</td>
              <td style="padding: 4px 0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">${isAgencyShipment ? '<span style="color:#B45309;font-weight:bold;">Cobro en destino</span>' : (shippingCost === 0 ? "Gratis" : `$${shippingCost}`)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0 0 0; border-top: 1.5px solid #D4A55A; font-weight: 850; font-size: 16px; color: #0C1221; text-align: left; margin-top: 8px;">TOTAL NETO:</td>
              <td style="padding: 10px 0 0 0; border-top: 1.5px solid #D4A55A; font-weight: 850; font-size: 17px; color: #D4A55A; text-align: right; font-family: monospace; margin-top: 8px;">$${total}</td>
            </tr>
          </table>
          <div style="clear: both; height: 1px;"></div>

          <!-- Agency Shipping Notice block -->
          ${isAgencyShipment ? `
          <div style="margin-bottom: 25px; font-size: 13px; color: #0C1221; background-color: #FAF5EB; border: 1.5px solid #FCD34D; border-left: 5px solid #D4A55A; padding: 15px 18px; border-radius: 8px; box-shadow: 0 1px 3px rgba(12, 18, 33, 0.03);">
            <strong style="color: #B45309; display: block; margin-bottom: 5px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800;">📢 AVISO DE ENVÍO POR AGENCIA:</strong> 
            El costo de envío de la encomienda <strong>lo paga el cliente directamente a la agencia de transporte (DAC, UES o De Punta) al recibir o retirar su pedido</strong> (modalidad cobro en destino). Nosotros despachamos tu paquete en Tres Cruces / sucursal de origen sin ningún cargo extra.
          </div>
          ` : ""}

          <!-- Notes / Special Instructions block -->
          ${notes && notes.trim() && notes !== "Ninguna" ? `
          <div style="margin-bottom: 25px; font-size: 13.5px; color: #0C1221; background-color: #FAF5EB; border-left: 4px solid #D4A55A; padding: 15px 18px; border-radius: 4px; box-shadow: 0 1px 3px rgba(12, 18, 33, 0.03);">
            <strong style="color: #B45309; display: block; margin-bottom: 5px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Instrucciones para preparación / Notas de envío:</strong> 
            "${notes}"
          </div>
          ` : ""}

          <!-- Payment instructions -->
          ${generateEmailPaymentDetailsBlock(settings)}

        </div>

        <!-- Cohesive Dark Footer with Gold accent -->
        <div style="background-color: #0C1221; padding: 25px 30px; text-align: center; border-top: 3px solid #D4A55A; font-size: 11px; color: #FAF9F6; line-height: 1.5;">
          Este correo ha sido generado de forma automática para la gestión del pedido del cliente y de la sucursal de ${siteTitle}.
          <br />
          Si hay algún dato a corregir, por favor contáctanos lo antes posible para evitar demoras en el armado.
        </div>
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * 2. Generate PEDIDO ENVIADO/DESPACHADO Email HTML
 */
export function generateOrderShippedEmailHtml(order: any, settings: any): { subject: string; html: string } {
  const rawOrderId = order.id || "";
  const orderId = rawOrderId.length > 8 ? rawOrderId.substring(0, 6).toUpperCase() : rawOrderId;
  const customerName = order.customerName || "Cliente";
  const items = order.items || [];
  const trackingNumber = order.trackingNumber || order.tracking_number || "";
  const trackingCarrier = order.trackingCarrier || order.tracking_carrier || "";
  const siteTitle = settings.siteTitle || "Ventas Juem";

  const defaultSubject = `¡Tu pedido #${orderId} ha sido enviado! 🚚`;
  const subject = defaultSubject;

  const itemsRows = items.map((item: any) => {
    const sizeStr = item.sizeSelected ? ` - Talle: ${item.sizeSelected}` : "";
    const colorStr = item.colorSelected ? ` - Color: ${item.colorSelected}` : "";
    const nameWithVariant = `${item.productName}${sizeStr}${colorStr}`;
    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155;">
          <strong>${nameWithVariant}</strong>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; text-align: center; font-weight: bold;">
          ${item.quantity}
        </td>
      </tr>
    `;
  }).join("");

  // Tracking section HTML block if tracking info exists
  let trackingHtml = "";
  if (trackingNumber && trackingNumber.trim() !== "") {
    let trackingLink = "";
    const carrierLower = trackingCarrier.toLowerCase();
    if (carrierLower.includes("ues")) {
      trackingLink = `https://www.ues.com.uy/rastreo-de-envios?tracking=${trackingNumber}`;
    } else if (carrierLower.includes("dac")) {
      trackingLink = `https://www.dac.com.uy/vpa/index.html`; 
    } else {
      trackingLink = `https://www.correo.com.uy/`;
    }

    trackingHtml = `
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 22px 18px; margin-bottom: 25px; text-align: center;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.1em; display: block; margin-bottom: 6px;">Información de Seguimiento</span>
        <div style="font-size: 14px; font-weight: bold; color: #1e3a8a; margin-bottom: 6px;">
          Transportadora / Courier: <span style="text-transform: uppercase; color: #1d4ed8;">${trackingCarrier || "Correo"}</span>
        </div>
        <div style="font-size: 18px; font-family: monospace; font-weight: bold; color: #0f172a; margin-bottom: 15px; letter-spacing: 0.05em;">
          Código: ${trackingNumber}
        </div>
        <a href="${trackingLink}" target="_blank" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 11px 24px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 6px -1px rgba(29, 78, 216, 0.2);">
          Rastrear mi paquete 📦
        </a>
      </div>
    `;
  } else {
    trackingHtml = `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 25px; text-align: center; color: #166534; font-size: 13px; line-height: 1.4;">
        <strong>Despacho local completado:</strong> Tu pedido ha sido derivado a nuestro cadete del área correspondiente. Recibirás tu pedido de calzado muy pronto en la dirección especificada.
      </div>
    `;
  }

  // Google review button
  const reviewLink = "https://g.page/r/search/review"; // Fallback reviews link

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 25px 8px; color: #0f172a; line-height: 1.5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
        
        <!-- Header -->
        ${settings.emailHeaderImageUrl ? `
          <div style="background-color: #0c1221; text-align: center; border-bottom: 4px solid #D4A55A; overflow: hidden; line-height: 0;">
            <img src="${settings.emailHeaderImageUrl}" alt="${siteTitle}" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; object-fit: cover;" />
          </div>
        ` : `
          <div style="background-color: #0C1221; padding: 30px 16px; text-align: center; color: #ffffff; border-bottom: 4px solid #D4A55A;">
            ${settings.logoType === "image" && settings.logoImageUrl ? `
              <div style="margin-bottom: 12px; text-align: center;">
                <img src="${settings.logoImageUrl}" alt="${siteTitle}" style="max-height: 60px; max-width: 220px; object-fit: contain; display: inline-block; vertical-align: middle; border-radius: 4px; background-color: rgba(255, 255, 255, 0.1); padding: 4px;" />
              </div>
            ` : `
               <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.01em; color: #ffffff;">${siteTitle}</h1>
            `}
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #E6BF76; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">¡Tu pedido va en camino! 🚚🚀</p>
          </div>
        `}

        <!-- Body -->
        <div style="padding: 22px 16px;">
          ${settings.emailHeaderImageUrl && settings.logoType === "image" && settings.logoImageUrl ? `
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="${settings.logoImageUrl}" alt="${siteTitle}" style="max-height: 55px; max-width: 180px; object-fit: contain;" />
            </div>
          ` : ""}
          <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #0C1221; ${settings.emailHeaderImageUrl ? 'text-align: center;' : ''}">¡Hola, ${customerName}!</h2>
          <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">
            Te queremos informar que tu pedido <strong style="color: #0f172a;">#${orderId}</strong> ha sido enviado por nuestro equipo. Aquí dispones del detalle de tu despacho:
          </p>

          <!-- Tracking section inside email -->
          ${trackingHtml}

          <!-- Delivery / Date Info Box (Clean stable table layout instead of flex items) -->
          <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 25px; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 600; text-align: left;">Pedido de referencia:</td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: 700; font-family: monospace; text-align: right;">#${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 600; text-align: left;">Fecha de Envío:</td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: 500; text-align: right;">${new Date().toLocaleDateString("es-UY")}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 600; text-align: left;">Estado Actual del Pedido:</td>
              <td style="padding: 4px 0; color: #10b981; font-weight: bold; text-align: right;">ENVIADO / DESPACHADO</td>
            </tr>
          </table>

          <!-- Items list in this shipment -->
          <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">Productos en el Envío</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0;">Artículo</th>
                <th style="padding: 10px; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; width: 80px; border-bottom: 1px solid #e2e8f0;">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Payment instructions -->
          ${generateEmailPaymentDetailsBlock(settings)}

          <!-- Leave a review box (Amber themed, very warm and professional) -->
          <div style="text-align: center; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 25px 18px; margin-bottom: 25px;">
            <div style="font-size: 16px; font-weight: 800; color: #92400e; margin-bottom: 5px;">🌟 ¡Tu opinión nos ayuda a crecer! 🌟</div>
            <p style="font-size: 12px; color: #b45309; margin: 0 auto 15px auto; max-width: 420px; line-height: 1.45;">
              Nos encantaría que dejes tu reseña sobre tu experiencia con nuestro calzado. Tus valoraciones ayudan a que más personas encuentren su talle y diseño ideal.
            </p>
            <a href="${reviewLink}" target="_blank" style="display: inline-block; background-color: #d97706; color: #ffffff; padding: 11px 24px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.2);">
              Dejar una Valoración ⭐
            </a>
          </div>


        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
          Este correo ha sido generado de forma automática por la plataforma de venta de ${siteTitle}.
          <br />
          Si no realizaste este pedido, por favor ignora este correo.
        </div>
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * 3. FALLBACK GENERAL TEMPLATE FOR OTHER STATUS UPDATES
 */
export function generateOrderStatusChangedEmailHtml(params: {
  order: any;
  oldStatus: string;
  newStatus: string;
  settings: any;
}): { subject: string; html: string } {
  const { order, newStatus, settings } = params;
  const rawOrderId = order.id || "";
  const orderId = rawOrderId.length > 8 ? rawOrderId.substring(0, 6).toUpperCase() : rawOrderId;
  const customerName = order.customerName || "Cliente";
  const siteTitle = settings.siteTitle || "Ventas Juem";
  const statusText = statusLabels[newStatus] || newStatus;

  const defaultSubject = `Actualización de Estado - Pedido #${orderId}`;
  const customSubjectTemplate = settings.emailTemplateOrderStatusChangedSubject;
  const subject = customSubjectTemplate
    ? replacePlaceholders(customSubjectTemplate, { orderId, customerName, statusText, siteTitle })
    : defaultSubject;

  const defaultBody = "Te notificamos que el estado de tu pedido #{{orderId}} ha sido actualizado por nuestro equipo de logística.";
  const customBodyTemplate = settings.emailTemplateOrderStatusChangedBody;
  const bodyText = customBodyTemplate
    ? replacePlaceholders(customBodyTemplate, { orderId, customerName, statusText, siteTitle })
    : replacePlaceholders(defaultBody, { orderId });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 25px 8px; color: #0f172a; line-height: 1.5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
        
        <!-- Header -->
        ${settings.emailHeaderImageUrl ? `
          <div style="background-color: #0c1221; text-align: center; border-bottom: 4px solid #D4A55A; overflow: hidden; line-height: 0;">
            <img src="${settings.emailHeaderImageUrl}" alt="${siteTitle}" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; object-fit: cover;" />
          </div>
        ` : `
          <div style="background-color: #0C1221; padding: 30px 16px; text-align: center; color: #ffffff; border-bottom: 4px solid #D4A55A;">
            ${settings.logoType === "image" && settings.logoImageUrl ? `
              <div style="margin-bottom: 12px; text-align: center;">
                <img src="${settings.logoImageUrl}" alt="${siteTitle}" style="max-height: 60px; max-width: 220px; object-fit: contain; display: inline-block; vertical-align: middle; border-radius: 4px; background-color: rgba(255, 255, 255, 0.1); padding: 4px;" />
              </div>
            ` : `
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.01em; color: #ffffff;">${siteTitle}</h1>
            `}
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #E6BF76; font-weight: 600;">¡El estado de tu pedido ha cambiado!</p>
          </div>
        `}

        <!-- Body -->
        <div style="padding: 22px 16px;">
          ${settings.emailHeaderImageUrl && settings.logoType === "image" && settings.logoImageUrl ? `
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="${settings.logoImageUrl}" alt="${siteTitle}" style="max-height: 55px; max-width: 180px; object-fit: contain;" />
            </div>
          ` : ""}
          <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #0C1221; ${settings.emailHeaderImageUrl ? 'text-align: center;' : ''}">Hola, ${customerName}</h2>
          <p style="margin: 0 0 25px 0; font-size: 14px; color: #475569; white-space: pre-wrap;">
            ${bodyText}
          </p>

          <!-- Current Status Display -->
          <div style="text-align: center; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 25px 15px; margin-bottom: 25px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.1em; display: block; margin-bottom: 5px;">Nuevo Estado del Pedido</span>
            <span style="font-size: 20px; font-weight: 800; color: #1e3a8a;">${statusText}</span>
          </div>

          <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
            ${newStatus === "pago_confirmado" || newStatus === "pago_aprobado" ? "Hemos confirmado tu pago con éxito. Tu pedido pasa al sector de embalaje." : ""}
            ${newStatus === "pago_pendiente" ? "Tu pedido se encuentra <strong>pendiente de pago</strong>. Por favor, realiza la transferencia o giro correspondiente para poder continuar con el procesamiento de tu pedido." : ""}
            ${newStatus === "en_preparacion" ? "Tu calzado o indumentaria ya se está siendo preparado y verificado." : ""}
            ${newStatus === "listo_para_retirar" ? "¡Buenas noticias! Tu pedido ya está listo para ser retirado en nuestros depósitos físicos de entrega." : ""}
            ${newStatus === "pedido_cancelado" ? "Tu pedido ha sido cancelado. Si tienes dudas sobre los motivos o reintegros, no dudes en escribirnos." : ""}
            ${newStatus === "pedido_reembolsado" ? "El importe de tu compra ha sido devuelto de forma exitosa." : ""}
          </p>

          <!-- Payment instructions -->
          ${generateEmailPaymentDetailsBlock(settings)}

          <!-- Order Summary Details (Using stable table block instead of flex rows) -->
          <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc; border-radius: 12px; padding: 15px; margin-bottom: 25px; border: 1px solid #e2e8f0; font-size: 12px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 600; text-align: left;">Referencia de la Orden:</td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: 700; text-align: right; font-family: monospace;">#${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 600; text-align: left;">Importe Total:</td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: 700; text-align: right; font-family: monospace;">$${order.total || 0}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 600; text-align: left;">Línea telefónica del cliente:</td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: 700; text-align: right;">${order.customerPhone || "N/A"}</td>
            </tr>
          </table>


        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
          Este correo ha sido enviado automáticamente por ${siteTitle}. No es necesario responder directamente a este remitente.
        </div>
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * 4. DISPATCHER: MAIN CHIEF DECOUPLED ORDER EMAIL DISPATCH SYSTEM
 */
export async function dispatchOrderEmail(
  eventType: "purchase_confirmed" | "order_shipped", 
  order: any, 
  settings: any
): Promise<{ success: boolean; status: string; error?: string; message?: string }> {
  
  if (!order || !order.id) {
    return { success: false, status: "error", error: "Pedido o ID de pedido inexistente." };
  }

  const recipient = order.customerEmail || order.customer_email;
  if (!recipient || recipient === "cliente@tienda.com" || !recipient.includes("@")) {
    console.warn(`[Dispatcher Warning] Email de destino no válido o placeholder para pedido ID: ${order.id}. Muted.`);
    return { success: false, status: "muted", message: "Email del comprador es un placeholder o no es válido." };
  }

  // A. PREVENT DUPLICATES
  const duplicate = await isEmailAlreadySent(order.id, eventType);
  if (duplicate) {
    console.log(`[Email Dispatcher] Envío duplicado evitado para pedido #${order.id} (Tipo: ${eventType})`);
    return { success: true, status: "duplicate", message: "Envío duplicado prevenido con antelación." };
  }

  // B. RENDER CORRESPONDING RESPONSIVE HTML
  let subject = "";
  let html = "";

  try {
    if (eventType === "purchase_confirmed") {
      const render = generateOrderCreatedEmailHtml(order, settings);
      subject = render.subject;
      html = render.html;
    } else if (eventType === "order_shipped") {
      const render = generateOrderShippedEmailHtml(order, settings);
      subject = render.subject;
      html = render.html;
    } else {
      return { success: false, status: "error", error: `Evento de e-mail no admitido: ${eventType}` };
    }
  } catch (renderErr: any) {
    console.error(`[Email Dispatcher Error] Error de renderizado de plantilla para ${eventType}:`, renderErr);
    return { success: false, status: "error", error: `Error durante renderizado: ${renderErr.message}` };
  }

  // C. CORE TRANSMISSION SEND ACTION
  const result = await sendEmail({
    settings,
    to: recipient,
    subject,
    html
  });

  // D. RECORD LOG TRANSACTION
  const logId = "email-log-" + Math.random().toString(36).substring(2, 10);
  await logEmailDelivery({
    id: logId,
    timestamp: new Date().toISOString(),
    to: recipient,
    orderId: order.id,
    emailType: eventType,
    subject,
    body: html,
    status: result.status,
    error: result.error
  });

  return { success: result.success, status: result.status, error: result.error };
}
