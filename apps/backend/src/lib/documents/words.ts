const UNITS = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

/** 0..99, French rules (soixante-dix, quatre-vingts, et un). */
function belowHundred(n: number, final: boolean): string {
  if (n < 20) return UNITS[n] ?? "";
  if (n < 70) {
    const ten = TENS[Math.floor(n / 10)] ?? "";
    const unit = n % 10;
    if (unit === 0) return ten;
    return unit === 1 ? `${ten} et un` : `${ten}-${UNITS[unit]}`;
  }
  if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${belowHundred(n - 60, final)}`;
  if (n === 80) return final ? "quatre-vingts" : "quatre-vingt";
  return `quatre-vingt-${belowHundred(n - 80, final)}`;
}

/** 0..999. `final`: last group of the number (plural "cents", "quatre-vingts"). */
function belowThousand(n: number, final: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) {
    const plural = final && rest === 0 && hundreds > 1;
    parts.push(hundreds === 1 ? "cent" : `${UNITS[hundreds]} cent${plural ? "s" : ""}`);
  }
  if (rest > 0 || hundreds === 0) parts.push(belowHundred(rest, final));
  return parts.join(" ");
}

/** Integer in French words: 1980 -> "mille neuf cent quatre-vingts". */
export function integerToFrenchWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "zéro";
  const groups: [number, string, string][] = [
    [1_000_000_000, "milliard", "milliards"],
    [1_000_000, "million", "millions"],
  ];
  const parts: string[] = [];
  let rest = n;
  for (const [size, singular, plural] of groups) {
    const count = Math.floor(rest / size);
    if (count > 0) {
      parts.push(`${belowThousand(count, false)} ${count > 1 ? plural : singular}`);
      rest %= size;
    }
  }
  const thousands = Math.floor(rest / 1000);
  if (thousands > 0)
    parts.push(thousands === 1 ? "mille" : `${belowThousand(thousands, false)} mille`);
  const units = rest % 1000;
  if (units > 0) parts.push(belowThousand(units, true));
  return parts.join(" ");
}

/**
 * Amount in French words for "Arrêtée la présente facture à la somme de":
 * 330.5 MAD -> "trois cent trente dirhams et cinquante centimes".
 */
export function amountToFrenchWords(amount: number, currency: string): string {
  const cents = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  const isMad = currency.toUpperCase() === "MAD";
  const unit = isMad ? (whole > 1 ? "dirhams" : "dirham") : currency.toUpperCase();
  const text = `${integerToFrenchWords(whole)} ${unit}`;
  if (fraction === 0) return text;
  const sub = isMad ? (fraction > 1 ? "centimes" : "centime") : "centimes";
  return `${text} et ${integerToFrenchWords(fraction)} ${sub}`;
}
