import {meta,sampleAt,type Activity} from './activity'
import {clamp} from './terrain'
import type {Settings} from './settings'
export function assistance(settings:Settings,activity:Activity,time:number){
  if(settings.mode==='physics')return 0
  if(settings.mode==='assist')return .43
  const k=settings.assistMetric,value=sampleAt(activity.series[k],time)
  if(value===undefined)return 0
  const typical=k==='power'?400:k==='heartRate'?190:k==='cadence'?120:55
  return .72*clamp((value-meta[k].min)/(typical-meta[k].min),0,1)*settings.multiplier
}

