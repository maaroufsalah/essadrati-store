import type { Locale } from "@nocido/types";

/** Order notifications: the customer ones follow the COD lifecycle, `merchant` alerts the store. */
export const NOTIFICATION_KINDS = [
  "placed",
  "confirmed",
  "cancelled",
  "shipped",
  "delivered",
  "merchant",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

interface KindMessages {
  subject: string;
  heading: string;
  intro: string;
}

export interface NotificationMessages {
  kinds: Record<NotificationKind, KindMessages>;
  greeting: string;
  items: string;
  quantity: string;
  subtotal: string;
  shipping: string;
  free: string;
  total: string;
  deliveryTo: string;
  phone: string;
  customer: string;
  payment: string;
  track: string;
  openAdmin: string;
  help: string;
  whatsapp: string;
  /** Label separator: " : " in French, ": " otherwise. */
  colon: string;
}

/**
 * Kit wording of the order emails and WhatsApp messages. Store specific
 * content (name, logo, colors, contact, legal name) comes from StoreSettings.
 * Placeholders: {name}, {number}, {total}, {city}, {store}.
 */
export const NOTIFICATION_MESSAGES: Record<Locale, NotificationMessages> = {
  fr: {
    kinds: {
      placed: {
        subject: "Commande n° {number} reçue",
        heading: "Merci pour votre commande !",
        intro:
          "Nous avons bien reçu votre commande n° {number}. Nous vous appelons très vite pour la confirmer.",
      },
      confirmed: {
        subject: "Commande n° {number} confirmée",
        heading: "Votre commande est confirmée",
        intro: "Votre commande n° {number} est confirmée et en cours de préparation.",
      },
      cancelled: {
        subject: "Commande n° {number} annulée",
        heading: "Votre commande est annulée",
        intro: "Votre commande n° {number} a été annulée. Contactez-nous pour toute question.",
      },
      shipped: {
        subject: "Commande n° {number} expédiée",
        heading: "Votre commande est en route",
        intro:
          "Votre commande n° {number} est expédiée. Le livreur vous appellera avant de passer.",
      },
      delivered: {
        subject: "Commande n° {number} livrée",
        heading: "Votre commande est livrée",
        intro: "Votre commande n° {number} est livrée. Merci pour votre confiance !",
      },
      merchant: {
        subject: "Nouvelle commande n° {number} · {total}",
        heading: "Nouvelle commande",
        intro: "Commande n° {number} de {name}, livraison à {city}. À confirmer par téléphone.",
      },
    },
    greeting: "Bonjour {name},",
    items: "Articles",
    quantity: "Qté",
    subtotal: "Sous-total",
    shipping: "Livraison",
    free: "Gratuite",
    total: "Total à payer à la livraison",
    deliveryTo: "Livraison à",
    phone: "Téléphone",
    customer: "Client",
    payment: "Paiement en espèces à la livraison",
    track: "Suivre ma commande",
    openAdmin: "Ouvrir dans l'admin",
    help: "Une question ? Répondez à cet email ou contactez-nous.",
    whatsapp: "WhatsApp",
    colon: " : ",
  },
  en: {
    kinds: {
      placed: {
        subject: "Order #{number} received",
        heading: "Thank you for your order!",
        intro: "We received your order #{number}. We will call you shortly to confirm it.",
      },
      confirmed: {
        subject: "Order #{number} confirmed",
        heading: "Your order is confirmed",
        intro: "Your order #{number} is confirmed and being prepared.",
      },
      cancelled: {
        subject: "Order #{number} cancelled",
        heading: "Your order is cancelled",
        intro: "Your order #{number} was cancelled. Contact us with any question.",
      },
      shipped: {
        subject: "Order #{number} shipped",
        heading: "Your order is on its way",
        intro: "Your order #{number} has shipped. The courier will call you before coming.",
      },
      delivered: {
        subject: "Order #{number} delivered",
        heading: "Your order is delivered",
        intro: "Your order #{number} is delivered. Thank you for your trust!",
      },
      merchant: {
        subject: "New order #{number} · {total}",
        heading: "New order",
        intro: "Order #{number} from {name}, delivery to {city}. To confirm by phone.",
      },
    },
    greeting: "Hello {name},",
    items: "Items",
    quantity: "Qty",
    subtotal: "Subtotal",
    shipping: "Delivery",
    free: "Free",
    total: "Total to pay on delivery",
    deliveryTo: "Delivery to",
    phone: "Phone",
    customer: "Customer",
    payment: "Cash on delivery",
    track: "Track my order",
    openAdmin: "Open in the admin",
    help: "A question? Reply to this email or contact us.",
    whatsapp: "WhatsApp",
    colon: ": ",
  },
  ar: {
    kinds: {
      placed: {
        subject: "تم استلام الطلب رقم {number}",
        heading: "شكراً على طلبك!",
        intro: "توصلنا بطلبك رقم {number}. سنتصل بك قريباً لتأكيده.",
      },
      confirmed: {
        subject: "تم تأكيد الطلب رقم {number}",
        heading: "تم تأكيد طلبك",
        intro: "تم تأكيد طلبك رقم {number} وهو قيد التحضير.",
      },
      cancelled: {
        subject: "تم إلغاء الطلب رقم {number}",
        heading: "تم إلغاء طلبك",
        intro: "تم إلغاء طلبك رقم {number}. تواصل معنا لأي سؤال.",
      },
      shipped: {
        subject: "تم شحن الطلب رقم {number}",
        heading: "طلبك في الطريق",
        intro: "تم شحن طلبك رقم {number}. سيتصل بك عامل التوصيل قبل المرور.",
      },
      delivered: {
        subject: "تم تسليم الطلب رقم {number}",
        heading: "تم تسليم طلبك",
        intro: "تم تسليم طلبك رقم {number}. شكراً على ثقتك!",
      },
      merchant: {
        subject: "طلب جديد رقم {number} · {total}",
        heading: "طلب جديد",
        intro: "الطلب رقم {number} من {name}، التوصيل إلى {city}. يجب تأكيده بالهاتف.",
      },
    },
    greeting: "مرحباً {name}،",
    items: "المنتجات",
    quantity: "الكمية",
    subtotal: "المجموع الفرعي",
    shipping: "التوصيل",
    free: "مجاني",
    total: "المبلغ المستحق عند الاستلام",
    deliveryTo: "التوصيل إلى",
    phone: "الهاتف",
    customer: "الزبون",
    payment: "الدفع نقداً عند الاستلام",
    track: "تتبع طلبي",
    openAdmin: "فتح في لوحة التحكم",
    help: "لأي سؤال، رد على هذه الرسالة أو تواصل معنا.",
    whatsapp: "واتساب",
    colon: ": ",
  },
};

/** "{name}" placeholders; unknown ones stay as typed. */
export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
