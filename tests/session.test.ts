import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clockValues, DEFAULT_SETTINGS, gameLink, importLink, newSession, restore, STORAGE_KEY } from '../src/game/session'
import { applyMove, initialPosition, legalMoves, replay } from '../src/game/engine'
const storage = new Map<string,string>()
beforeEach(()=>{storage.clear();vi.stubGlobal('location',{origin:'https://hexchess.example',pathname:'/',hash:''});vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)||null,setItem:(k:string,v:string)=>storage.set(k,v)})})
describe('clocks and link sharing',()=>{
  it('counts elapsed wall time only for the active player and stops during pauses',()=>{
    const s={...newSession(),started:true,anchor:1000}
    expect(clockValues(s,'white',4100)).toEqual({white:596900,black:600000})
    expect(clockValues({...s,paused:true},'white',4100)).toEqual(s.clocks)
    expect(clockValues({...s,started:false},'white',4100)).toEqual(s.clocks)
    expect(clockValues(s,'black',1000000).black).toBe(0)
  })
  it('makes correspondence untimed even with custom timed settings',()=>{
    const s=newSession({...DEFAULT_SETTINGS,mode:'correspondence',minutes:10,increment:5})
    expect(s.settings.minutes).toBe(0);expect(s.settings.increment).toBe(0)
  })
  it('round-trips Unicode names and history through a game link',()=>{
    const m=legalMoves(initialPosition(),'f5')[0],s={...newSession({...DEFAULT_SETTINGS,mode:'local',whiteName:'Łukasz ♔',blackName:'ಸ್ನೇಹಿತ'}),moves:[m]}
    const url=gameLink(s),imported=importLink(url.slice(url.indexOf('#')))
    expect(imported.moves).toEqual([m]);expect(imported.settings.whiteName).toBe('Łukasz ♔');expect(imported.settings.blackName).toBe('ಸ್ನೇಹಿತ')
    expect(imported.settings.mode).toBe('correspondence');expect(imported.settings.minutes).toBe(0)
    expect(replay(imported.moves).pos).toEqual(applyMove(initialPosition(),m))
  })
  it('restores a shared game with valid clock history after saving it',()=>{
    const m=legalMoves(initialPosition())[0],s={...newSession(),moves:[m]},url=gameLink(s)
    const imported=importLink(url.slice(url.indexOf('#')))
    storage.set(STORAGE_KEY,JSON.stringify(imported))
    expect(restore().session.moves).toEqual([m]);expect(restore().error).toBeUndefined()
  })
  it('rejects malformed links, illegal history, unsupported versions and settings',()=>{
    expect(()=>importLink('#game=garbage')).toThrow()
    const encode=(data:unknown)=>'#game='+btoa(JSON.stringify(data))
    expect(()=>importLink(encode({v:2,settings:DEFAULT_SETTINGS,moves:[]}))).toThrow()
    expect(()=>importLink(encode({v:1,settings:{...DEFAULT_SETTINGS,minutes:-1},moves:[]}))).toThrow()
    expect(()=>importLink(encode({v:1,settings:DEFAULT_SETTINGS,moves:[{from:'f5',to:'bad'}]}))).toThrow()
  })
  it('falls back safely when device storage is corrupt',()=>{
    storage.set(STORAGE_KEY,'{"moves":');expect(restore().session.moves).toEqual([]);expect(restore().error).toBeDefined()
  })
})
