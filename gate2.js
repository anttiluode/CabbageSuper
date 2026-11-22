/* CabbageSuper Gate 2: real independent-target transfer and phase-preserving controls.
 * Requires engine.js. All training patches come from the donor; the target supplies
 * only its coarse parent during generation. Target fine residue is used only to score.
 */
const CabbageGate2=(function(){
"use strict";
const E=typeof CabbageSuper!=="undefined"?CabbageSuper:require("./engine.js");
const N=E.SIZE,T=E.TEST_START,clip=E.clip;
const hash=(a,b,c)=>{let z=(Math.imul(a+31,1664525)^Math.imul(b+29,1013904223)^Math.imul(c+7,2246822519))>>>0;z^=z>>>16;z=Math.imul(z,2246822507)>>>0;z^=z>>>13;return(z>>>0)/4294967296;};
function makeLeaf(seed=1){
 const out=new Float64Array(N*N),s=seed+17;
 const mid=67+hash(s,1,0)*14,curvature=6+hash(s,2,0)*18,slope=(hash(s,3,0)-.5)*.17;
 const freq=.024+hash(s,4,0)*.024,branchSlope=.28+hash(s,5,0)*.28;
 const phase=hash(s,6,0)*Math.PI*2,veinGap=13+hash(s,7,0)*6;
 const base=new Float64Array(N*N);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const center=mid+curvature*Math.sin(y*freq+phase)+slope*(y-N/2);
  const lateral=x-center,eye=Math.hypot((x-72)/74,(y-72)/86);
  const mask=clip((1.07-eye)*7,0,1);
  let side=0;
  for(let k=0;k<12;k++){
   const origin=9+k*veinGap,dir=lateral<0?-1:1;
   const d=y-(origin+dir*branchSlope*lateral+dir*.0015*lateral*lateral);
   side+=Math.exp(-d*d/10)*Math.exp(-Math.abs(lateral)/84);
  }
  const primary=Math.exp(-(lateral*lateral)/85);
  base[y*N+x]=.34+mask*(.075+.17*primary+.030*side+.065*Math.sin(x*.039+y*.021+phase)+.05*Math.cos(y*.077-phase));
 }
 const b=E.split(base).coarse;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=y*N+x,eye=Math.hypot((x-72)/74,(y-72)/86),mask=clip((1.07-eye)*7,0,1);
  // Synthetic "child" textures are explicitly tied to the coarse signal.
  const fibers=.047*Math.sin(33*b[i]+.16*x+.12*Math.sin(y*.31+phase))
             +.024*Math.sin(45*b[i]-.18*y+phase*.4);
  out[i]=clip(b[i]+mask*fibers,0,1);
 }
 return out;
}
function transfer(donor,target){
 const dm=E.fit(donor),tm=E.fit(target);
 return {...tm,dictionary:dm.dictionary,rms:dm.rms,trainingSource:donor};
}
function empty(model){
 return {coarse:model.coarse,residue:new Float64Array(N*N),image:model.coarse};
}
// Implement a separable, exact (up to floating-point) 2D DFT on only the bottom strip.
// Unlike FFT grids of convenient power-of-two size, this handles the actual 144x36 region.
const cache=new Map();
function trig(n){
 if(cache.has(n))return cache.get(n);
 const C=new Float64Array(n*n),S=new Float64Array(n*n);
 for(let k=0;k<n;k++)for(let x=0;x<n;x++){
  const t=2*Math.PI*k*x/n,i=k*n+x;C[i]=Math.cos(t);S[i]=Math.sin(t);
 }
 const v={C,S};cache.set(n,v);return v;
}
function dft2(re,im,width,height,inverse=false){
 const r1=new Float64Array(re.length),i1=new Float64Array(re.length);
 const R=new Float64Array(re.length),I=new Float64Array(re.length);
 const rw=trig(width),rh=trig(height),sign=inverse?1:-1;
 // Along x
 for(let y=0;y<height;y++)for(let k=0;k<width;k++){
  let ar=0,ai=0;
  for(let x=0;x<width;x++){
   const q=y*width+x,p=k*width+x,c=rw.C[p],s=rw.S[p]*sign;
   ar+=re[q]*c-im[q]*s;ai+=re[q]*s+im[q]*c;
  }
  const d=inverse?width:1;r1[y*width+k]=ar/d;i1[y*width+k]=ai/d;
 }
 // Along y
 for(let x=0;x<width;x++)for(let k=0;k<height;k++){
  let ar=0,ai=0;
  for(let y=0;y<height;y++){
   const q=y*width+x,p=k*height+y,c=rh.C[p],s=rh.S[p]*sign;
   ar+=r1[q]*c-i1[q]*s;ai+=r1[q]*s+i1[q]*c;
  }
  const d=inverse?height:1;R[k*width+x]=ar/d;I[k*width+x]=ai/d;
 }
 return {re:R,im:I};
}
function phaseControl(model,conditioned,seed=17){
 const h=N-T,m=N*h,r=new Float64Array(m),im=new Float64Array(m);
 for(let y=0;y<h;y++)for(let x=0;x<N;x++)r[y*N+x]=conditioned.residue[(y+T)*N+x];
 const A=dft2(r,im,N,h,false),re=A.re,ii=A.im;
 for(let y=0;y<h;y++)for(let x=0;x<N;x++){
  const k=y*N+x,py=(h-y)%h,px=(N-x)%N,j=py*N+px;
  if(k>j)continue;
  if(k===j){ii[k]=0;continue;}
  const amp=Math.hypot(re[k],ii[k]),theta=2*Math.PI*hash(seed,x,y);
  re[k]=amp*Math.cos(theta);ii[k]=amp*Math.sin(theta);
  re[j]=re[k];ii[j]=-ii[k];
 }
 const B=dft2(re,ii,N,h,true);
 const out=new Float64Array(N*N),residue=new Float64Array(N*N);
 for(let k=0;k<N*N;k++)out[k]=k<T*N?model.source[k]:model.coarse[k];
 for(let y=T;y<N;y++)for(let x=0;x<N;x++){
  const idx=y*N+x,local=(y-T)*N+x;
  residue[idx]=B.re[local];out[idx]=clip(model.coarse[idx]+B.re[local],0,1);
 }
 return {image:out,residue,coarse:model.coarse,phaseImagLeak:Math.sqrt(B.im.reduce((s,v)=>s+v*v,0)/m)};
}
function spectrumMismatch(a,b){
 const h=N-T,m=N*h,ar=new Float64Array(m),br=new Float64Array(m),z=new Float64Array(m);
 for(let y=T;y<N;y++)for(let x=0;x<N;x++){
   const i=(y-T)*N+x,k=y*N+x;ar[i]=a.residue[k];br[i]=b.residue[k];
 }
 const A=dft2(ar,z,N,h),B=dft2(br,z,N,h);
 let top=0,den=0;
 for(let i=0;i<m;i++){
  const diff=Math.hypot(A.re[i],A.im[i])-Math.hypot(B.re[i],B.im[i]);
  top+=diff*diff;den+=A.re[i]**2+A.im[i]**2;
 }
 return Math.sqrt(top/Math.max(den,1e-20));
}
function evaluate(donor,target,seed=17,phase=true){
 const model=transfer(donor,target);
 const candidates={
  conditioned:E.synth(model,"conditioned",seed),
  shuffled:E.synth(model,"shuffled",seed),
  independent:E.synth(model,"independent",seed),
  empty:empty(model)
 };
 if(phase)candidates.phase=phaseControl(model,candidates.conditioned,seed+420);
 const scores={};
 for(const [name,result]of Object.entries(candidates))scores[name]=E.score(model,result);
 return {model,candidates,scores,phaseSpectrumError:phase?spectrumMismatch(candidates.conditioned,candidates.phase):null};
}
function seedSweep(trainSeed=0,targetSeeds=[1,2,3,4],selectionSeeds=[11,17,23],phase=false){
 const donor=makeLeaf(trainSeed),results=[],wins={conditioned:0,shuffled:0,independent:0,empty:0,phase:0},totals={};
 for(const targetSeed of targetSeeds){
  for(const selectionSeed of selectionSeeds){
   const result=evaluate(donor,makeLeaf(targetSeed),selectionSeed,phase);
   const row={targetSeed,selectionSeed,metrics:{}};
   for(const [name,s] of Object.entries(result.scores)){row.metrics[name]=s.mse;totals[name]=(totals[name]||0)+s.mse;}
   const winner=Object.keys(row.metrics).sort((a,b)=>row.metrics[a]-row.metrics[b])[0];wins[winner]++;
   results.push(row);
  }
 }
 const means={};for(const [name,total] of Object.entries(totals))means[name]=total/results.length;
 return {trainSeed,targetSeeds,selectionSeeds,means,wins,results};
}
return {makeLeaf,transfer,empty,dft2,phaseControl,spectrumMismatch,evaluate,seedSweep};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=CabbageGate2;
