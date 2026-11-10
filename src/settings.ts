import type {Metric,TerrainMetric} from './activity'
export type Mode='physics'|'data'|'assist'
export type Shape='playable'|'raw'
export type Settings={metric:TerrainMetric;shape:Shape;mode:Mode;assistMetric:Metric;vertical:number;horizontal:number;smoothing:number;slope:number;gravity:number;torque:number;grip:number;rolling:number;gear:number;multiplier:number;debug:boolean}
export const sliders=[
  {key:'vertical',label:'Vertical Scale',min:40,max:400,step:5,unit:'px'},
  {key:'horizontal',label:'Horizontal Scale',min:0.5,max:3,step:.05,unit:'×'},
  {key:'smoothing',label:'Smoothing',min:0,max:8,step:1,unit:' passes'},
  {key:'slope',label:'Max Slope',min:12,max:50,step:1,unit:'°'},
  {key:'gravity',label:'Gravity',min:.3,max:2,step:.05,unit:'×'},
  {key:'torque',label:'Pedal Torque',min:.4,max:2.5,step:.05,unit:'×'},
  {key:'grip',label:'Bike Grip',min:.25,max:2,step:.05,unit:'×'},
  {key:'rolling',label:'Rolling Resistance',min:.1,max:2,step:.05,unit:'×'},
  {key:'gear',label:'Gear Ratio',min:1.2,max:4.5,step:.05,unit:':1'},
  {key:'multiplier',label:'Speed Multiplier',min:0,max:2,step:.05,unit:'×'},
] as const
export const defaults:Settings={metric:'power',shape:'playable',mode:'physics',assistMetric:'power',vertical:165,horizontal:1,smoothing:3,slope:29,gravity:1,torque:1,grip:1.1,rolling:1,gear:2.6,multiplier:1,debug:false}
export const presets = {
  Easy:{vertical:105,horizontal:1.2,smoothing:5,slope:21,torque:1.25,grip:1.25,gravity:1,rolling:1,gear:2.6,multiplier:1},
  Normal:{vertical:165,horizontal:1,smoothing:3,slope:29,torque:1,grip:1.1,gravity:1,rolling:1,gear:2.6,multiplier:1},
  Hard:{vertical:245,horizontal:.85,smoothing:1,slope:38,torque:.9,grip:.95,gravity:1,rolling:1,gear:2.6,multiplier:1}
}
export function loadSettings():Settings {
  try{
    const saved=JSON.parse(localStorage.getItem('graphity-settings-v1')??'{}')
    const s={...defaults}
    for(const v of sliders)if(typeof saved[v.key]==='number'&&Number.isFinite(saved[v.key]))s[v.key]=Math.max(v.min,Math.min(v.max,saved[v.key]))
    if(['power','heartRate','cadence'].includes(saved.metric))s.metric=saved.metric
    if(['power','heartRate','cadence','speed'].includes(saved.assistMetric))s.assistMetric=saved.assistMetric
    if(['physics','data','assist'].includes(saved.mode))s.mode=saved.mode
    if(['raw','playable'].includes(saved.shape))s.shape=saved.shape
    s.debug=saved.debug===true
    return s
  }catch{return {...defaults}}
}
export function saveSettings(s:Settings){try{localStorage.setItem('graphity-settings-v1',JSON.stringify(s))}catch{/* storage unavailable */}}

