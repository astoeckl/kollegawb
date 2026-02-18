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
      const body = new URLSearchParams(formData).toString();
      const buildMailtoHref = () => {
        const interesse = String(formData.get('interesse') ?? '').trim();
        const businessEmail = String(formData.get('business_email') ?? '').trim();
        const businessMobile = String(formData.get('business_mobile') ?? '').trim();
        const unternehmen = String(formData.get('unternehmen') ?? '').trim();
        const subject = interesse
          ? `Kollega Demo Anfrage - ${interesse}`
          : 'Kollega Demo Anfrage';
        const bodyLines =
          language === 'en'
            ? [
                'Hello 506.ai team,',
                '',
                'I am interested in a Kollega demo.',
                `Role: ${interesse || '-'}`,
                `Business email: ${businessEmail || '-'}`,
                `Business mobile: ${businessMobile || '-'}`,
                `Company: ${unternehmen || '-'}`,
              ]
            : [
                'Hallo 506.ai Team,',
                '',
                'ich interessiere mich fuer eine Kollega-Demo.',
                `Gewuenschter Kollega: ${interesse || '-'}`,
                `Business-E-Mail: ${businessEmail || '-'}`,
                `Business-Mobilnummer: ${businessMobile || '-'}`,
                `Unternehmen: ${unternehmen || '-'}`,
              ];
        return `mailto:andreas.stoeckl@506.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
      };

      fetch('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })
        .then((response) => {
          if (!response.ok && response.status === 404) {
            window.location.href = buildMailtoHref();
            if (leadStatus) {
              leadStatus.className = 'lead-status success';
              leadStatus.textContent =
                language === 'en'
                  ? 'Netlify form endpoint is unavailable. Your email app has been opened with a prefilled request.'
                  : 'Netlify-Formular-Endpunkt ist nicht verfuegbar. Ihr E-Mail-Programm wurde mit einer vorbefuellten Anfrage geoeffnet.';
            }
            return;
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
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
        .catch(() => {
          if (leadStatus) {
            leadStatus.className = 'lead-status error';
            leadStatus.textContent =
              language === 'en'
                ? 'Submission failed. Please try again or email andreas.stoeckl@506.ai.'
                : 'Senden fehlgeschlagen. Bitte erneut versuchen oder an andreas.stoeckl@506.ai schreiben.';
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
