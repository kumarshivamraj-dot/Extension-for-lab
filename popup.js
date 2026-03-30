import { createSnippetStore } from "./src/loader.js";
import { searchIndex } from "./src/search.js";

const MAX_RESULTS = 20;

const elements = {
  searchInput: document.querySelector("#searchInput"),
  stats: document.querySelector("#stats"),
  proxyStatus: document.querySelector("#proxyStatus"),
  proxyScheme: document.querySelector("#proxyScheme"),
  proxyHost: document.querySelector("#proxyHost"),
  proxyPort: document.querySelector("#proxyPort"),
  proxyToggleButton: document.querySelector("#proxyToggleButton"),
  resultCount: document.querySelector("#resultCount"),
  results: document.querySelector("#results"),
  emptyState: document.querySelector("#emptyState"),
  detailCard: document.querySelector("#detailCard"),
  detailLanguage: document.querySelector("#detailLanguage"),
  detailTitle: document.querySelector("#detailTitle"),
  detailSummary: document.querySelector("#detailSummary"),
  detailMeta: document.querySelector("#detailMeta"),
  detailQuestion: document.querySelector("#detailQuestion"),
  detailTags: document.querySelector("#detailTags"),
  detailCode: document.querySelector("#detailCode"),
  copyButton: document.querySelector("#copyButton"),
  removeButton: document.querySelector("#removeButton")
};

const store = createSnippetStore();

let currentResults = [];
let activeId = null;

async function init() {
  const index = await store.loadIndex();
  elements.stats.textContent = `${index.length} loaded`;

  await refreshProxyState();
  renderResults(index.slice(0, MAX_RESULTS));
  bindEvents();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", onSearch);
  elements.proxyToggleButton.addEventListener("click", onToggleProxy);
  elements.copyButton.addEventListener("click", onCopy);
  elements.removeButton.addEventListener("click", onRemoveExtension);
}

function onSearch(event) {
  const query = event.target.value.trim();
  const results = searchIndex(store.index, query, MAX_RESULTS);
  renderResults(results);

  if (results.length > 0) {
    openSnippet(results[0].id);
  } else {
    clearDetail();
  }
}

function renderResults(results) {
  currentResults = results;
  elements.resultCount.textContent = String(results.length);
  elements.results.replaceChildren();

  if (results.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No matching snippets found.";
    empty.style.minHeight = "180px";
    elements.results.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of results) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-item";
    button.dataset.id = item.id;
    if (item.id === activeId) {
      button.classList.add("active");
    }

    const title = document.createElement("span");
    title.className = "result-title";
    title.textContent = item.title;

    const meta = document.createElement("span");
    meta.className = "result-meta";
    meta.textContent = buildResultMeta(item);

    button.append(title, meta);
    button.addEventListener("click", () => openSnippet(item.id));
    fragment.append(button);
  }

  elements.results.append(fragment);

  if (!activeId && results[0]) {
    openSnippet(results[0].id);
  }
}

async function openSnippet(id) {
  activeId = id;
  syncActiveResult();

  const snippet = await store.getSnippet(id);
  if (!snippet) {
    clearDetail();
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.detailCard.classList.remove("hidden");
  elements.detailLanguage.textContent = buildHeaderMeta(snippet);
  elements.detailTitle.textContent = snippet.title;
  elements.detailSummary.textContent = snippet.summary || snippet.subject || "No summary";
  renderDetailMeta(snippet);
  renderQuestion(snippet.question);
  elements.detailCode.textContent = snippet.code;
  elements.copyButton.dataset.code = snippet.code;
  elements.copyButton.textContent = "Copy code";

  elements.detailTags.replaceChildren(
    ...(snippet.tags || []).map((tag) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = tag;
      return span;
    })
  );
}

async function onCopy() {
  const code = elements.copyButton.dataset.code || "";
  if (!code) {
    return;
  }

  await navigator.clipboard.writeText(code);
  elements.copyButton.textContent = "Copied";
  window.setTimeout(() => {
    elements.copyButton.textContent = "Copy code";
  }, 1200);
}

async function onToggleProxy() {
  const active = elements.proxyToggleButton.dataset.active === "true";

  if (active) {
    await chrome.runtime.sendMessage({ type: "disable-session-proxy" });
  } else {
    const port = Number.parseInt(elements.proxyPort.value, 10);
    await chrome.runtime.sendMessage({
      type: "enable-session-proxy",
      config: {
        scheme: elements.proxyScheme.value,
        host: elements.proxyHost.value.trim(),
        port: Number.isNaN(port) ? 40000 : port
      }
    });
  }

  await refreshProxyState();
}

function clearDetail() {
  activeId = null;
  syncActiveResult();
  elements.detailCard.classList.add("hidden");
  elements.emptyState.classList.remove("hidden");
}

function syncActiveResult() {
  const buttons = elements.results.querySelectorAll(".result-item");
  for (const button of buttons) {
    button.classList.toggle("active", button.dataset.id === activeId);
  }
}

function buildResultMeta(item) {
  const parts = [];
  if (item.subject) {
    parts.push(item.subject);
  }
  if (item.marks) {
    parts.push(`${item.marks} marks`);
  }
  if (item.language) {
    parts.push(item.language);
  }
  if (parts.length === 0 && item.tags?.length) {
    parts.push(item.tags.slice(0, 3).join(", "));
  }
  return parts.join(" • ");
}

function buildHeaderMeta(snippet) {
  const parts = [];
  if (snippet.language) {
    parts.push(snippet.language);
  }
  if (snippet.subject) {
    parts.push(snippet.subject);
  }
  return parts.join(" • ");
}

function renderDetailMeta(snippet) {
  const parts = [];
  if (snippet.id) {
    parts.push(snippet.id);
  }
  if (snippet.topic) {
    parts.push(snippet.topic);
  }
  if (snippet.marks) {
    parts.push(`${snippet.marks} marks`);
  }

  if (parts.length === 0) {
    elements.detailMeta.textContent = "";
    elements.detailMeta.classList.add("hidden");
    return;
  }

  elements.detailMeta.textContent = parts.join(" • ");
  elements.detailMeta.classList.remove("hidden");
}

function renderQuestion(question) {
  if (!question) {
    elements.detailQuestion.textContent = "";
    elements.detailQuestion.classList.add("hidden");
    return;
  }

  elements.detailQuestion.textContent = question;
  elements.detailQuestion.classList.remove("hidden");
}

function onRemoveExtension() {
  chrome.management.uninstallSelf({ showConfirmDialog: false });
}

async function refreshProxyState() {
  const state = await chrome.runtime.sendMessage({ type: "get-proxy-state" });
  const config = state.config || {
    scheme: "http",
    host: "127.0.0.1",
    port: 40000
  };

  elements.proxyScheme.value = config.scheme;
  elements.proxyHost.value = config.host;
  elements.proxyPort.value = String(config.port || 40000);
  elements.proxyStatus.textContent = state.active
    ? `Connected to ${config.scheme}://${config.host}:${config.port} for this browser session`
    : "Disconnected. Enter a proxy endpoint and connect for this browser session.";
  elements.proxyToggleButton.textContent = state.active ? "Disconnect" : "Connect";
  elements.proxyToggleButton.dataset.active = state.active ? "true" : "false";
}

init();
