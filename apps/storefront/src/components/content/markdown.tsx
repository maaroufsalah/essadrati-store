import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Internal links ("/faq") stay in the current locale; external ones open in a new tab. */
const components: Components = {
  a: ({ href = "", children }) =>
    href.startsWith("/") ? (
      <Link href={href}>{children}</Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

/**
 * CMS Markdown with the theme typography. Raw HTML is never rendered
 * (react-markdown default), so admin content cannot inject scripts.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "text-fg max-w-prose text-base leading-relaxed",
        "[&_h2]:font-display [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold",
        "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold",
        "[&_p]:my-4 [&_strong]:font-semibold",
        "[&_li]:my-1.5 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:ps-6",
        "[&_a]:text-primary [&_a:hover]:text-accent [&_a]:underline [&_a]:underline-offset-4",
        "[&_blockquote]:border-accent [&_blockquote]:text-muted-fg [&_blockquote]:my-6 [&_blockquote]:border-s-4 [&_blockquote]:ps-4 [&_blockquote]:italic",
        "[&_hr]:border-border [&_hr]:my-8 [&>:first-child]:mt-0",
        "[&_td]:border-border [&_th]:border-border [&_table]:my-6 [&_table]:w-full [&_table]:text-sm [&_td]:border-b [&_td]:p-2 [&_th]:border-b-2 [&_th]:p-2 [&_th]:text-start",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
