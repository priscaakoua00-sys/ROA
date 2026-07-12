import { COPY, type Locale } from './content';
import { LiveStream } from './live-stream';
import { Reveal } from './reveal';

const LOCALES: Locale[] = ['nl', 'en', 'fr'];

/** Cinematic Roavaa marketing homepage. Self-contained styles (see .lp in globals.css). */
export function Landing({ locale }: { locale: Locale }) {
  const c = COPY[locale];

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
            <span className="lp-langs">
              {LOCALES.map((l) => (
                <a key={l} href={`/${l}`} className={l === locale ? 'on' : undefined}>
                  {l.toUpperCase()}
                </a>
              ))}
            </span>
            <a className="lp-btn" href="#demo">{c.nav.demo}</a>
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
                <a className="lp-btn" href="#demo">{c.hero.ctaPrimary} →</a>
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
              <LiveStream locale={locale} />
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

        {/* CLOSE */}
        <section className="lp-close" id="demo">
          <div className="lp-wrap">
            <Reveal>
              <h2 className="lp-close-title">
                {c.close.pre}<em>{c.close.em}</em>{c.close.post}
              </h2>
            </Reveal>
            <Reveal className="lp-cta lp-cta-center">
              <a className="lp-btn" href="#">{c.close.ctaPrimary} →</a>
              <a className="lp-btn ghost" href="#">{c.close.ctaSecondary}</a>
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
