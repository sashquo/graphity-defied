import { Decoder, Stream } from '@garmin/fitsdk'
import { processActivity, type Sample } from './activity'
type FitRow=Record<string,unknown>
const seconds=(v:unknown)=>v instanceof Date?v.getTime()/1000:NaN
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:undefined
export function importFit(buffer:ArrayBuffer,name:string){
  const stream=Stream.fromArrayBuffer(buffer)
  if(!Decoder.isFIT(stream))throw new Error('This is not a Garmin FIT file.')
  const decoder=new Decoder(stream)
  if(!decoder.checkIntegrity())throw new Error('The FIT file is incomplete or its checksum does not match.')
  const {messages,errors}=decoder.read()
  const rows=(messages.recordMesgs??[]) as FitRow[]
  if(rows.length<2)throw new Error('The file contains fewer than two workout records.')
  const original:Sample[]=rows.map(row=>{
    const speed=num(row.enhancedSpeed)??num(row.speed)
    return {time:seconds(row.timestamp),distance:num(row.distance),heartRate:num(row.heartRate),power:num(row.power),cadence:num(row.cadence),speed:speed===undefined?undefined:speed*3.6}
  })
  const sessions=(messages.sessionMesgs??[]) as FitRow[]
  const info=sessions[0]
  const activity=processActivity(name.replace(/\.fit$/i,''),'FIT',original,{
    date:info?.startTime instanceof Date?info.startTime:undefined,
    duration:sessions.length===1?num(info?.totalElapsedTime):undefined,
    distance:sessions.length===1?num(info?.totalDistance):undefined,
    warnings:errors.length?[errors.length+' FIT decoder warnings; valid records were retained.']:[]
  })
  if(!activity.available.some(k=>k!=='speed'))throw new Error('No usable heart rate, power or cadence series was found.')
  return activity
}
