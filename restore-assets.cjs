const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

async function scan(dir) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await scan(file));
    else if ((await fs.stat(file)).size < 200) {
      const match = (await fs.readFile(file, 'utf8')).match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]+)\r?\nsize (\d+)/);
      if (match) files.push({ file, hash: match[1], size: Number(match[2]) });
    }
  }
  return files;
}

async function main() {
  const files = await scan(path.join(__dirname, 'src/assets'));
  console.log(`${files.length} Git LFS pointers to restore`);
  let completed = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (files.length) {
      const item = files.pop();
      const relative = path.relative(__dirname, item.file).split(path.sep).map(encodeURIComponent).join('/');
      const response = await fetch(`https://media.githubusercontent.com/media/Vincexodus/PCBuild3R/main/${relative}`);
      if (!response.ok) throw new Error(`${relative}: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length !== item.size || createHash('sha256').update(bytes).digest('hex') !== item.hash) throw new Error(`Invalid asset: ${relative}`);
      await fs.writeFile(item.file, bytes);
      console.log(`Restored ${++completed}: ${relative}`);
    }
  }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
