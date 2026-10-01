import {
  type Locale,
  type PublicStoreSettings,
  resolveLocalized,
  SOCIAL_NETWORKS,
  toWhatsAppNumber,
} from "@nocido/types";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

interface SiteFooterProps {
  settings: PublicStoreSettings;
  locale: Locale;
}

function ContactItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-muted-fg mt-0.5 [&_svg]:size-4">{icon}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/** Phone numbers are always written left to right, even in Arabic. */
function PhoneNumber({ e164 }: { e164: string }) {
  return (
    <bdi dir="ltr" className="tabular-nums">
      {e164}
    </bdi>
  );
}

export async function SiteFooter({ settings, locale }: SiteFooterProps) {
  const t = await getTranslations();
  const fallbacks = [settings.localization.defaultLocale];
  const text = (value: Parameters<typeof resolveLocalized>[0]) =>
    resolveLocalized(value, locale, fallbacks);

  const storeName = text(settings.identity.storeName);
  const tagline = text(settings.identity.tagline);
  const address = text(settings.contact.address);
  const openingHours = text(settings.contact.openingHours);
  const { phone, whatsapp, email, city, mapUrl, socials } = settings.contact;
  const networks = SOCIAL_NETWORKS.filter((network) => socials[network]);
  const { legalName, ice } = settings.billing;
  const linkClass = "text-fg underline-offset-4 hover:text-accent hover:underline";

  return (
    <footer className="border-border bg-muted/50 pb-safe mt-auto border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <p className="font-display text-fg text-xl font-bold">{storeName}</p>
          {tagline ? <p className="text-muted-fg max-w-xs text-sm">{tagline}</p> : null}
        </div>

        <div className="space-y-3">
          <h2 className="text-fg text-sm font-semibold">{t("footer.contact")}</h2>
          <ul className="space-y-3 text-sm">
            {phone ? (
              <ContactItem icon={<Phone aria-hidden />}>
                <a href={`tel:${phone}`} className={linkClass} aria-label={t("footer.phone")}>
                  <PhoneNumber e164={phone} />
                </a>
              </ContactItem>
            ) : null}
            {whatsapp ? (
              <ContactItem icon={<MessageCircle aria-hidden />}>
                <a
                  href={`https://wa.me/${toWhatsAppNumber(whatsapp)}`}
                  className={linkClass}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {t("footer.whatsapp")} <PhoneNumber e164={whatsapp} />
                </a>
              </ContactItem>
            ) : null}
            {email ? (
              <ContactItem icon={<Mail aria-hidden />}>
                <a href={`mailto:${email}`} className={linkClass} aria-label={t("footer.email")}>
                  <bdi dir="ltr">{email}</bdi>
                </a>
              </ContactItem>
            ) : null}
            {address || city ? (
              <ContactItem icon={<MapPin aria-hidden />}>
                {mapUrl ? (
                  <a href={mapUrl} className={linkClass} rel="noopener noreferrer" target="_blank">
                    {[address, city].filter(Boolean).join(", ")}
                  </a>
                ) : (
                  [address, city].filter(Boolean).join(", ")
                )}
              </ContactItem>
            ) : null}
            {openingHours ? (
              <ContactItem icon={<Clock aria-hidden />}>
                <span className="sr-only">{t("footer.openingHours")}</span>
                <span className="text-muted-fg whitespace-pre-line">{openingHours}</span>
              </ContactItem>
            ) : null}
          </ul>
        </div>

        {networks.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-fg text-sm font-semibold">{t("footer.followUs")}</h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {networks.map((network) => (
                <li key={network}>
                  <a
                    href={socials[network] ?? undefined}
                    className={linkClass}
                    rel="noopener noreferrer me"
                    target="_blank"
                  >
                    {t(`social.${network}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="border-border border-t">
        <div className="text-muted-fg mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-xs sm:flex-row sm:justify-between sm:px-6">
          <p>
            {t("footer.rights", {
              year: new Date().getFullYear(),
              storeName: legalName || storeName,
            })}
          </p>
          {ice ? <p>{t("footer.ice", { ice })}</p> : null}
        </div>
      </div>
    </footer>
  );
}
