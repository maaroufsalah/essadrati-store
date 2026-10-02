import { MessageCircle } from "lucide-react";

/**
 * Floating WhatsApp button, bottom end corner, above the iOS safe area and
 * above the product page sticky bar on phones.
 */
export function FloatingWhatsApp({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="bg-success text-bg shadow-card fixed end-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full transition-transform hover:scale-105 md:bottom-6"
    >
      <MessageCircle className="size-7" aria-hidden />
    </a>
  );
}
