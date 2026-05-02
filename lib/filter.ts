import type { Facility } from "@/types/facility";

export type SortKey = "recommend" | "prefecture" | "name";

export interface FilterParams {
  prefectures: string[];
  categories: string[];
  indoor: string[];
  rain: string[];
  fee: "free" | "paid" | "";
  tags: string[];
  q: string;
  sort: SortKey;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap((x) => x.split(",")).filter(Boolean);
  return v.split(",").filter(Boolean);
}

function asString(v: string | string[] | undefined): string {
  if (!v) return "";
  if (Array.isArray(v)) return v[0] ?? "";
  return v;
}

export function parseFilterParams(sp: RawSearchParams): FilterParams {
  const sortValue = asString(sp.sort);
  const sort: SortKey =
    sortValue === "prefecture" || sortValue === "name"
      ? sortValue
      : "recommend";
  const feeValue = asString(sp.fee);
  return {
    prefectures: asArray(sp.prefectures),
    categories: asArray(sp.categories),
    indoor: asArray(sp.indoor),
    rain: asArray(sp.rain),
    fee: feeValue === "free" || feeValue === "paid" ? feeValue : "",
    tags: asArray(sp.tags),
    q: asString(sp.q).trim(),
    sort,
  };
}

export function applyFilters(
  facilities: Facility[],
  filters: FilterParams,
): Facility[] {
  const q = filters.q.toLowerCase();
  const filtered = facilities.filter((f) => {
    if (
      filters.prefectures.length &&
      !filters.prefectures.includes(f.prefecture_id)
    ) {
      return false;
    }
    if (
      filters.categories.length &&
      !filters.categories.includes(f.category_id)
    ) {
      return false;
    }
    if (filters.indoor.length && !filters.indoor.includes(f.indoor_outdoor)) {
      return false;
    }
    if (filters.rain.length && !filters.rain.includes(f.rain_friendly)) {
      return false;
    }
    if (filters.fee === "free" && !f.is_free) return false;
    if (filters.fee === "paid" && f.is_free) return false;
    if (filters.tags.length) {
      const hasAll = filters.tags.every((t) => f.tags.includes(t as never));
      if (!hasAll) return false;
    }
    if (q) {
      const haystack = [
        f.name,
        f.address,
        f.description,
        f.category,
        f.prefecture,
        f.target_age,
        ...f.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return sortFacilities(filtered, filters.sort);
}

function sortFacilities(facilities: Facility[], sort: SortKey): Facility[] {
  const arr = [...facilities];
  if (sort === "name") {
    arr.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  } else if (sort === "prefecture") {
    arr.sort(
      (a, b) =>
        a.prefecture_id.localeCompare(b.prefecture_id) ||
        a.id - b.id,
    );
  } else {
    arr.sort((a, b) => {
      const score = (f: Facility) =>
        (f.rain_friendly === "◎" ? 2 : f.rain_friendly === "△" ? 1 : 0) +
        (f.is_free ? 1 : 0);
      return score(b) - score(a) || a.id - b.id;
    });
  }
  return arr;
}

export function hasActiveFilters(f: FilterParams): boolean {
  return (
    f.prefectures.length > 0 ||
    f.categories.length > 0 ||
    f.indoor.length > 0 ||
    f.rain.length > 0 ||
    f.fee !== "" ||
    f.tags.length > 0 ||
    f.q !== ""
  );
}

export function buildQueryString(f: FilterParams): string {
  const params = new URLSearchParams();
  if (f.prefectures.length) params.set("prefectures", f.prefectures.join(","));
  if (f.categories.length) params.set("categories", f.categories.join(","));
  if (f.indoor.length) params.set("indoor", f.indoor.join(","));
  if (f.rain.length) params.set("rain", f.rain.join(","));
  if (f.fee) params.set("fee", f.fee);
  if (f.tags.length) params.set("tags", f.tags.join(","));
  if (f.q) params.set("q", f.q);
  if (f.sort !== "recommend") params.set("sort", f.sort);
  const s = params.toString();
  return s ? `?${s}` : "";
}
