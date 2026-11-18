import type { EslintMajor } from "./types";

type Version = [number, number, number];

function parseVersion(value: string): { version: Version, parts: number } | null {
  const segments = value.replace(/[-+].*$/, "").split(".");
  const numbers = segments.filter((segment) => !["x", "X", "*", ""].includes(segment)).map(Number);

  if (numbers.length === 0 || numbers.some((number) => !Number.isInteger(number))) {
    return null;
  }

  return { version: [numbers[0] ?? 0, numbers[1] ?? 0, numbers[2] ?? 0], parts: numbers.length };
}

function compare(a: Version, b: Version) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** Returns null for a comparator this small parser does not understand. */
function satisfies(version: Version, comparator: string): boolean | null {
  if (comparator === "*" || comparator === "x") {
    return true;
  }

  const match = /^(\^|~|>=|<=|>|<|=)?v?(.+)$/.exec(comparator);
  const parsed = match ? parseVersion(match[2] ?? "") : null;

  if (!match || !parsed) {
    return null;
  }

  const target = parsed.version;
  const order = compare(version, target);

  switch (match[1]) {
    case "^":
      return version[0] === target[0] && order >= 0;
    case "~":
      return version[0] === target[0] && (parsed.parts < 2 || version[1] === target[1]) && order >= 0;
    case ">=":
      return order >= 0;
    case ">":
      return order > 0;
    case "<=":
      return order <= 0;
    case "<":
      return order < 0;
    default:
      // A bare "9" or "9.1" matches every version with that prefix.
      return version.slice(0, parsed.parts).every((part, index) => part === target[index]);
  }
}

/**
 * Whether a `peerDependencies.eslint` range accepts some release of the given
 * ESLint major. Covers the comparators plugins use in practice; a range that
 * cannot be parsed counts as supported, so the UI never warns without evidence.
 */
export function rangeSupportsMajor(range: string | null, major: EslintMajor): boolean {
  if (!range) {
    return true;
  }

  const candidates: Version[] = [[major, 0, 0], [major, 999, 999]];

  return range.split("||").some((alternative) => {
    const comparators = alternative
      .trim()
      .replace(/(\^|~|>=|<=|>|<|=)\s+/g, "$1")
      .split(/\s+/)
      .filter(Boolean);

    if (comparators.length === 0) {
      return true;
    }

    return candidates.some((candidate) => comparators.every((comparator) => satisfies(candidate, comparator) ?? true));
  });
}
