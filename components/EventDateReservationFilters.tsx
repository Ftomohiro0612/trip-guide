"use client";

import {
  getEventDateFilterError,
  type EventDatePreset,
  type EventDateRange,
  type EventReservationFilter,
} from "@/lib/event-filter";

interface EventDateReservationFiltersProps {
  dateRange: EventDateRange;
  datePreset: EventDatePreset | null;
  onDateRangeChange: (range: EventDateRange) => void;
  onDatePresetChange: (preset: EventDatePreset | null) => void;
  onReservationChange: (reservation: EventReservationFilter | null) => void;
  reservation: EventReservationFilter | null;
  variant?: "default" | "summer";
}

const PRESETS: { id: EventDatePreset; label: string }[] = [
  { id: "weekend", label: "今週末" },
  { id: "month", label: "今月" },
];

const RESERVATIONS: { id: EventReservationFilter; label: string }[] = [
  { id: "required", label: "予約必要" },
  { id: "not_required", label: "予約不要" },
];

export default function EventDateReservationFilters({
  dateRange,
  datePreset,
  onDateRangeChange,
  onDatePresetChange,
  onReservationChange,
  reservation,
  variant = "default",
}: EventDateReservationFiltersProps) {
  const error = getEventDateFilterError(dateRange, datePreset);
  const activeClass =
    variant === "summer"
      ? "border-indigo-700 bg-indigo-700 text-white"
      : "border-brand bg-brand text-white";
  const hoverClass =
    variant === "summer"
      ? "hover:border-indigo-300 hover:text-indigo-700"
      : "hover:border-brand hover:text-brand";
  const errorId = `event-date-error-${variant}`;

  function updateDate(field: keyof EventDateRange, value: string) {
    onDatePresetChange(null);
    onDateRangeChange({ ...dateRange, [field]: value });
  }

  function togglePreset(preset: EventDatePreset) {
    const nextPreset = datePreset === preset ? null : preset;
    onDateRangeChange({ startDate: "", endDate: "" });
    onDatePresetChange(nextPreset);
  }

  return (
    <>
      <fieldset data-filter-group="date">
        <legend className="mb-2 text-xs font-bold text-slate-500">
          いつ行くか
        </legend>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            開始日
            <input
              type="date"
              value={dateRange.startDate}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              data-date-filter="start"
              onChange={(event) => updateDate("startDate", event.target.value)}
              className="min-h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-900"
            />
          </label>
          <span className="hidden pb-3 text-slate-400 sm:block" aria-hidden>
            〜
          </span>
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            終了日
            <input
              type="date"
              value={dateRange.endDate}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              data-date-filter="end"
              onChange={(event) => updateDate("endDate", event.target.value)}
              className="min-h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-900"
            />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-2" aria-label="日付プリセット">
          {PRESETS.map((preset) => (
            <FilterChoice
              key={preset.id}
              active={datePreset === preset.id}
              activeClass={activeClass}
              hoverClass={hoverClass}
              dataAttribute={`preset:${preset.id}`}
              onClick={() => togglePreset(preset.id)}
            >
              {preset.label}
            </FilterChoice>
          ))}
        </div>
        {error ? (
          <p
            id={errorId}
            role="alert"
            data-date-filter-error
            className="mt-2 text-sm font-bold text-red-600"
          >
            {error}
          </p>
        ) : null}
      </fieldset>

      <fieldset data-filter-group="reservation">
        <legend className="mb-2 text-xs font-bold text-slate-500">
          予約状況
        </legend>
        <div className="flex flex-wrap gap-2">
          {RESERVATIONS.map((option) => (
            <FilterChoice
              key={option.id}
              active={reservation === option.id}
              activeClass={activeClass}
              hoverClass={hoverClass}
              dataAttribute={`reservation:${option.id}`}
              onClick={() =>
                onReservationChange(
                  reservation === option.id ? null : option.id,
                )
              }
            >
              {option.label}
            </FilterChoice>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          未選択時は、予約状況が未確認のイベントも含めて表示します。
        </p>
      </fieldset>
    </>
  );
}

function FilterChoice({
  active,
  activeClass,
  children,
  dataAttribute,
  hoverClass,
  onClick,
}: {
  active: boolean;
  activeClass: string;
  children: React.ReactNode;
  dataAttribute: string;
  hoverClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-event-filter-control={dataAttribute}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-bold transition-colors ${
        active
          ? activeClass
          : `border-slate-200 bg-white text-slate-600 ${hoverClass}`
      }`}
    >
      {children}
    </button>
  );
}
