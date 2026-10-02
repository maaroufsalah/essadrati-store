import { directionOf, type Locale, type NumberingSystem } from "@nocido/types";
import { interpolate, NOTIFICATION_MESSAGES, type NotificationKind } from "./messages";

export interface NotificationOrder {
  id: string;
  displayId: number;
  locale: Locale;
  currency: string;
  /** Real customer address, null for phone-only orders (technical email). */
  email: string | null;
  fullName: string;
  phone: string;
  cityName: string;
  items: { title: string; variant: string | null; quantity: number; total: number }[];
  itemTotal: number;
  shippingTotal: number;
  total: number;
}

export interface NotificationBranding {
  storeName: string;
  logoUrl: string | null;
  legalName: string;
  numberingSystem: NumberingSystem;
  colors: {
    bg: string;
    card: string;
    cardFg: string;
    primary: string;
    primaryFg: string;
    mutedFg: string;
    border: string;
  };
  contact: { phone: string | null; whatsapp: string | null; email: string | null };
}

export interface RenderedMessage {
  subject: string;
  html: string;
  text: string;
}

const escape = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function formatMoney(
  amount: number,
  currency: string,
  locale: Locale,
  numberingSystem: NumberingSystem,
): string {
  return new Intl.NumberFormat(`${locale}-u-nu-${numberingSystem}`, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Order number without grouping, in the store digits. */
function orderNumber(order: NotificationOrder, branding: NotificationBranding): string {
  return new Intl.NumberFormat(`${order.locale}-u-nu-${branding.numberingSystem}`, {
    useGrouping: false,
  }).format(order.displayId);
}

/**
 * Branded HTML email (table layout and inline styles for mail clients),
 * right to left in Arabic, plus its plain text version.
 */
export function renderOrderEmail(
  kind: NotificationKind,
  order: NotificationOrder,
  branding: NotificationBranding,
  links: { track: string | null; admin: string | null },
): RenderedMessage {
  const t = NOTIFICATION_MESSAGES[order.locale];
  const money = (amount: number) =>
    formatMoney(amount, order.currency, order.locale, branding.numberingSystem);
  const values = {
    name: order.fullName.split(/\s+/)[0] ?? order.fullName,
    number: orderNumber(order, branding),
    total: money(order.total),
    city: order.cityName,
    store: branding.storeName,
  };
  const kindText = t.kinds[kind];
  const subject = `${interpolate(kindText.subject, values)} · ${branding.storeName}`;
  const heading = interpolate(kindText.heading, values);
  const intro = interpolate(kindText.intro, values);
  const greeting = kind === "merchant" ? "" : interpolate(t.greeting, values);
  const dir = directionOf(order.locale);
  const align = dir === "rtl" ? "right" : "left";
  const end = dir === "rtl" ? "left" : "right";
  const { colors } = branding;
  const shipping = order.shippingTotal === 0 ? t.free : money(order.shippingTotal);
  const cta = kind === "merchant" ? links.admin : links.track;
  const ctaLabel = kind === "merchant" ? t.openAdmin : t.track;
  const ltr = (value: string) => `<span dir="ltr">${escape(value)}</span>`;

  const rows = order.items
    .map(
      (item) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${colors.border};text-align:${align}">
<div style="font-weight:600">${escape(item.title)}</div>
${item.variant ? `<div style="color:${colors.mutedFg};font-size:13px">${ltr(item.variant)}</div>` : ""}
</td>
<td style="padding:10px 8px;border-bottom:1px solid ${colors.border};text-align:center;white-space:nowrap">× ${item.quantity}</td>
<td style="padding:10px 0;border-bottom:1px solid ${colors.border};text-align:${end};white-space:nowrap">${escape(money(item.total))}</td>
</tr>`,
    )
    .join("");

  const totalRow = (label: string, value: string, strong = false) =>
    `<tr><td colspan="2" style="padding:6px 0;text-align:${align};${strong ? "font-weight:700;font-size:16px" : `color:${colors.mutedFg}`}">${escape(label)}</td><td style="padding:6px 0;text-align:${end};white-space:nowrap;${strong ? "font-weight:700;font-size:16px" : ""}">${escape(value)}</td></tr>`;

  const contactLines = [
    branding.contact.phone ? `${escape(t.phone + t.colon)}${ltr(branding.contact.phone)}` : null,
    branding.contact.whatsapp
      ? `${escape(t.whatsapp + t.colon)}${ltr(branding.contact.whatsapp)}`
      : null,
    branding.contact.email ? ltr(branding.contact.email) : null,
  ].filter(Boolean);

  const customerBlock =
    kind === "merchant"
      ? `<p style="margin:0 0 4px"><strong>${escape(t.customer + t.colon)}</strong>${escape(order.fullName)}</p>
<p style="margin:0 0 4px"><strong>${escape(t.phone + t.colon)}</strong>${ltr(order.phone)}</p>`
      : "";

  const html = `<!doctype html>
<html lang="${order.locale}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:${colors.bg};color:${colors.cardFg};font-family:Tahoma,Arial,Helvetica,sans-serif;line-height:1.5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bg};padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${colors.card};border:1px solid ${colors.border};border-radius:12px;overflow:hidden" dir="${dir}">
<tr><td style="padding:24px;text-align:center;border-bottom:3px solid ${colors.primary}">
${
  branding.logoUrl
    ? `<img src="${escape(branding.logoUrl)}" alt="${escape(branding.storeName)}" style="max-height:56px;max-width:220px">`
    : `<div style="font-size:22px;font-weight:700">${escape(branding.storeName)}</div>`
}
</td></tr>
<tr><td style="padding:28px 24px;text-align:${align}">
<h1 style="margin:0 0 12px;font-size:22px">${escape(heading)}</h1>
${greeting ? `<p style="margin:0 0 8px">${escape(greeting)}</p>` : ""}
<p style="margin:0 0 20px">${escape(intro)}</p>
${customerBlock}
<p style="margin:0 0 20px"><strong>${escape(t.deliveryTo + t.colon)}</strong>${escape(order.cityName)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
<tr><th style="text-align:${align};padding-bottom:6px;border-bottom:2px solid ${colors.border}">${escape(t.items)}</th><th style="padding-bottom:6px;border-bottom:2px solid ${colors.border}">${escape(t.quantity)}</th><th style="padding-bottom:6px;border-bottom:2px solid ${colors.border}"></th></tr>
${rows}
${totalRow(t.subtotal, money(order.itemTotal))}
${totalRow(t.shipping, shipping)}
${totalRow(t.total, money(order.total), true)}
</table>
<p style="margin:16px 0 0;color:${colors.mutedFg};font-size:13px">${escape(t.payment)}</p>
${
  cta
    ? `<p style="margin:28px 0 0;text-align:center"><a href="${escape(cta)}" style="display:inline-block;background:${colors.primary};color:${colors.primaryFg};text-decoration:none;font-weight:700;padding:12px 28px;border-radius:999px">${escape(ctaLabel)}</a></p>`
    : ""
}
</td></tr>
<tr><td style="padding:20px 24px;background:${colors.bg};color:${colors.mutedFg};font-size:12px;text-align:center">
${kind === "merchant" ? "" : `<p style="margin:0 0 6px">${escape(t.help)}</p>`}
${contactLines.length ? `<p style="margin:0 0 6px">${contactLines.join(" · ")}</p>` : ""}
<p style="margin:0">${escape(branding.legalName || branding.storeName)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    heading,
    greeting,
    intro,
    kind === "merchant" ? `${t.customer}${t.colon}${order.fullName} · ${order.phone}` : "",
    `${t.deliveryTo}${t.colon}${order.cityName}`,
    "",
    ...order.items.map(
      (item) =>
        `- ${item.title}${item.variant ? ` (${item.variant})` : ""} × ${item.quantity}${t.colon}${money(item.total)}`,
    ),
    "",
    `${t.subtotal}${t.colon}${money(order.itemTotal)}`,
    `${t.shipping}${t.colon}${shipping}`,
    `${t.total}${t.colon}${money(order.total)}`,
    t.payment,
    cta ? `${ctaLabel}${t.colon}${cta}` : "",
    "",
    branding.legalName || branding.storeName,
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");

  return { subject, html, text };
}

/** Short WhatsApp message for the same event (sent by the WhatsApp channel). */
export function renderWhatsAppText(
  kind: NotificationKind,
  order: NotificationOrder,
  branding: NotificationBranding,
  trackUrl: string | null,
): string {
  const t = NOTIFICATION_MESSAGES[order.locale];
  const values = {
    name: order.fullName.split(/\s+/)[0] ?? order.fullName,
    number: orderNumber(order, branding),
    total: formatMoney(order.total, order.currency, order.locale, branding.numberingSystem),
    city: order.cityName,
    store: branding.storeName,
  };
  return [
    `${branding.storeName} · ${interpolate(t.kinds[kind].heading, values)}`,
    interpolate(t.kinds[kind].intro, values),
    trackUrl ? `${t.track}${t.colon}${trackUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
