(() => {
  const icons = {
    'phone-icon': 'issue-cracked-screen.svg',
    'diagnostic-icon': 'issue-laptop-thermal.svg',
    'cleaning-icon': 'laptop-service-v2.webp',
    'tuneup-icon': 'laptop-service-v2.webp',
    'security-icon': 'issue-battery-health.svg',
    'recovery-icon': 'issue-console-hdmi.svg',
    'battery-icon': 'issue-battery-health.svg'
  };
  const apply = () => document.querySelectorAll('.service-icon').forEach((node) => {
    const key = Object.keys(icons).find((name) => node.classList.contains(name));
    if (!key || node.querySelector('.service-icon-art')) return;
    const image = document.createElement('img');
    image.className = 'service-icon-art';
    image.src = `assets/${icons[key]}`;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    node.appendChild(image);
  });
  document.addEventListener('DOMContentLoaded', apply, { once: true });
})();

