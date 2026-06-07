// ============================================================
// BLGOOOOO — 个人博客服务端
// ============================================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 基础配置
// ============================================================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================================
// 数据目录初始化
// ============================================================
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'resources');
[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 预置默认数据文件
const DEFAULT_DATA = {
  'posts.json': [],
  'comments.json': [],
  'resources.json': [],
  'guestbook.json': []
};

Object.entries(DEFAULT_DATA).forEach(([file, defaultContent]) => {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, JSON.stringify(defaultContent, null, 2), 'utf-8');
  }
});

// ============================================================
// 数据读写辅助
// ============================================================
function readJSON(filename) {
  const fp = path.join(DATA_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch {
    return [];
  }
}

function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================
// 文件上传配置
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => cb(null, true)
});

// ============================================================
// 页面路由
// ============================================================

// 首页
app.get('/', (req, res) => {
  const posts = readJSON('posts.json');
  const resources = readJSON('resources.json');
  const site = readJSON('site.json');
  res.render('index', {
    site,
    posts: posts.slice(0, 4),
    resources: resources.slice(0, 4),
    page: 'home',
    currentUrl: '/'
  });
});

// 博客列表
app.get('/blog', (req, res) => {
  const posts = readJSON('posts.json');
  const site = readJSON('site.json');
  const { tag, search, page = 1 } = req.query;

  let filtered = [...posts];
  if (tag) {
    filtered = filtered.filter(p => Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.excerpt || '').toLowerCase().includes(q) ||
      (p.content || '').toLowerCase().includes(q)
    );
  }

  // 分页
  const perPage = 8;
  const totalPosts = filtered.length;
  const totalPages = Math.ceil(totalPosts / perPage) || 1;
  const currentPage = Math.min(Math.max(1, parseInt(page)), totalPages);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // 提取所有标签
  const allTags = [...new Set(posts.flatMap(p => p.tags || []))];

  res.render('blog', {
    site,
    posts: paged,
    totalPages,
    currentPage,
    totalPosts,
    allTags,
    activeTag: tag || null,
    searchQuery: search || null
  });
});

// 文章详情
app.get('/blog/:id', (req, res) => {
  const posts = readJSON('posts.json');
  const comments = readJSON('comments.json');
  const site = readJSON('site.json');

  const post = posts.find(p => p.id === req.params.id);
  if (!post) {
    return res.status(404).render('404', { site });
  }

  // 增加浏览量
  post.views = (post.views || 0) + 1;
  const idx = posts.findIndex(p => p.id === req.params.id);
  posts[idx] = post;
  writeJSON('posts.json', posts);

  const postComments = comments.filter(c => c.postId === req.params.id);

  // 相关文章（同标签）
  const related = posts
    .filter(p => p.id !== post.id && p.tags?.some(t => post.tags?.includes(t)))
    .slice(0, 3);

  res.render('post', {
    site,
    post,
    comments: postComments,
    related
  });
});

// 资源页
app.get('/resources', (req, res) => {
  const resources = readJSON('resources.json');
  const site = readJSON('site.json');
  const { category, search } = req.query;

  let filtered = [...resources];
  const categories = [...new Set(resources.map(r => r.category).filter(Boolean))];

  if (category && category !== 'all') {
    filtered = filtered.filter(r => r.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r =>
      (r.title || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    );
  }

  res.render('resources', {
    site,
    resources: filtered,
    categories,
    activeCategory: category || 'all',
    searchQuery: search || null
  });
});

// 留言板
app.get('/guestbook', (req, res) => {
  const messages = readJSON('guestbook.json');
  const site = readJSON('site.json');
  res.render('guestbook', { site, messages });
});

// 关于页
app.get('/about', (req, res) => {
  const site = readJSON('site.json');
  res.render('about', { site });
});

// ============================================================
// API 路由
// ============================================================

// 搜索 API
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ posts: [], resources: [] });

  const posts = readJSON('posts.json');
  const resources = readJSON('resources.json');
  const query = q.toLowerCase();

  const matchedPosts = posts.filter(p =>
    (p.title || '').toLowerCase().includes(query) ||
    (p.excerpt || '').toLowerCase().includes(query) ||
    (p.content || '').toLowerCase().includes(query)
  ).map(({ content, ...rest }) => rest);

  const matchedResources = resources.filter(r =>
    (r.title || '').toLowerCase().includes(query) ||
    (r.description || '').toLowerCase().includes(query)
  );

  res.json({ posts: matchedPosts, resources: matchedResources });
});

// 发布博客文章
app.post('/api/posts', (req, res) => {
  const { title, content, excerpt, tags, coverImage } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '请填写标题和内容' });
  }

  const posts = readJSON('posts.json');
  const newPost = {
    id: uuidv4(),
    title,
    content,
    excerpt: excerpt || content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
    tags: tags || [],
    coverImage: coverImage || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0
  };
  posts.unshift(newPost);
  writeJSON('posts.json', posts);
  res.json(newPost);
});

// 发表评论
app.post('/api/comments', (req, res) => {
  const { postId, name, email, content } = req.body;
  if (!postId || !name || !content) {
    return res.status(400).json({ error: '请填写必要信息' });
  }

  const comments = readJSON('comments.json');
  const newComment = {
    id: uuidv4(),
    postId,
    name,
    email: email || '',
    content,
    createdAt: new Date().toISOString()
  };
  comments.push(newComment);
  writeJSON('comments.json', comments);
  res.json(newComment);
});

// 留言板提交
app.post('/api/guestbook', (req, res) => {
  const { name, email, content, website } = req.body;
  if (!name || !content) {
    return res.status(400).json({ error: '请填写昵称和留言内容' });
  }

  const messages = readJSON('guestbook.json');
  const newMessage = {
    id: uuidv4(),
    name,
    email: email || '',
    website: website || '',
    content,
    createdAt: new Date().toISOString()
  };
  messages.unshift(newMessage);
  writeJSON('guestbook.json', messages);
  res.json(newMessage);
});

// 资源上传
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });

  const resources = readJSON('resources.json');
  const newResource = {
    id: uuidv4(),
    title: req.body.title || req.file.originalname,
    description: req.body.description || '',
    category: req.body.category || '其他',
    fileName: req.file.originalname,
    filePath: `/uploads/resources/${req.file.filename}`,
    fileSize: req.file.size,
    downloads: 0,
    createdAt: new Date().toISOString()
  };
  resources.unshift(newResource);
  writeJSON('resources.json', resources);
  res.json(newResource);
});

// 资源下载（计数）
app.post('/api/resources/:id/download', (req, res) => {
  const resources = readJSON('resources.json');
  const idx = resources.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '资源不存在' });

  resources[idx].downloads = (resources[idx].downloads || 0) + 1;
  writeJSON('resources.json', resources);
  res.json({ downloads: resources[idx].downloads });
});

// ============================================================
// 404
// ============================================================
app.use((req, res) => {
  const site = readJSON('site.json');
  res.status(404).render('404', { site, page: '404' });
});

// ============================================================
// 启动
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║        ✦  BLGOOOOO 博客  ✦          ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  本地: http://localhost:${PORT}         ║`);
  console.log('  ║  网络: http://192.168.x.x:' + PORT + '        ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
