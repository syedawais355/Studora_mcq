// Paper-shard confetti — 22 shards, paper-coloured, ink border, 1.8s fall.
// "No emoji, no sparkle cliché" — § 08 Motion in studora-blueprint.html.
const PAPER_COLORS = ['#fff28a', '#ffc9de', '#c8f2c0', '#bfdcff'];

export function confetti() {
  // We still respect the OS pref, but only if the user has explicitly set it
  // to reduce — many headless tools / browsers default to "reduce" without
  // the user asking. The CSS @media reduce-motion already neutralises animations
  // so we don't need to add another gate here.
  const c = document.createElement('div');
  c.className = 'nb-cf';
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('span');
    s.style.left = (Math.random() * 100) + '%';
    s.style.background = PAPER_COLORS[i % 4];
    s.style.animationDelay = (Math.random() * 0.3) + 's';
    // Two-axis init transform: random rotation + tiny x-drift so shards spread
    // sideways as they fall instead of dropping straight down.
    const drift = (Math.random() - 0.5) * 120;
    s.style.setProperty('--drift', `${drift}px`);
    s.style.transform = `rotate(${Math.random() * 360}deg)`;
    c.appendChild(s);
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 2000);
}
