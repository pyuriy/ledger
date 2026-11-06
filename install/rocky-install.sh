#!/bin/bash
# Install Ledger on a standalone Rocky Linux 8, 9, or 10 host.
# Run from a clone of this repository:
#   chmod +x install/rocky-install.sh
#   ./install/rocky-install.sh
set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run this as a normal user with sudo, not as root." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f /etc/os-release ]]; then
  echo "This installer is for Rocky Linux." >&2
  exit 1
fi
# shellcheck disable=SC1091
source /etc/os-release
if [[ "${ID:-}" != "rocky" ]]; then
  echo "This installer is for Rocky Linux. Detected: ${PRETTY_NAME:-unknown}." >&2
  exit 1
fi

major="${VERSION_ID%%.*}"
echo "Installing packages on ${PRETTY_NAME}..."
sudo dnf install -y git nginx

install_node() {
  if command -v node >/dev/null 2>&1; then
    local current
    current="$(node -p "process.versions.node.split('.')[0]")"
    if [[ "$current" -ge 22 ]]; then
      echo "Node.js $(node --version) is already installed."
      return
    fi
  fi

  if [[ "$major" == "10" ]]; then
    sudo dnf install -y nodejs npm
  elif [[ "$major" == "9" || "$major" == "8" ]]; then
    if dnf module list nodejs 2>/dev/null | grep -q '^nodejs[[:space:]]*22'; then
      sudo dnf module enable -y nodejs:22
      sudo dnf install -y nodejs npm
    else
      echo "nodejs:22 is not in AppStream. Using the NodeSource Node.js 22 repository."
      curl -fsSL https://rpm.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
      sudo bash /tmp/nodesource_setup.sh
      sudo dnf install -y nodejs
    fi
  else
    echo "Unsupported Rocky Linux major version: $major" >&2
    exit 1
  fi
}

install_node
echo "Using Node.js $(node --version) and npm $(npm --version)"
node_major="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$node_major" -lt 22 ]]; then
  echo "Ledger needs Node.js 22 or newer. Found $(node --version)." >&2
  exit 1
fi

echo "Building Ledger..."
npm install
npm run build

echo "Publishing files to /var/www/ledger..."
sudo mkdir -p /var/www/ledger
sudo find /var/www/ledger -mindepth 1 -delete
# Do not preserve the build directory's SELinux label.
sudo cp -r dist/. /var/www/ledger/
sudo restorecon -RF /var/www/ledger 2>/dev/null || sudo chcon -R -t httpd_sys_content_t /var/www/ledger

sudo cp install/ledger.conf /etc/nginx/conf.d/ledger.conf
if ! sudo nginx -t; then
  echo "nginx rejected the new site. If the error is a duplicate default server," >&2
  echo "comment out the stock 'server { listen 80; ... }' block in /etc/nginx/nginx.conf" >&2
  echo "and run: sudo nginx -t && sudo systemctl reload nginx" >&2
  exit 1
fi

sudo systemctl enable --now nginx
sudo systemctl reload nginx

if systemctl is-active --quiet firewalld; then
  sudo firewall-cmd --permanent --add-service=http
  sudo firewall-cmd --reload
fi

echo
echo "Ledger is served at http://$(hostname -f 2>/dev/null || hostname)/"
echo "Entries stay in each visitor's browser. They are not stored on this host."
