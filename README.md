# Google Docs offline

Chrome extension scaffold with offline access messaging for documents, spreadsheets and presentations.

## Current shape

- Manifest V3 popup extension
- Bundled JSON index for fast local search
- Segmented snippet JSON files for lazy loading
- Copy button for pasted code reuse
- Supports flat snippet JSON and nested question-bank JSON

## Structure

```text
manifest.json
popup.html
popup.css
popup.js
src/
  loader.js
  search.js
data/
  index.json
  snippets/
```

## Load in Chrome

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select this folder

## Refresh the search index

If you add or edit files in `data/snippets/`, rebuild `data/index.json` with:

```bash
node scripts/build-index.mjs
```

## Supported JSON shapes

Flat snippet file:

```json
{
  "items": [
    {
      "id": "js-fetch-json",
      "title": "Fetch JSON with async/await",
      "language": "javascript",
      "tags": ["fetch", "api"],
      "summary": "Basic fetch example.",
      "code": "..."
    }
  ]
}
```

Question-bank file:

```json
{
  "title": "Code-Based 10 Mark Questions Bank with R Code",
  "subject": "Probability Distributions and Statistical Analysis in R",
  "questions": [
    {
      "id": "CB10_01",
      "marks": 10,
      "topic": "t distribution and F distribution",
      "keywords": ["pt", "qf"],
      "question": "Write an R program...",
      "code": "..."
    }
  ]
}
```
