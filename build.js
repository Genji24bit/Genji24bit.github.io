// ============================================================
// BLGOOOOO — 静态网站构建脚本
// 将 Express 动态网站生成为纯静态 HTML，用于 GitHub Pages
// ============================================================

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}`;
const DIST = path.join(__dirname, 'dist');

// ============================================================
// 工具函数
// ============================================================
function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function savePage(urlPath, html) {
  // 将 /blog/post-id 保存为 blog/post-id/index.html
  let outputPath = urlPath === '/' ? 'index.html' : path.join(urlPath, 'index.html');
  outputPath = path.join(DIST, outputPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
  console.log(`  ✓ ${urlPath}`);
}

function waitForServer(url, timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      http.get(url, res => {
        resolve();
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Server start timeout'));
        } else {
          setTimeout(check, 300);
        }
      });
    }
    check();
  });
}

// ============================================================
// 主构建流程
// ============================================================
async function build() {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║    ✦  BLGOOOOO 静态构建工具  ✦     ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');

  // 清理 dist
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  fs.mkdirSync(DIST, { recursive: true });

  // 启动服务
  console.log('  📡 启动开发服务器...');
  const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.stdout.on('data', d => process.stdout.write(d));
  server.stderr.on('data', d => process.stderr.write(d));

  try {
    await waitForServer(BASE);
    console.log('  ✅ 服务器就绪\n');

    // ============================
    // 1. 构建页面
    // ============================
    console.log('  📄 生成页面...');

    const pages = [
      { url: '/', file: 'index.html' },
      { url: '/blog', file: 'blog/index.html' },
      { url: '/resources', file: 'resources/index.html' },
      { url: '/guestbook', file: 'guestbook/index.html' },
      { url: '/about', file: 'about/index.html' },
    ];

    for (const page of pages) {
      try {
        const html = await fetch(BASE + page.url);
        const outPath = path.join(DIST, page.file);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        // 替换服务端端口为静态路径
        const finalHtml = html.replace(new RegExp(`http://localhost:${PORT}`, 'g'), '');
        fs.writeFileSync(outPath, finalHtml);
        console.log(`  ✓ /${page.file}`);
      } catch (err) {
        console.log(`  ✗ ${page.url} — ${err.message}`);
      }
    }

    // ============================
    // 2. 构建博客文章详情页
    // ============================
    console.log('\n  📄 生成文章详情页...');
    try {
      const postsJson = fs.readFileSync(path.join(__dirname, 'data', 'posts.json'), 'utf-8');
      const posts = JSON.parse(postsJson);
      for (const post of posts) {
        const url = `/blog/${post.id}`;
        try {
          const html = await fetch(BASE + url);
          const finalHtml = html.replace(new RegExp(`http://localhost:${PORT}`, 'g'), '');
          const outPath = path.join(DIST, url, 'index.html');
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, finalHtml);
          console.log(`  ✓ ${url}`);
        } catch (err) {
          console.log(`  ✗ ${url} — ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`  ✗ 读取文章数据失败: ${err.message}`);
    }

    // ============================
    // 3. 复制静态资源
    // ============================
    console.log('\n  📦 复制静态资源...');
    copyDir(path.join(__dirname, 'public'), DIST);
    console.log('  ✓ public/ → dist/');

    // 复制数据文件（用于客户端搜索、Giscus 配置等）
    const dataDest = path.join(DIST, 'data');
    fs.mkdirSync(dataDest, { recursive: true });
    const dataFiles = ['posts.json', 'resources.json', 'giscus.json', 'site.json'];
    for (const file of dataFiles) {
      const src = path.join(__dirname, 'data', file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(dataDest, file));
      }
    }
    console.log('  ✓ data/ → dist/data/');

    // 复制上传的资源文件
    const uploadsSrc = path.join(__dirname, 'uploads');
    const uploadsDest = path.join(DIST, 'uploads');
    if (fs.existsSync(uploadsSrc)) {
      copyDir(uploadsSrc, uploadsDest);
      console.log('  ✓ uploads/ → dist/uploads/');
    }

    // 复制根目录头像（如果存在且与 public 中的不同）
    const rootAvatar = path.join(__dirname, 'avatar.png');
    if (fs.existsSync(rootAvatar)) {
      const destAvatar = path.join(DIST, 'images', 'avatar.png');
      if (!fs.existsSync(destAvatar)) {
        fs.copyFileSync(rootAvatar, destAvatar);
        console.log('  ✓ avatar.png → dist/images/');
      }
    }

    console.log('\n  ✨ 构建完成！');
    const distSize = getDirSize(DIST);
    console.log(`  📁 dist/ 大小: ${(distSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('');

  } finally {
    server.kill();
  }
}

function getDirSize(dir) {
  let size = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) size += getDirSize(p);
      else size += fs.statSync(p).size;
    }
  } catch {}
  return size;
}

build().catch(err => {
  console.error('构建失败:', err);
  process.exit(1);
});
