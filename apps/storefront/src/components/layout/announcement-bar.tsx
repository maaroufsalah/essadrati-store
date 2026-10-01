import { Link } from "@/i18n/navigation";

interface AnnouncementBarProps {
  text: string;
  href: string | null;
}

/** Thin bar above the header, from StoreSettings.marketing.announcementBar. */
export function AnnouncementBar({ text, href }: AnnouncementBarProps) {
  const content = <span className="line-clamp-2">{text}</span>;
  const className = "block bg-primary px-4 py-2 text-center text-sm font-medium text-primary-fg";

  if (!href) return <div className={className}>{content}</div>;
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={`${className} hover:underline`}>
        {content}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={`${className} hover:underline`}
      rel="noopener noreferrer"
      target="_blank"
    >
      {content}
    </a>
  );
}
