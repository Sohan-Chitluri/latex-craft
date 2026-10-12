/**
 * Environment & System Requirements Doctor for latex-craft
 */

const { execSync } = require('child_process');
const fs = require('fs');

function checkTool(name, versionCmd) {
  try {
    const output = execSync(versionCmd + ' 2>&1', { stdio: 'pipe', encoding: 'utf-8' });
    const firstLine = output.trim().split('\n')[0];
    return { name, installed: true, version: firstLine };
  } catch (err) {
    return { name, installed: false, error: err.message };
  }
}

function detectOS() {
  if (process.platform === 'darwin') return 'macos';
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'linux') {
    if (fs.existsSync('/etc/os-release')) {
      const content = fs.readFileSync('/etc/os-release', 'utf-8').toLowerCase();
      if (content.includes('nixos')) return 'nixos';
      if (content.includes('ubuntu') || content.includes('debian')) return 'debian';
      if (content.includes('arch') || content.includes('manjaro')) return 'arch';
      if (content.includes('fedora') || content.includes('rhel')) return 'fedora';
    }
    return 'linux';
  }
  return 'unknown';
}

function getInstallInstructions(os, missingTools) {
  const instructions = [];
  const toolNames = missingTools.map(t => t.name);

  if (os === 'nixos') {
    const nixPkgs = [];
    if (toolNames.includes('tectonic')) nixPkgs.push('nixpkgs#tectonic');
    if (toolNames.includes('pdftoppm') || toolNames.includes('pdfinfo')) nixPkgs.push('nixpkgs#poppler-utils');
    if (toolNames.includes('pandoc')) nixPkgs.push('nixpkgs#pandoc');
    instructions.push(`nix profile add ${nixPkgs.join(' ')}`);
  } else if (os === 'macos') {
    instructions.push(`brew install ${toolNames.join(' ')}`);
  } else if (os === 'arch') {
    instructions.push(`sudo pacman -S ${toolNames.join(' ')}`);
  } else if (os === 'debian') {
    instructions.push(`sudo apt update && sudo apt install -y poppler-utils pandoc`);
    if (toolNames.includes('tectonic')) {
      instructions.push(`curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh`);
    }
  } else {
    instructions.push('Please install tectonic, poppler-utils, and pandoc using your system package manager.');
  }

  return instructions;
}

function runDoctor() {
  const checks = [
    checkTool('tectonic', 'tectonic --version'),
    checkTool('pdftoppm', 'pdftoppm -v'),
    checkTool('pdfinfo', 'pdfinfo -v'),
    checkTool('pandoc', 'pandoc -v'),
  ];

  const os = detectOS();
  const missing = checks.filter(c => !c.installed);

  console.log(`\n🩺 latex-craft System Doctor`);
  console.log(`Detected OS: ${os.toUpperCase()}`);
  console.log(`Node.js:     ${process.version}\n`);

  checks.forEach(c => {
    if (c.installed) {
      console.log(`  ✓ ${c.name.padEnd(12)} : ${c.version}`);
    } else {
      console.log(`  ✗ ${c.name.padEnd(12)} : NOT FOUND`);
    }
  });

  if (missing.length === 0) {
    console.log(`\n🎉 All required tools are installed and ready to use!\n`);
    return { ok: true, checks };
  } else {
    console.log(`\n⚠️  Missing ${missing.length} required tool(s).`);
    console.log(`\nTo install on ${os}:`);
    const instructions = getInstallInstructions(os, missing);
    instructions.forEach(cmd => console.log(`  $ ${cmd}`));
    console.log('');
    return { ok: false, checks, missing };
  }
}

module.exports = { runDoctor, detectOS, checkTool };
