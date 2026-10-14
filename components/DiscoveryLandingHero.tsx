import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

interface Props {
  imageSrc?: string;
  breadcrumb: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
}

export default function DiscoveryLandingHero({
  imageSrc,
  breadcrumb,
  eyebrow,
  title,
  description,
  icon,
}: Props) {
  return (
    <section
      className="relative h-40 overflow-hidden bg-slate-800 text-white sm:h-64"
      data-discovery-hero
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt=""
          width={1600}
          height={640}
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-slate-900/10" />
      <div className="relative mx-auto flex h-full max-w-5xl flex-col px-4 py-3 sm:py-7">
        <nav aria-label="パンくず" className="mb-2 text-xs text-white/90 sm:mb-4">
          <Link href="/" className="hover:underline">
            ホーム
          </Link>
          <span className="mx-1.5">/</span>
          <span>{breadcrumb}</span>
        </nav>
        <div className="flex min-h-0 items-start gap-3 sm:gap-4">
          {icon}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/95">{eyebrow}</p>
            <h1 className="mt-0.5 line-clamp-2 text-xl font-bold tracking-tight drop-shadow sm:mt-1 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-1 line-clamp-1 max-w-2xl text-xs leading-5 text-white/95 sm:mt-3 sm:line-clamp-2 sm:text-base">
              {description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
