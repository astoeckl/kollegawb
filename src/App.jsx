import { useEffect, useMemo, useState } from 'react';
import contentDe from './content.html?raw';
import contentEn from './content-en.html?raw';
import './styles.css';

function App() {
  const [language, setLanguage] = useState(() => {
    const saved = window.localStorage.getItem('kollega_language');
    return saved === 'en' ? 'en' : 'de';
  });

  const content = useMemo(
    () => (language === 'en' ? contentEn : contentDe),
    [language],
  );

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem('kollega_language', language);
  }, [language]);

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

    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = nav?.querySelectorAll('.nav-links a') ?? [];

    const closeNav = () => {
      if (!nav) return;
      nav.classList.remove('nav-open');
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    };

    const onNavToggle = () => {
      if (!nav) return;
      const isOpen = nav.classList.toggle('nav-open');
      if (navToggle) navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    const onResize = () => {
      if (window.innerWidth > 768) closeNav();
    };

    navToggle?.addEventListener('click', onNavToggle);
    navLinks.forEach((link) => link.addEventListener('click', closeNav));
    window.addEventListener('resize', onResize);

    const leadForm = document.getElementById('lead-form');
    const businessEmailInput = document.getElementById('business_email');
    const leadStatus = document.getElementById('lead-status');
    const submitButton = leadForm?.querySelector('button[type="submit"]');

    const freeMailDomains = new Set([
      'gmail.com',
      'googlemail.com',
      'yahoo.com',
      'yahoo.de',
      'outlook.com',
      'hotmail.com',
      'live.com',
      'icloud.com',
      'me.com',
      'gmx.at',
      'gmx.de',
      'web.de',
      'aol.com',
      'proton.me',
      'protonmail.com',
    ]);

    const validateBusinessEmail = () => {
      if (!businessEmailInput) return true;

      const value = businessEmailInput.value.trim().toLowerCase();
      businessEmailInput.setCustomValidity('');

      if (!value || !value.includes('@')) return true;

      const domain = value.split('@')[1];
      if (freeMailDomains.has(domain)) {
        businessEmailInput.setCustomValidity(
          language === 'en'
            ? 'Please use your company business email address.'
            : 'Bitte eine Business-E-Mail-Adresse Ihres Unternehmens verwenden.',
        );
        return false;
      }

      return true;
    };

    const onLeadSubmit = (event) => {
      event.preventDefault();
      const isBusiness = validateBusinessEmail();
      if (!isBusiness) {
        businessEmailInput?.reportValidity();
        if (leadStatus) {
          leadStatus.className = 'lead-status error';
          leadStatus.textContent =
            language === 'en'
              ? 'Please use your company business email address.'
              : 'Bitte verwenden Sie eine Business-E-Mail-Adresse.';
        }
        return;
      }

      const form = leadForm;
      if (!form) return;

      if (leadStatus) {
        leadStatus.className = 'lead-status';
        leadStatus.textContent =
          language === 'en' ? 'Sending request...' : 'Anfrage wird gesendet...';
      }
      if (submitButton) submitButton.disabled = true;

      const formData = new FormData(form);
      const payload = {
        interesse: String(formData.get('interesse') ?? '').trim(),
        business_email: String(formData.get('business_email') ?? '').trim(),
        business_mobile: String(formData.get('business_mobile') ?? '').trim(),
        unternehmen: String(formData.get('unternehmen') ?? '').trim(),
        language,
      };

      fetch('/.netlify/functions/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result.message || `HTTP ${response.status}`);
          }

          form.reset();
          if (leadStatus) {
            leadStatus.className = 'lead-status success';
            leadStatus.textContent =
              language === 'en'
                ? 'Thanks, your demo request has been sent.'
                : 'Danke, Ihre Demo-Anfrage wurde gesendet.';
          }
        })
        .catch((error) => {
          if (leadStatus) {
            leadStatus.className = 'lead-status error';
            leadStatus.textContent =
              error?.message ||
              (language === 'en'
                ? 'Submission failed. Please try again.'
                : 'Senden fehlgeschlagen. Bitte erneut versuchen.');
          }
        })
        .finally(() => {
          if (submitButton) submitButton.disabled = false;
        });
    };

    const clearLeadStatus = () => {
      if (!leadStatus) return;
      leadStatus.className = 'lead-status';
      leadStatus.textContent = '';
    };

    const onBusinessEmailInput = () => {
      validateBusinessEmail();
      clearLeadStatus();
    };

    businessEmailInput?.addEventListener('input', onBusinessEmailInput);
    leadForm?.addEventListener('input', clearLeadStatus);
    leadForm?.addEventListener('submit', onLeadSubmit);

    return () => {
      revealObserver.disconnect();
      counterObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      navToggle?.removeEventListener('click', onNavToggle);
      navLinks.forEach((link) => link.removeEventListener('click', closeNav));
      businessEmailInput?.removeEventListener('input', onBusinessEmailInput);
      leadForm?.removeEventListener('input', clearLeadStatus);
      leadForm?.removeEventListener('submit', onLeadSubmit);
    };
  }, [language, content]);

  return (
    <>
      <div className="lang-switch" aria-label="Language switch">
        <button
          type="button"
          className={language === 'de' ? 'active' : ''}
          onClick={() => setLanguage('de')}
        >
          DE
        </button>
        <button
          type="button"
          className={language === 'en' ? 'active' : ''}
          onClick={() => setLanguage('en')}
        >
          EN
        </button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </>
  );
}

export default App;
