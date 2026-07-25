// Sub-Store script operation for sing-box on iOS.
// Primary subscription:
//   sfi-substore.js#type=0&name=airport#noCache
// Optional landing subscription:
//   sfi-substore.js#type=0&name=airport&landing_name=landing&landing_type=0#noCache
// type=0 selects a subscription. type=1, col, or collection selects a collection.

const args = $arguments || {};
const {
  type = '0',
  name = 'airport',
  landing_name = '',
  landing_type = '0',
} = args;

const REGION_PATTERNS = {
  HK: /hong\s*kong|(?:^|[^a-z])hkg?(?:\d+)?(?:[^a-z]|$)/i,
  TW: /tai\s*wan|taiwan|(?:^|[^a-z])tw(?:\d+)?(?:[^a-z]|$)/i,
  SG: /singapore|(?:^|[^a-z])sg(?:\d+)?(?:[^a-z]|$)/i,
  US: /united\s*states|america|(?:^|[^a-z])usa?(?:\d+)?(?:[^a-z]|$)/i,
  JP: /japan|tokyo|(?:^|[^a-z])jp(?:\d+)?(?:[^a-z]|$)/i,
  DE: /germany|frankfurt|(?:^|[^a-z])de(?:\d+)?(?:[^a-z]|$)/i,
};

const CHAIN_ENTRY_PATTERNS = [
  { label: 'IEPL', pattern: /(?:^|[^a-z])iepl(?:[^a-z]|$)/i },
  { label: 'IPLC', pattern: /(?:^|[^a-z])iplc(?:[^a-z]|$)/i },
];

const TAG_REPLACEMENTS = [
  [/\u9999\u6e2f|\u{1F1ED}\u{1F1F0}/gu, ' HK '],
  [/\u53f0\u6e7e|\u81fa\u7063|\u53f0\u7063|\u{1F1F9}\u{1F1FC}/gu, ' TW '],
  [/\u65b0\u52a0\u5761|\u72ee\u57ce|\u7345\u57ce|\u{1F1F8}\u{1F1EC}/gu, ' SG '],
  [/\u7f8e\u56fd|\u7f8e\u570b|\u7f8e\u897f|\u7f8e\u4e1c|\u7f8e\u6771|\u{1F1FA}\u{1F1F8}/gu, ' US '],
  [/\u65e5\u672c|\u4e1c\u4eac|\u6771\u4eac|\u{1F1EF}\u{1F1F5}/gu, ' JP '],
  [/\u5fb7\u56fd|\u5fb7\u570b|\u6cd5\u5170\u514b\u798f|\u6cd5\u862d\u514b\u798f|\u{1F1E9}\u{1F1EA}/gu, ' DE '],
  [/\u514d\u8d39|\u514d\u8cbb/gu, ' FREE '],
];

const CHAIN_REGIONS = ['HK', 'TW', 'SG', 'US', 'JP'];
const BASE_TAGS = new Set(['DIRECT']);
const POLICY_TAGS = new Set([
  'PROXY', 'GLOBAL', 'YOUTUBE', 'AI', 'EMBY', 'SPEEDTEST',
  'HK', 'TW', 'SG', 'US', 'JP', 'DE', 'OTHERS',
]);
const RESERVED_TAGS = new Set([
  ...POLICY_TAGS,
  ...BASE_TAGS,
  'ts-ep',
]);

const config = (ProxyUtils.JSON5 || JSON).parse($content || $files[0]);
const usedTags = new Set(RESERVED_TAGS);

const primaryRaw = await produceArtifact({
  type: artifactType(type),
  name,
  platform: 'sing-box',
  produceType: 'internal',
});

const primaryProxies = sortFreeLast(
  normalizeProxyList(
    (primaryRaw || []).filter((proxy) => proxy && proxy.tag && !/warp|cloudflare/i.test(proxy.tag)),
    usedTags,
  ),
);

