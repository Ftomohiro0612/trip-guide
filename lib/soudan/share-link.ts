import { SERVICE } from "../config";
import { isPlausibleShareToken } from "./token";
import { isHttpUrl } from "./validation";

export function buildShareUrl(token: string, siteUrl = SERVICE.baseUrl): string {
  if (!isPlausibleShareToken(token)) throw new TypeError("Invalid share token format");
  if (!isHttpUrl(siteUrl)) throw new TypeError("Invalid site URL");
  return new URL(`/soudan/${token}`, siteUrl).toString();
}

/** Accept only the title and URL, so conditions and response text cannot be interpolated. */
export function buildWebShareData(title: string, url: string): ShareData {
  return { title, text: `${title}\n見るだけで登録は不要`, url };
}

export function buildLineShareUrl(title: string, url: string): string {
  const share = buildWebShareData(title, url);
  return `https://line.me/R/msg/text/?${encodeURIComponent(`${share.text}\n${url}`)}`;
}
