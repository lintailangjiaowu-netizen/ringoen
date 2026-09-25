(() => {
  'use strict';
  const api = window.AppleFieldBlog;
  const form = document.querySelector('#blog-editor-form');
  if (!api || !form) return;
  const storageKey = 'apple-field-blog-editor-v1';
  const status = document.querySelector('#editor-status');
  const preview = document.querySelector('#editor-preview');
  const select = document.querySelector('#article-select');
  const field = name => form.elements.namedItem(name);
  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  };
  const blank = () => ({ id: 'entry-' + Date.now().toString(36), date: today(), title:'', category:'園の日々', summary:'', body:'', cover:'blocks', sample:false });
  let posts = api.normalize(window.APPLE_FIELD_POSTS || []);
  let currentId = posts[0]?.id || blank().id;
  let dirty = false;
  let storageAvailable = true;
  const say = message => { status.textContent = message; };
  const readForm = () => ({
    id: currentId,
    date: field('date').value, title: field('title').value,
    category: field('category').value, summary: field('summary').value,
    body: field('body').value, cover: field('cover').value,
    sample: field('sample').checked
  });
  function updatePreview() {
    const raw = readForm();
    const value = { ...raw, date:raw.date || today(), title:raw.title || 'ここに記事のタイトルが入ります', summary:raw.summary || '今日の出来事を、短い言葉で紹介しましょう。', body:raw.body || 'ここに本文が入ります。' };
    try { api.renderArticle(preview, api.validate(value)); }
    catch { preview.textContent = '入力した日付や文字数を確認してください。'; }
    document.querySelector('#body-count').textContent = `${raw.body.length.toLocaleString()} / 12,000文字`;
  }
  function updateSelect() {
    select.replaceChildren();
    for (const post of posts) {
      const option = document.createElement('option'); option.value = post.id; option.textContent = post.title; select.append(option);
    }
    if (!posts.some(post => post.id === currentId)) {
      const option = document.createElement('option'); option.value = currentId; option.textContent = '新しい記事（下書き）'; select.append(option);
    }
    select.value = currentId;
  }
  function setForm(post) {
    currentId = post.id;
    for (const name of ['date','title','category','summary','body','cover']) field(name).value = post[name] || '';
    field('sample').checked = post.sample === true;
    dirty = false; updateSelect(); updatePreview();
  }
  function store() {
    try { localStorage.setItem(storageKey, JSON.stringify({version:1,posts,draft:readForm()})); storageAvailable = true; return true; }
    catch { storageAvailable = false; return false; }
  }
  function validateBundle(bundle) {
    if (!bundle || bundle.version !== 1) throw new Error('この編集画面のバックアップJSONを選んでください。');
    const normalized = api.normalize(bundle.posts);
    const draft = bundle.draft;
    if (!draft || typeof draft !== 'object') throw new Error('下書きのデータが見つかりません。');
    // 未完成の下書きも復元できるが、型・長さ・選択値は制限する。
    for (const [key,max] of Object.entries({id:90,date:10,title:80,category:20,summary:220,body:12000,cover:20})) {
      if(typeof draft[key] !== 'string' || draft[key].length > max) throw new Error('バックアップの項目を確認してください。');
    }
    api.validate({...draft,date:draft.date || today(),title:draft.title || '下書き',summary:draft.summary || '下書き',body:draft.body || '下書き'});
    return {posts:normalized,draft};
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content],{type}));
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  let initial = posts[0] || blank();
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const bundle = validateBundle(JSON.parse(stored));
      // 新しく配布された記事を消さないよう、保存データとID単位でまとめる。
      posts = api.normalize([...new Map([...posts,...bundle.posts].map(post=>[post.id,post])).values()]);
      initial = bundle.draft;
      say('このブラウザに保存した下書きを復元しました。');
    }
  } catch { say('保存済みの下書きを読み込めませんでした。サイトの記事を表示します。'); }
  setForm(initial);
  form.addEventListener('input',()=>{dirty=true; updatePreview(); say('編集中です。下書きを保存すると、あとから続きを書けます。');});
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(store()){dirty=false;say('下書きをこのブラウザに保存しました。サイトにはまだ反映されません。');}
    else say('ブラウザに保存できませんでした。「バックアップ保存」でファイルを保存してください。');
  });
  document.querySelector('#new-article').addEventListener('click',()=>{
    if(dirty && !confirm('未保存の編集内容があります。新しい記事に切り替えますか？')) return;
    setForm(blank()); say('新しい記事を書き始められます。'); field('title').focus();
  });
  select.addEventListener('change',()=>{
    const id=select.value;
    if(dirty && !confirm('未保存の編集内容があります。記事を切り替えますか？')) {select.value=currentId;return;}
    const post=posts.find(post=>post.id===id);
    if(post){setForm(post);say('記事を読み込みました。変更後は下書き保存、または書き出しをしてください。');}
  });
  document.querySelector('#backup-article').addEventListener('click',()=>{
    download('ringo-blog-backup.json',JSON.stringify({version:1,posts,draft:readForm()},null,2),'application/json');
    dirty=false; say('下書きと記事データのバックアップを書き出しました。');
  });
  document.querySelector('#restore-backup').addEventListener('change',async event=>{
    const file=event.target.files[0]; if(!file)return;
    try {
      if(file.size>10*1024*1024) throw new Error('10MB以下のバックアップを選んでください。');
      const bundle=validateBundle(JSON.parse(await file.text()));
      if(dirty && !confirm('未保存の編集内容を置き換えて、バックアップを読み込みますか？'))return;
      posts=bundle.posts; setForm(bundle.draft); const saved=store();
      say(saved?'バックアップを復元しました。':'バックアップを読み込みました。ブラウザへの保存はできていません。');
    } catch(error){say(error.message || 'バックアップを読み込めませんでした。');}
    finally {event.target.value='';}
  });
  document.querySelector('#export-article').addEventListener('click',()=>{
    if(!form.reportValidity())return;
    try {
      const post=api.validate(readForm());
      const next=api.normalize([...posts.filter(item=>item.id!==post.id),post]);
      const json=JSON.stringify(next,null,2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
      const exported = '// りんご園 ブログデータ\nwindow.APPLE_FIELD_POSTS = '+json+';\n';
      download('blog-data.js',exported,'text/javascript');
      document.querySelector('#export-fallback').hidden = false;
      document.querySelector('#export-text').value = exported;
      posts=next;store();dirty=false;updateSelect();
      say('書き出すデータを作成し、blog-data.jsのダウンロードを開始しました。保存したファイルをサイトフォルダの同名ファイルと置き換えてください。'+(storageAvailable?'':' ブラウザ保存はできていないため、バックアップも保存してください。'));
    } catch(error){say(error.message);}
  });
  document.querySelector('#copy-export').addEventListener('click',async()=>{
    const text=document.querySelector('#export-text');
    try { await navigator.clipboard.writeText(text.value); say('データをコピーしました。blog-data.jsの内容を置き換えて保存できます。'); }
    catch { text.focus();text.select();say('データを選択しました。コピーしてblog-data.jsへ保存してください。'); }
  });
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
})();
