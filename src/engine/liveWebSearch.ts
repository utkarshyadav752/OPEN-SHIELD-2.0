export interface LiveWebSearchItem {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPubDate(rawDate: string): string {
  if (!rawDate) return 'Recent';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return rawDate.slice(0, 24);
  }
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function parseRssSearchItems(xml: string, maxItems = 8): LiveWebSearchItem[] {
  if (!xml || typeof xml !== 'string') return [];

  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  const seenUrls = new Set<string>();
  const results: LiveWebSearchItem[] = [];

  for (const itemXml of itemMatches) {
    if (results.length >= maxItems) break;

    const rawTitleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    const rawLinkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const rawDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const rawSourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

    let title = decodeXmlEntities(rawTitleMatch?.[1] || '');
    const url = decodeXmlEntities(rawLinkMatch?.[1] || '');
    let source = decodeXmlEntities(rawSourceMatch?.[1] || '');
    const publishedDate = formatPubDate(decodeXmlEntities(rawDateMatch?.[1] || ''));

    if (!title || !/^https?:\/\//i.test(url)) continue;
    if (seenUrls.has(url)) continue;

    // Google News RSS titles typically end with " - Publisher"
    const lastDashIdx = title.lastIndexOf(' - ');
    if (lastDashIdx > 15) {
      const inferredSource = title.slice(lastDashIdx + 3).trim();
      if (!source && inferredSource) {
        source = inferredSource;
      }
      title = title.slice(0, lastDashIdx).trim();
    }

    if (!source) {
      try {
        source = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        source = 'Web News';
      }
    }

    seenUrls.add(url);
    results.push({
      title,
      url,
      source,
      publishedDate,
    });
  }

  return results;
}

export async function fetchLiveWebNews(
  query: string,
  maxItems = 8
): Promise<LiveWebSearchItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const endpoint = `https://news.google.com/rss/search?q=${encodeURIComponent(
    cleanQuery
  )}&hl=en-US&gl=US&ceid=US:en`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'OpenShield-Consumer-Auditor/1.0 (+https://openshield.org)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssSearchItems(xml, maxItems);
  } catch {
    clearTimeout(timer);
    return [];
  }
}
