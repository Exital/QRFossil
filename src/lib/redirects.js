export function buildRedirects(config) {
  const out = {};
  const links = (config && config.links) || {};
  for (const [slug, link] of Object.entries(links)) {
    if (!link) continue;
    if (link.enabled) out[slug] = link.destination;
    else out[slug] = { disabled: true };
  }
  return out;
}
