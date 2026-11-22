#!/usr/bin/env bash
# One-time (and re-runnable) host setup on Ubuntu 24.04.
# Usage: ./provision.sh   (as root)
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "run as root" >&2; exit 1; }
etc=/etc/ai-summarized
here=$(cd "$(dirname "$0")" && pwd)
export DEBIAN_FRONTEND=noninteractive

echo "== packages"
apt-get update -q
apt-get -y -q install ca-certificates curl git gnupg
# Node 22 from NodeSource's signed package source; Ubuntu's own is older.
if ! node --version 2>/dev/null | grep -q '^v22\.'; then
  install -d -m 755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -q
  apt-get -y -q install nodejs
fi

# The worker only makes outgoing requests. Nothing listens except SSH, and the
# firewall is left as it is: this script never opens a port.

# SSH takes keys only. The new setting is checked before sshd reloads; test a
# fresh login (ssh -o ControlPath=none) before closing the current session.
echo "== ssh"
cat > /etc/ssh/sshd_config.d/00-keys-only.conf <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
CONF
sshd -t
systemctl reload ssh

# Updates install themselves (Ubuntu's default). One that needs a reboot, a new
# kernel or libc, gets it at night by itself. The server's clock is UTC: 02:00
# is 03:00 in Berlin in winter and 04:00 in summer, before the daily run.
echo "== automatic reboots"
cat > /etc/apt/apt.conf.d/52automatic-reboot <<'CONF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
CONF
rm -f /etc/apt/apt.conf.d/52unattended-upgrades-local

echo "== service user and settings"
id -u aisum &>/dev/null || useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin aisum
install -d -o root -g aisum -m 750 "$etc"
# Settings of the worker. The two secrets are added by hand with
# ai-summarized-secret, never by a script and never through a deploy.
if [[ ! -f $etc/worker.env ]]; then
  install -o root -g aisum -m 640 /dev/null "$etc/worker.env"
  echo "SUPABASE_URL=https://pukasffvqkukvhuctaoa.supabase.co" > "$etc/worker.env"
fi
install -o root -g root -m 755 "$here/ai-summarized-secret" /usr/local/bin/ai-summarized-secret

echo
echo "Done. Next: ./deploy.sh, then store the two secrets:"
echo "  ai-summarized-secret ANTHROPIC_API_KEY"
echo "  ai-summarized-secret SUPABASE_SECRET_KEY"
[[ -f /var/run/reboot-required ]] && echo "A reboot is required to finish the updates."
exit 0
