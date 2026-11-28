import type { Story } from '../../shell/Shell';
// Plain-English 3-beat intro shown above this tab.
const story: Story = {
  what: 'Finding a new material for solar panels, power chips or solid batteries means juggling three things at once: the right electrical behaviour, a crystal that will not fall apart, and ingredients you can actually buy. This lab screens 39 real crystals on all three.',
  how: 'Each crystal has a band gap (how much energy it takes to free an electron, which decides what job it can do), a stability score (how far it sits from its most stable form, 0 means stable) and an abundance score for its elements. The lab keeps only the crystals that no other crystal beats on all three at once, the best trade-offs, known as the Pareto frontier.',
  tryThis: 'Click the Solar Absorber preset. The band gap window snaps to 1.1 to 1.6 eV, the shortlist drops from 39 to 13 crystals (silicon, GaAs, CdTe and others), and the best trade-offs are joined by a blue line on the chart.',
};
export default story;
