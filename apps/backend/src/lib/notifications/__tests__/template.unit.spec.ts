import { describe, expect, it } from "vitest";
import { interpolate, NOTIFICATION_KINDS, NOTIFICATION_MESSAGES } from "../messages";
import {
  type NotificationBranding,
  type NotificationOrder,
  renderOrderEmail,
  renderWhatsAppText,
} from "../template";

const order: NotificationOrder = {
  id: "order_01",
  displayId: 42,
  locale: "fr",
  currency: "mad",
  email: "client@example.test",
  fullName: "Fatima Zahra <script>",
  phone: "+212612345678",
  cityName: "Rabat",
  items: [{ title: "Miel & amlou", variant: "500g", quantity: 2, total: 600 }],
  itemTotal: 600,
  shippingTotal: 0,
  total: 600,
};

const branding: NotificationBranding = {
  storeName: "Boutique",
  logoUrl: null,
  legalName: "Boutique SARL",
  numberingSystem: "latn",
  colors: {
    bg: "#ffffff",
    card: "#ffffff",
    cardFg: "#111111",
    primary: "#222222",
    primaryFg: "#ffffff",
    mutedFg: "#555555",
    border: "#dddddd",
  },
  contact: { phone: "+212522000000", whatsapp: null, email: "contact@example.test" },
};

const links = {
  track: "https://shop.test/fr/order/order_01",
  admin: "https://admin.test/orders/order_01",
};

describe("order emails", () => {
  it("renders the confirmation in the order language", () => {
    const email = renderOrderEmail("placed", order, branding, links);
    expect(email.subject).toBe("Commande n° 42 reçue · Boutique");
    expect(email.html).toContain('lang="fr" dir="ltr"');
    expect(email.html).toContain("Bonjour Fatima,");
    expect(email.html).toContain(links.track);
    expect(email.text).toContain("Total à payer à la livraison : 600");
  });

  it("escapes customer and catalog text", () => {
    const html = renderOrderEmail("merchant", order, branding, links).html;
    expect(html).toContain("Fatima Zahra &lt;script&gt;");
    expect(html).toContain("Miel &amp; amlou");
    expect(html).not.toContain("<script>");
  });

  it("links the merchant alert to the admin", () => {
    const email = renderOrderEmail("merchant", order, branding, links);
    expect(email.subject).toContain("Nouvelle commande n° 42");
    expect(email.html).toContain(links.admin);
    expect(email.html).not.toContain(links.track);
  });

  it("goes right to left in Arabic", () => {
    const email = renderOrderEmail("shipped", { ...order, locale: "ar" }, branding, links);
    expect(email.html).toContain('lang="ar" dir="rtl"');
    expect(email.subject).toContain("تم شحن الطلب رقم 42");
  });

  it("builds the WhatsApp text", () => {
    expect(renderWhatsAppText("confirmed", order, branding, links.track)).toContain(
      "Votre commande n° 42 est confirmée",
    );
  });
});

describe("notification messages", () => {
  it("define every kind in every language with the same placeholders", () => {
    const placeholders = (value: string) =>
      [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const kind of NOTIFICATION_KINDS) {
      const reference = NOTIFICATION_MESSAGES.fr.kinds[kind];
      for (const locale of ["en", "ar"] as const) {
        const other = NOTIFICATION_MESSAGES[locale].kinds[kind];
        expect(placeholders(other.subject)).toEqual(placeholders(reference.subject));
        expect(placeholders(other.intro)).toEqual(placeholders(reference.intro));
      }
    }
  });

  it("keeps unknown placeholders", () => {
    expect(interpolate("{a} {b}", { a: "1" })).toBe("1 {b}");
  });
});
