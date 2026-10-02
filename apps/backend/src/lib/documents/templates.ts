import { amountToFrenchWords } from "./words";

/** Order data printed on the invoice and the delivery note. */
export interface DocumentOrder {
  displayId: number;
  createdAt: string;
  currency: string;
  customerName: string;
  customerPhone: string;
  address: string;
  cityName: string;
  note: string | null;
  items: {
    title: string;
    variant: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  itemTotal: number;
  shippingTotal: number;
  total: number;
}

/** Seller data from StoreSettings (identity, contact, billing). */
export interface DocumentSeller {
  storeName: string;
  legalName: string;
  logoUrl: string | null;
  address: string;
  city: string;
  phone: string;
  email: string;
  ice: string;
  rc: string;
  if: string;
  patente: string;
  cnss: string;
  tva: { subject: boolean; rate: number };
  invoicePrefix: string;
  footer: string;
  timezone: string;
  colors: {
    fg: string;
    muted: string;
    border: string;
    primary: string;
    primaryFg: string;
    surface: string;
  };
}

/** Kit wording of the documents (French, the language of Moroccan invoices). */
const FR = {
  invoice: "Facture",
  deliveryNote: "Bon de livraison",
  number: "N°",
  date: "Date",
  order: "Commande",
  seller: "Vendeur",
  customer: "Client",
  shipTo: "Destinataire",
  from: "Expéditeur",
  phone: "Tél.",
  designation: "Désignation",
  quantity: "Qté",
  unitPrice: "PU TTC",
  lineTotal: "Total TTC",
  shipping: "Frais de livraison",
  totalHt: "Total HT",
  tva: "TVA",
  totalTtc: "Total TTC",
  noTva: "TVA non applicable",
  amountInWords: "Arrêtée la présente facture à la somme de",
  payment: "Mode de paiement : espèces à la livraison",
  toCollect: "Montant à encaisser",
  note: "Remarque",
  courierSignature: "Signature du livreur",
  customerSignature: "Signature du client",
  ice: "ICE",
  rc: "RC",
  if: "IF",
  patente: "Patente",
  cnss: "CNSS",
};

const escape = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Free text that may be Arabic: its own direction inside the French page. */
const auto = (value: string) => `<bdi dir="auto">${escape(value)}</bdi>`;

export function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("fr-MA", { dateStyle: "long", timeZone: timezone }).format(
    new Date(iso),
  );
}

/** FA-2026-000042: prefix, year of the order, zero-padded order number. */
export function invoiceNumber(order: DocumentOrder, seller: DocumentSeller): string {
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: seller.timezone }).format(
    new Date(order.createdAt),
  );
  return `${seller.invoicePrefix}-${year}-${String(order.displayId).padStart(6, "0")}`;
}

/** HT and TVA from tax inclusive amounts. */
export function taxBreakdown(totalTtc: number, rate: number): { ht: number; tva: number } {
  const ht = Math.round((totalTtc / (1 + rate / 100)) * 100) / 100;
  return { ht, tva: Math.round((totalTtc - ht) * 100) / 100 };
}