let landingProxies = [];
if (landing_name) {
  const landingRaw = await produceArtifact({
    type: artifactType(landing_type),
    name: landing_name,
    platform: 'sing-box',
    produceType: 'internal',
  });
  landingProxies = normalizeProxyList(
    (landingRaw || []).filter((proxy) => proxy && proxy.tag),
    usedTags,
  );
}

const topology = buildDetourTopology(primaryProxies, landingProxies, usedTags);
replaceGeneratedOutbounds(config, topology.visible.concat(topology.support));
fillPolicyGroups(config, topology.visible);

$content = JSON.stringify(config, null, 2);

function artifactType(value) {
  return /^1$|col|collection/i.test(String(value)) ? 'collection' : 'subscription';
}

function buildDetourTopology(primary, landing, usedTags) {
  if (!landing.length) return { visible: primary, support: [] };

  const landingByRegion = Object.fromEntries(CHAIN_REGIONS.map((region) => [region, []]));
  for (const proxy of landing) {
    const region = matchRegion(proxy.tag, CHAIN_REGIONS);
    if (region) landingByRegion[region].push(proxy);
  }

  const visible = [];
  const support = new Map();
  for (const proxy of primary) {
    const entryLabel = matchChainEntry(proxy.tag);
    const region = matchRegion(proxy.tag, CHAIN_REGIONS);
    const candidates = region ? landingByRegion[region] : [];
    if (!entryLabel || !region || !candidates.length) {
      visible.push(proxy);
      continue;
    }

    support.set(proxy.tag, proxy);
    for (const landingProxy of candidates) {
      visible.push({
        ...landingProxy,
        tag: nextGeneratedTag(`${entryLabel} -> ${region}`, usedTags),
        detour: proxy.tag,
      });
    }
  }

  return { visible, support: [...support.values()] };
}

function matchChainEntry(tag) {
  for (const entry of CHAIN_ENTRY_PATTERNS) {
    if (entry.pattern.test(tag)) return entry.label;
  }
  return null;
}

function matchRegion(tag, regions) {
  for (const region of regions) {
    if (REGION_PATTERNS[region].test(tag)) return region;
  }
  return null;
}

function replaceGeneratedOutbounds(config, proxies) {
  const policy = (config.outbounds || []).filter((outbound) =>
    outbound && POLICY_TAGS.has(outbound.tag)
  );
  const base = (config.outbounds || []).filter((outbound) =>
    outbound && BASE_TAGS.has(outbound.tag)
  );
  config.outbounds = policy.concat(proxies, base);
}

function fillPolicyGroups(config, proxies) {
  const all = tags(proxies);
  const allOrDirect = all.length ? all : ['DIRECT'];
  const regionTags = {};
  for (const region of CHAIN_REGIONS) {
    regionTags[region] = tags(proxies, REGION_PATTERNS[region]);
  }

  const deTags = tags(proxies, REGION_PATTERNS.DE);
  syncOptionalGroup(config, 'DE', deTags);
  syncTelegramDC24(config, deTags.length > 0);

  const knownPatterns = Object.values(REGION_PATTERNS);
  const othersTags = proxies
    .filter((proxy) => proxy?.tag && !knownPatterns.some((pattern) => pattern.test(proxy.tag)))
    .map((proxy) => proxy.tag);
  syncOptionalGroup(config, 'OTHERS', othersTags);

  const regionalPolicy = (regions) => {
    const values = uniq(regions.flatMap((region) => regionTags[region] || []));
    return fallback(values, allOrDirect);
  };

  const groups = {
    PROXY: allOrDirect,
    GLOBAL: allOrDirect,
    EMBY: allOrDirect,
    SPEEDTEST: allOrDirect,
    HK: fallback(regionTags.HK, allOrDirect),
    TW: fallback(regionTags.TW, allOrDirect),
    SG: fallback(regionTags.SG, allOrDirect),
    US: fallback(regionTags.US, allOrDirect),
    JP: fallback(regionTags.JP, allOrDirect),
    YOUTUBE: regionalPolicy(['HK', 'US', 'JP']),
    AI: regionalPolicy(['TW', 'US']),
  };
  if (deTags.length) groups.DE = deTags;
  if (othersTags.length) groups.OTHERS = othersTags;

  for (const outbound of config.outbounds || []) {
    if (!outbound || !Object.prototype.hasOwnProperty.call(groups, outbound.tag)) continue;
    outbound.type = 'selector';
    outbound.outbounds = groups[outbound.tag];
    outbound.interrupt_exist_connections = true;
  }
}

