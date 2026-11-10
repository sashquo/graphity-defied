export const WHEEL_RADIUS=17
export const WHEEL_METRES=.34
export const FRAME_MS=1000/60
export const kmh=(pixelsPerTick:number)=>pixelsPerTick*60*WHEEL_METRES/WHEEL_RADIUS*3.6
export function crankSpeed(wheelRadiansPerTick:number,ratio:number,pedaling:boolean){
  return pedaling?Math.max(0,wheelRadiansPerTick)/ratio:0
}
export function cadence(crankRadiansPerTick:number){return crankRadiansPerTick*3600/(2*Math.PI)}
export function pedalTorque(wheelRadiansPerTick:number,ratio:number,strength:number) {
  const rpm=cadence(crankSpeed(wheelRadiansPerTick,ratio,true))
  return .59*strength*(2.6/ratio)*Math.max(0,1-(rpm/145)**2)
}
