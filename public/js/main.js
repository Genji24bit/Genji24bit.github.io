/* ============================================================
   BLGOOOOO — 前端功能脚本
   ============================================================ */

'use strict';

// ============================================================
// DOM 就绪
// ============================================================
document.addEventListener('DOMContentLoaded', function() {

  // ============================================================
  // 1. 实时时钟
  // ============================================================
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const timeStr = h + ':' + m + ':' + s;

    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekday = days[now.getDay()];
    const dateStr = year + '年' + month + '月' + day + '日';

    // Hero 时钟
    const heroClock = document.getElementById('heroClock');
    if (heroClock) {
      const timeEl = heroClock.querySelector('.hero-clock-time');
      const dateEl = heroClock.querySelector('.hero-clock-date');
      if (timeEl) timeEl.textContent = timeStr;
      if (dateEl) dateEl.textContent = dateStr + ' 星期' + weekday;
    }

    // Footer 时钟
    const footerClock = document.getElementById('footerClock');
    if (footerClock) {
      const timeEl = footerClock.querySelector('.clock-time');
      const dateEl = footerClock.querySelector('.clock-date');
      if (timeEl) timeEl.textContent = timeStr;
      if (dateEl) dateEl.textContent = dateStr + ' 星期' + weekday;
    }

    // 统计数据时钟
    const statClock = document.getElementById('statClock');
    if (statClock) {
      const timeEl = statClock.querySelector('.stat-clock-time');
      const secEl = statClock.querySelector('.stat-clock-seconds');
      if (timeEl) timeEl.textContent = h + ':' + m;
      if (secEl) secEl.textContent = s;
    }

    // 访客统计（模拟）
    const visitorEl = document.getElementById('visitorCount');
    if (visitorEl && !visitorEl.dataset.initialized) {
      visitorEl.dataset.initialized = 'true';
      animateCounter(visitorEl, 128, 1500);
    }
  }

  updateClock();
  setInterval(updateClock, 1000);

  // 计数器动画
  function animateCounter(el, target, duration) {
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    function tick() {
      start += step;
      if (start >= target) {
        el.textContent = target.toLocaleString();
        return;
      }
      el.textContent = start;
      requestAnimationFrame(tick);
    }
    tick();
  }

  // ============================================================
  // 2. 滚动显示动画 (Intersection Observer)
  // ============================================================
  function initRevealAnimations() {
    const revealElements = document.querySelectorAll('[data-reveal]');
    if (revealElements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.dataset.delay) || 0;

          setTimeout(() => {
            el.classList.add('revealed');
          }, delay);

          observer.unobserve(el);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => observer.observe(el));
  }

  initRevealAnimations();

  // ============================================================
  // 3. 导航栏滚动效果
  // ============================================================
  function initNavScroll() {
    const header = document.querySelector('.header');
    if (!header) return;

    let lastScroll = 0;

    window.addEventListener('scroll', function() {
      const currentScroll = window.pageYOffset;

      if (currentScroll > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      lastScroll = currentScroll;
    }, { passive: true });
  }

  initNavScroll();

  // ============================================================
  // 4. 移动端菜单
  // ============================================================
  function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', function() {
      this.classList.toggle('active');
      navLinks.classList.toggle('open');
      document.body.classList.toggle('menu-open');
    });

    // 点击链接后关闭菜单
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
        document.body.classList.remove('menu-open');
      });
    });
  }

  initMobileMenu();

  // ============================================================
  // 5. 搜索功能
  // ============================================================
  function initSearch() {
    const toggle = document.getElementById('searchToggle');
    const overlay = document.getElementById('searchOverlay');
    const closeBtn = document.getElementById('searchClose');
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');

    if (!toggle || !overlay || !input || !results) return;

    let searchTimeout = null;

    function openSearch() {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => input.focus(), 300);
    }

    function closeSearch() {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      input.value = '';
      results.innerHTML = '<div class="search-empty">输入关键词开始搜索</div>';
    }

    toggle.addEventListener('click', openSearch);
    closeBtn.addEventListener('click', closeSearch);

    // 键盘事件
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeSearch();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
    });

    // 点击遮罩关闭
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeSearch();
    });

    // 搜索输入
    input.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      const query = this.value.trim();
      if (!query) {
        results.innerHTML = '<div class="search-empty">输入关键词开始搜索</div>';
        return;
      }

      searchTimeout = setTimeout(function() {
        performSearch(query);
      }, 300);
    });
  }

  function performSearch(query) {
    const results = document.getElementById('searchResults');

    // 先尝试 API 搜索（开发服务器模式）
    fetch('/api/search?q=' + encodeURIComponent(query))
      .then(r => r.json())
      .then(data => {
        renderSearchResults(data, query, results);
      })
      .catch(function() {
        // API 不可用，降级为客户端搜索（静态部署模式）
        clientSideSearch(query, results);
      });
  }

  function clientSideSearch(query, results) {
    const q = query.toLowerCase();
    Promise.all([
      fetch('/data/posts.json').then(r => r.json()).catch(() => []),
      fetch('/data/resources.json').then(r => r.json()).catch(() => [])
    ]).then(([posts, resources]) => {
      const matchedPosts = posts.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q)
      );
      const matchedResources = resources.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
      renderSearchResults({ posts: matchedPosts, resources: matchedResources }, query, results);
    }).catch(() => {
      results.innerHTML = '<div class="search-empty">搜索服务暂不可用</div>';
    });
  }

  function renderSearchResults(data, query, results) {
    if (data.posts.length === 0 && data.resources.length === 0) {
      results.innerHTML = '<div class="search-empty">没有找到与「' + query + '」相关的结果</div>';
      return;
    }

    let html = '';
    data.posts.forEach(post => {
      html += '<a href="/blog/' + post.id + '" class="search-result-item">' +
        '<span class="search-result-badge post">文章</span>' +
        '<h4>' + escapeHtml(post.title) + '</h4>' +
        '<p>' + escapeHtml((post.excerpt || '').substring(0, 120)) + '</p>' +
        '</a>';
    });
    data.resources.forEach(res => {
      html += '<a href="' + res.filePath + '" class="search-result-item">' +
        '<span class="search-result-badge resource">资源</span>' +
        '<h4>' + escapeHtml(res.title) + '</h4>' +
        '<p>' + escapeHtml((res.description || '').substring(0, 120)) + '</p>' +
        '</a>';
    });

    results.innerHTML = html;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  initSearch();

  // ============================================================
  // 6. 回到顶部
  // ============================================================
  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;

    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }, { passive: true });

    btn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  initBackToTop();

  // ============================================================
  // 7. 统计数字动画
  // ============================================================
  function initStatCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count) || 0;
          animateCounter(el, target, 1200);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));
  }

  initStatCounters();

  // ============================================================
  // 8. 友情链接/外部链接处理
  // ============================================================
  document.querySelectorAll('a[href^="http"]').forEach(link => {
    if (!link.href.includes(window.location.hostname)) {
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('target', '_blank');
    }
  });

  // ============================================================
  // 9. 加载 Giscus 评论（如果容器存在）
  // ============================================================
  function initGiscus() {
    const container = document.getElementById('giscus-container');
    if (!container) return;

    // 尝试从 data/giscus.json 加载配置（静态部署时）
    fetch('/data/giscus.json')
      .then(r => r.json())
      .then(config => {
        if (!config.enabled) return;

        const script = document.createElement('script');
        script.src = 'https://giscus.app/client.js';
        script.setAttribute('data-repo', config.repo);
        script.setAttribute('data-repo-id', config.repoId);
        script.setAttribute('data-category', config.category);
        script.setAttribute('data-category-id', config.categoryId);
        script.setAttribute('data-mapping', config.mapping);
        script.setAttribute('data-strict', '0');
        script.setAttribute('data-reactions-enabled', config.reactions);
        script.setAttribute('data-emit-metadata', config.metadata);
        script.setAttribute('data-input-position', 'top');
        script.setAttribute('data-theme', config.theme);
        script.setAttribute('data-lang', config.lang);
        script.setAttribute('crossorigin', 'anonymous');
        script.async = true;
        container.appendChild(script);
      })
      .catch(() => {
        // Giscus 配置不存在或加载失败，静默跳过
      });
  }

  initGiscus();

  // ============================================================
  // 10. 页面加载完成后隐藏闪烁
  // ============================================================
  document.body.style.opacity = '1';
});
