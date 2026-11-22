"use strict";
const assert=require("node:assert/strict");
const E=require("./engine.js"),G=require("./gate2.js"),H=require("./gate3.js");
const N=E.SIZE,donor=G.makeLeaf(0),model=G.transfer(donor,G.makeLeaf(1));
const cal=H.calibrate(model.dictionary);
assert.equal(cal.quantile,.95);
assert.ok(cal.threshold>0&&cal.threshold<1);
assert.equal(cal.calibrationCount,model.dictionary.length);
const plain=E.synth(model,"conditioned",17);
const gated=H.apply(model,plain,cal);
assert.ok(gated.coverage>0&&gated.coverage<1,"nontrivial confidence map");
assert.ok(E.score(model,gated).mse<E.score(model,G.empty(model)).mse,"valid leaf should beat no detail");
const hidden={...model,residue:new Float64Array(N*N)};
assert.deepEqual(Array.from(H.apply(hidden,E.synth(hidden,"conditioned",17),cal).residue),
 Array.from(gated.residue),"no access to target hidden fine detail");

// Rejection must be learned from donor calibration only, not manually tuned on flat target.
const flat=new Float64Array(N*N).fill(.5),flatModel=G.transfer(donor,flat);
const flatPlain=E.synth(flatModel,"conditioned",17);
const flatResult=H.apply(flatModel,flatPlain,cal);
assert.equal(flatResult.coverage,0,"flat target unrecognized");
assert.equal(E.score(flatModel,flatResult).mse,0,"abstain on flat world");
assert.ok(E.score(flatModel,flatPlain).mse>0,"ungated hallucination exposes failure");

const waves=new Float64Array(N*N);
for(let y=0;y<N;y++)for(let x=0;x<N;x++)
 waves[y*N+x]=.5+.1*Math.sin(x*1.17+y*.91)+.04*Math.cos(y*.57);
const waveModel=G.transfer(donor,waves),wavePlain=E.synth(waveModel,"conditioned",17),waveGated=H.apply(waveModel,wavePlain,cal);
assert.ok(E.score(waveModel,waveGated).mse<E.score(waveModel,wavePlain).mse,"wrong-mechanism rejection must reduce error");

const leaves=[];
for(let seed=1;seed<=4;seed++){
 const m=G.transfer(donor,G.makeLeaf(seed));
 const pred=E.synth(m,"conditioned",17);
 const conf=H.apply(m,pred,cal);
 const s0=E.score(m,pred),s1=E.score(m,conf),base=E.score(m,G.empty(m));
 leaves.push({seed,ungated:s0.mse,gated:s1.mse,coarse:base.mse,coverage:conf.coverage});
 assert.ok(s1.mse<base.mse,"gated prediction should beat no detail on synthetic leaf "+seed);
}
console.log("Gate 3 PASS (donor-calibrated synthetic experiment):",JSON.stringify({threshold:cal.threshold,flatCoverage:flatResult.coverage,waveCoverage:waveGated.coverage,leaves},null,2));
