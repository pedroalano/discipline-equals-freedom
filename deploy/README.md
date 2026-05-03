# VPS deployment runbook

Single-host production setup. Nginx + Let's Encrypt on the host fronts Docker
containers (web, api, postgres, redis) on the loopback interface. Images are
built by GitHub Actions and pushed to GHCR; the VPS pulls.

Assumes Ubuntu/Debian. Replace `app.example.com` with your domain everywhere.

## 0. Prerequisites

- Domain DNS A/AAAA pointing to the VPS public IP
- Resend domain verified (DKIM/SPF) for the `RESEND_FROM_EMAIL` sender
- A GitHub Personal Access Token with `read:packages` scope to pull from GHCR
  (only needed if the package is private — public packages skip `docker login`)

## 1. Bootstrap the host

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx \
    docker.io docker-compose-plugin git ufw
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # log out / back in for group change

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## 2. Clone repo

```bash
sudo mkdir -p /opt/zenfocus
sudo chown "$USER":"$USER" /opt/zenfocus
git clone https://github.com/<owner>/<repo>.git /opt/zenfocus
cd /opt/zenfocus
```

## 3. Configure environment

```bash
cp .env.production.example .env
# Generate secrets:
echo "JWT_SECRET=$(openssl rand -hex 64)" >> .env.tmp
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 64)" >> .env.tmp
# Then edit .env: paste the two values from .env.tmp, set POSTGRES_PASSWORD,
# DATABASE_URL (must match POSTGRES_PASSWORD), GHCR_OWNER, the URLs
# (APP_URL/CORS_ORIGIN/FRONTEND_URL/NEXT_PUBLIC_API_URL), and Resend keys.
nano .env
shred -u .env.tmp
chmod 600 .env
```

## 4. Nginx + TLS

```bash
sudo cp deploy/nginx/app.conf /etc/nginx/sites-available/zenfocus
sudo sed -i 's/app\.example\.com/<your-domain>/g' /etc/nginx/sites-available/zenfocus
sudo ln -s /etc/nginx/sites-available/zenfocus /etc/nginx/sites-enabled/zenfocus
sudo rm -f /etc/nginx/sites-enabled/default
sudo mkdir -p /var/www/certbot

# Comment out the listen 443 block before the first nginx reload — certbot
# will rewrite the file with cert paths after issuing the certificate.
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d <your-domain>
# certbot installs a renewal timer (systemctl list-timers | grep certbot)
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Pull and start

```bash
# If the GHCR images are private:
echo "$GHCR_PAT" | docker login ghcr.io -u <github-user> --password-stdin

# Pull and bring up. TAG defaults to latest.
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

The `api-migrate` one-shot service runs `prisma migrate deploy` and exits
before `api` starts.

## 6. Smoke test

```bash
curl -sf https://<your-domain>/api/health    # → {"status":"ok"}
curl -I http://<your-domain>                 # → 301 to https
```

Open `https://<your-domain>` in a browser, register, confirm verification
email arrives, click the link, verify login redirects in.

## 7. Backups

```bash
# Daily dump at 03:00 (root crontab)
sudo crontab -e
# Add:
# 0 3 * * * /opt/zenfocus/deploy/backup.sh >> /var/log/zenfocus-backup.log 2>&1
```

Keeps last 7 dumps in `/opt/zenfocus/backups/`. See header of `backup.sh`
for restore instructions.

## 8. Updating

GitHub Actions pushes new images on every merge to `main` and SSHes in to
roll the stack — no manual step required. To deploy a specific tag manually:

```bash
cd /opt/zenfocus
git pull
TAG=<sha-or-tag> docker compose -f docker-compose.prod.yml pull
TAG=<sha-or-tag> docker compose -f docker-compose.prod.yml up -d
docker image prune -f
```

## 9. GitHub Actions deploy — required secrets

Set these in **Settings → Secrets and variables → Actions** of the repo:

| Secret        | Value                                                         |
| ------------- | ------------------------------------------------------------- |
| `VPS_HOST`    | VPS IP or hostname                                            |
| `VPS_USER`    | SSH user (must be in the `docker` group)                      |
| `VPS_SSH_KEY` | Private SSH key authorised in `~/.ssh/authorized_keys` on VPS |

GHCR push uses the workflow's built-in `GITHUB_TOKEN` — no extra secret.
