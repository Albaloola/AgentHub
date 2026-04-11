#!/usr/bin/env bash
set -euo pipefail

# AgentHub Installer for Linux and macOS
# https://github.com/0x4F6D6172/agenthub

REPO_OWNER="0x4F6D6172"
REPO_NAME="agenthub"
GITHUB_API="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()  { printf "${CYAN}[INFO]${RESET}  %s\n" "$1"; }
ok()    { printf "${GREEN}[OK]${RESET}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${RESET}  %s\n" "$1"; }
error() { printf "${RED}[ERROR]${RESET} %s\n" "$1" >&2; }
fatal() { error "$1"; exit 1; }

usage() {
    cat <<EOF
${BOLD}AgentHub Installer${RESET}

Usage: install.sh [OPTIONS]

Options:
  --help        Show this help message
  --version     Install a specific version (e.g. --version v1.0.0)
  --dry-run     Show what would be done without making changes

Examples:
  curl -fsSL https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/packaging/install.sh | bash
  ./install.sh --version v1.2.0
EOF
    exit 0
}

# --- Parse arguments ---
VERSION=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h)    usage ;;
        --version)    VERSION="$2"; shift 2 ;;
        --dry-run)    DRY_RUN=true; shift ;;
        *)            fatal "Unknown option: $1. Use --help for usage." ;;
    esac
done

# --- Detect OS and architecture ---
detect_platform() {
    local os arch

    case "$(uname -s)" in
        Linux*)   os="linux" ;;
        Darwin*)  os="macos" ;;
        *)        fatal "Unsupported operating system: $(uname -s). Only Linux and macOS are supported." ;;
    esac

    case "$(uname -m)" in
        x86_64|amd64)   arch="x64" ;;
        aarch64|arm64)  arch="arm64" ;;
        *)              fatal "Unsupported architecture: $(uname -m). Only x64 and arm64 are supported." ;;
    esac

    echo "${os}" "${arch}"
}

# --- Fetch release information ---
fetch_release() {
    local api_url="$GITHUB_API"

    if [[ -n "$VERSION" ]]; then
        api_url="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${VERSION}"
    fi

    info "Fetching release information from GitHub..."

    local response
    if command -v curl &>/dev/null; then
        response=$(curl -fsSL "$api_url" 2>/dev/null) || fatal "Failed to fetch release info. Check your internet connection or verify the version exists."
    elif command -v wget &>/dev/null; then
        response=$(wget -qO- "$api_url" 2>/dev/null) || fatal "Failed to fetch release info. Check your internet connection or verify the version exists."
    else
        fatal "Neither curl nor wget found. Please install one and try again."
    fi

    echo "$response"
}

