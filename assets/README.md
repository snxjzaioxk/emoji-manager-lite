Icon assets

Place platform icons here:

- Windows: icon.ico
  - Multi-size ICO including at least 256, 128, 64, 32, 16 px.
  - Source suggestion: start from a 1024x1024 PNG and export ICO.

- macOS: icon.icns
  - Generated from a 1024x1024 PNG.

- Linux: icons/ (folder)
  - PNGs named 16x16.png, 32x32.png, 48x48.png, 64x64.png, 128x128.png, 256x256.png, 512x512.png.

Tips to generate icons locally:

- One command (recommended):
  - Put your 1024x1024 PNG at `assets/icon.png`
  - Run: `npm run icons`
  - Outputs: `assets/icon.ico`, `assets/icon.icns`, and PNG sizes in `assets/icons/`

- Using ImageMagick (Windows/macOS/Linux):
  - ico: magick input.png -define icon:auto-resize=256,128,64,48,32,16 assets/icon.ico
  - icns: magick input.png -resize 1024x1024 assets/icon_1024.png (then use an icns generator)
