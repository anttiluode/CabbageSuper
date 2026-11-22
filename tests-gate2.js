"use strict";
const assert=require("node:assert/strict");
const E=require("./engine.js"),G=require("./gate2.js");
const donor=G.makeLeaf(0),target=G.makeLeaf(1);
const case1=G.evaluate(donor,target,17,true);
const s=case1.scores;
assert.ok(case1.model.dictionary.length>200);
assert.ok(s.conditioned.mse<s.shuffled.mse,"correct parent beats wrong-address donor retrieval");
assert.ok(s.conditioned.mse<s.independent.mse,"correct parent beats unconditional donor retrieval");
assert.ok(s.conditioned.mse<s.empty.mse,"correct parent beats coarse-only");
assert.ok(case1.phaseSpectrumError<1e-10,"phase control preserves exactly the predicted 2D power");
assert.ok(case1.candidates.phase.phaseImagLeak<1e-10,"conjugate phases reconstruct real data");
assert.ok(s.phase.mse>s.conditioned.mse,"phase-only control destroys target phase alignment in calibration");

// Genuine donor-target separation: zeroing the target's withheld residue
// must leave all generated predictions unchanged (only the scoring changes).
const model=G.transfer(donor,target);
const run=E.synth(model,"conditioned",17);
const fake={...model,residue:new Float64Array(E.SIZE*E.SIZE)};
const masked=E.synth(fake,"conditioned",17);
assert.deepEqual(Array.from(run.residue),Array.from(masked.residue),
    "generator may not read withheld target residue");
assert.deepEqual(Array.from(run.image),Array.from(masked.image),
    "generator may not read withheld target pixels in the generated zone");

// A transfer has to survive multiple independent target variants and selection seeds.
const report=G.seedSweep(0,[1,2,3,4],[11,17,23],false);
assert.equal(report.results.length,12);
assert.equal(report.wins.conditioned,12,"synthetic family parent-conditioning calibration");
assert.ok(report.means.conditioned<report.means.empty);

// Critical negative control. This is an EXPECTED current failure, not a passing model:
const flat=new Float64Array(E.SIZE*E.SIZE).fill(.5);
const negative=G.evaluate(donor,flat,17,false).scores;
assert.equal(negative.empty.mse,0,"flat field has no fine-scale residue");
assert.ok(negative.conditioned.mse>0,"un-gated model hallucinates details on flat fields");

const repeat=G.evaluate(donor,target,17,false);
assert.deepEqual(Array.from(repeat.candidates.conditioned.residue),
  Array.from(case1.candidates.conditioned.residue),"fully deterministic seed");
console.log("Gate 2 PASS (synthetic controls only):",JSON.stringify({
  means:report.means,wins:report.wins,phaseSpectrumMismatch:case1.phaseSpectrumError,
  flatHallucinationMSE:negative.conditioned.mse
},null,2));