# --- Find the download URL for the correct asset ---
find_asset_url() {
    local release_json="$1"
    local os="$2"
    local arch="$3"
    local pattern

    if [[ "$os" == "macos" ]]; then
        # Look for .dmg files matching the architecture
        if [[ "$arch" == "arm64" ]]; then
            pattern='\.dmg"'
            # Prefer arm64-specific DMG, fall back to universal or any DMG
            local url
            url=$(echo "$release_json" | grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*arm64[^"]*\.dmg"' | head -1 | grep -o 'https://[^"]*')
            if [[ -z "$url" ]]; then
                url=$(echo "$release_json" | grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*\.dmg"' | head -1 | grep -o 'https://[^"]*')
            fi
            echo "$url"
        else
            # x64: prefer x64-specific, then universal, then any DMG
            local url
            url=$(echo "$release_json" | grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*x64[^"]*\.dmg"' | head -1 | grep -o 'https://[^"]*')
            if [[ -z "$url" ]]; then
                url=$(echo "$release_json" | grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*\.dmg"' | head -1 | grep -o 'https://[^"]*')
            fi
            echo "$url"
        fi
    elif [[ "$os" == "linux" ]]; then
        # Look for .AppImage files matching the architecture
        if [[ "$arch" == "arm64" ]]; then
            local url
            url=$(echo "$release_json" | grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*arm64[^"]*\.AppImage"' | head -1 | grep -o 'https://[^"]*')
            if [[ -z "$url" ]]; then
                url=$(echo "$release_json" | grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*aarch64[^"]*\.AppImage"' | head -1 | grep -o 'https://[^"]*')
            fi
            if [[ -z "$url" ]]; then
                url=$(echo "$release_json" | grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*\.AppImage"' | head -1 | grep -o 'https://[^"]*')
            fi
            echo "$url"
        else
            local url
            url=$(echo "$release_json" | grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*x86_64[^"]*\.AppImage"' | head -1 | grep -o 'https://[^"]*')
            if [[ -z "$url" ]]; then
                url=$(echo "$release_json" | grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*x64[^"]*\.AppImage"' | head -1 | grep -o 'https://[^"]*')
            fi
            if [[ -z "$url" ]]; then
                url=$(echo "$release_json" | grep -o '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]*\.AppImage"' | head -1 | grep -o 'https://[^"]*')
            fi
            echo "$url"
        fi
    fi
}

# --- Extract version tag from release JSON ---
extract_version() {
    local release_json="$1"
    echo "$release_json" | grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"'
}

# --- Download file ---
download_file() {
    local url="$1"
    local dest="$2"

    info "Downloading: $(basename "$dest")"

    if command -v curl &>/dev/null; then
        curl -fSL --progress-bar -o "$dest" "$url" || fatal "Download failed."
    elif command -v wget &>/dev/null; then
        wget --show-progress -qO "$dest" "$url" || fatal "Download failed."
    fi
}

# --- Install on Linux (AppImage) ---
install_linux() {
    local file="$1"
    local install_path="/usr/local/bin/agenthub"

    info "Installing AppImage to ${install_path}..."

    chmod +x "$file"

    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would move $file to $install_path"
        return
    fi

    if [[ -w "/usr/local/bin" ]]; then
        mv "$file" "$install_path"
    else
        info "Root privileges required to install to /usr/local/bin"
        sudo mv "$file" "$install_path"
    fi

    ok "AgentHub installed to ${install_path}"
    info "Run 'agenthub' to start."
}

# --- Install on macOS (DMG) ---
install_macos() {
    local file="$1"
    local mount_point
    mount_point=$(mktemp -d)

    info "Mounting DMG..."

    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would mount $file, copy AgentHub.app to /Applications, and unmount"
        return
    fi

    hdiutil attach "$file" -mountpoint "$mount_point" -nobrowse -quiet || fatal "Failed to mount DMG."

    local app_path
    app_path=$(find "$mount_point" -maxdepth 1 -name "*.app" | head -1)

    if [[ -z "$app_path" ]]; then
        hdiutil detach "$mount_point" -quiet 2>/dev/null
        fatal "No .app bundle found inside the DMG."
    fi

    info "Copying $(basename "$app_path") to /Applications..."
    cp -R "$app_path" /Applications/ || {
        hdiutil detach "$mount_point" -quiet 2>/dev/null
        fatal "Failed to copy app to /Applications. You may need to run with sudo."
    }

    hdiutil detach "$mount_point" -quiet 2>/dev/null
    rm -f "$file"

    ok "AgentHub installed to /Applications"
    info "Open AgentHub from your Applications folder or Spotlight."
}

# --- Main ---
main() {
    printf "\n${BOLD}  AgentHub Installer${RESET}\n"
    printf "  https://github.com/${REPO_OWNER}/${REPO_NAME}\n\n"

    read -r os arch < <(detect_platform)
    ok "Detected platform: ${os} ${arch}"

    local release_json
    release_json=$(fetch_release)

    local version
    version=$(extract_version "$release_json")
    ok "Latest release: ${version}"

    local download_url
    download_url=$(find_asset_url "$release_json" "$os" "$arch")

    if [[ -z "$download_url" ]]; then
        fatal "No compatible package found for ${os} ${arch}. Check the releases page: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases"
    fi

    ok "Found package: $(basename "$download_url")"

    local tmpdir
    tmpdir=$(mktemp -d)
    trap 'rm -rf "$tmpdir"' EXIT

    local filename
    filename=$(basename "$download_url")
    local filepath="${tmpdir}/${filename}"

    download_file "$download_url" "$filepath"
    ok "Download complete."

    case "$os" in
        linux) install_linux "$filepath" ;;
        macos) install_macos "$filepath" ;;
    esac

    printf "\n${GREEN}${BOLD}  Installation complete!${RESET}\n\n"
}

main
