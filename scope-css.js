// PostCSS plugin: scopes every stylesheet under src/modules/<name>/ to the wrapper class .m-<name>
// so merged apps' global styles never collide. :root/html/body map onto the wrapper itself.
export default function scopeModules() {
  return {
    postcssPlugin: 'scope-modules',
    Once(root) {
      const file = (root.source && root.source.input && root.source.input.file) || '';
      const m = file.replace(/\\/g, '/').match(/\/src\/modules\/([^/]+)\//);
      if (!m) return;
      const scope = `.m-${m[1]}`;
      root.walkRules((rule) => {
        let p = rule.parent;
        while (p) { if (p.type === 'atrule' && /keyframes$/i.test(p.name)) return; p = p.parent; }
        rule.selectors = rule.selectors.map((raw) => {
          const sel = raw.trim();
          if (sel.startsWith(scope)) return sel;
          const lead = sel.match(/^(:root|html\s+body|html|body)(?=$|[\s.:#[>+~])/);
          if (lead) {
            const rest = sel.slice(lead[0].length);
            if (!rest) return scope;
            return /^[.:#[]/.test(rest) ? `${scope}${rest}` : `${scope}${rest}`;
          }
          return `${scope} ${sel}`;
        });
      });
    },
  };
}
scopeModules.postcss = true;
