"use strict";
const assert=require("node:assert/strict");
const E=require("./engine.js");
const model=E.fit(E.demo());
assert.ok(model.dictionary.length>200);
assert.equal(model.n,144);
const a=E.synth(model,"conditioned",17,0);
const b=E.synth(model,"shuffled",17,0);
const c=E.synth(model,"independent",17,0);
const d=E.synth(model,"conditioned",17,0);
assert.deepEqual(Array.from(a.residue),Array.from(d.residue),"same seed must replay exactly");
for(const s of [a,b,c]) {
  assert.ok(s.image.every(Number.isFinite),"no NaNs");
  assert.ok(s.image.every(x=>x>=0&&x<=1),"display range");
}
const ea=E.score(model,a),eb=E.score(model,b),ec=E.score(model,c);
assert.ok(ea.mse<eb.mse&&ea.mse<ec.mse,"synthetic control must prefer correct parent");
assert.ok(ea.orientation>eb.orientation,"correct parent should improve orientation");
const shifted=E.synth(model,"conditioned",17,12);
const frozen=E.synth(model,"frozen",17,12);
assert.notDeepEqual(Array.from(shifted.residue),Array.from(frozen.residue),"parent intervention must change routing");
const alt=E.synth(model,"conditioned",18);
assert.notDeepEqual(Array.from(alt.residue),Array.from(a.residue),"different seed should change patches");
// Repeat the synthetic gate across selection seeds, and reject invention on a flat field.
for (let seed=11;seed<=20;seed++) {
  const yes=E.score(model,E.synth(model,"conditioned",seed)).mse;
  const wrong=E.score(model,E.synth(model,"shuffled",seed)).mse;
  const none=E.score(model,E.synth(model,"independent",seed)).mse;
  assert.ok(yes<wrong && yes<none,"synthetic parent relation must survive seed "+seed);
}
const flat=E.fit(new Float64Array(E.SIZE*E.SIZE).fill(.5));
const flatOutput=E.synth(flat,"conditioned",17);
assert.equal(E.score(flat,flatOutput).mse,0,"no law -> no invented residue");
console.log("CabbageSuper calibration passed:", {dictionary:model.dictionary.length,conditioned:ea,shuffled:eb,independent:ec});
