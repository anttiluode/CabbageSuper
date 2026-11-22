/* CabbageSuper: an explicit, nonparametric test of parent-conditioned Sihti residue synthesis. */
const CabbageSuper = (function buildEngine() {
  "use strict";
  const SIZE=144, TRAIN_END=88, TEST_START=98, HALF=4;
  const clip=(v,a,b)=>v<a?a:v>b?b:v;
  const at=(a,x,y,n=SIZE)=>a[clip(y|0,0,n-1)*n+clip(x|0,0,n-1)];
  function hash(seed,x,y){
    let z=(Math.imul(x+17,73856093)^Math.imul(y+29,19349663)^Math.imul(seed+1,83492791))>>>0;
    z^=z>>>16;z=Math.imul(z,2246822507)>>>0;z^=z>>>13;z=Math.imul(z,3266489909)>>>0;z^=z>>>16;
    return (z>>>0)/4294967296;
  }
  function box(a,n,r) {
    const h=new Float64Array(n*n),o=new Float64Array(n*n),k=2*r+1;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      let sum=0;for(let dx=-r;dx<=r;dx++)sum+=a[y*n+clip(x+dx,0,n-1)];
      h[y*n+x]=sum/k;
    }
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      let sum=0;for(let dy=-r;dy<=r;dy++)sum+=h[clip(y+dy,0,n-1)*n+x];
      o[y*n+x]=sum/k;
    }
    return o;
  }
  function blur(a,n,r){return box(box(a,n,r),n,r);}
  function demo(){
    const b=new Float64Array(SIZE*SIZE),out=new Float64Array(SIZE*SIZE);
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const mid=72+12*Math.sin(y*.036);
      const bulge=Math.exp(-Math.pow((x-mid)/9,2));
      let side=0;
      for(let k=0;k<9;k++){
        const origin=11+k*16,off=x-mid,sideSlope=off<0?-.42:.42;
        const distance=y-(origin+sideSlope*off+0.002*off*off*Math.sign(off));
        side+=.036*Math.exp(-distance*distance/14)*Math.exp(-Math.abs(off)/100);
      }
      const edge=Math.sqrt(Math.pow((x-72)/73,2)+Math.pow((y-72)/82,2));
      const support=clip((1.08-edge)*6,0,1);
      b[y*SIZE+x]=.32+support*(.15+.17*bulge+side+.11*Math.sin(x*.027+y*.043)+.055*Math.cos(y*.11));
    }
    const c=blur(b,SIZE,3);
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const i=y*SIZE+x,edge=Math.sqrt(Math.pow((x-72)/73,2)+Math.pow((y-72)/82,2)),mask=clip((1.07-edge)*8,0,1);
      const fibers=.065*Math.sin(32*c[i]+.16*x+.10*Math.sin(y*.32))+.025*Math.sin(46*c[i]-.17*y);
      out[i]=clip(c[i]+mask*fibers,0,1);
    }
    return out;
  }
  function split(source,n=SIZE) {
    const small=blur(source,n,2),coarse=blur(source,n,7),residue=new Float64Array(n*n);
    for(let i=0;i<residue.length;i++)residue[i]=small[i]-coarse[i];
    return {coarse,residue,small};
  }
  function desc(c,x,y,n=SIZE){
    const a=at(c,x,y,n),L=at(c,x-5,y,n),R=at(c,x+5,y,n),U=at(c,x,y-5,n),D=at(c,x,y+5,n);
    return [a*2,(R-L)*13,(D-U)*13,(L+R+U+D-4*a)*12,
      (at(c,x-5,y-5,n)-a)*6,(at(c,x+5,y-5,n)-a)*6,
      (at(c,x-5,y+5,n)-a)*6,(at(c,x+5,y+5,n)-a)*6];
  }
  function fit(source,n=SIZE){
    if(n!==SIZE||source.length!==n*n)throw Error("Use a centered 144x144 image");
    const s=split(source,n),dictionary=[];
    let rms=0,count=0;
    for(let y=8;y<TRAIN_END-8;y++)for(let x=8;x<n-8;x++){
      rms+=s.residue[y*n+x]**2;count++;
    }
    for(let y=HALF+2;y<TRAIN_END-HALF-2;y+=3)for(let x=HALF+2;x<n-HALF-2;x+=3){
      const patch=[];
      for(let dy=-HALF;dy<=HALF;dy++)for(let dx=-HALF;dx<=HALF;dx++)patch.push(at(s.residue,x+dx,y+dy,n));
      dictionary.push({features:desc(s.coarse,x,y,n),patch});
    }
    return {source,coarse:s.coarse,residue:s.residue,dictionary,rms:Math.sqrt(rms/count),n};
  }
  function nearest(dic,f){
    let slots=[[-1,Infinity],[-1,Infinity],[-1,Infinity],[-1,Infinity]];
    for(let i=0;i<dic.length;i++){
      let d=0;for(let k=0;k<f.length;k++){const e=f[k]-dic[i].features[k];d+=e*e;}
      if(d<slots[3][1]){
        let j=3;while(j>0&&d<slots[j-1][1]){slots[j]=slots[j-1];j--;}
        slots[j]=[i,d];
      }
    }
    return slots.map(x=>x[0]);
  }
  function shiftParent(c,dx,n){
    if(!dx)return c;
    const out=new Float64Array(n*n);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)out[y*n+x]=at(c,x-dx,y,n);
    return out;
  }
  function synth(model,kind="conditioned",seed=17,dx=0){
    const {n,dictionary}=model,c=shiftParent(model.coarse,dx,n),r=new Float64Array(n*n),weight=new Float64Array(n*n),out=new Float64Array(n*n);
    const readParent=kind==="frozen"?model.coarse:c;
    for(let y=TEST_START+HALF;y<n-HALF;y+=4)for(let x=HALF;x<n-HALF;x+=4){
      const u=hash(seed,x,y);
      let id;
      if(kind==="independent")id=Math.floor(u*dictionary.length);
      else{
        const qx=kind==="shuffled"?(x+49)%n:x,qy=kind==="shuffled"?(y+39)%n:y;
        const best=nearest(dictionary,desc(readParent,qx,qy,n));
        id=best[Math.floor(u*best.length)];
      }
      const p=dictionary[id].patch;
      for(let dy=-HALF;dy<=HALF;dy++)for(let xx=-HALF;xx<=HALF;xx++){
        const iy=y+dy,ix=x+xx;
        if(iy<TEST_START||iy>=n||ix<0||ix>=n)continue;
        const w=(HALF+1-Math.abs(xx))*(HALF+1-Math.abs(dy)),k=iy*n+ix;
        r[k]+=p[(dy+HALF)*(HALF*2+1)+xx+HALF]*w;weight[k]+=w;
      }
    }
    let sum=0,num=0;
    for(let y=TEST_START;y<n;y++)for(let x=0;x<n;x++){
      const k=y*n+x;r[k]=weight[k]?r[k]/weight[k]:0;sum+=r[k]*r[k];num++;
    }
    const factor=model.rms/Math.max(1e-9,Math.sqrt(sum/num));
    for(let i=0;i<r.length;i++){
      r[i]*=factor;
      const y=Math.floor(i/n);
      out[i]=clip((y<TEST_START?model.source[i]:c[i]+r[i]),0,1);
    }
    return {image:out,residue:r,coarse:c};
  }
  function score(model,result){
    const n=model.n;let err=0,align=0,den=0,count=0;
    for(let y=TEST_START+3;y<n-3;y++)for(let x=3;x<n-3;x++){
      const k=y*n+x,err0=result.residue[k]-model.residue[k];err+=err0*err0;count++;
      const pgx=(at(result.coarse,x+2,y,n)-at(result.coarse,x-2,y,n))*0.5;
      const pgy=(at(result.coarse,x,y+2,n)-at(result.coarse,x,y-2,n))*0.5;
      const rx=(at(result.residue,x+1,y,n)-at(result.residue,x-1,y,n))*0.5;
      const ry=(at(result.residue,x,y+1,n)-at(result.residue,x,y-1,n))*0.5;
      const p2=pgx*pgx+pgy*pgy,rr=rx*rx+ry*ry;
      if(p2>1e-9&&rr>1e-9){
        const dot=pgx*rx+pgy*ry,cross=pgx*ry-pgy*rx;
        const w=Math.sqrt(p2)*Math.sqrt(rr);
        align+=w*(dot*dot-cross*cross)/(p2*rr);den+=w;
      }
    }
    return {mse:err/count,orientation:den?align/den:null};
  }
  function selfTest(){
    const model=fit(demo()),a=synth(model,"conditioned",17),b=synth(model,"shuffled",17),c=synth(model,"independent",17),shift=synth(model,"conditioned",17,12),frozen=synth(model,"frozen",17,12);
    if(model.dictionary.length<100)throw Error("Dictionary empty");
    if(!a.image.every(Number.isFinite)||!b.image.every(Number.isFinite)||!c.image.every(Number.isFinite))throw Error("NaN in synthesis");
    if(a.residue.every((v,i)=>v===b.residue[i]))throw Error("Parent condition has no effect");
    if(shift.residue.every((v,i)=>v===frozen.residue[i]))throw Error("Parent shift has no effect");
    if(a.image.some(v=>v<0||v>1))throw Error("Output range");
    return {patches:model.dictionary.length,correct:score(model,a),shuffled:score(model,b),independent:score(model,c),shiftResidualChange:Math.sqrt(shift.residue.reduce((s,v,i)=>s+(v-frozen.residue[i])**2,0)/shift.residue.length)};
  }
  return {SIZE,TRAIN_END,TEST_START,clip,demo,split,fit,synth,score,selfTest};
})();
if (typeof module !== 'undefined' && module.exports) module.exports=CabbageSuper;
