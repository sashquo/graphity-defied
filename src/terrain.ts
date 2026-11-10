import { sampleAt, type Activity } from './activity'
import type {Settings} from './settings'
export const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x))
export type Vertex={x:number;y:number;t:number;changed:boolean;gap:boolean}
export type Track={points:Vertex[];start:number;finish:number;checkpoints:number[];warnings:TerrainWarning[];maxSlope:number;duration:number}
export type TerrainWarning={x:number;end:number;kind:'steep'|'clearance'|'gap';message:string}
export function atX(points:Vertex[],x:number){
  let l=0,h=points.length-1
  while(h-l>1){const m=(l+h)>>1;if(points[m].x<=x)l=m;else h=m}
  const a=points[l],b=points[h],u=clamp((x-a.x)/(b.x-a.x),0,1)
  return {y:a.y+(b.y-a.y)*u,t:a.t+(b.t-a.t)*u,slope:Math.atan2(b.y-a.y,b.x-a.x),index:l}
}
export function validateTerrain(points:Vertex[],maxAllowed:number){
  const warnings:TerrainWarning[]=[]
  let maxSlope=0,last:TerrainWarning|undefined
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],s=Math.atan2(b.y-a.y,b.x-a.x)
    const degrees=Math.abs(s)*180/Math.PI
    maxSlope=Math.max(maxSlope,degrees)
    const left=atX(points,a.x-27).y,right=atX(points,a.x+27).y
    const kind=degrees>maxAllowed+.01?'steep':a.y< (left+right)/2-13?'clearance':a.gap||b.gap?'gap':undefined
    if(!kind){last=undefined;continue}
    if(last?.kind===kind){last.end=b.x;continue}
    last={x:a.x,end:b.x,kind,message:kind==='steep'?'Steep grade':kind==='clearance'?'Possible frame clearance issue':'Missing data · geometry bridge'}
    warnings.push(last)
  }
  return {warnings,maxSlope}
}
export function generateTerrain(activity:Activity,s:Settings):Track {
  const source=activity.series[s.metric]
  if(source.length<2)throw new Error('The selected metric has too little data.')
  const duration=Math.max(1,activity.duration)
  const physicalLength=clamp(duration*19,1750,85000)*s.horizontal
  const count=Math.min(6000,Math.max(110,Math.round(physicalLength/24)))
  const ts=new Set<number>(Array.from({length:count+1},(_,i)=>duration*i/count))
  // Keep extrema from each time bucket so short efforts survive reduction of long workouts.
  const extrema=new Map<number,{low:typeof source[number];high:typeof source[number]}>()
  for(const p of source){
    if(p.estimated)continue
    const b=Math.floor(p.t/duration*count/2),e=extrema.get(b)
    if(!e)extrema.set(b,{low:p,high:p})
    else{if(p.v<e.low.v)e.low=p;if(p.v>e.high.v)e.high=p}
  }
  for(const e of extrema.values()){ts.add(e.low.t);ts.add(e.high.t)}
  // Avoid duplicate spatial edges at near-identical floating-point timestamps.
  const sorted=[...ts].sort((a,b)=>a-b).filter((t,i,a)=>!i||t-a[i-1]>.05)
  if(sorted.at(-1)!<duration-.0001)sorted[sorted.length-1]=duration
  let min=Infinity,max=-Infinity
  source.forEach(p=>{min=Math.min(min,p.v);max=Math.max(max,p.v)})
  const raw=sorted.map(t=>320-((sampleAt(source,t,true)??min)-min)/Math.max(1,max-min)*s.vertical)
  let ys=[...raw]
  if(s.shape==='playable')for(let j=0;j<s.smoothing;j++)ys=ys.map((v,i)=>i===0||i===ys.length-1?v:(ys[i-1]+2*v+ys[i+1])/4)
  const points:Vertex[]=[{x:0,y:ys[0],t:0,changed:false,gap:false}]
  const start=160
  let x=start
  const limit=Math.tan(s.slope*Math.PI/180)
  sorted.forEach((t,i)=>{
    const dx=i?(t-sorted[i-1])*physicalLength/duration:0
    // Stretch rises rather than clipping their height; a small minimum edge avoids tiny seams.
    const adapted=i&&s.shape==='playable'?Math.max(4,dx,Math.abs(ys[i]-ys[i-1])/limit):dx
    x+=adapted
    points.push({x,y:ys[i],t,changed:Math.abs(ys[i]-raw[i])>.35||adapted>dx+.1,gap:sampleAt(source,t)===undefined})
  })
  const finish=x
  points.push({x:x+280,y:ys.at(-1)!,t:duration,changed:false,gap:false})
  const validation=validateTerrain(points,s.slope)
  return {points,start,finish,checkpoints:Array.from({length:10},(_,i)=>start+(finish-start)*i/10),duration,...validation}
}

