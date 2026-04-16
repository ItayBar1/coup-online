# Deploying Coup Online on a Home Server

## Prerequisites

- Docker + Docker Compose v2 installed on the server
- A GitHub account (for GHCR)
- (Optional) Cloudflare account for public access via Cloudflare Tunnel

---

## 1. First-time setup on the home server

```bash
# Clone the repo (or just copy docker-compose.yml + .env)
git clone https://github.com/ItayBar1/coup-online.git
cd coup-online

# Copy the env template and fill in values
cp .env.example .env
```

---

## 2. Authenticate Docker with GHCR

CI pushes images to GitHub Container Registry. The home server needs read access to pull them.

1. Create a GitHub Personal Access Token (PAT) with `read:packages` scope at  
   `GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)`.

2. Log in:

   ```bash
   echo YOUR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
   ```

3. Credentials are stored in `~/.docker/config.json` — Watchtower uses this file automatically.

---

## 3. Start the stack

```bash
docker compose up -d
```

This starts:

- **`coup`** — the app (Express + Socket.IO + built React frontend) on `HOST_PORT` (default 8000)
- **`watchtower`** — polls GHCR every 5 minutes and restarts `coup` when a new `latest` image is found

---

## 4. CI/CD flow

Every `push` to `main` triggers `.github/workflows/deploy.yml`:

1. Builds a multi-stage Docker image (Vite → Node)
2. Pushes two tags to GHCR:
   - `latest` (always points to newest main-branch build)
   - `sha-<commit>` (immutable, for rollbacks)
3. Watchtower on your home server picks up the new `latest` within 5 minutes and restarts the container.

Pull Requests only **build** the image (no push) — a cheap CI gate with no side effects.

---

## 5. Exposing via Cloudflare Tunnel (no port-forwarding needed)

Cloudflare Tunnel proxies traffic from your domain to `localhost:8000` on the home server without opening any inbound firewall ports.

```bash
# Install cloudflared (once)
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# Authenticate (opens browser)
cloudflared tunnel login

# Create a named tunnel
cloudflared tunnel create coup-tunnel

# Route your domain to the tunnel
cloudflared tunnel route dns coup-tunnel coup.yourdomain.com

# Start the tunnel (points to the app container)
cloudflared tunnel run --url http://localhost:8000 coup-tunnel
```

For persistent operation, install as a system service:

```bash
sudo cloudflared service install
```

The app listens on `0.0.0.0:8000` inside Docker. Cloudflare Tunnel connects to `localhost:8000` on the host — no extra Nginx reverse proxy required.

> **Socket.IO note:** Cloudflare Free plan proxies WebSocket connections correctly.  
> Enable **WebSocket** in `Cloudflare Dashboard → Network → WebSockets` for your zone.

---

## 6. Rollback

```bash
# List recent immutable tags
docker pull ghcr.io/itaybar1/coup-online:sha-<commit>

# Update .env IMAGE_TAG and restart
IMAGE_TAG=sha-<commit> docker compose up -d
```

---

## 7. Viewing logs

```bash
# Tail app logs (structured JSON)
docker compose logs -f coup

# Parse with jq for readable output
docker compose logs -f coup | jq '.'
```
