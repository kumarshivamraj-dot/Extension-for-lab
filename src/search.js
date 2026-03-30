function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function scoreItem(item, query) {
  if (!query) {
    return 1;
  }

  let score = 0;
  const title = normalize(item.title);
  const language = normalize(item.language);
  const haystack = item.searchText || "";

  if (title === query) {
    score += 120;
  }
  if (title.startsWith(query)) {
    score += 80;
  }
  if (language === query) {
    score += 50;
  }
  if (haystack.includes(query)) {
    score += 25;
  }

  const tokens = query.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (title.includes(token)) {
      score += 20;
    }
    if (haystack.includes(token)) {
      score += 8;
    }
  }

  return score;
}

export function searchIndex(index, rawQuery, limit = 20) {
  const query = normalize(rawQuery);

  return index
    .map((item) => ({
      ...item,
      score: scoreItem(item, query)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit);
}
