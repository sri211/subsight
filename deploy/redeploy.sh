#!/bin/bash
# Run on the Hetzner server to pull the latest code and restart the backend.
# Usage: bash /opt/subsight/deploy/redeploy.sh
set -e
cd /opt/subsight
git pull
cd backend
./venv/bin/pip install -r requirements.txt
systemctl restart subsight
echo "Redeployed. Recent logs:"
journalctl -u subsight -n 20 --no-pager
