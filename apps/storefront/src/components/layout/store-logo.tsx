import type { MediaRef } from "@nocido/types";
import Image from "next/image";

interface StoreLogoProps {
  name: string;
  light: MediaRef | null;
  dark: MediaRef | null;
}

const LOGO_HEIGHT = 40;

function LogoImage({ media, className }: { media: MediaRef; className?: string }) {
  const ratio = media.width && media.height ? media.width / media.height : 3;
  return (
    <Image
      src={media.url}
      alt=""
      width={Math.round(LOGO_HEIGHT * ratio)}
      height={LOGO_HEIGHT}
      className={className}
      priority
    />
  );
}

/**
 * Logo from StoreSettings, with a dark-mode variant when one is uploaded.
 * The store name stays the accessible label; without any logo it is shown
 * as text in the display font.
 */
export function StoreLogo({ name, light, dark }: StoreLogoProps) {
  if (!light && !dark) {
    return <span className="font-display text-fg text-xl font-bold sm:text-2xl">{name}</span>;
  }
  return (
    <>
      <span className="sr-only">{name}</span>
      {light ? (
        <LogoImage media={light} className={dark ? "h-10 w-auto dark:hidden" : "h-10 w-auto"} />
      ) : null}
      {dark ? (
        <LogoImage
          media={dark}
          className={light ? "hidden h-10 w-auto dark:block" : "h-10 w-auto"}
        />
      ) : null}
    </>
  );
}
