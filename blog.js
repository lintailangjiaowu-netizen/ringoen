(() => {
  'use strict';
  const categories = ['園の日々', 'あそびと療育', 'お知らせ'];
  const covers = {
    blocks: { src: 'assets/diary-blocks.svg', alt: '赤や緑の積み木を重ねたイラスト', caption: '積み木あそびをイメージしたイラストです。', width: 900, height: 640 },
    orchard: { src: 'assets/orchard.png', alt: 'りんごの木の下で遊ぶうさぎとクマのイラスト', caption: 'イラストはイメージです。実際の活動写真ではありません。' },
    book: { src: 'assets/bear-book.png', alt: '絵本を読むクマのイラスト', caption: 'イラストはイメージです。' },
    wave: { src: 'assets/bear-wave.png', alt: '手を振るクマのイラスト', caption: 'イラストはイメージです。' }
  };
  const node = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  function heading(tag, text) {
    const title = node(tag);
    let start = 0;
    for (const match of text.matchAll(/「[^」]{1,6}」/g)) {
      title.append(document.createTextNode(text.slice(start, match.index)), node('span', 'keep', match[0]));
      start = match.index + match[0].length;
    }
    title.append(document.createTextNode(text.slice(start)));
    return title;
  }
  function validate(value) {
    if (!value || typeof value !== 'object') throw new Error('記事の形式が正しくありません。');
    const limits = { id: 90, date: 10, title: 80, category: 20, summary: 220, body: 12000, cover: 20 };
    const post = {};
    for (const [key, max] of Object.entries(limits)) {
      if (typeof value[key] !== 'string' || !value[key].trim() || value[key].length > max) throw new Error('未入力の項目、または長すぎる項目があります。');
      post[key] = value[key].trim();
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(post.id)) throw new Error('記事IDを確認してください。');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date)) throw new Error('日付を確認してください。');
    const date = new Date(post.date + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== post.date) throw new Error('正しい日付を入力してください。');
    if (!categories.includes(post.category) || !Object.hasOwn(covers, post.cover)) throw new Error('カテゴリまたはイラストを確認してください。');
    post.sample = value.sample === true;
    return post;
  }
  function normalize(data) {
    if (!Array.isArray(data) || data.length > 300) throw new Error('記事データの形式、または件数を確認してください。');
    const posts = data.map(validate);
    if (new Set(posts.map(post => post.id)).size !== posts.length) throw new Error('記事IDが重複しています。');
    return posts.sort((a,b) => b.date.localeCompare(a.date));
  }
  function meta(post) {
    const row = node('div', 'blog-meta');
    const date = node('time', '', post.date.replaceAll('-', '.')); date.dateTime = post.date;
    row.append(date, node('span', 'blog-category', post.category));
    if (post.sample) row.append(node('span', 'sample-label', '見本記事'));
    return row;
  }
  function cover(post, small = false) {
    const info = covers[post.cover];
    const img = node('img', ['orchard','blocks'].includes(post.cover) ? 'blog-cover' : 'blog-cover blog-cover-character');
    img.src = info.src; img.alt = info.alt;
    img.width = info.width || (post.cover === 'orchard' ? 1536 : 1280);
    img.height = info.height || (post.cover === 'orchard' ? 1024 : 1280);
    img.decoding = 'async'; if (small) img.loading = 'lazy';
    return img;
  }
  function card(post) {
    const article = node('article', 'blog-card');
    const link = node('a', 'blog-card-link'); link.href = 'blog-post.html?id=' + encodeURIComponent(post.id);
    const content = node('div', 'blog-card-copy');
    content.append(meta(post), heading('h2', post.title), node('p', '', post.summary), node('span', 'text-link', '日記を読む ↗'));
    link.append(cover(post,true), content); article.append(link); return article;
  }
  function renderArticle(container, post) {
    container.replaceChildren();
    container.append(meta(post), heading('h1', post.title));
    if (post.sample) container.append(node('p', 'sample-notice', 'この記事は文章・構成の見本として作成した架空の1日です。実際の活動記録や、特定のお子さまのエピソードではありません。日付も見本です。'));
    container.append(node('p', 'blog-lead', post.summary));
    const figure = node('figure', 'blog-figure');
    figure.append(cover(post), node('figcaption', '', covers[post.cover].caption));
    container.append(figure);
    const body = node('div', 'blog-body');
    for (const paragraph of post.body.split(/\n\s*\n/)) {
      if (paragraph.startsWith('## ')) body.append(node('h2', '', paragraph.slice(3).trim()));
      else body.append(node('p', '', paragraph));
    }
    container.append(body);
  }
  window.AppleFieldBlog = { validate, normalize, renderArticle };
  let posts = [];
  try { posts = normalize(window.APPLE_FIELD_POSTS || []); }
  catch (error) {
    for (const target of document.querySelectorAll('[data-blog-list], [data-blog-article]')) target.replaceChildren(node('p', 'note', '記事データを読み込めませんでした。'));
    return;
  }
  const list = document.querySelector('[data-blog-list]');
  if (list) {
    const buttons = document.querySelectorAll('[data-blog-filter]');
    const availableCategories = new Set(posts.map(post => post.category));
    const filters = document.querySelector('.blog-filters');
    if (filters) filters.hidden = availableCategories.size < 2;
    buttons.forEach(button => {
      button.hidden = button.dataset.blogFilter !== 'すべて' && !availableCategories.has(button.dataset.blogFilter);
    });
    const renderList = category => {
      const matching = posts.filter(post => category === 'すべて' || post.category === category);
      const limit = Number(list.dataset.limit) || matching.length;
      list.replaceChildren(...matching.slice(0,limit).map(card));
      if (!matching.length) list.append(node('p', 'blog-empty', 'このカテゴリの記事は、これからお届けします。'));
      const count = document.querySelector('[data-blog-count]');
      if (count) count.textContent = `${matching.length}件の日記`;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.blogFilter === category)));
    };
    renderList('すべて');
    buttons.forEach(button => button.addEventListener('click', () => renderList(button.dataset.blogFilter)));
  }
  const article = document.querySelector('[data-blog-article]');
  if (article) {
    const id = new URLSearchParams(location.search).get('id') || posts[0]?.id;
    const post = posts.find(post => post.id === id);
    if (post) {
      renderArticle(article, post);
      document.title = `${post.title} | りんご園の日記`;
      const description = document.querySelector('meta[name="description"]');
      if (description) description.content = post.summary;
    } else article.replaceChildren(node('h1', '', '記事が見つかりませんでした'), node('p', '', '一覧から読みたい日記をお選びください。'));
  }
})();
