# RepoPilot — AI providers (including free options)

RepoPilot uses AI for **chat** (Q&A, PR review) and **embeddings** (semantic search). You can mix providers.

Configure via `api/.env` — see [`api/.env.example`](../api/.env.example).

---

## Quick picks

| Goal | Recommended setup | Cost |
|------|-------------------|------|
| **Fully free, best quality** | `LLM_PROVIDER=groq` + `EMBEDDING_PROVIDER=local` | $0 |
| **Fully free, local only** | Ollama chat + Ollama embeddings | $0 (runs on your machine) |
| **Free chat + better search** | Groq chat + OpenAI embeddings (when billed) | Embeddings only |
| **No keys at all** | Defaults: local chat stub + local-hash embeddings | $0 (limited quality) |

---

## Chat providers (`LLM_PROVIDER`)

Used by `/ask` and PR review.

### Groq (recommended free tier)

- Sign up: [console.groq.com](https://console.groq.com)
- Free tier with rate limits; fast inference

```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_CHAT_MODEL=llama-3.3-70b-versatile
```

### Google Gemini (free tier)

- API key: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Free quota with daily limits

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_CHAT_MODEL=gemini-2.0-flash
```

### Ollama (100% local)

- Install: [ollama.com](https://ollama.com)
- Pull a model: `ollama pull llama3.2`

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_CHAT_MODEL=llama3.2
```

### OpenAI (paid)

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini
```

If OpenAI returns **429 insufficient_quota**, switch to Groq or Gemini — no code changes beyond `.env`.

---

## Embedding providers (`EMBEDDING_PROVIDER`)

Used when indexing search (`index-search` CLI) and at query time.

### Local hash (default, free)

No API key. Keyword-ish semantic search — good enough for dev/demo.

```env
EMBEDDING_PROVIDER=local
```

### Ollama (free, local)

```env
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

Run: `ollama pull nomic-embed-text`

Vectors are padded from 768 → 1536 dims (see `embeddingProvider.ts`).

### OpenAI (paid)

```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

On quota/auth errors, RepoPilot **automatically falls back** to local-hash embeddings.

---

## Provider resolution order

**Chat** (`resolveLLMProviderKind`):

1. `LLM_PROVIDER` env if set
2. Else first key found: `GROQ_API_KEY` → `GEMINI_API_KEY` → `OLLAMA_BASE_URL` → `OPENAI_API_KEY`
3. Else `local-fallback` stub

**Embeddings** (`resolveEmbeddingProviderKind`):

1. `EMBEDDING_PROVIDER` env if set
2. Else `OPENAI_API_KEY` → `OLLAMA_BASE_URL` → `local`

---

## After changing provider

Restart API + worker, then re-index if you switched embedding provider:

```bash
export TMPDIR="$PWD/.tmp"
SHA=$(git rev-parse HEAD)
cd api && set -a && source .env && set +a
node dist/cli.js index-search --repo-id YOUR_REPO_ID --revision-sha "$SHA"
```

---

## Other free APIs (not built-in yet)

| Service | Notes |
|---------|--------|
| [OpenRouter](https://openrouter.ai) | Some free models; OpenAI-compatible — set base URL via future env |
| [Hugging Face Inference](https://huggingface.co/inference-api) | Free tier; needs custom adapter |
| [Together.ai](https://together.ai) | Free credits on signup |

Groq + Gemini cover most free chat needs without extra code.
