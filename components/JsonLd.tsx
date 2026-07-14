interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  baseUrl?: string;
}

export function BreadcrumbJsonLd({
  items,
  baseUrl = "https://trip-guide.net",
}: BreadcrumbProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href && { item: `${baseUrl}${item.href}` }),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonStringify(data) }}
    />
  );
}

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonStringify(data) }}
    />
  );
}

interface ItemListItem {
  name: string;
  href: string;
}

interface ItemListProps {
  name: string;
  items: ItemListItem[];
  baseUrl?: string;
}

export function ItemListJsonLd({
  name,
  items,
  baseUrl = "https://trip-guide.net",
}: ItemListProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${baseUrl}${it.href}`,
      name: it.name,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonStringify(data) }}
    />
  );
}

function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value).replace(/</gu, "\\u003c");
}
