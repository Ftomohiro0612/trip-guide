export function buildFacilityPhotoSearchUrl(name: string, address: string) {
  const query = encodeURIComponent(`${name} ${address}`);
  return `https://www.google.com/search?tbm=isch&q=${query}`;
}
