import React, { Suspense, useEffect, useState } from 'react';

export type Provenance = { kind: 'real' | 'model' | 'synthetic'; label: string };
export type Story = { what: string; how: string; tryThis: string };
export type TabDef = {
  id: string;
  label: string;
  sub: string;
  track?: string;
  scope: string; // module folder name, wrapper gets class m-<scope>
  provenance: Provenance[];
  note?: string;
  story?: Story;
  load: () => Promise<{ default: React.ComponentType }>;
  component?: React.ComponentType; // statically bundled default tab: paints with the first JS pass
};
export type ShellConfig = {
  pillar: string;
  title: string;
  subtitle: string;
  tabs: TabDef[];
  footer: string;
};

class TabBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="sh-wrap" style={{ padding: 40, color: '#555555' }}>
        <p style={{ margin: '0 0 12px' }}>This lab hit an unexpected input and stopped. Reset it to start again.</p>
        <button type="button" onClick={() => this.setState({ failed: false })} style={{ font: 'inherit', padding: '8px 14px', borderRadius: 8, border: '1px solid #d4d4d0', background: '#fff', cursor: 'pointer' }}>
          Reset this lab
        </button>
      </div>
    );
  }
}

const lazyCache = new Map<string, React.LazyExoticComponent<React.ComponentType>>();
function lazyFor(t: TabDef): React.ComponentType {
  if (t.component) return t.component;
  if (!lazyCache.has(t.id)) lazyCache.set(t.id, React.lazy(t.load));
  return lazyCache.get(t.id)!;
}

function readTab(ids: string[]): string {
  const h = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (ids.includes(h)) return h;
  const q = new URLSearchParams(window.location.search).get('tab');
  if (q && ids.includes(q.toLowerCase())) return q.toLowerCase();
  return ids[0];
}

export function Shell({ config }: { config: ShellConfig }) {
  const ids = config.tabs.map((t) => t.id);
  const [active, setActive] = useState(() => readTab(ids));
  const [visited, setVisited] = useState<string[]>(() => [readTab(ids)]);

  useEffect(() => {
    const onHash = () => setActive(readTab(ids));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    setVisited((v) => (v.includes(active) ? v : [...v, active]));
    const t = config.tabs.find((x) => x.id === active)!;
    document.title = config.tabs.length > 1 ? `${t.label} · ${config.title} · Mohammed KM` : `${config.title} · Mohammed KM`;
    // Keep the active tab visible inside a horizontally scrolling tab strip (mobile deep links).
    const el = document.querySelector<HTMLElement>(`.sh-tab[href="#${active}"]`);
    const strip = el?.closest<HTMLElement>('.sh-tracks') ?? el?.closest<HTMLElement>('.sh-tabs');
    if (el && strip && strip.scrollWidth > strip.clientWidth) {
      const base = strip.getBoundingClientRect().left - strip.scrollLeft;
      const track = el.closest<HTMLElement>('.sh-track') ?? el;
      const tr = track.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      // Prefer showing the whole track (label + tabs); fall back to the tab itself if the track is wider than the strip.
      const left = (er.right - tr.left <= strip.clientWidth - 24 ? tr.left : er.left) - base - 16;
      strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
  }, [active]);

  const go = (id: string) => {
    if (id === active) return;
    history.replaceState(null, '', `#${id}`);
    setActive(id);
    window.scrollTo({ top: 0 });
  };

  const tracks = Array.from(new Set(config.tabs.map((t) => t.track).filter(Boolean))) as string[];
  const tabButton = (t: TabDef) => (
    <a
      key={t.id}
      href={`#${t.id}`}
      role="tab"
      className="sh-tab"
      aria-selected={t.id === active}
      onClick={(e) => { e.preventDefault(); go(t.id); }}
    >
      <span className="sh-tab-label">{t.label}</span>
      <span className="sh-tab-sub">{t.sub}</span>
    </a>
  );
  const cur = config.tabs.find((t) => t.id === active)!;

  return (
    <>
      <header className="mkm-topbar">
        <div className="mkm-topbar-inner">
          <div className="mkm-brand">
            <span className="mkm-brand-mark" aria-hidden="true">
              <img src="/favicon.png?v=2" alt="" width="28" height="28" />
            </span>
            <span className="mkm-brand-name">{config.title}</span>
          </div>
        </div>
      </header>
      <header className="sh-top">
        <div className="sh-wrap">
          <div className="sh-head">
            <h1 className="sh-title">{config.title}</h1>
            <p className="sh-sub">{config.subtitle}</p>
          </div>
          {config.tabs.length < 2 ? null : tracks.length ? (
            <nav className="sh-tracks" role="tablist" aria-label="Modules">
              {tracks.map((tr) => (
                <div className="sh-track" key={tr}>
                  <span className="sh-track-name">{tr}</span>
                  <div className="sh-tabs">{config.tabs.filter((t) => t.track === tr).map(tabButton)}</div>
                </div>
              ))}
            </nav>
          ) : (
            <nav className="sh-tabs" role="tablist" aria-label="Modules">{config.tabs.map(tabButton)}</nav>
          )}
        </div>
      </header>
      <div className="sh-wrap">
        <div className="sh-prov" aria-label="Data provenance">
          {cur.provenance.map((p) => (
            <span key={p.label} className={`sh-pill ${p.kind}`}>{p.kind === 'real' ? 'real data' : p.kind === 'model' ? 'modelled' : 'synthetic'} · {p.label}</span>
          ))}
          {cur.note ? <span>{cur.note}</span> : null}
        </div>
        {cur.story ? (
          <div className="sh-story" aria-label="About this lab">
            <p><b>What this lab shows.</b> {cur.story.what}</p>
            <p><b>How it works.</b> {cur.story.how}</p>
            <p className="sh-story-try"><b>Try this first.</b> {cur.story.tryThis}</p>
          </div>
        ) : null}
      </div>
      <main className="sh-main">
        {config.tabs.filter((t) => visited.includes(t.id)).map((t) => {
          const C = lazyFor(t);
          return (
            <section key={t.id} className={`sh-panel m-${t.scope}`} hidden={t.id !== active} role="tabpanel" aria-label={t.label}>
              <TabBoundary>
                <Suspense fallback={<div className="sh-wrap" style={{ padding: 40, color: '#6b6b68' }}>Loading…</div>}>
                  <C />
                </Suspense>
              </TabBoundary>
            </section>
          );
        })}
      </main>
      <footer className="sh-wrap">
        <div className="sh-foot">
          <span>{config.footer}</span>
          <span>
            <a href="https://mohammed-km.in/projects">all projects</a> · <a href="https://mohammed-km.in">mohammed-km.in</a>
          </span>
        </div>
      </footer>
    </>
  );
}
