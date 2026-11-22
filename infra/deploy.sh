#!/usr/bin/env bash
# Builds the worker from a checkout in /opt/ai-summarized and installs what a
# release can change outside of it: the units and the timers.
# Usage: ./deploy.sh [git-ref]   (as root; default: main)
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "run as root" >&2; exit 1; }
repo=/opt/ai-summarized
ref=${1:-main}

if [[ ! -d $repo/.git ]]; then
  git clone --quiet https://github.com/LukasB3/ai-summarized.git "$repo"
fi
git -C "$repo" fetch --quiet origin
git -C "$repo" checkout --quiet --detach "origin/$ref"
# The checkout may have brought a new version of this script. Start over with it.
if [[ -z ${DEPLOY_RESTARTED:-} ]]; then
  DEPLOY_RESTARTED=1 exec "$repo/infra/deploy.sh" "$ref"
fi

cd "$repo/worker"
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm prune --omit=dev --no-audit --no-fund

cd "$repo/infra"
install -o root -g root -m 755 ai-summarized-secret /usr/local/bin/ai-summarized-secret
for unit in ai-summarized-digest.service ai-summarized-digest.timer ai-summarized-weekly.service ai-summarized-weekly.timer; do
  install -o root -g root -m 644 "$unit" "/etc/systemd/system/$unit"
done
systemctl daemon-reload
systemctl enable --quiet --now ai-summarized-digest.timer ai-summarized-weekly.timer

echo "deployed $(git -C "$repo" rev-parse --short HEAD) ($ref)"
systemctl list-timers --no-pager 'ai-summarized-*'
