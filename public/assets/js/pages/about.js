// About page — short, calm, with the tagline as the centerpiece.
import { topbar, footer } from '../components/topbar.js?v=1779087891';
import { trackPage } from '../components/login-wall.js?v=1779087891';
import { wireNav } from '../core/router.js?v=1779087891';

const root = () => document.getElementById('app');

export function renderAbout() {
  if (trackPage()) return;
  const r = root();
  r.innerHTML = `
  ${topbar('about')}
  <main class="nb-wrap">
    <div class="nb-crumbs"><a data-nav="home" href="/">home</a><span class="sep">/</span>about</div>
    <header class="nb-about-hero">
      <h1>Made in Bahawalpur, for <em>every student in Pakistan.</em></h1>
      <p>Studora is a quieter place to practice — built like a notebook, fast like an app. We collect, verify and explain MCQs for the eight national exams candidates actually sit.</p>
    </header>

    <div class="nb-cols-3">
      <div class="nb-card"><h3>Why Studora</h3><p>Most question banks are dark, loud, and full of pop-ups. We made the calmest one we could imagine — paper background, ink type, a yellow highlighter.</p></div>
      <div class="nb-card mint"><h3>How the bank is built</h3><p>Every question is sourced from a past paper or a teacher's set, then verified before publish. We tag it for the exams it appears on.</p></div>
      <div class="nb-card sky"><h3>How we verify</h3><p>Teachers review the 100 most-viewed questions every week. A "report" button on every card lets you flag anything that looks off.</p></div>
    </div>

    <div class="nb-callout info" style="margin-top:32px">
      <div class="ic">i</div>
      <div>
        <h5>Our promise</h5>
        <p>The basics are free, forever. The convenience — ad-free, offline, analytics — will be Studora Pro at Rs 499/mo when it ships in month four.</p>
      </div>
    </div>
  </main>
  ${footer()}`;
  wireNav(r);
}
