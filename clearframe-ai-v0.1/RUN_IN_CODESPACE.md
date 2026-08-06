# Prompt / Command for Codespace

Paste the commands below in the Codespace terminal.

```bash
cd /workspaces
unzip -o clearframe-ai-v0.1.zip
cd clearframe-ai-v0.1

npm install
npm test
npm run dev
```

For real Cloudflare AI processing and deployment, use API token only:

```bash
cd /workspaces/clearframe-ai-v0.1
set +e
umask 077

read -rsp "Paste CLOUDFLARE_API_TOKEN: " CLOUDFLARE_API_TOKEN
echo
export CLOUDFLARE_API_TOKEN

read -rp "Paste CLOUDFLARE_ACCOUNT_ID: " CLOUDFLARE_ACCOUNT_ID
export CLOUDFLARE_ACCOUNT_ID

npm install
npm test
npx wrangler dev --remote
```

After remote testing passes, stop the dev server and deploy:

```bash
cd /workspaces/clearframe-ai-v0.1
npx wrangler deploy
```

Rules:

- Do not run `wrangler login`.
- Do not use OAuth, Cloudflare Access, Service Token or browser approval.
- Do not paste the token into source files.
- Do not commit `.env`, `.dev.vars` or terminal output containing secrets.
- Do not claim AI enhancement works until a real image is tested through remote runtime.
