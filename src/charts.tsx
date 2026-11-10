import {type Point} from './activity'
import {atX,type Track} from './terrain'
const W=960,H=320
function reduce<T>(points:T[],max:number):T[]{
  if(points.length<=max)return points
  return [...Array.from({length:max-1},(_,i)=>points[Math.floor(i*(points.length-1)/(max-1))]),points.at(-1)!]
}
export function TrackChart({track,progress,hero=false}:{track:Track;progress?:number;hero?:boolean}){
  const p=reduce(track.points,hero?230:520)
  let top=Infinity,bottom=-Infinity
  for(const v of p){top=Math.min(top,v.y);bottom=Math.max(bottom,v.y)}
  const x=(v:number)=>v/track.points.at(-1)!.x*W
  const y=(v:number)=>hero?134+(v-top)/Math.max(1,bottom-top)*142:30+(v-top)/Math.max(1,bottom-top)*252
  const line=p.map((v,i)=>(i?'L':'M')+x(v.x).toFixed(2)+','+y(v.y).toFixed(2)).join(' ')
  const heroX=track.points.at(-1)!.x*.715
  const heroY=y(atX(track.points,heroX).y)
  const heroAngle=Math.atan2(y(atX(track.points,heroX+12).y)-y(atX(track.points,heroX-12).y),x(24))*180/Math.PI
  const mark=progress===undefined?undefined:x(track.start+(track.finish-track.start)*progress)
  return <svg className={hero?'hero-chart':'chart'} viewBox={hero?'0 0 960 320':'0 0 960 320'} preserveAspectRatio="none" role="img" aria-label="Generated terrain profile">
    <defs><linearGradient id={hero?'hero-fill':'track-fill'} x2="0" y2="1"><stop stopColor="#229ac0" stopOpacity=".41"/><stop offset="1" stopColor="#0a2436" stopOpacity=".08"/></linearGradient></defs>
    {!hero&&[80,160,240].map(n=><line key={n} x1="0" x2={W} y1={n} y2={n} stroke="#244058" strokeWidth="1"/>)}
    <path d={line+' L'+W+','+H+' L0,'+H+' Z'} fill={hero?'url(#hero-fill)':'url(#track-fill)'}/>
    {hero&&<path d={line} fill="none" stroke="#60dfff" opacity=".14" strokeWidth="16"/>}
    <path d={line} fill="none" stroke="#79defb" strokeWidth={hero?3:2} vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>
    {!hero&&track.points.filter((v,i)=>v.changed&&!track.points[i-1]?.changed).slice(0,300).map(v=><circle key={v.x} cx={x(v.x)} cy={y(v.y)} r="3.5" fill="#ad91ff"/>)}
    {!hero&&track.warnings.map(v=><rect key={v.x+v.kind} x={x(v.x)} y="0" width={Math.max(2,x(v.end)-x(v.x))} height={H} fill="#ff9865" opacity=".27"/>)}
    {mark!==undefined&&<><line x1={mark} x2={mark} y1="0" y2={H} stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke"/><circle cx={mark} cy="14" r="9" fill="#fff"/></>}
    {hero&&<g transform={['translate(',x(heroX),' ',heroY,') rotate(',heroAngle,') scale(1.23) translate(-4 -28)'].join('')} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="-15" cy="16" r="12" fill="#101f30" stroke="#9cecff" strokeWidth="2"/><circle cx="23" cy="16" r="12" fill="#101f30" stroke="#9cecff" strokeWidth="2"/>
      <path d="M-15 16 -10 0 7 16 -15 16 M-10 0 18 0 7 16 M23 16 18 0 20 -5 26 -5" fill="none" stroke="#83f0ff" strokeWidth="2"/>
      <path d="M-9 -7 7 1 3 12 M-9 -7 5 -19 14 -22 M5 -19 13 -9 23 -6" fill="none" stroke="#eafaff" strokeWidth="4"/>
      <path d="M-9 -7 5 -19" stroke="#41a7ff" strokeWidth="7"/><circle cx="15" cy="-24" r="5" fill="#f7fcff"/>
    </g>}
  </svg>
}
export function SourceChart({points,duration,color}:{points:Point[];duration:number;color:string}){
  const actual=points.filter(p=>!p.estimated)
  let lo=Infinity,hi=-Infinity
  const segments:Point[][]=[]
  for(const v of actual){
    lo=Math.min(lo,v.v);hi=Math.max(hi,v.v)
    const last=segments.at(-1)
    if(!last||v.t-last.at(-1)!.t>15)segments.push([v])
    else last.push(v)
  }
  const d=segments.map(seg=>reduce(seg,Math.max(2,Math.ceil(650*seg.length/actual.length)))
    .map((v,i)=>(i?'L':'M')+(v.t/Math.max(1,duration)*W).toFixed(2)+','+(284-(v.v-lo)/Math.max(1,hi-lo)*245).toFixed(2)).join(' ')).join(' ')
  return <svg className="chart" role="img" aria-label="Original workout chart" viewBox="0 0 960 320" preserveAspectRatio="none">
    {[80,160,240].map(n=><line key={n} x1="0" x2={W} y1={n} y2={n} stroke="#244058" strokeWidth="1"/>)}
    <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>
  </svg>
}

