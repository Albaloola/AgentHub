#!/usr/bin/env bash
#
# generate-icons.sh — Generate platform-specific icons from public/icon.svg
#
# Requires: rsvg-convert (librsvg) or ImageMagick 7 (magick)
# Optional: iconutil (macOS only, for .icns generation)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SVG_SOURCE="$PROJECT_ROOT/public/icon.svg"
OUTPUT_DIR="$PROJECT_ROOT/packaging/icons"

# PNG sizes to generate
SIZES=(1024 512 256 128 64 32 16)

# ICO embeds these sizes
ICO_SIZES=(16 32 48 64 128 256)

# ──────────────────────────────────────────────
# Preflight checks
# ──────────────────────────────────────────────
if [[ ! -f "$SVG_SOURCE" ]]; then
  echo "ERROR: SVG source not found at $SVG_SOURCE"
  exit 1
fi

# Determine which rasterizer to use (prefer rsvg-convert for quality)
RASTERIZER=""
if command -v rsvg-convert &>/dev/null; then
  RASTERIZER="rsvg"
  echo "Using rsvg-convert for SVG rasterization"
elif command -v magick &>/dev/null; then
  RASTERIZER="magick"
  echo "Using ImageMagick (magick) for SVG rasterization"
else
  echo "ERROR: Neither rsvg-convert nor magick (ImageMagick 7) found."
  echo "Install one of them:"
  echo "  Arch:   pacman -S librsvg   OR   pacman -S imagemagick"
  echo "  Debian: apt install librsvg2-bin OR apt install imagemagick"
  echo "  macOS:  brew install librsvg  OR  brew install imagemagick"
  exit 1
fi

# Need ImageMagick for ICO generation regardless
HAS_MAGICK=false
if command -v magick &>/dev/null; then
  HAS_MAGICK=true
fi

# ──────────────────────────────────────────────
# Setup output directory
# ──────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"
echo "Output directory: $OUTPUT_DIR"
echo ""

# ──────────────────────────────────────────────
# Helper: rasterize SVG to PNG at a given size
# ──────────────────────────────────────────────
rasterize() {
  local size="$1"
  local output="$2"

  if [[ "$RASTERIZER" == "rsvg" ]]; then
    rsvg-convert -w "$size" -h "$size" "$SVG_SOURCE" -o "$output"
  else
    magick -background none -density 300 "$SVG_SOURCE" -resize "${size}x${size}" "$output"
  fi
}

# ──────────────────────────────────────────────
# Generate PNGs at all sizes
# ──────────────────────────────────────────────
echo "Generating PNG icons..."
for size in "${SIZES[@]}"; do
  if [[ "$size" -eq 1024 ]]; then
    outfile="$OUTPUT_DIR/icon.png"
  else
    outfile="$OUTPUT_DIR/icon-${size}.png"
  fi

  rasterize "$size" "$outfile"
  echo "  ${size}x${size}  ->  $(basename "$outfile")"
done
echo ""

# ──────────────────────────────────────────────
# Generate Windows ICO (multi-resolution)
# ──────────────────────────────────────────────
if [[ "$HAS_MAGICK" == true ]]; then
  echo "Generating Windows ICO..."

  # Build temporary PNGs for ICO sizes that may not be in our standard set
  ICO_INPUTS=()
  TEMP_FILES=()
  for size in "${ICO_SIZES[@]}"; do
    # Check if we already generated this size
    if [[ "$size" -eq 1024 ]]; then
      png="$OUTPUT_DIR/icon.png"
    else
      png="$OUTPUT_DIR/icon-${size}.png"
    fi

    if [[ -f "$png" ]]; then
      ICO_INPUTS+=("$png")
    else
      # Generate a temporary one (e.g., 48px is not in our standard set)
      tmp="$OUTPUT_DIR/.tmp-icon-${size}.png"
      rasterize "$size" "$tmp"
      ICO_INPUTS+=("$tmp")
      TEMP_FILES+=("$tmp")
    fi
  done

  magick "${ICO_INPUTS[@]}" "$OUTPUT_DIR/icon.ico"
  echo "  icon.ico  (sizes: ${ICO_SIZES[*]})"

  # Clean up temp files
  for tmp in "${TEMP_FILES[@]}"; do
    rm -f "$tmp"
  done
  echo ""
else
  echo "SKIP: Windows ICO generation requires ImageMagick (magick)."
  echo "      Install it to generate icon.ico"
  echo ""
fi

# ──────────────────────────────────────────────
# Generate macOS ICNS (requires iconutil, macOS only)
# ──────────────────────────────────────────────
if command -v iconutil &>/dev/null; then
  echo "Generating macOS ICNS..."

  ICONSET_DIR="$OUTPUT_DIR/icon.iconset"
  mkdir -p "$ICONSET_DIR"

  # macOS iconset requires specific filenames and sizes
  # Standard sizes: 16, 32, 128, 256, 512
  # @2x variants: 32(@2x of 16), 64(@2x of 32), 256(@2x of 128), 512(@2x of 256), 1024(@2x of 512)
  declare -A ICONSET_MAP=(
    ["icon_16x16.png"]=16
    ["icon_16x16@2x.png"]=32
    ["icon_32x32.png"]=32
    ["icon_32x32@2x.png"]=64
    ["icon_128x128.png"]=128
    ["icon_128x128@2x.png"]=256
    ["icon_256x256.png"]=256
    ["icon_256x256@2x.png"]=512
    ["icon_512x512.png"]=512
    ["icon_512x512@2x.png"]=1024
  )

  for name in "${!ICONSET_MAP[@]}"; do
    size="${ICONSET_MAP[$name]}"
    rasterize "$size" "$ICONSET_DIR/$name"
  done

  iconutil -c icns "$ICONSET_DIR" -o "$OUTPUT_DIR/icon.icns"
  rm -rf "$ICONSET_DIR"
  echo "  icon.icns"
  echo ""
else
  echo "SKIP: macOS ICNS generation requires iconutil (macOS only)."
  echo "      Run this script on macOS to generate icon.icns"
  echo ""
fi

# ──────────────────────────────────────────────
# Copy 512px icon to public/ for web use
# ──────────────────────────────────────────────
cp "$OUTPUT_DIR/icon-512.png" "$PROJECT_ROOT/public/icon-512.png"
echo "Copied icon-512.png to public/ for web use."

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo ""
echo "=== Icon generation complete ==="
echo ""
echo "Generated files:"
ls -lh "$OUTPUT_DIR"/icon* 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}'
echo ""
if [[ -f "$PROJECT_ROOT/public/icon-512.png" ]]; then
  echo "Web icon: public/icon-512.png"
fi
echo "SVG source: public/icon.svg"
