# Production domain — repopilot.software

Primary production URL for the **repopilot-app** Vercel project:

| Role | URL |
|------|-----|
| **Canonical app** | `https://repopilot.software` |
| www (redirects) | `https://www.repopilot.software` → apex |
| Legacy Vercel alias | `https://repopilot-app.vercel.app` (still works) |

HTTP → HTTPS is handled automatically by Vercel (HSTS included).

## Status

- [x] Domains attached to Vercel project `repopilot-app`
- [x] `NEXT_PUBLIC_APP_URL=https://repopilot.software` (Production + Preview)
- [x] `www` → apex redirect in `web/vercel.json`
- [ ] **DNS at name.com** (blocking — domain still parks on `91.195.240.94`)

## DNS (name.com)

Keep nameservers on **name.com** and replace the parking A records:

| Type | Host | Value |
|------|------|--------|
| **A** | `@` | `216.198.79.1` |
| **A** | `@` | `64.29.17.1` |
| **CNAME** | `www` | `97ce17e248083caa.vercel-dns-017.com` |

Remove any existing apex/`www` A/CNAME pointing at `91.195.240.94` (parking).

**Alternative:** point nameservers to `ns1.vercel-dns.com` + `ns2.vercel-dns.com` and manage DNS in Vercel.

After DNS propagates:

```bash
vercel domains verify repopilot.software
vercel domains verify www.repopilot.software
curl -sI https://repopilot.software | head -5
```

## Env / OAuth follow-ups

1. **Redeploy** Vercel after env change so builds pick up `NEXT_PUBLIC_APP_URL`.
2. **GitHub OAuth app** → Authorization callback URL:
   `https://repopilot.software/api/auth/github/callback`  
   (exact path must match your app; also keep localhost for local dev).
3. **API CORS** (Railway / Render) add:
   `https://repopilot.software,https://www.repopilot.software`
4. Marketing CTA (`repopilot-pi`) → `https://repopilot.software`.
