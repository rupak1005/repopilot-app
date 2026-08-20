# RepoPilot — AI providers

Chat (Ask / PR review) and embeddings (semantic search) are configured in `api/.env`.  
Template: [`api/.env.example`](../api/.env.example).

## Recommended free stack

```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_CHAT_MODEL=openai/gpt-oss-120b
EMBEDDING_PROVIDER=local
```

| Goal | Setup |
|------|--------|
| Free, best quality | Groq chat + local embeddings |
| Fully local | Ollama chat + Ollama embeddings |
| No API keys | `LLM_PROVIDER=local` + `EMBEDDING_PROVIDER=local` (stub answers) |

> Groq retired `llama-3.3-70b-versatile` (Aug 2026). Use `openai/gpt-oss-120b` or `qwen/qwen3.6-27b`.

## Chat (`LLM_PROVIDER`)

### Groq

```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_CHAT_MODEL=openai/gpt-oss-120b
```

### Gemini

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_CHAT_MODEL=gemini-2.0-flash
```

### Ollama

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_CHAT_MODEL=llama3.2
```

### OpenAI

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini
```

Resolution: explicit `LLM_PROVIDER` → first available key (`GROQ` → `GEMINI` → `OLLAMA` → `OPENAI`) → `local`.

## Embeddings (`EMBEDDING_PROVIDER`)

```env
# Free default (no key)
EMBEDDING_PROVIDER=local

# Ollama
# EMBEDDING_PROVIDER=ollama
# OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# OpenAI
# EMBEDDING_PROVIDER=openai
# OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

OpenAI embedding failures fall back to local-hash automatically.

## After switching providers

Restart API (and worker). If you changed **embeddings**, re-run search index:

```bash
yarn --cwd api build
node api/dist/cli.js index-search --repo-id YOUR_REPO_ID --revision-sha "$(git rev-parse HEAD)"
```
