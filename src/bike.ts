import Phaser from 'phaser'
import { FRAME_MS, WHEEL_RADIUS as R, cadence, crankSpeed, kmh, pedalTorque } from './drivetrain'
import { atX, clamp, type Track } from './terrain'
import type { Settings } from './settings'
type Body=MatterJS.BodyType
const M=(Phaser.Physics.Matter as unknown as {Matter:typeof MatterJS}).Matter
export type Controls={pedal:boolean;brake:boolean;lean:number}
export const transform=(b:Body,x:number,y:number)=>({x:b.position.x+x*Math.cos(b.angle)-y*Math.sin(b.angle),y:b.position.y+x*Math.sin(b.angle)+y*Math.cos(b.angle)})
export class BikePhysics{
  readonly frame:Body
  readonly rear:Body
  readonly front:Body
  readonly world:Phaser.Physics.Matter.World
  rearGround=false
  frontGround=false
  crank=0
  rpm=0
  lean=0
  drive=0
  tiltTime=0
  constructor(world:Phaser.Physics.Matter.World,public track:Track,public settings:Settings){
    this.world=world
    const group=M.Body.nextGroup(true)
    this.frame=M.Bodies.rectangle(0,0,46,17,{density:.004,frictionAir:.004,label:'frame',collisionFilter:{group,category:1,mask:0}})
    const wheel=(label:string)=>M.Bodies.circle(0,0,R,{density:.0018,friction:Math.min(1,.67*settings.grip),frictionStatic:.85,frictionAir:.003,restitution:0,slop:.02,label,collisionFilter:{group,category:1,mask:0xffffffff}},24)
    this.rear=wheel('rear');this.front=wheel('front')
    const axle=(body:Body,x:number)=>M.Constraint.create({bodyA:this.frame,pointA:{x,y:12},bodyB:body,length:0,stiffness:.92,damping:.18})
    world.add([this.frame,this.rear,this.front,axle(this.rear,-26),axle(this.front,26)])
    const contact=(e:MatterJS.IEventCollision<Phaser.Physics.Matter.World>)=>{
      for(const p of e.pairs){
        if((p.bodyA as Body).label==='terrain'||(p.bodyB as Body).label==='terrain'){
          this.rearGround||=p.bodyA===this.rear||p.bodyB===this.rear
          this.frontGround||=p.bodyA===this.front||p.bodyB===this.front
        }
      }
    }
    world.on('collisionstart',contact)
    world.on('collisionactive',contact)
    world.on('beforeupdate',()=>{this.rearGround=false;this.frontGround=false})
  }
  reset(x:number){
    const a=atX(this.track.points,x-26),b=atX(this.track.points,x+26)
    const angle=Math.atan2(b.y-a.y,52)
    const p={x,y:(a.y+b.y)/2-R-14}
    M.Body.setPosition(this.frame,p);M.Body.setAngle(this.frame,angle)
    M.Body.setPosition(this.rear,transform(this.frame,-26,12));M.Body.setPosition(this.front,transform(this.frame,26,12))
    for(const body of [this.frame,this.rear,this.front]){
      M.Body.setVelocity(body,{x:0,y:0});M.Body.setAngularVelocity(body,0);body.force.x=0;body.force.y=0;body.torque=0
    }
    this.rearGround=false;this.frontGround=false;this.crank=0;this.rpm=0;this.lean=0;this.tiltTime=0;this.drive=0
  }
  preStep(input:Controls, assist:number){
    const s=this.settings
    this.lean+=(input.lean-this.lean)*.14
    const drive=input.pedal||assist>0
    this.drive=pedalTorque(this.rear.angularVelocity,s.gear,(input.pedal?s.torque:0)+assist)
    if(input.brake)this.drive=0
    this.rear.torque+=this.drive*(this.rearGround?1:.19)
    const traction=(wheel:Body,ground:boolean)=>{
      const rolling=ground?.014*s.rolling:0
      const braking=input.brake?(ground?1.6:.62):0
      wheel.torque-=clamp(wheel.angularVelocity*2.3,-(braking+rolling),braking+rolling)
    }
    traction(this.rear,this.rearGround);traction(this.front,this.frontGround)
    const air=!this.rearGround&&!this.frontGround
    this.frame.torque+=this.lean*(air?.48:.67)-this.frame.angularVelocity*.42
    if(!air){
      const terrain=atX(this.track.points,this.frame.position.x)
      const error=Math.atan2(Math.sin(terrain.slope-this.frame.angle),Math.cos(terrain.slope-this.frame.angle))
      // Weight transfer and mild upright support; the wheels remain the only drive contact.
      this.frame.torque+=clamp(error,-.7,.7)*.39
      const p=transform(this.frame,this.lean*18,-15)
      M.Body.applyForce(this.frame,p,{x:0,y:.00125*s.gravity})
    }
    const v=this.frame.velocity
    const drag=.000054*Math.hypot(v.x,v.y)
    M.Body.applyForce(this.frame,this.frame.position,{x:-v.x*drag,y:-v.y*drag*.36})
    const c=crankSpeed(this.rear.angularVelocity,s.gear,drive&&!input.brake)
    this.rpm=cadence(c)
    this.crank=(this.crank+c)%(Math.PI*2)
  }
  crashed(){
    const h=transform(this.frame,12+this.lean*9,-42)
    const middle=transform(this.frame,3+this.lean*9,-22)
    const ground=(p:{x:number;y:number},r:number)=>p.y+r>atX(this.track.points,p.x).y
    const angle=Math.abs(Math.atan2(Math.sin(this.frame.angle),Math.cos(this.frame.angle)))
    this.tiltTime=angle>2.15?this.tiltTime+FRAME_MS:0
    return ground(h,7)||ground(middle,4)||this.tiltTime>240||this.frame.position.y>1100||this.frame.position.x < -25
  }
  speed(){return kmh(this.frame.velocity.x)}
}
export class GroundBodies {
  private active=new Map<number,Body[]>()
  private chunks=new Map<number,Body[]>()
  private built=new Set<number>()
  private cursor=0
  constructor(private world:Phaser.Physics.Matter.World,private track:Track){
    this.cursor=0
  }
  sync(x:number){
    const block=850,mid=Math.floor(x/block)
    const wanted=new Set([mid-1,mid,mid+1,mid+2].filter(n=>n>=0))
    for(const [key,bodies] of this.active)if(!wanted.has(key)){this.world.remove(bodies);this.active.delete(key)}
    const p=this.track.points
    for(const key of wanted){
      if(this.active.has(key))continue
      if(!this.built.has(key)){
        const bodies:Body[]=[]
        this.cursor=atX(p,key*block).index
        if(this.cursor>0&&p[this.cursor].x>=key*block)this.cursor--
        for(let i=this.cursor;i<p.length-1&&p[i].x<(key+1)*block;i++){
          const a=p[i],b=p[i+1]
          if(a.x<key*block)continue
          const floor=Math.max(a.y,b.y)+92
          const verts=[{x:a.x,y:a.y},{x:b.x,y:b.y},{x:b.x,y:floor},{x:a.x,y:floor}]
          const c=M.Vertices.centre(verts as MatterJS.Vector[])
          const body=M.Bodies.fromVertices(c.x,c.y,[verts],{isStatic:true,friction:1,frictionStatic:1,label:'terrain',slop:.02},false,0,0)
          if(body)bodies.push(body)
        }
        this.chunks.set(key,bodies);this.built.add(key)
      }
      const bodies=this.chunks.get(key)!
      this.world.add(bodies);this.active.set(key,bodies)
    }
  }
  visible(){return [...this.active.values()].flat()}
}



