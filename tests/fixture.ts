import {Encoder,type FileIdMesg,type RecordMesg} from '@garmin/fitsdk'
export function fixture(values=[105,135,174,123],power=false){
  const encoder=new Encoder()
  const date=new Date('2025-02-04T09:00:00Z')
  encoder.onMesg(0,{type:'activity',timeCreated:date} as FileIdMesg)
  for(let i=0;i<values.length;i++){
    encoder.onMesg(20,{timestamp:new Date(+date+i*5000),heartRate:values[i],distance:40*i,enhancedSpeed:8.5,...(power?{power:values[i]*2,cadence:91}: {})} as RecordMesg)
  }
  return encoder.close()
}
export function bytesArray(data:Uint8Array):ArrayBuffer{
  return Uint8Array.from(data).buffer
}
