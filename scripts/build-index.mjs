import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const snippetsDir = path.join(rootDir, "data", "snippets");
const indexFile = path.join(rootDir, "data", "index.json");

const snippetFiles = (await fs.readdir(snippetsDir)).filter((file) => file.endsWith(".json"));
const items = [];

for (const fileName of snippetFiles) {
  const segment = path.basename(fileName, ".json");
  const absolutePath = path.join(snippetsDir, fileName);
  const raw = await fs.readFile(absolutePath, "utf8");
  const payload = JSON.parse(raw);

  for (const item of flattenRecords(payload)) {
    const searchText = [
      item.title,
      item.subject,
      item.language,
      item.topic,
      ...(item.tags || []),
      ...(item.keywords || []),
      item.summary,
      item.question,
      item.code
    ]
      .join(" ")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    items.push({
      id: item.id,
      title: item.title,
      subject: item.subject || "",
      language: item.language || "",
      topic: item.topic || "",
      marks: item.marks ?? null,
      tags: item.tags || item.keywords || [],
      segment,
      searchText
    });
  }
}

items.sort((left, right) => left.title.localeCompare(right.title));

await fs.writeFile(indexFile, JSON.stringify({ items }, null, 2) + "\n", "utf8");

console.log(`Wrote ${items.length} indexed snippets to ${path.relative(rootDir, indexFile)}`);

function flattenRecords(payload) {
  if (Array.isArray(payload.items)) {
    return payload.items.map((item) => ({
      ...item,
      subject: item.subject || payload.subject || "",
      language: item.language || payload.language || payload.subject || "",
      topic: item.topic || "",
      keywords: item.keywords || item.tags || [],
      title: item.title || payload.title || item.id
    }));
  }

  if (Array.isArray(payload.questions)) {
    return payload.questions.map((question) => ({
      id: question.id,
      title: question.title || question.topic || question.id,
      subject: payload.subject || "",
      language: payload.language || "r",
      topic: question.topic || "",
      marks: question.marks ?? null,
      keywords: question.keywords || [],
      tags: question.keywords || [],
      summary: payload.title || "",
      question: question.question || "",
      code: question.code || ""
    }));
  }

  return [];
}
