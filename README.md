# CabbageSuper — Does the detail know its parent?

[Open the offline experiment](https://anttiluode.github.io/CabbageSuper/) (enable GitHub Pages from main/root if not already on) · [index.html](index.html) · [engine.js](engine.js)


**NEW — [Gate 2: Cross-leaf transfer and exact-phase control](gate2.html)** · [Live URL if Pages enabled](https://anttiluode.github.io/CabbageSuper/gate2.html). Compare donor A with a different target leaf B, a no-detail baseline, shuffled-parent patch retrieval, independent patch retrieval and a phase-scrambled image whose Fourier power spectrum matches the conditioned result exactly. Both donor and target can be separately uploaded as real leaf photos. No uploads leave the browser.

## The experiment

This is a focused successor to CabbageFarm and CabbageFarmSihti, motivated by Sigh Image's disappearing detail, Sihti's residue shelf, and Luotain2's rule-and-residue discipline.

> Can a generator learn from **one part of a leaf** how fine-scale detail relates to coarse-scale geometry, then apply that learned relationship to an **unseen part**? Does it fail when supplied with the wrong coarse parent?

It is **not** a new transformer, a claim of novelty, or an infinite-cabbage generator. It is the smallest offline falsification experiment for one missing ingredient: *the spatial address of the fine residue with respect to its coarse parent*.

## What the browser does

1. Start with the built-in **synthetic leaf** or upload any photograph of a real leaf. The image is center-cropped to a 144×144 grayscale field locally.
2. Construct a coarse parent C by two radius-7 box blurs. Construct an intermediate field B by two radius-2 blurs. The band-pass residue is **R = B − C**. The image above the first horizontal line is training only.
3. Fit a nonparametric dictionary from the top of the image, pairing 8-element local coarse descriptors with 9×9 patches of R. No source data from the bottom test strip reaches that dictionary; a safety gap is left for the blurs' finite support.
4. For each location in the unseen bottom strip, select from the four nearest parent-matching patches in the training dictionary using a seeded selector. Blend overlapping patches and normalize all generated residuals to the training residue RMS.
5. Compare three variants under the same data and approximate residue energy: **correct-parent conditioned**, **wrong-address shuffled parent**, and **independent detail**. The frozen-detail fourth variant is an intervention control, not a separate trained model.
6. Move the **Shift coarse parent** control. The conditional generator reads the displaced parent; the frozen control uses original-parent patch choices but overlays the same displaced coarse signal. Thus changes in the residue are attributable to the conditioning path, not just the shifted coarse image.

### Built-in synthetic calibration (seed 17, separated training/test)

| Model | Test residual pixel MSE | Fine-to-parent orientation |
| --- | ---: | ---: |
| Correct parent | **0.000650** | **0.242** |
| Wrong-address parent | 0.001439 | 0.018 |
| Independent patches | 0.001692 | 0.032 |

The correct-parent variant reduced test MSE by approximately 62% relative to independent patches on the built-in synthetic scene. **This is a calibration case intentionally made with a coarse/fine relationship. It does not establish the same result on natural leaf photographs.** The model may fail on them. Seed, image, patch repetition, and training split matter.

Across seeds 11–20 the correct-parent variant had lower held-out MSE than both controls in **10/10 runs**. Mean pixel MSE was **0.000662** conditioned, **0.001478** shuffled and **0.001718** independent. These are different patch-selection seeds on the **same synthetic image**, not separate datasets. A flat-field null test generates zero spurious residue.

For a real image, the app reports the same measurements without promising a win. If the correct-parent method fails to outperform a matched independent or shuffled control, the hypothesis has not passed on that photograph.

## Why this relates to the earlier projects

- **SighImageInverse:** a known global EQ may be inverted when its input and output carry enough spectral evidence. Here we do not invert an EQ; we isolate a real mid-scale residue to test how it is *organized*.
- **Luotain2:** residual evidence can propose spatial coupling and validation can reject spurious laws. Here the hypothesis is much narrower: can coarse local patches predict the appropriate fine-patch family?
- **CabbageFarmSihti:** its Gaussian-spectrum baseline transfers frequency statistics but may scramble phase, which erases veins. It proposed conditioning detail on the correct coarse parent and using a shuffled-parent kill test. This project implements a data-conditioned patch lookup rather than a hand-authored tangent rule.
- **BlackBoxSpotlight:** tests inference through a controlled observation boundary. This browser experiment does not reconstruct a transformer head.

## What it does NOT prove

- No neural-network training occurs; a *learned dictionary* is a nonparametric conditional generative model. The coarse-to-residue association is fitted from observations, but spatial descriptors and matching distance are designed by us.
- The whole coarse parent is retained at generation time; recognizable cabbage shape therefore does **not** mean a cabbage was generated from scratch.
- The library reuses source patches. It cannot establish that new anatomy has been invented, and it does not yet support unbounded coordinate-consistent generation.
- Matching RMS does not guarantee matched Fourier spectra or patch-distribution statistics. The next comparison should match both to rule out trivial differences in texture power.
- The sampled fine patches contain unpredictable phase. Pixel MSE can punish a perfectly plausible but differently phased result. Orientation is only a partial structural diagnostic, not a realism score.
- A single vertical split can cause distribution shift (top and bottom of a leaf differ); repeat with multiple spatially separated folds and with different real leaves.
- This is an interpretable patch experiment, **not** the solution to Sigh's general inverse, nor to arbitrary attention routing.

## Run

Open index.html in any modern browser with engine.js in the same directory. No Python, server, accounts, network requests or GPUs are needed.

For the sanity controls, run:

```sh
node tests.js
```

## Next scientific gate

Provide several real cabbage/leaf photographs. Train on disjoint spatial regions or entire source leaves and evaluate entirely unseen leaves. Match the independent and conditioned models for residual **power spectrum and RMS**, then vary only parent conditioning. Inspect whether fine-vein orientation, branching, and local scale vary correctly with the coarse-vein shape. If not, replace the fixed coarse descriptor and patch lookup with a genuinely learned local conditional transfer model — and keep all the same controls.

The north star remains: **learn the rule that generates new detail, not a copy of the picture**.


---

## Experiment 002 — Beyond one leaf

Read [gate2.html](gate2.html), [gate2.js](gate2.js), and [tests-gate2.js](tests-gate2.js).

**Objective.** One leaf donates coarse-neighborhood/residual-patch pairs. A different leaf supplies coarse geometry at generation time. Fine detail in the target is reserved only for evaluation. The donor and target are deliberately separated; the test verifies that erasing the target's hidden residue leaves all generated values unchanged.

### Outcomes on procedural leaves

The donor was synthetic seed 0; targets were four newly parameterized synthetic leaf images (seeds 1–4), with patch-choice seeds 11, 17, 23. All four leaves were generated by the **same explicitly constructed family**, so this is a transfer *calibration*, not an independent natural-image discovery.

| Candidate | Mean held-out residual MSE | Best among 12 |
|---|---:|---:|
| Correct coarse parent | **0.000153** | **12** |
| No generated fine detail | 0.000311 | 0 |
| Shuffled parent descriptors | 0.000629 | 0 |
| Unconditional random donor patches | 0.000697 | 0 |

The correct-parent method improved held-out MSE against *doing nothing* by 50.9% in this controlled family.

For the original synthetic calibration leaf, the phase-scrambled control (same generated 2D Fourier magnitudes, different phases) scored MSE **0.001829**, versus **0.000650** conditioned. Numerical spectrum mismatch: **2.54×10⁻¹⁴**. This is a direct power-spectrum-preserving phase intervention on the *conditioned output*, not an independently trained spectral baseline.

### A failure worth keeping

When trained on leaf A and applied to an unrelated **flat image**, CabbageSuper still manufactured detail: conditioned MSE **0.000304**, compared with **0** for simply leaving the target flat. It also fails to beat the empty-residue baseline on a deliberately unrelated fine-wave target. There is no reliable abstention/confidence rule yet.

This is exactly what the next system must address: **should we generate a residue here at all, and on what evidence?** A future confidence gate should be trained from donor-only evidence and tested on both positive and negative target types; it must not use the target's hidden fine residual to decide.

### Run the tests

```sh
node tests.js
node tests-gate2.js
```

No build tool, Python service or GPU is required. The DFT for the phase-matched control is computed directly over the 144×36 held-out strip; it is small but can be slower than the patch matching on older browsers.

### Real-world gate, still outstanding

Use **two independently photographed real leaves**, A for the donor and B for the target, preferably similar scale and lighting. Pre-register a set of at least five independent leaf pairs, a fixed crop and seed list, and the score relative to coarse-only reconstruction before tuning the model. Repeat with leaves photographed from different plants. If correct-parent conditioning loses to no-detail or shuffled-parent on real leaves, call that a failure of the model's current learned representation.

Possible public CC0 specimens to download and upload locally: Wikimedia Commons [Cabbage close up (49199572378)](https://commons.wikimedia.org/wiki/File:Cabbage_close_up_(49199572378).jpg) and [Cabbage close up (49199572553)](https://commons.wikimedia.org/wiki/File:Cabbage_close_up_(49199572553).jpg). Verify the close-up shows appropriate leaf veins at the required spatial resolution; not all cabbage photographs are useful.

**Do not conclude we can generate a whole cabbage.** The target's coarse structure is supplied directly. The question here is only whether a donor-trained local residue rule can reconstruct appropriately structured finer detail in a different leaf.
