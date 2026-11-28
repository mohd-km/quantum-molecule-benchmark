import type { Story } from '../../shell/Shell';
// Plain-English 3-beat intro shown above this tab.
const story: Story = {
  what: "Chemistry is meant to be one of the first jobs a quantum computer does better than a normal one. This lab tests that on two tiny molecules, hydrogen (H₂) and lithium hydride (LiH). It shows how much noise today's chips can take before a laptop wins.",
  how: "A 2-qubit quantum computer is simulated in your browser running VQE (variational quantum eigensolver), a way to estimate a molecule's energy on a quantum computer. Its answer is compared with the published exact energy. The gap is shown in mHa (milli-Hartree, a tiny unit of energy). Under about 1.6 mHa, called chemical accuracy, the answer is good enough to predict real chemistry.",
  tryThis: "With H₂ selected, click the Error-corrected target preset: the noisy chip's miss drops from about 10 mHa to under 1 mHa and turns green. Then click Typical superconducting chip and watch it jump past 30 mHa, worse than the quick classical estimate.",
};
export default story;