function page(title: string, seller: DocumentSeller, body: string): string {
  const { colors } = seller;
  return `<!doctype html>
<html lang="fr" dir="ltr">
<head>
<meta charset="utf-8">
<title>${escape(title)}</title>
<style>
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { margin: 0; color: ${colors.fg}; font: 11pt/1.45 "Noto Sans", "Segoe UI", "Noto Naskh Arabic", Tahoma, Arial, sans-serif; }
h1 { margin: 0; font-size: 22pt; letter-spacing: .5px; text-transform: uppercase; color: ${colors.primary}; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 14px; border-bottom: 3px solid ${colors.primary}; }
.brand img { max-height: 60px; max-width: 220px; }
.brand .name { font-size: 16pt; font-weight: 700; }
.meta { text-align: right; }
.meta p { margin: 2px 0; }
.parties { display: flex; gap: 16px; margin: 18px 0; }
.party { flex: 1; border: 1px solid ${colors.border}; border-radius: 8px; padding: 10px 12px; }
.party h2 { margin: 0 0 6px; font-size: 9pt; text-transform: uppercase; color: ${colors.muted}; letter-spacing: .6px; }
.party p { margin: 1px 0; }
.ids { color: ${colors.muted}; font-size: 9pt; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 9pt; text-transform: uppercase; color: ${colors.muted}; border-bottom: 2px solid ${colors.border}; padding: 6px 4px; }
td { padding: 7px 4px; border-bottom: 1px solid ${colors.border}; vertical-align: top; }
.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.variant { color: ${colors.muted}; font-size: 9pt; }
.totals { margin: 14px 0 0 auto; width: 55%; }
.totals td { border: 0; padding: 4px; }
.totals .grand td { border-top: 2px solid ${colors.fg}; font-weight: 700; font-size: 12.5pt; }
.words { margin-top: 18px; padding: 10px 12px; background: ${colors.surface}; border-radius: 8px; }
.collect { margin: 20px 0; padding: 14px 16px; border: 2px solid ${colors.primary}; border-radius: 10px; display: flex; justify-content: space-between; font-size: 15pt; font-weight: 700; }
.phone { font-size: 14pt; font-weight: 700; }
.signatures { display: flex; gap: 16px; margin-top: 28px; }
.signatures div { flex: 1; height: 90px; border: 1px dashed ${colors.border}; border-radius: 8px; padding: 8px; color: ${colors.muted}; font-size: 9pt; }
footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid ${colors.border}; color: ${colors.muted}; font-size: 8.5pt; text-align: center; }
</style>
</head>
<body>${body}</body>
</html>`;
}

function brand(seller: DocumentSeller): string {
  return seller.logoUrl
    ? `<div class="brand"><img src="${escape(seller.logoUrl)}" alt="${escape(seller.storeName)}"></div>`
    : `<div class="brand"><div class="name">${auto(seller.storeName)}</div></div>`;
}

function sellerLines(seller: DocumentSeller): string {
  return [
    `<p><strong>${auto(seller.legalName || seller.storeName)}</strong></p>`,
    seller.address ? `<p>${auto(seller.address)}</p>` : "",
    seller.city ? `<p>${auto(seller.city)}</p>` : "",
    seller.phone ? `<p>${FR.phone} <span dir="ltr">${escape(seller.phone)}</span></p>` : "",
    seller.email ? `<p>${escape(seller.email)}</p>` : "",
  ].join("");
}

function legalIds(seller: DocumentSeller): string {
  return (
    [
      seller.ice ? `${FR.ice} ${seller.ice}` : "",
      seller.rc ? `${FR.rc} ${seller.rc}` : "",
      seller.if ? `${FR.if} ${seller.if}` : "",
      seller.patente ? `${FR.patente} ${seller.patente}` : "",
      seller.cnss ? `${FR.cnss} ${seller.cnss}` : "",
    ]
      .filter(Boolean)
      .map(escape)
      .join(" · ") || ""
  );
}

function customerLines(order: DocumentOrder): string {
  return [
    `<p><strong>${auto(order.customerName)}</strong></p>`,
    `<p>${FR.phone} <span dir="ltr">${escape(order.customerPhone)}</span></p>`,
    order.address && order.address !== order.cityName ? `<p>${auto(order.address)}</p>` : "",
    `<p>${auto(order.cityName)}</p>`,
  ].join("");
}

