import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRssSearchItems } from '../liveWebSearch';

test('parseRssSearchItems extracts titles, sources, formatted dates, and deduplicates URLs', () => {
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <item>
        <title>FTC Takes Action Against Subscription Traps &amp; Drip Pricing - Federal Trade Commission</title>
        <link>https://www.ftc.gov/news-events/news/press-releases/2026/05/subscription-rule</link>
        <pubDate>Wed, 18 Nov 2026 09:00:00 GMT</pubDate>
        <source url="https://www.ftc.gov">Federal Trade Commission</source>
      </item>
      <item>
        <title><![CDATA[Digital Fairness Act Targets 'Dark Patterns' - Pinsent Masons]]></title>
        <link>https://www.pinsentmasons.com/out-law/news/digital-fairness-act</link>
        <pubDate>Mon, 16 Nov 2026 12:00:00 GMT</pubDate>
      </item>
      <item>
        <title>Duplicate URL Item - Example</title>
        <link>https://www.ftc.gov/news-events/news/press-releases/2026/05/subscription-rule</link>
        <pubDate>Tue, 17 Nov 2026 10:00:00 GMT</pubDate>
      </item>
      <item>
        <title>Invalid Javascript Link</title>
        <link>javascript:alert(1)</link>
        <pubDate>Tue, 17 Nov 2026 10:00:00 GMT</pubDate>
      </item>
    </channel>
  </rss>`;

  const items = parseRssSearchItems(sampleXml, 5);
  assert.equal(items.length, 2);

  assert.equal(items[0].title, 'FTC Takes Action Against Subscription Traps & Drip Pricing');
  assert.equal(items[0].source, 'Federal Trade Commission');
  assert.equal(
    items[0].url,
    'https://www.ftc.gov/news-events/news/press-releases/2026/05/subscription-rule'
  );
  assert.match(items[0].publishedDate, /Nov\s+18,\s+2026/);

  assert.equal(items[1].title, "Digital Fairness Act Targets 'Dark Patterns'");
  assert.equal(items[1].source, 'Pinsent Masons');
});

test('parseRssSearchItems handles empty or invalid XML safely', () => {
  assert.deepEqual(parseRssSearchItems(''), []);
  assert.deepEqual(parseRssSearchItems('<rss></rss>'), []);
});
