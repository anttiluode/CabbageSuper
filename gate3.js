/* CabbageSuper Gate 3: donor-calibrated abstention, no target fine detail.
 * Refuses parent descriptors whose nearest-donor distance exceeds the 95th
 * percentile of donor leave-one-out nearest-neighbor distances.
 * Threshold is fixed from DONOR data only and not optimized on target scores.
 */
const CabbageGate3=(function(){
"use strict";
const E=typeof CabbageSuper!=="undefined"?CabbageSuper:require("./engine.js");
const N=E.SIZE,T=E.TEST_START,H=4;
const at=(a,x,y)=>a[Math.max(0,Math.min(N-1,y|0))*N+Math.max(0,Math.min(N-1,x|0))];
function features(c,x,y){
 const a=at(c,x,y),L=at(c,x-5,y),R=at(c,x+5,y),U=at(c,x,y-5),D=at(c,x,y+5);
 return[a*2,(R-L)*13,(D-U)*13,(L+R+U+D-4*a)*12,
 (at(c,x-5,y-5)-a)*6,(at(c,x+5,y-5)-a)*6,
 (at(c,x-5,y+5)-a)*6,(at(c,x+5,y+5)-a)*6];
}
function nearest(dictionary,query,exclude=-1){
 let min=Infinity;
 for(let i=0;i<dictionary.length;i++){
  if(i===exclude)continue;
  let d=0,v=dictionary[i].features;
  for(let j=0;j<8;j++){const t=v[j]-query[j];d+=t*t;}
  if(d<min)min=d;
 }
 return min;
}
function calibrate(dictionary,quantile=.95){
 if(!dictionary.length||!dictionary[0].features)throw Error("Need the donor dictionary");
 const loo=dictionary.map((item,i)=>nearest(dictionary,item.features,i));
 loo.sort((a,b)=>a-b);
 const threshold=loo[Math.floor(quantile*(loo.length-1))];
 return {threshold,quantile,calibrationCount:loo.length,median:loo[Math.floor(.5*(loo.length-1))]};
}
function mask(model,calibration){
 const {dictionary,coarse}=model;
 const accepted=new Float64Array(N*N),weights=new Float64Array(N*N);
 for(let y=T+H;y<N-H;y+=4)for(let x=H;x<N-H;x+=4){
  const d=nearest(dictionary,features(coarse,x,y));
  const value=d<=calibration.threshold?1:0;
  for(let dy=-H;dy<=H;dy++)for(let dx=-H;dx<=H;dx++){
   const yy=y+dy,xx=x+dx;
   if(yy<T||yy>=N||xx<0||xx>=N)continue;
   const k=yy*N+xx,w=(H+1-Math.abs(dx))*(H+1-Math.abs(dy));
   accepted[k]+=value*w;weights[k]+=w;
  }
 }
 let coverage=0;
 const out=new Float64Array(N*N);
 for(let y=T;y<N;y++)for(let x=0;x<N;x++){
  const i=y*N+x;out[i]=weights[i]?accepted[i]/weights[i]:0;
  coverage+=out[i];
 }
 coverage/=N*(N-T);
 return {value:out,coverage};
}
function apply(model,ungated,calibration){
 const gate=mask(model,calibration),r=new Float64Array(N*N),img=new Float64Array(N*N);
 for(let k=0;k<N*N;k++){
  const y=Math.floor(k/N);
  r[k]=ungated.residue[k]*gate.value[k];
  img[k]=y<T?model.source[k]:E.clip(model.coarse[k]+r[k],0,1);
 }
 return {image:img,residue:r,coarse:model.coarse,confidence:gate.value,coverage:gate.coverage,threshold:calibration.threshold};
}
function evaluate(model,seed=17){
 const calibration=calibrate(model.dictionary);
 const ungated=E.synth(model,"conditioned",seed);
 return {calibration,ungated,gated:apply(model,ungated,calibration)};
}
return {features,nearest,calibrate,mask,apply,evaluate};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=CabbageGate3;
