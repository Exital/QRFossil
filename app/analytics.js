const providers = {
  none: {
    id: "none",
    trackScan() {},
  },
};

export function getAnalytics(config) {
  const id = (config && config.analytics && config.analytics.provider) || "none";
  return providers[id] || providers.none;
}

export function trackScan(config, link) {
  getAnalytics(config).trackScan(link);
}

export const ANALYTICS_PROVIDERS = Object.keys(providers);
