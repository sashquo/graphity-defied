import {describe,it,expect} from 'vitest'
import {demo,processActivity,sampleAt} from '../src/activity'
import {atX,generateTerrain} from '../src/terrain'
import {importFit} from '../src/fit'
import {defaults} from '../src/settings'
import {assistance} from '../src/movement'
import {cadence,crankSpeed,pedalTorque} from '../src/drivetrain'
import {bytesArray,fixture} from './fixture'

describe('FIT import',()=>{
  it('decodes real FIT records, uses enhanced speed and retains unavailable metrics',()=>{
    const a=importFit(bytesArray(fixture()),'sample.fit')
    expect(a.name).toBe('sample')
    expect(a.date?.toISOString()).toBe('2025-02-04T09:00:00.000Z')
    expect(a.available).toEqual(['heartRate','speed'])
    expect(a.distance).toBe(120)
    expect(a.duration).toBe(15)
    expect(a.original[0].speed).toBeCloseTo(30.6)
  })
  it('rejects corrupted files',()=>{
    const bytes=fixture();bytes[bytes.length-1]^=123
    expect(()=>importFit(bytesArray(bytes),'sample.fit')).toThrow(/checksum/)
  })
})
describe('activity and terrain',()=>{
  const a=processActivity('steps','DEMO',[{time:60,power:150},{time:3,power:600},{time:0,power:150},{time:3,power:-5,heartRate:152},{time:12,power:600},{time:73,power:190}])
  it('sorts and merges duplicate timestamps, marks estimates and keeps long gaps blank',()=>{
    expect(a.original).toHaveLength(6)
    expect(a.clean).toHaveLength(5)
    expect(a.clean[1]).toMatchObject({time:3,power:600,heartRate:152})
    expect(a.series.power.some(v=>v.estimated)).toBe(true)
    expect(sampleAt(a.series.power,40)).toBeUndefined()
    expect(sampleAt(a.series.power,40,true)).toBeDefined()
  })
  it('normalizes metrics, respects max slope and preserves data mapping after stretching',()=>{
    const options={...defaults,vertical:320,slope:14,smoothing:0}
    const t=generateTerrain(a,options),raw=generateTerrain(a,{...options,shape:'raw'})
    expect(t).toEqual(generateTerrain(a,options))
    expect(t.maxSlope).toBeLessThanOrEqual(14.001)
    expect(raw.maxSlope).toBeGreaterThan(14)
    expect(t.finish).toBeGreaterThan(raw.finish)
    expect(Math.max(...t.points.map(p=>p.y))-Math.min(...t.points.map(p=>p.y))).toBeCloseTo(320)
    expect(t.warnings.some(w=>w.kind==='gap')).toBe(true)
    for(const p of t.points)expect(atX(t.points,p.x).t).toBeCloseTo(p.t)
    expect(t.checkpoints).toHaveLength(10)
  })
})
describe('drivetrain',()=>{
  it('derives cadence from wheel rotation, fixed gear, and freewheel state',()=>{
    expect(cadence(crankSpeed(Math.PI/10,2,true))).toBeCloseTo(90)
    expect(crankSpeed(Math.PI/10,2,false)).toBe(0)
    expect(crankSpeed(-1,2,true)).toBe(0)
    expect(pedalTorque(0,2,1)).toBeGreaterThan(pedalTorque(0,3,1))
  })
  it('applies no recorded assistance in Physics mode',()=>{
    const a=demo('Intervals')
    expect(assistance(defaults,a,45)).toBe(0)
    expect(assistance({...defaults,mode:'assist'},a,45)).toBe(assistance({...defaults,mode:'assist'},a,70))
    expect(assistance({...defaults,mode:'data'},a,45)).not.toBe(assistance({...defaults,mode:'data'},a,70))
  })
})

