import { useEffect } from 'react';
import content from './content.html?raw';
import './styles.css';

function App() {
  useEffect(() => {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach((el) => revealObserver.observe(el));

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target;
          const target = parseInt(el.dataset.target ?? '0', 10);
          const suffix = el.dataset.suffix || '';
          const duration = 2000;
          const start = performance.now();

          const animate = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - (1 - progress) ** 3;
            const current = Math.round(eased * target);
            el.textContent = `${current}${suffix}`;
            if (progress < 1) requestAnimationFrame(animate);
          };

          requestAnimationFrame(animate);
          counterObserver.unobserve(el);
        });
      },
      { threshold: 0.5 },
    );

    const counterElements = document.querySelectorAll('.counter');
    counterElements.forEach((el) => counterObserver.observe(el));

    const onScroll = () => {
      const nav = document.getElementById('nav');
      if (!nav) return;
      nav.classList.toggle('scrolled', window.scrollY > 50);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      revealObserver.disconnect();
      counterObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

export default App;
