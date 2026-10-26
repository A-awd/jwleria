// Builds the shipped files from these readable sources: `node src/build.cjs` (needs bun, preinstalled at ~/.bun/bin/bun).
// app.js: bun whitespace + syntax minify (identifiers kept). style.css: comments/whitespace removed, custom properties shortened.
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const B = path.join(__dirname, '..') + '/', tmp = path.join(os.tmpdir(), 'jwl-b-app.js');
const bun = fs.existsSync(path.join(os.homedir(), '.bun/bin/bun')) ? path.join(os.homedir(), '.bun/bin/bun') : 'bun';
execFileSync(bun, ['build', B + 'src/app.js', '--minify-whitespace', '--minify-syntax', '--outfile=' + tmp], { stdio: 'pipe' });
fs.writeFileSync(B + 'app.js', '/* Jwleria direction B «الفهرس» — design preview. Built from src/app.js (whitespace-minified; edit the source). */\n' + fs.readFileSync(tmp, 'utf8').trim() + '\n');
const css = fs.readFileSync(B + 'src/style.css', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1').replace(/:\s+/g, ':').replace(/;}/g, '}')
  .replace(/--(muted|line2|line|panel|ink2|ink|gut|bg|ar|lt)\b/g, (_, n) => '--' + ({ muted: 'm', line2: 'l2', line: 'l', panel: 'p', ink2: 'i2', ink: 'i', gut: 'g', bg: 'bg', ar: 'f', lt: 'fl' })[n])
  .replace(/}/g, '}\n').trim();
fs.writeFileSync(B + 'style.css', '/* Jwleria direction B «الفهرس» — design preview. Built from src/style.css (minified; edit the source). */\n' + css + '\n');
console.log('app.js', fs.statSync(B + 'app.js').size, 'style.css', fs.statSync(B + 'style.css').size);
