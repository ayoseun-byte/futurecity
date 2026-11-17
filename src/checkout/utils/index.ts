type FormatType =
  | "titleCase"
  | "sentenceCase"
  | "lowerCase"
  | "upperCase"
  | "camelCase"
  | "kebabCase"
  | "snakeCase"
  | "clipStart"
  | "clipEnd"
  | "clip";

type ClipLength = number | [number, number];

/**
 * Formats text according to the specified format type
 * @param input - The input string to format
 * @param format - The format type to apply
 * @param clipLength - Length for clipping (single number for start/end, tuple for middle clip)
 * @returns Formatted string
 */
export function formatText(
  input: string,
  format: FormatType = "titleCase",
  clipLength: ClipLength = 4,
): string {
  if (!input || typeof input !== "string") return "";

  // Extract words from various formats (camelCase, snake_case, kebab-case, etc.)
  const toWords = (text: string): string[] =>
    text
      .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase to space
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Handle acronyms (XMLParser → XML Parser)
      .replace(/[_\-]+/g, " ") // underscores/dashes to space
      .replace(/\s+/g, " ") // normalize multiple spaces
      .trim()
      .split(" ")
      .filter(Boolean); // remove empty strings

  const words = toWords(input);

  switch (format) {
    case "titleCase": {
      // Articles, conjunctions, and short prepositions that shouldn't be capitalized (except first word)
      const lowercaseWords = new Set([
        "a",
        "an",
        "the",
        "and",
        "but",
        "or",
        "for",
        "nor",
        "on",
        "at",
        "to",
        "by",
        "in",
        "of",
      ]);

      return words
        .map((word, index) => {
          const lower = word.toLowerCase();
          // Always capitalize first and last word, or if not in lowercase set
          if (
            index === 0 ||
            index === words.length - 1 ||
            !lowercaseWords.has(lower)
          ) {
            return word.charAt(0).toUpperCase() + lower.slice(1);
          }
          return lower;
        })
        .join(" ");
    }

    case "sentenceCase": {
      if (words.length === 0) return "";
      const lower = words.map((w) => w.toLowerCase());
      return (
        lower[0].charAt(0).toUpperCase() +
        lower[0].slice(1) +
        (lower.length > 1 ? " " + lower.slice(1).join(" ") : "")
      );
    }

    case "lowerCase":
      return words.map((w) => w.toLowerCase()).join(" ");

    case "upperCase":
      return words.map((w) => w.toUpperCase()).join(" ");

    case "camelCase": {
      const lower = words.map((w) => w.toLowerCase());
      return (
        lower[0] +
        lower
          .slice(1)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join("")
      );
    }

    case "kebabCase":
      return words.map((w) => w.toLowerCase()).join("-");

    case "snakeCase":
      return words.map((w) => w.toLowerCase()).join("_");

    case "clipStart": {
      if (typeof clipLength !== "number" || clipLength < 0) {
        console.warn("clipStart requires a positive number for clipLength");
        return input;
      }
      return input.length <= clipLength
        ? input
        : `…${input.slice(-clipLength)}`;
    }

    case "clipEnd": {
      if (typeof clipLength !== "number" || clipLength < 0) {
        console.warn("clipEnd requires a positive number for clipLength");
        return input;
      }
      return input.length <= clipLength
        ? input
        : `${input.slice(0, clipLength)}…`;
    }

    case "clip": {
      if (!Array.isArray(clipLength) || clipLength.length !== 2) {
        console.warn("clip requires a tuple [start, end] for clipLength");
        return input;
      }
      const [start, end] = clipLength;

      if (start < 0 || end < 0) {
        console.warn("clip lengths must be positive numbers");
        return input;
      }

      const totalClip = start + end;
      // Only clip if string is significantly longer than clips + ellipsis
      if (input.length <= totalClip + 3) return input;

      return `${input.slice(0, start)}…${input.slice(-end)}`;
    }

    default:
      // TypeScript exhaustiveness check
      format satisfies never;
      return input;
  }
}

export const formatAddress = (
  address: string,
  clipLength: ClipLength = [6, 3],
) => {
  return formatText(address, "clip", clipLength);
};

export function clipAmount(
  value: number | string,
  significantDigits = 3,
): string {
  if (value === undefined || value === null || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!isFinite(num) || num === 0) return "0";

  const magnitude = Math.floor(Math.log10(Math.abs(num)));
  const decimalPlaces =
    magnitude >= 0
      ? significantDigits
      : Math.abs(magnitude) - 1 + significantDigits;
  const factor = Math.pow(10, decimalPlaces);
  const truncated = Math.floor(Math.abs(num) * factor) / factor;
  const result = (num < 0 ? -truncated : truncated).toFixed(decimalPlaces);

  return result;
}

export * from "./pareseMetamaskError";
