import { Check } from 'lucide-react';
import { COPY, type Locale } from './content';
import { LiveStream } from './live-stream';
import { Reveal } from './reveal';
import { RobinSimulation } from './robin-simulation';
import { VoiceDemo } from './voice-demo';

const LOCALES: Locale[] = ['nl', 'en', 'fr'];

/** Cinematic Roavaa marketing homepage. Self-contained styles (see .lp in globals.css). */
export function Landing({ locale }: { locale: Locale }) {
  const safeLocale: Locale = (['nl', 'en', 'fr'] as const).includes(locale)
    ? locale
    : 'nl';
  const c = COPY[safeLocale];

  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-wrap lp-bar">
          <a href="#top" className="lp-brand">
            Roavaa<span className="lp-dot">.</span>
          </a>
          <nav className="lp-nav">
            <a className="lp-link" href="#werk">{c.nav.work}</a>
            <a className="lp-link" href="#robin">{c.nav.robin}</a>
            <a className="lp-link" href={`/${safeLocale}/pricing`}>{c.nav.pricing}</a>
            <span className="lp-langs">
              {LOCALES.map((l) => (
                <a key={l} href={`/${l}`} className={l === locale ? 'on' : undefined}>
                  {l.toUpperCase()}
                </a>
              ))}
            </span>
            <a className="lp-btn" href={`/${safeLocale}/signup`}>{c.nav.demo}</a>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div>
              <span className="lp-kicker lp-mono">{c.hero.kicker}</span>
              <h1 className="lp-h1">
                {c.hero.pre}
                <em>{c.hero.em}</em>
                {c.hero.post}
              </h1>
              <p className="lp-sub">{c.hero.sub}</p>
              <div className="lp-cta">
                <a className="lp-btn" href={`/${safeLocale}/signup`}>{c.hero.ctaPrimary} →</a>
                <a className="lp-btn ghost" href="#werk">{c.hero.ctaSecondary}</a>
              </div>
              <div className="lp-sig">
                <span className="lp-serif">
                  <b>{c.hero.sigB}</b> {c.hero.sigRest}
                </span>
              </div>
            </div>

            <div className="lp-device">
              <div className="lp-device-head">
                <span className="t">{c.device.head}</span>
                <span className="lp-live lp-mono"><span className="pulse" />{c.device.live}</span>
              </div>
              <LiveStream locale={safeLocale} />
              <div className="lp-device-foot">
                <span className="decide">{c.device.decide}<b>{c.device.decideB}</b></span>
                <span className="mini"><span className="go">{c.device.approve}</span><span>{c.device.view}</span></span>
              </div>
            </div>
          </div>
        </section>

        {/* STAKES */}
        <section className="lp-stakes">
          <Reveal className="lp-wrap">
            <p className="lp-big lp-serif">
              {c.stakes.pre}<em>{c.stakes.em}</em>{c.stakes.post}
            </p>
            <p className="lp-note">{c.stakes.note}</p>
          </Reveal>
        </section>

        {/* PILLARS */}
        <section className="lp-light lp-pillars" id="pillars">
          <div className="lp-wrap">
            <Reveal className="lp-sechead">
              <h2>{c.pillars.title}</h2>
              <span className="lp-mono">{c.pillars.tag}</span>
            </Reveal>
            <div className="lp-pillars-grid">
              {c.pillars.items.map((p, i) => (
                <Reveal key={p.t} delay={i * 90} className="lp-pillar">
                  <span className="lp-pillar-n lp-mono">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{p.t}</h3>
                  <p>{p.p}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ACTS */}
        <section className="lp-light lp-acts" id="werk">
          <div className="lp-wrap">
            <Reveal className="lp-sechead">
              <h2>{c.acts.title}</h2>
              <span className="lp-mono">{c.acts.tag}</span>
            </Reveal>
            {c.acts.items.map((a) => (
              <Reveal key={a.n} className="lp-act">
                <span className="num">{a.n}</span>
                <h3>{a.t}</h3>
                <p>{a.p}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ROBIN */}
        <section className="lp-robin" id="robin">
          <div className="lp-wrap lp-robin-grid">
            <Reveal>
              <h2 className="lp-robin-title">
                {c.robin.titlePre}<em>{c.robin.titleEm}</em>
              </h2>
              <p className="lp-lead">{c.robin.lead}</p>
              <ul className="lp-robin-list">
                {c.robin.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </Reveal>

            <Reveal className="lp-chat">
              <div className="row in">
                <div>
                  <div className="who">{c.chat.who}</div>
                  <div className="bub">{c.chat.inMsg}</div>
                </div>
              </div>
              <div className="row out">
                <div className="bub">{c.chat.outMsg}</div>
              </div>
              <div className="propose">
                <span className="lbl lp-mono">{c.chat.proposeLbl}</span>
                <p>{c.chat.propose}</p>
                <div className="decide">
                  <span className="go">{c.chat.approve}</span>
                  <span className="sk">{c.chat.adjust}</span>
                  <span className="tag lp-mono">{c.chat.decide}</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* SIMULATION */}
        <section className="lp-simsec" id="simulatie">
          <div className="lp-wrap">
            <Reveal className="lp-sechead on-dark">
              <h2>
                {c.simulation.titlePre}<em>{c.simulation.titleEm}</em>
              </h2>
              <span className="lp-mono">{c.simulation.tag}</span>
            </Reveal>
            <Reveal>
              <p className="lp-lead">{c.simulation.sub}</p>
            </Reveal>
            <Reveal delay={100}>
              <RobinSimulation locale={safeLocale} />
            </Reveal>
          </div>
        </section>

        {/* VOICE */}
        <section className="lp-light lp-voice-section" id="voice">
          <div className="lp-wrap lp-voice-grid">
            <Reveal className="lp-copy-head">
              <span className="lp-mono">{c.voice.tag}</span>
              <h2>{c.voice.title}</h2>
              <p className="lp-lead-light">{c.voice.sub}</p>
            </Reveal>
            <Reveal delay={100}>
              <VoiceDemo locale={safeLocale} />
            </Reveal>
          </div>
        </section>

        {/* MEMORIES */}
        <section className="lp-light lp-mem">
          <div className="lp-wrap">
            <Reveal className="lp-sechead">
              <h2>{c.memories.title}</h2>
              <span className="lp-mono">{c.memories.tag}</span>
            </Reveal>
            <div className="lp-mem-grid">
              {c.memories.items.map((m) => (
                <Reveal key={m.k} className="lp-mcard">
                  <span className="lp-mono">{m.k}</span>
                  <h4>{m.t}</h4>
                  <p>{m.p}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* WHY */}
        <section className="lp-light lp-why" id="why">
          <div className="lp-wrap">
            <Reveal className="lp-sechead">
              <h2>{c.why.title}</h2>
              <span className="lp-mono">{c.why.tag}</span>
            </Reveal>
            <div className="lp-why-grid">
              {c.why.items.map((item, i) => (
                <Reveal key={item} delay={i * 60} className="lp-why-item">
                  <Check className="size-4" aria-hidden />
                  <span>{item}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* JOURNEY */}
        <section className="lp-journey" id="journey">
          <div className="lp-wrap">
            <Reveal className="lp-sechead on-dark">
              <h2>{c.journey.title}</h2>
              <span className="lp-mono">{c.journey.tag}</span>
            </Reveal>
            <div className="lp-journey-track">
              {c.journey.steps.map((step, i) => (
                <Reveal key={step} delay={i * 50} className="lp-journey-step">
                  <span className="n lp-mono">{String(i + 1).padStart(2, '0')}</span>
                  <span className="t">{step}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* PWA */}
        <section className="lp-light lp-pwa" id="pwa">
          <div className="lp-wrap lp-pwa-grid">
            <Reveal className="lp-copy-head">
              <span className="lp-mono">{c.pwa.tag}</span>
              <h2>{c.pwa.title}</h2>
              <p className="lp-lead-light">{c.pwa.sub}</p>
              <ul className="lp-pwa-list">
                {c.pwa.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={100} className="lp-pwa-mocks">
              <div className="lp-pwa-mock desktop">
                <div className="bar">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="body">
                  <div className="url">roavaa.com</div>
                  <div className="install">＋ {c.pwa.ctaInstall}</div>
                </div>
              </div>
              <div className="lp-pwa-mock phone">
                <div className="notch" />
                <div className="screen">
                  <span className="app-icon">R</span>
                  <span className="app-label">Roavaa</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CLOSE */}
        <section className="lp-light lp-founder">
          <div className="lp-wrap lp-founder-grid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/founder.jpg" alt={c.founder.name} className="lp-photo" />
            <div>
              <span className="lp-mono">{c.founder.eyebrow}</span>
              <h2 className="lp-founder-name">{c.founder.name}</h2>
              <p className="lp-founder-role">{c.founder.role}</p>
              {c.founder.story.map((para, i) => (
                <p key={i} className="lp-founder-story">{para}</p>
              ))}
              <p className="lp-founder-sig">“{c.founder.signature}”</p>
            </div>
          </div>
        </section>

        <section className="lp-close" id="demo">
          <div className="lp-wrap">
            <Reveal>
              <h2 className="lp-close-title">
                {c.close.pre}<em>{c.close.em}</em>{c.close.post}
              </h2>
            </Reveal>
            <Reveal className="lp-cta lp-cta-center">
              <a className="lp-btn" href={`/${safeLocale}/signup`}>{c.close.ctaPrimary} →</a>
              <a className="lp-btn ghost" href={`/${safeLocale}/login`}>{c.close.ctaSecondary}</a>
            </Reveal>
            <Reveal className="lp-close-sig">
              <span className="lp-brand lp-serif">Roavaa<span className="lp-dot">.</span></span>
              <span className="lp-mono">{c.close.sig}</span>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap">{c.footer}</div>
      </footer>
    </div>
  );
}
