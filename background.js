const DEFAULT_PROXY = {
  host: "127.0.0.1",
  port: 40000,
  scheme: "http"
};

chrome.runtime.onStartup.addListener(() => {
  disableSessionProxy();
});

chrome.runtime.onInstalled.addListener(() => {
  disableSessionProxy();
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "remove_extension") {
    return;
  }

  chrome.management.uninstallSelf({ showConfirmDialog: false });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "get-proxy-state") {
    getProxyState().then(sendResponse);
    return true;
  }

  if (message?.type === "enable-session-proxy") {
    enableSessionProxy(message.config).then(sendResponse);
    return true;
  }

  if (message?.type === "disable-session-proxy") {
    disableSessionProxy().then(sendResponse);
    return true;
  }

  return false;
});

async function enableSessionProxy(config) {
  const safeConfig = sanitizeProxyConfig(config);

  await chrome.storage.local.set({ sessionProxyConfig: safeConfig });
  await chrome.proxy.settings.set({
    value: {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: safeConfig.scheme,
          host: safeConfig.host,
          port: safeConfig.port
        },
        bypassList: ["<local>"]
      }
    },
    scope: "regular"
  });

  return getProxyState();
}

async function disableSessionProxy() {
  await chrome.proxy.settings.clear({ scope: "regular" });
  return getProxyState();
}

async function getProxyState() {
  const [{ sessionProxyConfig }, config] = await Promise.all([
    chrome.storage.local.get({ sessionProxyConfig: DEFAULT_PROXY }),
    chrome.proxy.settings.get({})
  ]);

  const savedConfig = sanitizeProxyConfig(sessionProxyConfig);
  const singleProxy = config.value?.rules?.singleProxy || {};
  const active = config.value?.mode === "fixed_servers" && Boolean(singleProxy.host);

  return {
    active,
    config: active
      ? sanitizeProxyConfig({
          host: singleProxy.host,
          port: singleProxy.port,
          scheme: singleProxy.scheme
        })
      : savedConfig
  };
}

function sanitizeProxyConfig(config = {}) {
  const host =
    typeof config.host === "string" && config.host.trim()
      ? config.host.trim()
      : DEFAULT_PROXY.host;
  const port = Number.isInteger(config.port) && config.port > 0 ? config.port : DEFAULT_PROXY.port;
  const scheme = ["http", "https", "socks4", "socks5"].includes(config.scheme)
    ? config.scheme
    : DEFAULT_PROXY.scheme;

  return { host, port, scheme };
}
