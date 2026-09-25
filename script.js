// キーボード・外側のクリックでもメニューを閉じる。
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
if (toggle && nav) {
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  const closeMenu = () => { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); };
  toggle.addEventListener('click', () => {
    const open = !isOpen();
    toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) { closeMenu(); toggle.focus(); }
  });
  document.addEventListener('click', event => {
    if (isOpen() && !nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  window.matchMedia('(min-width: 1101px)').addEventListener('change', closeMenu);
}

// 初期状態から本文を表示し、JS無効時にも読めるようにする。
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const runningAnimations = new Set();
function play(element, keyframes, options) {
  if (reducedMotion.matches || typeof element.animate !== 'function') return;
  const animation = element.animate(keyframes, options);
  runningAnimations.add(animation);
  const release = () => runningAnimations.delete(animation);
  animation.addEventListener('finish', release, { once: true });
  animation.addEventListener('cancel', release, { once: true });
}
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    for (const animation of runningAnimations) animation.cancel();
    runningAnimations.clear();
  }
});
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      observer.unobserve(element);
      if (element.classList.contains('bear-accent')) {
        play(element, [
          { transform: 'rotate(0deg) translateY(0)' },
          { transform: 'rotate(-3deg) translateY(-4px)', offset: .3 },
          { transform: 'rotate(2deg) translateY(-2px)', offset: .65 },
          { transform: 'rotate(0deg) translateY(0)' }
        ], { duration: 1100, easing: 'ease-in-out' });
      } else {
        const delay = Math.min(Array.from(element.parentElement.children).indexOf(element), 2) * 65;
        play(element, [
          { opacity: .8, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 420, delay, easing: 'cubic-bezier(.2,.65,.3,1)' });
      }
    });
  }, { threshold: .12 });
  document.querySelectorAll('.feature, .room, .therapy-detail, .room-profile, .staff-card, .work-card, .news-item, .blog-card, .bear-accent').forEach(element => observer.observe(element));
}
// details本来の開閉とキーボード操作を保ったまま、回答を軽く表示する。
document.querySelectorAll('.faq details').forEach(details => {
  details.addEventListener('toggle', () => {
    if (!details.open) return;
    const answer = details.querySelector('.answer');
    if (answer) play(answer, [
      { opacity: .25, transform: 'translateY(-5px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 240, easing: 'ease-out' });
  });
});