/** Invoice (facture) in French, amounts tax inclusive with the TVA breakdown when subject. */
export function buildInvoiceHtml(order: DocumentOrder, seller: DocumentSeller): string {
  const number = invoiceNumber(order, seller);
  const rows = order.items
    .map(
      (item) => `<tr>
<td>${auto(item.title)}${item.variant ? `<div class="variant">${auto(item.variant)}</div>` : ""}</td>
<td class="num">${item.quantity}</td>
<td class="num">${escape(money(item.unitPrice, order.currency))}</td>
<td class="num">${escape(money(item.total, order.currency))}</td>
</tr>`,
    )
    .join("");
  const shippingRow =
    order.shippingTotal > 0
      ? `<tr><td>${FR.shipping}</td><td class="num">1</td><td class="num">${escape(money(order.shippingTotal, order.currency))}</td><td class="num">${escape(money(order.shippingTotal, order.currency))}</td></tr>`
      : "";
  const { ht, tva } = taxBreakdown(order.total, seller.tva.rate);
  const totals = seller.tva.subject
    ? `<tr><td>${FR.totalHt}</td><td class="num">${escape(money(ht, order.currency))}</td></tr>
<tr><td>${FR.tva} ${seller.tva.rate} %</td><td class="num">${escape(money(tva, order.currency))}</td></tr>
<tr class="grand"><td>${FR.totalTtc}</td><td class="num">${escape(money(order.total, order.currency))}</td></tr>`
    : `<tr class="grand"><td>${FR.totalTtc}</td><td class="num">${escape(money(order.total, order.currency))}</td></tr>
<tr><td colspan="2" class="ids">${FR.noTva}</td></tr>`;
  const ids = legalIds(seller);

  return page(
    `${FR.invoice} ${number}`,
    seller,
    `<div class="header">${brand(seller)}<div class="meta"><h1>${FR.invoice}</h1>
<p>${FR.number} <strong>${escape(number)}</strong></p>
<p>${FR.date} : ${escape(formatDate(order.createdAt, seller.timezone))}</p>
<p>${FR.order} ${FR.number} ${order.displayId}</p></div></div>
<div class="parties">
<div class="party"><h2>${FR.seller}</h2>${sellerLines(seller)}${ids ? `<p class="ids">${ids}</p>` : ""}</div>
<div class="party"><h2>${FR.customer}</h2>${customerLines(order)}</div>
</div>
<table><thead><tr><th>${FR.designation}</th><th class="num">${FR.quantity}</th><th class="num">${FR.unitPrice}</th><th class="num">${FR.lineTotal}</th></tr></thead>
<tbody>${rows}${shippingRow}</tbody></table>
<table class="totals">${totals}</table>
<div class="words">${FR.amountInWords} : <strong>${escape(amountToFrenchWords(order.total, order.currency))}</strong>.</div>
<p>${FR.payment}</p>
<footer>${seller.footer ? `<p>${auto(seller.footer)}</p>` : ""}<p>${auto(seller.legalName || seller.storeName)}${ids ? ` · ${ids}` : ""}</p></footer>`,
  );
}

/** Delivery note (bon de livraison) for the courier: recipient, items, amount to collect. */
export function buildDeliveryNoteHtml(order: DocumentOrder, seller: DocumentSeller): string {
  const number = `BL-${String(order.displayId).padStart(6, "0")}`;
  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${auto(item.title)}${item.variant ? `<div class="variant">${auto(item.variant)}</div>` : ""}</td><td class="num">${item.quantity}</td></tr>`,
    )
    .join("");
  return page(
    `${FR.deliveryNote} ${number}`,
    seller,
    `<div class="header">${brand(seller)}<div class="meta"><h1>${FR.deliveryNote}</h1>
<p>${FR.number} <strong>${escape(number)}</strong></p>
<p>${FR.date} : ${escape(formatDate(order.createdAt, seller.timezone))}</p>
<p>${FR.order} ${FR.number} ${order.displayId}</p></div></div>
<div class="parties">
<div class="party"><h2>${FR.from}</h2>${sellerLines(seller)}</div>
<div class="party"><h2>${FR.shipTo}</h2><p><strong>${auto(order.customerName)}</strong></p>
<p class="phone" dir="ltr">${escape(order.customerPhone)}</p>
${order.address && order.address !== order.cityName ? `<p>${auto(order.address)}</p>` : ""}
<p><strong>${auto(order.cityName)}</strong></p></div>
</div>
<table><thead><tr><th>${FR.designation}</th><th class="num">${FR.quantity}</th></tr></thead><tbody>${rows}</tbody></table>
<div class="collect"><span>${FR.toCollect}</span><span>${escape(money(order.total, order.currency))}</span></div>
${order.note ? `<p><strong>${FR.note} :</strong> ${auto(order.note)}</p>` : ""}
<div class="signatures"><div>${FR.courierSignature}</div><div>${FR.customerSignature}</div></div>`,
  );
}
