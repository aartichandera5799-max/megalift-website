(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  const form = document.querySelector('#enquiry-form');
  const result = document.querySelector('#form-result');
  const quoteForm = document.querySelector('#quote-form');
  let quoteEstimate = null;

  function closeMenu() {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }

  function escapeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); });
  }

  const revealItems = document.querySelectorAll('.service-row, .cargo-tags > div, .standard-grid article, .steps article, .price-card, .faq-list details, .record-grid article');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    revealItems.forEach((item) => { item.classList.add('reveal'); observer.observe(item); });
  }

  if (quoteForm) {
    const quoteResult = document.querySelector('#quote-result');
    quoteForm.addEventListener('submit', (event) => {
      event.preventDefault();
      quoteResult.hidden = true;
      if (!quoteForm.reportValidity()) return;
      const weight = Number(quoteForm.elements.namedItem('quoteWeight').value);
      const distance = Number(quoteForm.elements.namedItem('quoteDistance').value);
      const type = quoteForm.elements.namedItem('quoteType').value;
      if (!Number.isFinite(weight) || !Number.isFinite(distance) || weight <= 0 || distance <= 0) return;

      let tier;
      if (type === 'road' && weight <= 50 && distance <= 500) {
        tier = { label: 'Core', range: '₹1.5–2.5 lakh', detail: 'Up to 50 t · up to 500 km' };
      } else if (type === 'road' && weight >= 50 && weight <= 150 && distance <= 800) {
        tier = { label: 'Plus', range: '₹3.5–7 lakh', detail: '50–150 t · up to 800 km' };
      } else if (type === 'multimodal' || weight > 150) {
        tier = { label: 'Project', range: 'From ₹10 lakh · custom scope', detail: '150 t+ or multimodal · subject to a project review' };
      } else if (type === 'lifting') {
        tier = { label: 'Project', range: 'Equipment priced per job', detail: 'Crane, port handling and jacking are separately scoped' };
      } else {
        tier = { label: 'Custom route review', range: 'Price on review', detail: 'This weight and distance combination is outside the published package bands' };
      }
      quoteEstimate = { weight, distance, type, range: tier.range };
      const contactParams = new URLSearchParams({ quoteWeight: String(weight), quoteDistance: String(distance), quoteType: type, quoteRange: tier.range });
      quoteResult.innerHTML = `<strong>${tier.label} · ${tier.range}</strong><span>${tier.detail}</span><small>Indicative brochure range, excluding GST. This is a guide, not a firm offer.</small><a href="contact.html?${contactParams}" class="quote-use">Add these details to an enquiry <span>↘</span></a>`;
      quoteResult.hidden = false;
      quoteResult.querySelector('.quote-use').addEventListener('click', () => {
        if (!form) return;
        form.elements.namedItem('quoteWeight').value = String(weight);
        form.elements.namedItem('quoteDistance').value = String(distance);
        form.elements.namedItem('quoteType').value = type;
        form.elements.namedItem('quoteRange').value = tier.range;
        form.elements.namedItem('weight').value = weight <= 50 ? 'Under 50 tonnes' : weight <= 150 ? '50–150 tonnes' : weight <= 300 ? '150–300 tonnes' : '300+ tonnes';
      });
    });
  }

  const caseTabs = document.querySelectorAll('.case-tab');
  const caseData = {
    transformer: {
      id: 'ILLUSTRATIVE CASE / A', cargo: 'Transformer · 84 t', route: 'Vadodara → JNPT', origin: 'VADODARA', destination: 'JNPT',
      next: 'Delivery review', status: 'Delivered · example',
      routePath: 'M55 145C102 125 127 113 166 112s52-42 87-41 64 23 108-8', marker: [361, 63],
      milestones: [['Route planned', 'Illustrative milestone', 'DONE'], ['In transit', 'Illustrative milestone', 'DONE'], ['Delivered', 'Example status only', 'DONE']]
    },
    wind: {
      id: 'ILLUSTRATIVE CASE / B', cargo: 'Wind cargo · sample', route: 'Gujarat → Maharashtra', origin: 'GUJARAT', destination: 'MAHARASHTRA',
      next: 'Destination arrival', status: 'In transit · demo',
      routePath: 'M55 145C102 125 127 113 166 112s52-42 87-41', marker: [253, 71],
      milestones: [['Route planned', 'Illustrative milestone', 'DONE'], ['In transit', 'Demo location only', 'NOW'], ['Destination arrival', 'Not a live ETA', '—']]
    }
  };
  caseTabs.forEach((button) => button.addEventListener('click', () => {
    const data = caseData[button.dataset.case];
    if (!data) return;
    caseTabs.forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('#track-id').textContent = data.id;
    document.querySelector('#track-cargo').textContent = data.cargo;
    document.querySelector('#track-route-label').innerHTML = `${escapeText(data.route)} <i>·</i> Simulated route`;
    document.querySelector('#track-origin-label').textContent = data.origin;
    document.querySelector('#track-destination-label').textContent = data.destination;
    document.querySelector('#track-next').textContent = data.next;
    document.querySelector('#track-status').textContent = data.status;
    document.querySelector('#track-route-live').setAttribute('d', data.routePath);
    document.querySelector('#track-marker').setAttribute('cx', data.marker[0]);
    document.querySelector('#track-marker').setAttribute('cy', data.marker[1]);
    document.querySelector('#track-timeline').innerHTML = data.milestones.map(([title, detail, time], index) => {
      const complete = index === 0 || (data.status.startsWith('Delivered') ? index < 3 : index < 1);
      const active = !complete && time === 'NOW';
      return `<div class="timeline-item ${complete ? 'complete' : active ? 'active' : ''}"><span></span><div><strong>${escapeText(title)}</strong><small>${escapeText(detail)}</small></div><time>${escapeText(time)}</time></div>`;
    }).join('');
  }));

  if (!form || !result) return;

  const quoteParams = new URLSearchParams(window.location.search);
  if (quoteParams.has('quoteWeight')) {
    for (const key of ['quoteWeight', 'quoteDistance', 'quoteType', 'quoteRange']) {
      const value = quoteParams.get(key);
      if (value !== null && form.elements.namedItem(key)) form.elements.namedItem(key).value = value;
    }
    const weight = Number(quoteParams.get('quoteWeight'));
    if (Number.isFinite(weight) && weight > 0) {
      form.elements.namedItem('weight').value = weight <= 50 ? 'Under 50 tonnes' : weight <= 150 ? '50–150 tonnes' : weight <= 300 ? '150–300 tonnes' : '300+ tonnes';
    }
    const quoteSummary = document.createElement('p');
    quoteSummary.className = 'prefilled-quote';
    quoteSummary.textContent = `Quote estimate carried into this enquiry: ${quoteParams.get('quoteRange') || 'indicative range on review'} (excluding GST).`;
    form.querySelector('.form-header').after(quoteSummary);
  }

  const messages = {
    name: 'Please enter your name.', email: 'Enter a valid work email address.',
    cargo: 'Choose a cargo type or select “Other / not sure yet”.',
    origin: 'Please add an origin city or location.', destination: 'Please add a destination city or location.',
    consent: 'Please confirm you agree to submit these enquiry details.'
  };

  function fieldError(control, message) {
    const label = control.closest('label');
    const output = label && label.querySelector('.field-error');
    if (output) output.textContent = message;
    control.classList.toggle('invalid', Boolean(message));
    if (control.type !== 'checkbox') {
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }
  }

  form.querySelectorAll('input, select, textarea').forEach((control) => {
    control.addEventListener('input', () => fieldError(control, ''));
    control.addEventListener('change', () => fieldError(control, ''));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    result.hidden = true;
    result.classList.remove('error');
    let firstInvalid = null;
    ['name', 'email', 'cargo', 'origin', 'destination', 'consent'].forEach((name) => {
      const control = form.elements.namedItem(name);
      let message = '';
      if (control.type === 'checkbox') {
        if (!control.checked) message = messages[name];
      } else if (!control.value.trim()) {
        message = messages[name];
      } else if (name === 'name' && control.value.trim().length < 2) {
        message = 'Please enter at least two characters.';
      } else if (name === 'email' && !control.validity.valid) {
        message = messages[name];
      }
      fieldError(control, message);
      if (message && !firstInvalid) firstInvalid = control;
    });
    if (firstInvalid) { firstInvalid.focus(); return; }

    if (window.location.protocol === 'file:') {
      result.classList.add('error');
      result.innerHTML = '<strong>The enquiry service is not running.</strong>Open PowerShell in the MegaLift website folder, run <code>node server.mjs</code>, then open <code>http://localhost:3000/contact.html</code>. Keep that PowerShell window open while using the form.';
      result.hidden = false;
      result.focus();
      return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());
    payload.consent = form.elements.namedItem('consent').checked;
    if (quoteEstimate) Object.assign(payload, {
      quoteWeight: String(quoteEstimate.weight), quoteDistance: String(quoteEstimate.distance),
      quoteType: quoteEstimate.type, quoteRange: quoteEstimate.range
    });
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving enquiry…';
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The enquiry could not be saved. Please try again.');
      result.innerHTML = `<strong>Thank you, ${escapeText(payload.name.trim())}. Your move brief is saved.</strong>The enquiry was added to the website server's Excel-ready log. Reference: ${escapeText(data.id)}. The team can review it in the protected enquiry export.`;
      result.hidden = false;
      result.focus();
      form.reset();
      quoteEstimate = null;
    } catch (error) {
      result.classList.add('error');
      result.innerHTML = `<strong>We couldn't save your move brief.</strong>${escapeText(error.message)} Check that the website is running with its enquiry service, then try again.`;
      result.hidden = false;
      result.focus();
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Send move enquiry <span>↗</span>';
    }
  });
})();
