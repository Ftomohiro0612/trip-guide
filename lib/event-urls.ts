export function isPdfOfficialUrl(url: string): boolean {
  return url.split(/[?#]/, 1)[0].toLowerCase().endsWith(".pdf");
}
