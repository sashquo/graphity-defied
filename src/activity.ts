export const metrics = ['heartRate','power','cadence','speed'] as const
export type Metric = typeof metrics[number]
export type TerrainMetric = Exclude<Metric,'speed'>
export const terrainMetrics:TerrainMetric[] = ['heartRate','power','cadence']
export const meta = {
  heartRate:{label:'Heart Rate',unit:'bpm',short:'HR',color:'#ff8eac',min:20,max:255},
  power:{label:'Power',unit:'W',short:'PWR',color:'#74d8ff',min:0,max:3000},
  cadence:{label:'Cadence',unit:'rpm',short:'CAD',color:'#b5a0ff',min:0,max:250},
  speed:{label:'Recorded Speed',unit:'km/h',short:'SPD',color:'#a9efad',min:0,max:150}
}
export type Sample = {time:number;distance?:number} & Partial<Record<Metric,number>>
export type Point = {t:number;v:number;estimated?:boolean}
export type Activity = {
  name:string;source:'FIT'|'DEMO';date:Date|null;duration:number;distance?:number;
  original:Sample[]; clean:Sample[]; series:Record<Metric,Point[]>;available:Metric[];
  averages:Partial<Record<Metric,number>>; warnings:string[]
}
const valid = (x:unknown):x is number => typeof x==='number' && Number.isFinite(x)
export function processActivity(name:string, source:Activity['source'], original:Sample[], info:{date?:Date;duration?:number;distance?:number;warnings?:string[]}={}):Activity {
  const byTime=new Map<number,Sample>()
  let invalid=0,duplicates=0
  for(const raw of original){
    if(!valid(raw.time)){invalid++;continue}
    const s=byTime.get(raw.time) ?? {time:raw.time}
    if(byTime.has(raw.time))duplicates++
    if(valid(raw.distance) && raw.distance>=0)s.distance=raw.distance
    for(const k of metrics){
      const x=raw[k]
      if(x===undefined)continue
      if(valid(x) && x>=meta[k].min && x<=meta[k].max)s[k]=x
      else invalid++
    }
    byTime.set(s.time,s)
  }
  const clean=[...byTime.values()].sort((a,b)=>a.time-b.time)
  const start=clean[0]?.time ?? 0
  const duration=Math.max(0,(clean.at(-1)?.time ?? start)-start,info.duration??0)
  const series={} as Activity['series'], averages:Activity['averages']={}
  const warnings=[...(info.warnings??[])]
  if(duplicates)warnings.push(duplicates+' duplicate timestamps merged.')
  if(invalid)warnings.push(invalid+' invalid field values ignored.')
  let gaps=0
  for(const k of metrics){
    const observed=clean.flatMap(s=>s[k]===undefined?[]:[{t:s.time-start,v:s[k]!}])
    const points:Point[]=[]
    let area=0,coverage=0
    observed.forEach((p,i)=>{
      const prev=observed[i-1]
      if(prev){
        const gap=p.t-prev.t
        if(gap<=15){
          area+=(p.v+prev.v)/2*gap;coverage+=gap
          const segments=Math.ceil(gap/3)
          for(let j=1;j<segments;j++)points.push({t:prev.t+gap*j/segments,v:prev.v+(p.v-prev.v)*j/segments,estimated:true})
        } else gaps++
      }
      points.push(p)
    })
    if(observed.length)averages[k]=coverage?area/coverage:observed.reduce((sum,p)=>sum+p.v,0)/observed.length
    series[k]=points
  }
  if(gaps)warnings.push('Long gaps (>15 s) are left blank in the recording. The track bridges them and flags the affected sections.')
  return {name,source,date:info.date??(source==='FIT'&&clean.length?new Date(start*1000):null),duration,
    distance:info.distance??clean.reduce<number|undefined>((best,p)=>p.distance===undefined?best:Math.max(best??0,p.distance),undefined),
    original,clean,series,averages,warnings,available:metrics.filter(k=>series[k].filter(p=>!p.estimated).length>=2)}
}
export function sampleAt(points:Point[], t:number, bridge=false):number|undefined {
  if(!points.length)return
  if(t<=points[0].t)return bridge||t===points[0].t?points[0].v:undefined
  if(t>=points.at(-1)!.t)return bridge||t===points.at(-1)!.t?points.at(-1)!.v:undefined
  let l=0,h=points.length-1
  while(h-l>1){const m=(l+h)>>1;if(points[m].t<=t)l=m;else h=m}
  const a=points[l],b=points[h]
  if(!bridge && b.t-a.t>15 && t!==a.t)return
  return a.v+(b.v-a.v)*(t-a.t)/(b.t-a.t)
}
export function demo(name:string):Activity {
  const n=180
  const data=Array.from({length:n+1},(_,i)=>{
    const u=i/n
    const hill=name==='Endurance'? .44+.23*Math.sin(u*19-.6)+.11*Math.sin(u*35):
      name==='Intervals'?.25+.65*Math.pow((1+Math.sin(u*31-1.5))/2,2):
      .42+.28*Math.sin(u*27-1)+.2*Math.sin(u*65)+.085*Math.sin(u*125)
    return {time:i,distance:i*8.9,heartRate:Math.round(95+70*hill+5*Math.sin(u*14)),power:Math.round(95+290*hill),cadence:Math.round(68+30*hill+6*Math.sin(u*33)),speed:27+13*hill}
  })
  return processActivity(name,'DEMO',data)
}
