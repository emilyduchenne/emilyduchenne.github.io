(function () {
  'use strict';

  const state = { filter: 'all', page: 0 };
  let allItems = [];

  const feedEl = document.getElementById('workFeed');
  const paginationEl = document.getElementById('pagination');
  const tabButtons = document.querySelectorAll('.work__tab');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxLabel = document.getElementById('lightboxLabel');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxSub = document.getElementById('lightboxSub');
  const lightboxLink = document.getElementById('lightboxLink');
  const lightboxClose = document.getElementById('lightboxClose');

  let lastFocusedEl = null;

  function isMobile() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  init();

  async function init() {
    readStateFromUrl();
    setActiveTab();

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        state.filter = btn.dataset.filter;
        state.page = 0;
        setActiveTab();
        writeStateToUrl();
        render();
      });
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
    });

    const [videos, articles] = await Promise.all([loadVideos(), loadArticles()]);
    allItems = [...videos, ...articles].sort((a, b) => new Date(b.date) - new Date(a.date));
    render();
  }

  async function loadVideos() {
    if (!CONFIG.BEHOLD_FEED_ID || CONFIG.BEHOLD_FEED_ID === 'REPLACE_ME') {
      console.warn('Behold feed ID not set in js/config.js — no videos will load.');
      return [];
    }
    try {
      const res = await fetch(`https://feeds.behold.so/${CONFIG.BEHOLD_FEED_ID}`);
      if (!res.ok) throw new Error(`Behold feed responded ${res.status}`);
      const data = await res.json();
      return (data.posts || [])
        .filter(post => post.mediaType === 'VIDEO')
        .map(mapBeholdPost);
    } catch (err) {
      console.error('Failed to load Instagram feed from Behold', err);
      return [];
    }
  }

  function mapBeholdPost(post) {
    const isPlayable = post.mediaType === 'VIDEO';
    const sizes = post.sizes || {};
    const cover = (sizes.medium && sizes.medium.mediaUrl) || post.thumbnailUrl || post.mediaUrl;
    const large = (sizes.large && sizes.large.mediaUrl) || cover;
    const caption = post.prunedCaption || post.caption || '';
    const lines = caption.split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0] || 'View on Instagram';
    const sub = lines.slice(1).join(' ');

    return {
      type: 'video',
      isPlayable,
      title,
      sub,
      outlet: 'Instagram',
      date: post.timestamp,
      image: cover,
      largeImage: large,
      url: post.permalink,
    };
  }

  async function loadArticles() {
    try {
      const res = await fetch('articles.json');
      const articles = await res.json();
      return articles.map(a => ({ type: 'article', ...a }));
    } catch (err) {
      console.error('Failed to load data/articles.json', err);
      return [];
    }
  }

  function hasUrl(url) {
    return typeof url === 'string' && url.trim() !== '' && url.trim() !== '#';
  }

  function getFilteredItems() {
    if (state.filter === 'all') return allItems;
    return allItems.filter(it => it.type === state.filter);
  }

  function render() {
    const filtered = getFilteredItems();
    const perPage = CONFIG.ITEMS_PER_PAGE;
    const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
    state.page = Math.min(state.page, pageCount - 1);

    const pageItems = filtered.slice(state.page * perPage, state.page * perPage + perPage);
    renderFeed(pageItems, filtered.length);
    renderPagination(pageCount);
  }

  function renderFeed(items, totalCount) {
    feedEl.innerHTML = '';

    if (totalCount === 0) {
      const empty = document.createElement('p');
      empty.className = 'work__empty';
      empty.textContent = 'Nothing here yet — check back soon.';
      feedEl.appendChild(empty);
      return;
    }

    items.forEach(it => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'work-item';

      const label = it.type === 'video' ? 'Video' : 'Article';
      const metaEl = document.createElement('span');
      metaEl.className = 'work-item__label';
      metaEl.textContent = `${label} · ${it.outlet}`;

      const titleEl = document.createElement('span');
      titleEl.className = 'work-item__title';
      titleEl.textContent = it.title;

      const subEl = document.createElement('span');
      subEl.className = 'work-item__sub';
      subEl.textContent = it.sub;

      if (it.type === 'video') {
        const cover = document.createElement('div');
        cover.className = 'work-item__cover';
        const img = document.createElement('img');
        img.src = it.image;
        img.alt = '';
        img.loading = 'lazy';
        cover.appendChild(img);
        if (it.isPlayable) {
          const play = document.createElement('span');
          play.className = 'work-item__play';
          play.setAttribute('aria-hidden', 'true');
          play.textContent = '▶';
          cover.appendChild(play);
        }
        card.appendChild(cover);
        card.appendChild(metaEl);
        card.appendChild(titleEl);
        card.appendChild(subEl);
        card.addEventListener('click', () => {
          if (isMobile()) {
            window.open(it.url, '_blank', 'noopener');
          } else {
            openLightbox(it);
          }
        });
      } else {
        card.appendChild(metaEl);
        card.appendChild(titleEl);
        card.appendChild(subEl);
        const cover = document.createElement('div');
        cover.className = 'work-item__cover work-item__cover--article';
        const img = document.createElement('img');
        img.src = it.image;
        img.alt = '';
        img.loading = 'lazy';
        cover.appendChild(img);
        card.appendChild(cover);
        if (hasUrl(it.url)) {
          const read = document.createElement('span');
          read.className = 'work-item__read';
          read.textContent = 'Read the piece →';
          card.appendChild(read);
          card.addEventListener('click', () => window.open(it.url, '_blank', 'noopener'));
        } else {
          card.classList.add('work-item--static');
        }
      }

      feedEl.appendChild(card);
    });
  }

  function renderPagination(pageCount) {
    paginationEl.innerHTML = '';
    if (pageCount <= 1) {
      paginationEl.hidden = true;
      return;
    }
    paginationEl.hidden = false;

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'pagination__arrow';
    prev.textContent = '←';
    prev.setAttribute('aria-label', 'Previous page');
    prev.disabled = state.page === 0;
    prev.addEventListener('click', () => goToPage(state.page - 1));
    paginationEl.appendChild(prev);

    for (let i = 0; i < pageCount; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.type = 'button';
      pageBtn.className = 'pagination__page';
      pageBtn.textContent = String(i + 1);
      pageBtn.setAttribute('aria-current', String(i === state.page));
      pageBtn.addEventListener('click', () => goToPage(i));
      paginationEl.appendChild(pageBtn);
    }

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'pagination__arrow';
    next.textContent = '→';
    next.setAttribute('aria-label', 'Next page');
    next.disabled = state.page === pageCount - 1;
    next.addEventListener('click', () => goToPage(state.page + 1));
    paginationEl.appendChild(next);
  }

  function goToPage(page) {
    state.page = page;
    writeStateToUrl();
    render();
    document.getElementById('work').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setActiveTab() {
    tabButtons.forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === state.filter));
    });
  }

  function readStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const page = parseInt(params.get('page'), 10);
    if (type === 'all' || type === 'video' || type === 'article') state.filter = type;
    if (!Number.isNaN(page) && page > 0) state.page = page - 1;
  }

  function writeStateToUrl() {
    const params = new URLSearchParams();
    if (state.filter !== 'all') params.set('type', state.filter);
    if (state.page > 0) params.set('page', String(state.page + 1));
    const query = params.toString();
    const url = window.location.pathname + (query ? `?${query}` : '');
    window.history.replaceState(null, '', url);
  }

  function openLightbox(it) {
    lastFocusedEl = document.activeElement;
    lightboxImg.src = it.largeImage || it.image;
    lightboxImg.alt = it.title;
    lightboxLabel.textContent = `${it.type === 'video' ? 'Video' : 'Article'} · ${it.outlet}`;
    lightboxTitle.textContent = it.title;
    lightboxSub.textContent = it.sub;
    lightboxLink.href = it.url;
    lightboxLink.textContent = it.isPlayable ? 'Watch on Instagram' : 'View on Instagram';

    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    if (lastFocusedEl) lastFocusedEl.focus();
  }
})();
