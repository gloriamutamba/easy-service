import { animate, stagger, inView } from 'https://cdn.jsdelivr.net/npm/motion@12.23.24/+esm';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fadeUp(targets, options = {}) {
    const nodes = typeof targets === 'string'
        ? document.querySelectorAll(targets)
        : targets;
    if (!nodes || (nodes.length !== undefined && !nodes.length)) return;
    if (reduced) {
        animate(nodes, { opacity: 1, y: 0 }, { duration: 0 });
        return;
    }
    animate(nodes, { opacity: [0, 1], y: [18, 0] }, {
        duration: 0.55,
        easing: [0.22, 1, 0.36, 1],
        delay: options.delay || 0,
        ...options
    });
}

function revealWhenVisible(selector, childSelector) {
    document.querySelectorAll(selector).forEach(section => {
        inView(section, () => {
            const heading = section.querySelector('.section-heading');
            if (heading) fadeUp(heading);
            if (childSelector) {
                const kids = section.querySelectorAll(childSelector);
                if (kids.length) {
                    fadeUp(kids, { delay: stagger(0.07, { startDelay: heading ? 0.1 : 0 }) });
                }
            }
            return false;
        }, { amount: 0.18 });
    });
}

function setupScrollSpy() {
    const links = [...document.querySelectorAll('.nav-links a[data-section]')];
    if (!links.length) return;

    const sections = links
        .map(link => document.getElementById(link.dataset.section))
        .filter(Boolean);

    const setActive = id => {
        links.forEach(link => {
            link.classList.toggle('active', link.dataset.section === id);
        });
    };

    const observer = new IntersectionObserver(entries => {
        const visible = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
    }, { rootMargin: '-28% 0px -55% 0px', threshold: [0.15, 0.4, 0.7] });

    sections.forEach(section => observer.observe(section));

    links.forEach(link => {
        link.addEventListener('click', () => {
            document.body.classList.remove('nav-open');
            setActive(link.dataset.section);
        });
    });
}

function playHero() {
    fadeUp('.page-hero');
    fadeUp('.hero-kicker, .hero-content h1, .hero-content > p, .hero-buttons', {
        delay: stagger(0.08)
    });
    fadeUp('.hero-visual', { delay: 0.12 });
    fadeUp('.hero-stat', { delay: stagger(0.08, { startDelay: 0.2 }) });
}

function playDynamicCards() {
    fadeUp('.rec-card', { delay: stagger(0.08) });
    fadeUp('.category-card', { delay: stagger(0.05) });
}

document.documentElement.classList.add('js-motion');
setupScrollSpy();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', playHero, { once: true });
} else {
    playHero();
}

revealWhenVisible('.urgent-finder', '.urgent-card');
revealWhenVisible('.rec-teaser', '.rec-card, .cta-pair');
revealWhenVisible('#comment-ca-marche', '.step');
revealWhenVisible('#avis', '.avis-card, .avis-form');
revealWhenVisible('.contact-page', '.contact-card, .contact-form, .contact-aside');

if (document.querySelector('.rec-card, .category-card')) {
    playDynamicCards();
}
document.addEventListener('landing:ready', playDynamicCards);
document.addEventListener('landing:avis', () => fadeUp('.avis-card', { delay: stagger(0.06) }));

window.setTimeout(() => {
    document.querySelectorAll('.hero-kicker, .hero-content h1, .hero-content > p, .hero-buttons, .hero-visual, .hero-stat, .section-heading, .urgent-card, .rec-card, .category-card, .step, .avis-card, .avis-form, .contact-card, .page-hero').forEach(node => {
        if (getComputedStyle(node).opacity === '0') {
            node.style.opacity = '1';
            node.style.transform = 'none';
        }
    });
}, 4000);
