import type { Story } from '../../shell/Shell';
// Plain-English 3-beat intro shown above this tab.
const story: Story = {
  what: "Quantum computers are often pitched as the future of chemistry. This lab tests that claim on two tiny molecules, hydrogen (H₂) and lithium hydride (LiH), and shows how much noise today's chips can tolerate before a laptop does better.",
  how: "A 2-qubit quantum computer is simulated in your browser running VQE, a way to estimate a molecule's energy on a quantum computer. Its answer is compared with the published exact energy. The gap is shown in mHa (milli-Hartree, a tiny unit of energy); under about 1.6 mHa, called chemical accuracy, is good enough to predict real chemistry.",
  tryThis: "With H₂ selected, click the Error-corrected target preset: the noisy chip's miss drops from about 10 mHa to under 1 mHa and turns green. Then click Typical superconducting chip and watch it jump past 30 mHa, worse than the quick classical estimate.",
};
export default story;
