import { existsSync } from "node:fs";

/** Turns a complete HTML document into a PDF. Implementations can be swapped. */
export interface PdfRenderer {
  readonly name: string;
  render(html: string): Promise<Buffer>;
}

export class PdfRendererUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfRendererUnavailableError";
  }
}

/** Usual Chromium locations: Docker (Alpine/Debian), then Windows and macOS dev machines. */
const BROWSER_CANDIDATES = [
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

function browserPath(): string {
  const configured = process.env.PDF_BROWSER_PATH?.trim();
  if (configured) return configured;
  const found = BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) throw new PdfRendererUnavailableError("pdf.browserNotFound");
  return found;
}

/**
 * Headless Chromium through puppeteer-core: real text shaping, so Arabic
 * names are joined and ordered correctly. One browser per document (admin
 * usage is occasional; nothing stays in memory).
 * PDF_BROWSER_PATH overrides the browser; PDF_BROWSER_NO_SANDBOX=true is for
 * containers without user namespaces.
 */
export const chromiumRenderer: PdfRenderer = {
  name: "chromium",
  async render(html) {
    const { launch } = await import("puppeteer-core");
    const browser = await launch({
      executablePath: browserPath(),
      headless: true,
      args:
        process.env.PDF_BROWSER_NO_SANDBOX === "true"
          ? ["--no-sandbox", "--disable-dev-shm-usage"]
          : ["--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage();
      // Remote images (logo) may load; scripts never run in documents.
      await page.setJavaScriptEnabled(false);
      await page.setContent(html, { waitUntil: "load", timeout: 20_000 });
      const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  },
};

export function pdfRenderer(): PdfRenderer {
  return chromiumRenderer;
}
