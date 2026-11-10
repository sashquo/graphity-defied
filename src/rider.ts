import type Phaser from 'phaser'
import { transform, type BikePhysics } from './bike'
const cyan=0x73e3ff,blue=0x208cef,ink=0x0b1421,white=0xf4f6ef
type P={x:number;y:number}
function line(g:Phaser.GameObjects.Graphics,a:P,b:P,color:number,width:number){
  g.lineStyle(width,color,1);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.strokePath()
}
function joint(a:P,b:P,upper:number,lower:number,sign:number):P{
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.001,Math.hypot(dx,dy))
  const p=Math.max(0,Math.min(upper,(upper*upper+d*d-lower*lower)/(2*d)))
  const h=sign*Math.sqrt(Math.max(0,upper*upper-p*p))
  return{x:a.x+dx/d*p-dy/d*h,y:a.y+dy/d*p+dx/d*h}
}
export function drawRider(g:Phaser.GameObjects.Graphics,b:BikePhysics,crashed:boolean){
  const P=(x:number,y:number)=>transform(b.frame,x,y)
  const back=b.rear.position,front=b.front.position,bb=P(-5,9),seat=P(-13,-12),head=P(19,-9),bar=P(27,-16)
  for(const wheel of [b.rear,b.front]){
    const {x,y}=wheel.position
    g.fillStyle(0x111d2c,1);g.fillCircle(x,y,17)
    g.lineStyle(3,0x06111c,1);g.strokeCircle(x,y,16)
    g.lineStyle(1.4,0x79b7d2,1);g.strokeCircle(x,y,13.7)
    for(let i=0;i<8;i++){
      const t=i*Math.PI/4+wheel.angle
      line(g,{x,y},{x:x+13.3*Math.cos(t),y:y+13.3*Math.sin(t)},i%2?0x334b66:0x58728a,1)
    }
    g.fillStyle(white,1);g.fillCircle(x,y,2)
  }
  for(const [a,z] of [[back,bb],[back,seat],[seat,bb],[seat,head],[bb,head],[head,front],[head,bar]])line(g,a,z,cyan,2.2)
  line(g,P(-20,-13),P(-8,-13),ink,3)
  line(g,bar,P(28,-9),white,2)
  const balance=b.lean*7, airborne=!b.frontGround&&!b.rearGround
  const hip=P(-12+balance,-19-(airborne?2:0)),shoulder=P(5+balance,-34-(crashed?1:0))
  const helmet=P(12+balance,-42)
  for(const side of [1,0]){
    const phase=b.crank+side*Math.PI
    const pedal=P(-5+7*Math.cos(phase),9+7*Math.sin(phase))
    const foot={x:pedal.x+1,y:pedal.y-2}
    const knee=joint(hip,foot,18,17,-1)
    line(g,bb,pedal,side?0x447a93:white,2)
    line(g,hip,knee,side?0x193656:0x275887,6)
    line(g,knee,foot,side?0x7f8fa6:0xdce5e7,4)
    line(g,{x:foot.x-3,y:foot.y+1},{x:foot.x+5,y:foot.y+1},side?0x7996af:white,3)
  }
  line(g,hip,shoulder,ink,13)
  line(g,hip,shoulder,blue,9)
  line(g,P(-8+balance,-24),P(4+balance,-33),cyan,2)
  const elbow=joint(shoulder,bar,12,13,1)
  line(g,shoulder,elbow,blue,5)
  line(g,elbow,bar,white,3.6)
  g.fillStyle(white,1);g.fillCircle(helmet.x,helmet.y,6.6)
  const visor=P(15+balance,-41)
  g.fillStyle(ink,1);g.fillEllipse(visor.x+1,visor.y+1,7,3)
  g.fillStyle(cyan,1);g.fillCircle(helmet.x-2,helmet.y-3,2)
}

