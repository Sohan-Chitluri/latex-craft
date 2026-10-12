# latex-craft System Requirements

`latex-craft` is designed to be lightweight (~50MB footprint) without requiring a multi-gigabyte TeX Live distribution. It relies on three fast, native CLI tools:

| Tool | Purpose | Recommended Installation |
| :--- | :--- | :--- |
| **`tectonic`** | Modern XeTeX engine (downloads packages from CTAN on-demand) | Nix: `nixpkgs#tectonic` <br> Mac: `brew install tectonic` <br> Linux: `curl https://drop-sh.fullyjustified.net \| sh` |
| **`poppler-utils`** (`pdftoppm`, `pdfinfo`) | High-resolution PDF-to-image rasterization for multimodal visual inspection | Nix: `nixpkgs#poppler-utils` <br> Mac: `brew install poppler` <br> Debian/Ubuntu: `sudo apt install poppler-utils` |
| **`pandoc`** | Word (`.docx`) and Markdown (`.md`) to LaTeX conversion with media extraction | Nix: `nixpkgs#pandoc` <br> Mac: `brew install pandoc` <br> Debian/Ubuntu: `sudo apt install pandoc` |
| **`Node.js`** | `>= 18.0.0` runtime | [nodejs.org](https://nodejs.org) |

---

## One-Liner Install Commands

### NixOS / Nix Flakes
```bash
nix profile add nixpkgs#tectonic nixpkgs#poppler-utils nixpkgs#pandoc
```

### macOS (Homebrew)
```bash
brew install tectonic poppler pandoc
```

### Ubuntu / Debian
```bash
sudo apt update && sudo apt install -y poppler-utils pandoc
curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh
```

### Arch Linux
```bash
sudo pacman -S tectonic poppler pandoc
```

---

## Verifying Your Environment
You can verify your installation at any time by running:
```bash
npx latex-craft doctor
```
