"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { SummerEventMapPoint } from "@/lib/summer-event-locations";

const SummerEventMap = dynamic(() => import("./SummerEventMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[420px] place-items-center rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-sky-50 p-8 text-center sm:h-[500px]">
      <div>
        <p className="text-3xl" aria-hidden>
          🗺️
        </p>
        <p className="mt-2 text-sm font-bold text-slate-600">
          地図を読み込んでいます…
        </p>
      </div>
    </div>
  ),
});

interface Props {
  points: SummerEventMapPoint[];
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SummerEventMapErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // The event explorer is intentionally independent from the optional map.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950"
        >
          <p className="font-bold">地図を読み込めませんでした。</p>
          <p className="mt-2 leading-relaxed">
            イベント一覧は通常どおり利用できます。下の条件検索からお探しください。
          </p>
          <a
            href="#summer-filters"
            className="mt-3 inline-flex min-h-10 items-center font-bold text-indigo-700 underline underline-offset-4"
          >
            イベント一覧へ移動する ↓
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function SummerEventMapClient({ points }: Props) {
  return (
    <SummerEventMapErrorBoundary>
      <SummerEventMap points={points} />
    </SummerEventMapErrorBoundary>
  );
}
