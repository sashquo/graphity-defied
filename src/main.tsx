import {useEffect,useMemo,useRef,useState, type ChangeEvent, type ReactNode} from 'react'
import {createRoot} from 'react-dom/client'
import {demo,meta,terrainMetrics,type Activity,type Metric,type TerrainMetric} from './activity'
import {defaults,loadSettings,presets,saveSettings,sliders,type Settings} from './settings'
import {generateTerrain} from './terrain'
import {SourceChart,TrackChart} from './charts'
import type {GameActions,Hud,Run} from './game'
import './style.css'

const routes=[
  {name:'Endurance',level:'EASY',note:'Rolling hills · flowing profile',style:'easy'},
  {name:'Intervals',level:'MEDIUM',note:'Repeated climbs · sharp efforts',style:'medium'},
  {name:'Extreme',level:'HARD',note:'Steep drops · technical terrain',style:'hard'}
]
const demos=routes.map(r=>demo(r.name))
const defaultTracks=demos.map(a=>generateTerrain(a,defaults))
const time=(s:number)=>[Math.floor(s/60),Math.floor(s%60)].map(v=>String(v).padStart(2,'0')).join(':')
const icons:Record<string,ReactNode>={
  mountain:<path d="M2 17 9 6l4 6 3-4 6 9H2Zm5-7 2 2 2-2"/>,
  arrow:<path d="M4 12h15m-6-6 6 6-6 6"/>,
  upload:<><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/></>,
  play:<path d="m8 5 11 7-11 7V5Z"/>,
  back:<path d="M20 12H5m6-6-6 6 6 6"/>,
  sliders:<path d="M5 3v18M12 3v18M19 3v18M2 9h6m1 7h6m1-9h6"/>,
  pulse:<path d="M2 12h5l3-7 4 14 3-7h5"/>,
  lock:<><rect x="6" y="10" width="12" height="11" rx="2"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></>,
  wheel:<><circle cx="12" cy="12" r="8"/><path d="M4 12h16m-8-8v16M6 6l12 12M6 18 18 6"/></>,
  pause:<path d="M9 5v14m6-14v14"/>,
  reset:<path d="M3 12a9 9 0 1 1 3 7M3 5v7h7"/>
}
function Icon({name,size=18}:{name:string;size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>}
function Kbd({children}:{children:ReactNode}){return <kbd>{children}</kbd>}
function App(){
  const [view,setView]=useState<'home'|'lab'|'ride'>('home')
  const [activity,setActivity]=useState(demos[0])
  const [imported,setImported]=useState<Activity>()
  const [settings,setSettings]=useState(loadSettings)
  const [run,setRun]=useState<Run>()
  const [start,setStart]=useState(0)
  const [fitError,setFitError]=useState('')
  const [loading,setLoading]=useState(false)
  const input=useRef<HTMLInputElement>(null)
  const go=(v:typeof view)=>{setView(v);window.scrollTo(0,0)}
  useEffect(()=>saveSettings(settings),[settings])
  const effective=useMemo(()=>{
    const metric=activity.available.includes(settings.metric)?settings.metric:terrainMetrics.find(k=>activity.available.includes(k))!
    const assistMetric=activity.available.includes(settings.assistMetric)?settings.assistMetric:activity.available[0]
    return {...settings,metric,assistMetric}
  },[activity,settings])
  const track=useMemo(()=>generateTerrain(activity,effective),[activity,effective])
  const choose=(a:Activity)=>{setActivity(a);setStart(0)}
  const set=<K extends keyof Settings>(key:K,value:Settings[K])=>setSettings(s=>({...s,[key]:value}))
  const startRide=(a=activity)=>{
    const s=a===activity?effective:{...settings,metric:a.available.includes(settings.metric)?settings.metric:'power' as const,assistMetric:a.available.includes(settings.assistMetric)?settings.assistMetric:'power' as const}
    if(a!==activity)choose(a)
    setRun({activity:a,settings:{...s},track:a===activity?track:generateTerrain(a,s),startAt:view==='lab'&&a===activity?start/100:0})
    go('ride')
  }
  async function upload(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]
    e.target.value=''
    if(!file)return
    setFitError('');setLoading(true)
    try{
      if(file.size>40*1024*1024)throw new Error('Choose a FIT file under 40 MB.')
      const {importFit}=await import('./fit')
      const decoded=importFit(await file.arrayBuffer(),file.name)
      setImported(decoded);choose(decoded);go('lab')
    }catch(e){setFitError(e instanceof Error?e.message:'This FIT file could not be read.')}
    finally{setLoading(false)}
  }
  return <>
    <header className="top"><div className="shell top-inner">
      <button className="logo" onClick={()=>go('home')}><span className="logo-mark"><Icon name="mountain" size={22}/></span><span>GRAPHITY <i>DEFIED</i></span></button>
      <nav aria-label="Primary"><button className={view==='home'?'selected':''} onClick={()=>go('home')}>Overview</button><button className={view==='lab'?'selected':''} onClick={()=>go('lab')}>Track Lab</button></nav>
      <span className="version"><b/> PROTOTYPE <span>0.3</span></span>
    </div></header>
    <input className="hidden" type="file" accept=".fit,application/octet-stream" aria-label="FIT file" onChange={upload} ref={input}/>
    <main className={'shell page '+(view==='ride'?'ride-page':'')}>
      {fitError&&<div className="error" role="alert">{fitError}<button onClick={()=>setFitError('')} aria-label="Dismiss error">×</button></div>}
      {view==='home'&&<>
        <div className="home-grid">
          <section className="hero">
            <div className="hero-grid"/><TrackChart track={defaultTracks[0]} hero/>
            <div className="hero-content"><div className="eyebrow"><span className="small-line"/> PHYSICS CYCLING ARCADE</div>
            <h1>GRAPHITY<br/><em>DEFIED<span>.</span></em></h1>
            <p>Turn the peaks and valleys of a cycling workout into a track you can actually ride.</p>
            <div className="actions"><button className="button primary" onClick={()=>startRide(demos[0])}><Icon name="play"/> Try Demo</button><button className="button secondary" disabled={loading} onClick={()=>input.current?.click()}><Icon name="upload"/> {loading?'Reading…':'Upload FIT'}</button></div></div>
            <div className="hero-caption"><span><b/> TERRAIN PREVIEW</span><span>01 / ENDURANCE</span></div>
          </section>
          <aside className="ride-list">
            <div className="section-id">01 / SELECT A RIDE</div><h2>Demo routes</h2><p>Three workouts. Three ways to ride.</p>
            <div className="route-list">{routes.map((r,i)=><button key={r.name} className="route" onClick={()=>startRide(demos[i])}>
              <span className="route-number">0{i+1}</span><span className="route-text"><strong>{r.name}</strong><small>{r.note}</small><span className={'difficulty '+r.style}>{r.level}</span></span><Icon name="arrow" size={19}/>
            </button>)}</div>
            <button className="lab-link" onClick={()=>go('lab')}><Icon name="sliders" size={16}/> Open Track Lab <Icon name="arrow" size={16}/></button>
          </aside>
        </div>
        <section className="features" aria-label="How it works">
          <Feature icon="pulse" title="Ride your data">Use heart rate, power, or cadence to shape every hill.</Feature>
          <Feature icon="wheel" title="Physics first">Pedal, brake, and shift your weight. Let gravity do the rest.</Feature>
          <Feature icon="lock" title="Private by design">FIT workouts stay in this browser.</Feature>
        </section>
      </>}
      {view==='lab'&&<section>
        <div className="section-heading"><div><div className="eyebrow"><span className="small-line"/> 02 / WORKSHOP</div><h1>Track Lab<span>.</span></h1><p>Shape a workout into terrain, then take it for a ride.</p></div>
        <button className="button secondary" disabled={loading} onClick={()=>input.current?.click()}><Icon name="upload"/>{loading?'Reading…':'Upload FIT'}</button></div>
        <div className="lab-grid">
          <div className="lab-controls">
            <section className="panel">
              <h2>Workout</h2>
              <label className="select-label">Activity<select value={activity.source==='FIT'?'fit':activity.name} onChange={e=>{const d=e.target.value==='fit'?imported:demos.find(a=>a.name===e.target.value);if(d)choose(d)}}>
                {demos.map(a=><option key={a.name}>{a.name}</option>)}{imported&&<option value="fit">{imported.name}</option>}
              </select></label>
              <div className="stats-grid">
                <Stat label="Date" value={activity.date?.toLocaleDateString()??'Demo'}/><Stat label="Duration" value={time(activity.duration)}/>
                <Stat label="Distance" value={activity.distance===undefined?'—':(activity.distance/1000).toFixed(2)+' km'}/>
                {terrainMetrics.map(k=><Stat key={k} label={'Avg '+meta[k].short} value={activity.averages[k]===undefined?'—':Math.round(activity.averages[k]!)+' '+meta[k].unit}/>)}
              </div>
              {activity.warnings.length>0&&<details className="notes"><summary>Import notes ({activity.warnings.length})</summary>{activity.warnings.map(w=><p key={w}>{w}</p>)}</details>}
            </section>
            <section className="panel">
              <h2>Terrain & movement</h2>
              <label className="select-label">Terrain Source<select value={effective.metric} onChange={e=>set('metric',e.target.value as TerrainMetric)}>
                {terrainMetrics.map(k=><option value={k} key={k} disabled={!activity.available.includes(k)}>{meta[k].label}</option>)}
              </select></label>
              <fieldset><legend>Terrain geometry</legend><div className="segments">
                {(['playable','raw'] as const).map(k=><button type="button" key={k} aria-pressed={settings.shape===k} onClick={()=>set('shape',k)}>{k.toUpperCase()}</button>)}
              </div></fieldset>
              <label className="select-label">Movement Mode<select value={settings.mode} onChange={e=>set('mode',e.target.value as Settings['mode'])}>
                <option value="physics">Physics · Default</option><option value="data">Data Driven · Experimental</option><option value="assist">Constant Assist · Debug</option>
              </select></label>
              {settings.mode==='data'&&<label className="select-label">Assist Metric<select value={effective.assistMetric} onChange={e=>set('assistMetric',e.target.value as Metric)}>
                {Object.entries(meta).map(([k,v])=><option value={k} key={k} disabled={!activity.available.includes(k as Metric)}>{v.label}</option>)}
              </select></label>}
              <label className="check"><input type="checkbox" checked={settings.debug} onChange={e=>set('debug',e.target.checked)}/> Debug overlay and colliders</label>
            </section>
          </div>
          <div className="lab-main">
            <section className="panel">
              <div className="panel-head"><div><div className="section-id">LIVE PROFILE</div><h2>{activity.name}</h2></div><span className="pill">{settings.shape.toUpperCase()} · {meta[effective.metric].short}</span></div>
              <div className="compare">
                <div><h3>Original recording <small>{meta[effective.metric].unit}</small></h3><SourceChart points={activity.series[effective.metric]} duration={activity.duration} color={meta[effective.metric].color}/></div>
                <div><h3>Generated terrain <small>{track.maxSlope.toFixed(1)}° max</small></h3><TrackChart track={track} progress={start/100}/></div>
              </div>
              <div className="chart-key"><span><b/> Adjusted geometry</span><span><b/> Potential issues / gaps</span></div>
              {track.warnings.length>0&&<details className="notes"><summary>{track.warnings.length} sections to inspect</summary><div className="warning-list">{track.warnings.map(w=><button className="warning" key={w.x+w.kind} onClick={()=>setStart(Math.min(99,Math.max(0,Math.floor((w.x-track.start)/(track.finish-track.start)*100)-2)))}>{w.message} · {Math.max(0,Math.round((w.x-track.start)/(track.finish-track.start)*100))}% <Icon name="arrow" size={12}/></button>)}</div></details>}
              <p className="muted-note">Geometry checks flag problem areas. Ride the track to verify it is passable.</p>
              <div className="launch"><label className="range"><span>Start position <strong>{start}%</strong></span><input aria-label="Start position" type="range" min="0" max="99" step="1" value={start} onChange={e=>setStart(+e.target.value)}/></label>
              <button className="button primary" onClick={()=>startRide()}><Icon name="play"/> Start Ride</button></div>
            </section>
            <section className="panel">
              <div className="panel-head"><h2>Tuning</h2><label className="preset">Preset <select aria-label="Preset" value={Object.keys(presets).find(k=>Object.entries(presets[k as keyof typeof presets]).every(([p,v])=>settings[p as keyof Settings]===v))??'Custom'} onChange={e=>{const p=presets[e.target.value as keyof typeof presets];if(p)setSettings(s=>({...s,...p}))}}>
                <option disabled>Custom</option>{Object.keys(presets).map(k=><option key={k}>{k}</option>)}
              </select></label></div>
              <div className="tuning">{sliders.map(s=><label className="range" key={s.key}><span>{s.label}<strong>{settings[s.key]}{s.unit}</strong></span>
                <input aria-label={s.label} type="range" min={s.min} max={s.max} step={s.step} value={settings[s.key]} disabled={(s.key==='multiplier'&&settings.mode!=='data')||(['slope','smoothing'].includes(s.key)&&settings.shape==='raw')} onChange={e=>set(s.key,+e.target.value)}/></label>)}</div>
            </section>
          </div>
        </div>
      </section>}
      {view==='ride'&&run&&<Ride run={run} goLab={()=>go('lab')}/>}
      <footer><span>GRAPHITY DEFIED</span><span>YOUR WORKOUT. YOUR TERRAIN. YOUR CHALLENGE.</span><span>BUILD 0.3.0</span></footer>
    </main>
  </>
}
function Feature({icon,title,children}:{icon:string;title:string;children:ReactNode}){
  return <div className="feature"><span className="feature-icon"><Icon name={icon}/></span><div><h3>{title}</h3><p>{children}</p></div></div>
}
function Stat({label,value}:{label:string;value:string}){return <div className="stat"><span>{label}</span><strong>{value}</strong></div>}
function Ride({run,goLab}:{run:Run;goLab:()=>void}){
  const [hud,setHud]=useState<Hud>()
  const [error,setError]=useState('')
  const [attempt,setAttempt]=useState(0)
  const [play,ready]=useState(false)
  const host=useRef<HTMLDivElement>(null)
  const actions=useRef<GameActions|null>(null)
  useEffect(()=>{
    let active=true,cleanup:(()=>void)|undefined
    ready(false);setHud(undefined);setError('')
    import('./game').then(({mountGame})=>{
      if(!active||!host.current)return
      const game=mountGame(host.current,run,data=>{if(active){setHud(data);ready(true)}})
      cleanup=game.destroy;actions.current=game.actions
    }).catch(e=>{if(active)setError(e.message)})
    return ()=>{active=false;cleanup?.();actions.current=null}
  },[run,attempt])
  const status=hud?.status??'riding', metric=meta[run.settings.metric]
  return <>
    <div className="section-heading ride-heading"><div><button className="plain-link" onClick={goLab}><Icon name="back" size={15}/> Track Lab</button><h1>{run.activity.name}<span>.</span></h1></div>
    <span className="pill">{run.settings.mode==='physics'?'PHYSICS':run.settings.mode==='data'?'DATA DRIVEN':'CONSTANT ASSIST'} / {run.settings.shape.toUpperCase()}</span></div>
    <div className="hud" aria-label="Ride telemetry">
      <Stat label="Speed" value={Math.abs(hud?.speed??0).toFixed(1)+' km/h'}/><Stat label="Game cadence" value={Math.round(hud?.rpm??0)+' rpm'}/><Stat label="Time" value={time(hud?.time??0)}/>
      <Stat label="Progress" value={Math.floor((hud?.progress??0)*100)+'%'}/><Stat label="Crashes" value={String(hud?.crashes??0)}/><Stat label={'Terrain · '+metric.label} value={hud?.value===undefined?'—':Math.round(hud.value)+' '+metric.unit}/>
    </div>
    <div className="stage">
      <div className="canvas-host" ref={host} aria-label="Bike game"/>
      {!play&&<div className="game-overlay"><div>{error?<p role="alert">Game could not start: {error}</p>:<p>Preparing track…</p>}</div></div>}
      {status!=='riding'&&<div className="game-overlay"><div>
        <div className="eyebrow">{status==='crashed'?'CHECKPOINT SAVED':status==='paused'?'SIMULATION PAUSED':'RIDE COMPLETE'}</div>
        <h2>{status==='crashed'?'Crash.':status==='paused'?'Paused.':'Finished!'}</h2>
        <p>{status==='finished'?time(hud?.time??0)+' · '+hud?.crashes+' crashes':status==='paused'?'Pick up where you left off.':'Respawn at your last checkpoint.'}</p>
        <button className="button primary" onClick={()=>status==='crashed'?actions.current?.reset():status==='paused'?actions.current?.pause():setAttempt(n=>n+1)}>{status==='crashed'?'Respawn':status==='paused'?'Resume':'Ride Again'}</button>
      </div></div>}
      {run.settings.debug&&hud&&<output className="debug">{hud.fps.toFixed(0)} FPS · X {hud.x.toFixed(1)} · Grade {hud.slope.toFixed(1)}°<br/>{hud.speed.toFixed(1)} km/h · {hud.rpm.toFixed(0)} RPM · Torque {hud.drive.toFixed(3)}<br/>Rear {hud.rear?'ground':'air'} / Front {hud.front?'ground':'air'}</output>}
    </div>
    <div className="ride-bottom"><TrackChart track={run.track} progress={hud?.progress??0}/><div className="ride-buttons">
      <button className="button secondary" onClick={()=>actions.current?.pause()} disabled={status==='finished'||status==='crashed'}><Icon name="pause" size={16}/> Pause</button>
      <button className="button secondary" onClick={()=>setAttempt(n=>n+1)}><Icon name="reset" size={16}/> Restart</button>
    </div></div>
    <div className="controls"><span><Kbd>W</Kbd> / <Kbd>↑</Kbd> Pedal</span><span><Kbd>S</Kbd> / <Kbd>↓</Kbd> Brake</span><span><Kbd>A</Kbd> <Kbd>D</Kbd> / <Kbd>←</Kbd> <Kbd>→</Kbd> Lean</span><span><Kbd>R</Kbd> Respawn</span><span><Kbd>Esc</Kbd> Pause</span></div>
  </>
}
createRoot(document.getElementById('root')!).render(<App/>)


