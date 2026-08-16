// Sub-Store script operation for the official sing-box Windows core.
// Primary subscription:
//   sfw-substore.js#type=0&name=airport#noCache
// Optional landing subscription:
//   sfw-substore.js#type=0&name=airport&landing_name=landing&landing_type=0#noCache
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
const BASE_TAGS = new Set(['DIRECT', 'bridge-out']);

// 模板里固定存在的策略组
const FIXED_POLICY_TAGS = new Set([
  'PROXY', 'GLOBAL', 'YOUTUBE', 'EMBY', 'SPEEDTEST', 'DOWNLOAD',
]);

// 按需创建的分组：订阅里没有对应节点就不建组，顺序即面板展示顺序
const REGION_GROUP_ORDER = ['HK', 'TW', 'SG', 'US', 'JP', 'DE', 'OTHERS'];

// 分流规则的首选地区；该地区无节点时统一回落到 REGION_FALLBACK
const REGION_RULE_TARGETS = [
  { match: (rule) => rule.rule_set === 'telegram-dc5', region: 'SG' },
  { match: (rule) => rule.rule_set === 'telegram-dc13', region: 'US' },
  { match: (rule) => rule.rule_set === 'telegram-dc24', region: 'DE' },
  { match: (rule) => rule.rule_set === 'geosite-category-ai-!cn', region: 'US' },
  { match: (rule) => Array.isArray(rule.domain) && rule.domain.includes('gemini.google.com'), region: 'HK' },
];
const REGION_FALLBACK = 'PROXY';

const RESERVED_TAGS = new Set([
  ...FIXED_POLICY_TAGS,
  ...REGION_GROUP_ORDER,
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

const primaryProxies = normalizeProxyList(
  (primaryRaw || []).filter((proxy) => proxy && proxy.tag && !/warp|cloudflare/i.test(proxy.tag)),
  usedTags,
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
    outbound && FIXED_POLICY_TAGS.has(outbound.tag)
  );
  const base = (config.outbounds || []).filter((outbound) =>
    outbound && BASE_TAGS.has(outbound.tag)
  );
  config.outbounds = policy.concat(proxies, base);
}

function fillPolicyGroups(config, proxies) {
  const all = tags(proxies);
  const allOrDirect = all.length ? all : ['DIRECT'];
  const regionTags = collectRegionTags(proxies);

  syncRegionGroups(config, regionTags);
  syncRegionRules(config, regionTags);

  const regionalPolicy = (regions) => {
    const values = uniq(regions.flatMap((region) => regionTags[region] || []));
    return fallback(values, allOrDirect);
  };
  const groups = {
    PROXY: allOrDirect,
    GLOBAL: allOrDirect,
    YOUTUBE: regionalPolicy(['HK', 'US', 'JP']),
    EMBY: allOrDirect,
    SPEEDTEST: allOrDirect,
    DOWNLOAD: uniq(all.concat(['DIRECT'])),
  };

  for (const outbound of config.outbounds || []) {
    if (!outbound || !Object.prototype.hasOwnProperty.call(groups, outbound.tag)) continue;
    outbound.outbounds = groups[outbound.tag];
    outbound.interrupt_exist_connections = true;
  }
}

function collectRegionTags(proxies) {
  const knownPatterns = Object.values(REGION_PATTERNS);
  const regionTags = {};
  for (const region of Object.keys(REGION_PATTERNS)) {
    regionTags[region] = tags(proxies, REGION_PATTERNS[region]);
  }
  regionTags.OTHERS = (proxies || [])
    .filter((proxy) => proxy?.tag && !knownPatterns.some((pattern) => pattern.test(proxy.tag)))
    .map((proxy) => proxy.tag);
  return regionTags;
}

// 地区组按需存在：订阅里没有该地区的节点就不建组，避免面板上出现选不出东西的空组。
function syncRegionGroups(config, regionTags) {
  const outbounds = config.outbounds || [];
  const groups = REGION_GROUP_ORDER
    .filter((tag) => (regionTags[tag] || []).length)
    .map((tag) => ({
      tag,
      type: 'selector',
      outbounds: regionTags[tag],
      interrupt_exist_connections: true,
    }));
  outbounds.splice(lastFixedPolicyIndex(outbounds) + 1, 0, ...groups);
}

function lastFixedPolicyIndex(outbounds) {
  let last = -1;
  for (let i = 0; i < outbounds.length; i += 1) {
    if (FIXED_POLICY_TAGS.has(outbounds[i]?.tag)) last = i;
  }
  return last;
}

// 模板里这些规则一律指向 REGION_FALLBACK，这里按实际存在的地区组升级；
// 组不存在时保持回落，否则会留下悬空 outbound 引用导致内核拒绝加载。
function syncRegionRules(config, regionTags) {
  const rules = config.route?.rules;
  if (!Array.isArray(rules)) return;

  for (const { match, region } of REGION_RULE_TARGETS) {
    const rule = rules.find((item) => item && match(item));
    if (rule) rule.outbound = region;
  }

  const available = new Set(REGION_GROUP_ORDER.filter((tag) => (regionTags[tag] || []).length));
  for (const rule of rules) {
    if (REGION_GROUP_ORDER.includes(rule?.outbound) && !available.has(rule.outbound)) {
      rule.outbound = REGION_FALLBACK;
    }
  }
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