function syncOptionalGroup(config, tag, members) {
  const outbounds = config.outbounds || [];
  const index = outbounds.findIndex((outbound) => outbound?.tag === tag);
  if (!members.length) {
    if (index >= 0) outbounds.splice(index, 1);
    return;
  }

  const group = {
    tag,
    type: 'selector',
    outbounds: members,
    interrupt_exist_connections: true,
  };
  if (index >= 0) {
    outbounds[index] = group;
    return;
  }

  const insertAt = outbounds.findIndex((outbound) => outbound?.tag === 'GLOBAL');
  outbounds.splice(insertAt >= 0 ? insertAt : outbounds.length, 0, group);
}

function syncTelegramDC24(config, hasGermanyNodes) {
  const rules = config.route?.rules;
  if (!Array.isArray(rules)) return;
  const rule = rules.find((item) => item?.rule_set === 'telegram-dc24');
  if (rule) rule.outbound = hasGermanyNodes ? 'DE' : 'HK';
}

function normalizeProxyList(rawProxies, usedTags) {
  const seenOriginalTags = new Set();
  const renameMap = new Map();
  const proxies = [];

  for (const proxy of rawProxies || []) {
    if (!proxy || !proxy.tag || seenOriginalTags.has(proxy.tag)) continue;
    seenOriginalTags.add(proxy.tag);
    const nextTag = nextInputTag(sanitizeTag(proxy.tag), usedTags);
    renameMap.set(proxy.tag, nextTag);
    proxies.push({ ...proxy, tag: nextTag });
  }

  return proxies.map((proxy) => {
    const { tag, type, detour, ...rest } = proxy;
    const normalized = type === undefined ? { tag, ...rest } : { tag, type, ...rest };
    const nextDetour = typeof detour === 'string' && renameMap.has(detour)
      ? renameMap.get(detour)
      : detour;
    if (nextDetour !== undefined) normalized.detour = nextDetour;
    return normalized;
  });
}

function sanitizeTag(value) {
  let tag = String(value);
  for (const [pattern, replacement] of TAG_REPLACEMENTS) {
    tag = tag.replace(pattern, replacement);
  }
  tag = tag
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[\\/_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return tag || 'NODE';
}

function nextInputTag(originalTag, usedTags) {
  if (!usedTags.has(originalTag)) {
    usedTags.add(originalTag);
    return originalTag;
  }
  const base = `${originalTag} (node)`;
  let candidate = base;
  let index = 2;
  while (usedTags.has(candidate)) candidate = `${base} ${index++}`;
  usedTags.add(candidate);
  return candidate;
}

function nextGeneratedTag(base, usedTags) {
  let candidate = base;
  let index = 2;
  while (usedTags.has(candidate)) candidate = `${base} ${index++}`;
  usedTags.add(candidate);
  return candidate;
}

function tags(proxies, regex) {
  return (proxies || [])
    .filter((proxy) => proxy && proxy.tag && (!regex || regex.test(proxy.tag)))
    .map((proxy) => proxy.tag);
}

function fallback(values, fallbackValues) {
  return values.length ? values : fallbackValues;
}

function uniq(values) {
  return [...new Set(values)];
}

function sortFreeLast(proxies) {
  const regular = [];
  const free = [];
  for (const proxy of proxies) {
    if (/free/i.test(proxy.tag)) free.push(proxy);
    else regular.push(proxy);
  }
  return regular.concat(free);
}
