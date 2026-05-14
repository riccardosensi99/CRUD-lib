#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_URL:?Set GITHUB_URL to the GitHub organization or repository URL}"
: "${RUNNER_TOKEN:?Set RUNNER_TOKEN to the temporary runner registration token}"

RUNNER_VERSION="${RUNNER_VERSION:-2.334.0}"
RUNNER_USER="${RUNNER_USER:-actions-runner}"
RUNNER_NAME="${RUNNER_NAME:-$(hostname)-github-runner}"
RUNNER_LABELS="${RUNNER_LABELS:-local-ci}"
RUNNER_WORKDIR="${RUNNER_WORKDIR:-_work}"
RUNNER_GROUP="${RUNNER_GROUP:-}"
INSTALL_DIR="${INSTALL_DIR:-/opt/actions-runner/${RUNNER_NAME}}"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This installer supports Linux only." >&2
  exit 1
fi

case "$(uname -m)" in
  x86_64|amd64)
    RUNNER_ARCH="x64"
    ;;
  aarch64|arm64)
    RUNNER_ARCH="arm64"
    ;;
  armv7l)
    RUNNER_ARCH="arm"
    ;;
  *)
    echo "Unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

if ! id "$RUNNER_USER" >/dev/null 2>&1; then
  sudo useradd --create-home --shell /bin/bash "$RUNNER_USER"
fi

sudo mkdir -p "$INSTALL_DIR"

if [[ ! -f "$INSTALL_DIR/config.sh" ]]; then
  package="actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"
  url="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${package}"
  tmp="/tmp/${package}"

  curl -fsSL "$url" -o "$tmp"
  sudo tar -xzf "$tmp" -C "$INSTALL_DIR"
fi

sudo chown -R "$RUNNER_USER:$RUNNER_USER" "$INSTALL_DIR"

if [[ -x "$INSTALL_DIR/bin/installdependencies.sh" ]]; then
  sudo "$INSTALL_DIR/bin/installdependencies.sh"
fi

config_args=(
  --url "$GITHUB_URL"
  --token "$RUNNER_TOKEN"
  --name "$RUNNER_NAME"
  --labels "$RUNNER_LABELS"
  --work "$RUNNER_WORKDIR"
  --unattended
  --replace
)

if [[ -n "$RUNNER_GROUP" ]]; then
  config_args+=(--runnergroup "$RUNNER_GROUP")
fi

if [[ ! -f "$INSTALL_DIR/.runner" ]]; then
  sudo -H -u "$RUNNER_USER" bash -c 'cd "$1" && shift && ./config.sh "$@"' bash "$INSTALL_DIR" "${config_args[@]}"
else
  echo "Runner already configured at $INSTALL_DIR; skipping config.sh."
fi

sudo bash -c 'cd "$1" && ./svc.sh install "$2"' bash "$INSTALL_DIR" "$RUNNER_USER"
sudo bash -c 'cd "$1" && ./svc.sh start' bash "$INSTALL_DIR"
sudo bash -c 'cd "$1" && ./svc.sh status' bash "$INSTALL_DIR"
