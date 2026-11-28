import React from 'react';
import ReactDOM from 'react-dom/client';
import './shell/shell.css';
import { Shell, type ShellConfig } from './shell/Shell';
import DefaultTab from './modules/quantum/App';
import quantumStory from './modules/quantum/story';
import materialsStory from './modules/materials/story';

const config: ShellConfig = {
  pillar: 'worldview & physics',
  title: "Quantum & Materials Lab",
  subtitle:
    "Two hands-on labs at the scale of atoms: a small simulated quantum computer working out the energy of real molecules, and a screener that picks crystals that are useful, stable and buildable. Move a slider and the maths reruns in your browser.",
  footer: "Quantum & Materials Lab · runs entirely in your browser · Mohammed KM",
  tabs: [
    {
      id: 'quantum', story: quantumStory, label: 'Quantum VQE', sub: 'tiny molecules · how much noise is too much', scope: 'quantum',
      provenance: [{ kind: 'real', label: 'published exact energies for H₂ and LiH' }, { kind: 'model', label: 'simulated 2-qubit quantum chip with noise' }],
      component: DefaultTab,
      load: () => import('./modules/quantum/App'),
    },
    {
      id: 'materials', story: materialsStory, label: 'Materials', sub: 'useful, stable, buildable', scope: 'materials',
      provenance: [{ kind: 'real', label: 'known crystals & published band gaps' }, { kind: 'synthetic', label: 'hand-estimated stability & supply scores' }, { kind: 'model', label: 'best trade-off (Pareto) picker' }],
      load: () => import('./modules/materials/App'),
    },
  ],
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Shell config={config} />
  </React.StrictMode>,
);
