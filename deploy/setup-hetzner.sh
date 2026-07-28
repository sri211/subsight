#!/bin/bash
# One-time setup for a fresh Hetzner Cloud server (Ubuntu 22.04/24.04).
# Run as root: bash setup-hetzner.sh
set -e

echo "==> Installing system packages"
apt update
apt install -y python3 python3-venv python3-pip nginx certbot python3-certbot-nginx git

echo "==> Cloning SubSight"
if [ -d /opt/subsight ]; then
  cd /opt/subsight && git pull
else
  git clone https://github.com/sri211/subsight.git /opt/subsight
fi

echo "==> Setting up Python backend"
cd /opt/subsight/backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
mkdir -p data

if [ ! -f /opt/subsight/backend/.env ]; then
  cat > /opt/subsight/backend/.env <<'EOF'
ANTHROPIC_API_KEY=REPLACE_ME
APIFY_TOKEN=REPLACE_ME
EOF
  echo "!! Created backend/.env with placeholders — edit it with real keys before starting the service:"
  echo "   nano /opt/subsight/backend/.env"
fi

echo "==> Creating systemd service"
cat > /etc/systemd/system/subsight.service <<'EOF'
[Unit]
Description=SubSight FastAPI backend
After=network.target

[Service]
User=root
WorkingDirectory=/opt/subsight/backend
ExecStart=/opt/subsight/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8002
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable subsight

echo "==> Configuring Nginx reverse proxy for api.subsight.in"
cat > /etc/nginx/sites-available/subsight <<'EOF'
server {
    listen 80;
    server_name api.subsight.in;

    location / {
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;   # research jobs can run several minutes
    }
}
EOF
ln -sf /etc/nginx/sites-available/subsight /etc/nginx/sites-enabled/subsight
nginx -t
systemctl reload nginx

# NOTE: this server already runs other live projects (ReelAgent, MithraAI)
# and currently has no firewall enabled. This script deliberately does not
# touch ufw so it can't change the network posture of those other services
# as a side effect of deploying SubSight.

echo ""
echo "============================================================"
echo " Almost done. Two manual steps left:"
echo ""
echo " 1. Add your real API keys:"
echo "      nano /opt/subsight/backend/.env"
echo "    then:"
echo "      systemctl restart subsight"
echo ""
echo " 2. Once api.subsight.in's DNS A record points at this"
echo "    server's IP (may take a few minutes to propagate),"
echo "    issue the HTTPS certificate:"
echo "      certbot --nginx -d api.subsight.in"
echo "============================================================"
