import Phaser from 'phaser'
import {meta,sampleAt,type Activity} from './activity'
import type {Settings} from './settings'
import {atX,clamp,type Track} from './terrain'
import {BikePhysics,GroundBodies,type Controls} from './bike'
import {FRAME_MS} from './drivetrain'
import {assistance} from './movement'
import {drawRider} from './rider'
export type Status='riding'|'paused'|'crashed'|'finished'
export type Hud={speed:number;rpm:number;time:number;progress:number;crashes:number;value?:number;x:number;slope:number;drive:number;rear:boolean;front:boolean;fps:number;status:Status}
export type GameActions={reset:()=>void;pause:()=>void}
export type Run={activity:Activity;settings:Settings;track:Track;startAt:number}
export const emptyHud:Hud={speed:0,rpm:0,time:0,progress:0,crashes:0,x:0,slope:0,drive:0,rear:false,front:false,fps:0,status:'riding'}
class GameScene extends Phaser.Scene{
  private bike!:BikePhysics
  private ground!:GroundBodies
  private art!:Phaser.GameObjects.Graphics
  private landscape!:Phaser.GameObjects.Graphics
  private mark!:Phaser.GameObjects.Text
  private keys=new Set<string>()
  private status:Status='riding'
  private elapsed=0
  private crashes=0
  private accumulator=0
  private packet=0
  private checkpoint=0
  private camX=0
  private camY=0
  private fps=0
  constructor(private run:Run,private onHud:(hud:Hud)=>void){super('Ride')}
  create(){
    const world=this.matter.world
    world.autoUpdate=false
    world.setGravity(0,this.run.settings.gravity)
    world.engine.positionIterations=9
    world.engine.velocityIterations=8
    world.engine.constraintIterations=6
    this.landscape=this.add.graphics().setScrollFactor(0)
    this.art=this.add.graphics()
    this.mark=this.add.text(0,0,'FINISH',{fontFamily:'monospace',fontSize:11,color:'#d7f5ff',backgroundColor:'#133043',padding:{x:5,y:3}})
    const {track,startAt,settings}=this.run
    this.ground=new GroundBodies(world,track)
    this.bike=new BikePhysics(world,track,settings)
    const spawn=track.start+(track.finish-track.start)*startAt
    this.checkpoint=spawn
    this.ground.sync(spawn);this.bike.reset(spawn)
    const finish=atX(track.points,track.finish)
    this.mark.setPosition(track.finish+4,finish.y-76)
    this.camX=spawn-this.scale.width*.32;this.camY=this.bike.frame.position.y-this.scale.height*.60
    this.cameras.main.setScroll(this.camX,this.camY)
    const onDown=(e:KeyboardEvent)=>{
      if(!['KeyW','ArrowUp','KeyS','ArrowDown','KeyA','ArrowLeft','KeyD','ArrowRight','KeyR','Escape'].includes(e.code))return
      if(e.target instanceof HTMLElement&&['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return
      e.preventDefault()
      this.keys.add(e.code)
      if(e.repeat)return
      if(e.code==='KeyR')this.reset()
      if(e.code==='Escape')this.pauseRide()
    }
    const onUp=(e:KeyboardEvent)=>this.keys.delete(e.code)
    const onBlur=()=>{this.keys.clear();if(this.status==='riding')this.pauseRide()}
    window.addEventListener('keydown',onDown);window.addEventListener('keyup',onUp);window.addEventListener('blur',onBlur)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      window.removeEventListener('keydown',onDown);window.removeEventListener('keyup',onUp);window.removeEventListener('blur',onBlur)
    })
    this.emitHud()
  }
  reset(){
    if(!this.bike||this.status==='finished')return
    this.ground.sync(this.checkpoint);this.bike.reset(this.checkpoint);this.status='riding';this.accumulator=0;this.emitHud()
  }
  pauseRide(){
    if(this.status==='riding'||this.status==='paused'){
      this.status=this.status==='riding'?'paused':'riding'
      this.keys.clear();this.accumulator=0;this.emitHud()
    }
  }
  private emitHud(){
    if(!this.bike)return
    const {track,settings,activity}=this.run
    const x=this.bike.frame.position.x, pos=atX(track.points,x)
    this.onHud({speed:this.bike.speed(),rpm:this.bike.rpm,time:this.elapsed/1000,progress:clamp((x-track.start)/(track.finish-track.start),0,1),
      crashes:this.crashes,value:sampleAt(activity.series[settings.metric],pos.t),x,slope:pos.slope*-180/Math.PI,drive:this.bike.drive,
      rear:this.bike.rearGround,front:this.bike.frontGround,fps:this.fps,status:this.status})
  }
  update(_time:number,delta:number){
    if(!this.bike)return
    this.fps=this.game.loop.actualFps
    if(this.status==='riding'){
      this.accumulator+=Math.min(delta,80)
      while(this.accumulator>=FRAME_MS-.001&&this.status==='riding'){
        this.accumulator-=FRAME_MS
        const pedal=this.keys.has('KeyW')||this.keys.has('ArrowUp')
        const brake=this.keys.has('KeyS')||this.keys.has('ArrowDown')
        const lean=Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))
        const controls:Controls={pedal,brake,lean}
        const {track,activity,settings}=this.run
        this.ground.sync(this.bike.frame.position.x)
        const t=atX(track.points,this.bike.frame.position.x).t
        this.bike.preStep(controls,assistance(settings,activity,t))
        this.matter.world.step(FRAME_MS)
        this.elapsed+=FRAME_MS
        if(this.bike.crashed()){this.crashes++;this.status='crashed';this.emitHud()}
        else{
          const x=this.bike.frame.position.x
          for(const checkpoint of track.checkpoints)if(checkpoint<=x)this.checkpoint=Math.max(this.checkpoint,checkpoint)
          if(x>=track.finish){this.status='finished';this.emitHud()}
        }
      }
    }
    this.packet+=delta
    if(this.packet>90){this.emitHud();this.packet=0}
    this.draw(delta)
  }
  private draw(delta:number){
    const {track,settings}=this.run
    const w=this.scale.width,h=this.scale.height,bike=this.bike
    const targetX=bike.frame.position.x-w*.32+clamp(bike.frame.velocity.x*9,-60,135)
    const targetY=bike.frame.position.y-h*.59
    const ease=1-Math.exp(-delta/150)
    this.camX+=(targetX-this.camX)*ease;this.camY+=(targetY-this.camY)*ease
    this.cameras.main.setScroll(this.camX,this.camY)
    const bg=this.landscape
    bg.clear()
    bg.lineStyle(1,0x2c4b67,.28)
    for(let x=-(this.camX*.36%52);x<w;x+=52)bg.lineBetween(x,0,x,h)
    for(let y=-(this.camY*.32%52);y<h;y+=52)bg.lineBetween(0,y,w,y)
    for(let j=0;j<2;j++){
      bg.fillStyle(j?0x0d2334:0x101e33,1);bg.beginPath();bg.moveTo(0,h)
      for(let x=0;x<w+23;x+=23){
        const p=x+this.camX*(.12+j*.11)
        bg.lineTo(x,h*(.64+j*.1)+Math.sin(p/(101+j*26))*33+Math.sin(p/(37+j*13))*13)
      }
      bg.lineTo(w,h);bg.closePath();bg.fillPath()
    }
    const g=this.art,p=track.points
    g.clear()
    const a=atX(p,this.camX-80).index,z=Math.min(p.length-1,atX(p,this.camX+w+80).index+2)
    const outline=()=>{
      g.moveTo(Math.min(p[a].x,this.camX-80),p[a].y)
      for(let i=a;i<=z;i++)g.lineTo(p[i].x,p[i].y)
      if(p[z].x<this.camX+w)g.lineTo(this.camX+w+80,p[z].y)
    }
    g.fillStyle(0x112b3d,1);g.beginPath();outline();g.lineTo(Math.max(this.camX+w+80,p[z].x),this.camY+h+300);g.lineTo(this.camX-80,this.camY+h+300);g.closePath();g.fillPath()
    g.lineStyle(12,0x43bce0,.14);g.beginPath();outline();g.strokePath()
    g.lineStyle(2.5,0x7cddf4,1);g.beginPath();outline();g.strokePath()
    for(const checkpoint of [...track.checkpoints,track.finish]){
      if(checkpoint<this.camX-30||checkpoint>this.camX+w+30)continue
      const y=atX(p,checkpoint).y
      g.lineStyle(1,0x78d8ec,.8);g.lineBetween(checkpoint,y,checkpoint,y-75)
      if(checkpoint!==track.finish){g.fillStyle(0x83e4ff,.9);g.fillTriangle(checkpoint,y-75,checkpoint+15,y-68,checkpoint,y-61)}
      else for(let row=0;row<3;row++)for(let col=0;col<4;col++){g.fillStyle((row+col)%2?0x163346:0xeefaff,1);g.fillRect(checkpoint+col*6,y-75+row*6,6,6)}
    }
    if(settings.debug){
      const bodies=[...this.ground.visible(),bike.rear,bike.front,bike.frame]
      for(const body of bodies){
        if(body.bounds.max.x<this.camX||body.bounds.min.x>this.camX+w)continue
        g.lineStyle(1,0xffa676,.7)
        if(body.vertices)g.strokePoints(body.vertices,true)
      }
    }
    drawRider(g,bike,this.status==='crashed')
  }
}
export function mountGame(parent:HTMLDivElement,run:Run,onHud:(hud:Hud)=>void):{destroy:()=>void;actions:GameActions}{
  const scene=new GameScene(run,onHud)
  const game=new Phaser.Game({type:Phaser.CANVAS,parent,backgroundColor:'#0b1727',banner:false,audio:{noAudio:true},
    scale:{mode:Phaser.Scale.RESIZE,width:parent.clientWidth||960,height:parent.clientHeight||480},
    fps:{target:60},physics:{default:'matter',matter:{enableSleeping:false}},scene})
  return {destroy:()=>game.destroy(true),actions:{reset:()=>scene.reset(),pause:()=>scene.pauseRide()}}
}
export const metricValue=(run:Run,hud:Hud)=>hud.value===undefined?'—':Math.round(hud.value)+' '+meta[run.settings.metric].unit


