import Image from "next/image";
import Link from "next/link";

import logoDark from "@/assets/brand/logo-dark.svg";
import logoLight from "@/assets/brand/logo-light.svg";
import { brand } from "@/utils/brand";
import { cn } from "@/utils/styles";

import type { Route } from "next";

type LogoVariant = "icon" | "logo";
type LogoSize = "xs" | "sm" | "md" | "lg";

export type LogoProps = {
  /** `icon` renders the mark only, `logo` the mark and the wordmark. */
  variant?: LogoVariant,
  size?: LogoSize,
  href?: Route,
  className?: string
};

// Heights of the full lockup. The artwork has a transparent margin of 13% on
// each side, so the visible mark is about three quarters of this height.
const SIZE_CLASSES: Record<LogoSize, { lockup: string, mark: string }> = {
  xs: { lockup: "h-8", mark: "size-6" },
  sm: { lockup: "h-9", mark: "size-7" },
  md: { lockup: "h-12", mark: "size-9" },
  lg: { lockup: "h-16", mark: "size-12" },
};

/** The brand mark. It matches `src/app/icon.svg`. */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={cn("shrink-0", className)} viewBox="0 0 64 64">
      <rect fill="#5e31c9" height="64" rx="32" width="64" />
      <path
        // eslint-disable-next-line @stylistic/max-len -- path data cannot be wrapped
        d="M10.425 1.414L3.65 5.41A3.21 3.21 0 0 0 2 8.217v7.285a3.23 3.23 0 0 0 1.678 2.826l6.695 4.237c1.034.57 2.22.57 3.2.032l6.804-4.302c.98-.537 1.623-1.618 1.623-2.793V8.218l-.005-.204a3.22 3.22 0 0 0-1.284-2.39l-.107-.075l-.007-.007a1 1 0 0 0-.181-.133L13.64 1.414a3.33 3.33 0 0 0-3.216 0z"
        fill="#fff"
        transform="translate(17.28 17.28) scale(1.2267)"
      />
    </svg>
  );
}

function Logo({ className, href, size = "md", variant = "logo" }: LogoProps) {
  const sizes = SIZE_CLASSES[size];

  // The wordmark is drawn as outlines, so each theme gets its own file.
  const content = variant === "icon"
    ? <LogoMark className={sizes.mark} />
    : (
      <>
        <Image alt="" className={cn("w-auto dark:hidden", sizes.lockup)} src={logoLight} />
        <Image alt="" className={cn("hidden w-auto dark:block", sizes.lockup)} src={logoDark} />
      </>
    );

  // Pull the lockup's built-in margin back so it lines up with the content.
  const classes = cn("inline-flex items-center", variant === "logo" && "-ml-1", className);

  if (href) {
    return (
      <Link aria-label={brand.name} className={classes} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <div aria-label={brand.name} className={classes} role="img">
      {content}
    </div>
  );
}

export { Logo };
