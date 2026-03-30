const DATA_ROOT = "data";

export function createSnippetStore() {
  const segmentCache = new Map();

  return {
    index: [],

    async loadIndex() {
      if (this.index.length > 0) {
        return this.index;
      }

      const response = await fetch(chrome.runtime.getURL(`${DATA_ROOT}/index.json`));
      const data = await response.json();
      this.index = data.items;
      return this.index;
    },

    async getSnippet(id) {
      const index = await this.loadIndex();
      const match = index.find((item) => item.id === id);
      if (!match) {
        return null;
      }

      const segment = await loadSegment(match.segment);
      return findSnippet(segment, id);
    }
  };

  async function loadSegment(segmentName) {
    if (segmentCache.has(segmentName)) {
      return segmentCache.get(segmentName);
    }

    const response = await fetch(
      chrome.runtime.getURL(`${DATA_ROOT}/snippets/${segmentName}.json`)
    );
    const data = await response.json();
    segmentCache.set(segmentName, data);
    return data;
  }
}

function findSnippet(segment, id) {
  if (Array.isArray(segment.items)) {
    return segment.items.find((item) => item.id === id) || null;
  }

  if (Array.isArray(segment.questions)) {
    const question = segment.questions.find((item) => item.id === id);
    if (!question) {
      return null;
    }

    return {
      id: question.id,
      title: question.topic || question.id,
      subject: segment.subject || "",
      language: segment.language || "r",
      topic: question.topic || "",
      marks: question.marks ?? null,
      tags: question.keywords || [],
      keywords: question.keywords || [],
      summary: segment.title || "",
      question: question.question || "",
      code: question.code || ""
    };
  }

  return null;
}
