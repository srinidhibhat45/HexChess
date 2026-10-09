import { beforeEach, describe, expect, it, vi } from 'vitest'
import { legalMoves, replay } from '../src/game/engine'
import { canPause, canTakeBack, canUseHints, declineDraw, offerDraw, ownsTurn, playMove, zenEnabled } from '../src/game/controls'
import { DEFAULT_SETTINGS, exportGame, importGame, gameLink, importLink, newSession, parseMoves, restore, STORAGE_KEY, validateOutcome } from '../src/game/session'
import type { Session } from '../src/game/session'
const storage=new Map<string,string>()
const hash=(s:Session)=>gameLink(s).split('#')[1]
const receive=(s:Session,trusted?:Session)=>importLink('#'+hash(s),trusted)
const encode=(data:unknown)=>'#game='+btoa(JSON.stringify(data)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')
const move=(s:Session)=>legalMoves(replay(s.moves).pos)[0]
beforeEach(()=>{storage.clear();vi.stubGlobal('location',{origin:'https://hexchess.test',pathname:'/',hash:''});vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)||null})})
describe('offline fair play and focus',()=>{
  it('automatically focuses a started game and preserves an explicit exit',()=>{
    const s=newSession();expect(zenEnabled(s)).toBe(false)
    const played=playMove(s,move(s));expect(zenEnabled(played)).toBe(true)
    expect(zenEnabled(playMove({...s,zen:false},move(s)))).toBe(false)
    storage.set(STORAGE_KEY,JSON.stringify({...played,zen:false}))
    expect(zenEnabled(restore().session)).toBe(false)
    storage.set(STORAGE_KEY,JSON.stringify({...played,zen:undefined}))
    expect(zenEnabled(restore().session)).toBe(true)
  })
  it('limits assistance to computer practice',()=>{
    for(const mode of ['local','correspondence'] as const){const s=newSession({...DEFAULT_SETTINGS,mode});expect(canUseHints(s)).toBe(false);expect(canTakeBack(s)).toBe(false);expect(canPause(s)).toBe(false)}
    const s=newSession();expect(canUseHints(s)&&canTakeBack(s)&&canPause(s)).toBe(true)
  })
  it('rejects illegal destinations and moves for the wrong computer color',()=>{
    const s=newSession();expect(playMove(s,{from:'f5',to:'f11'})).toBe(s)
    const p=playMove(s,move(s));expect(playMove(p,move(p))).toBe(p)
    expect(playMove(p,move(p),Date.now(),true).moves).toHaveLength(2)
    expect(playMove(s,move(s),Date.now(),true)).toBe(s)
  })
  it('prevents moving after a clock expires or during a pause',()=>{
    const s={...newSession(),started:true,anchor:1000,clocks:{white:1,black:600000}}
    const expired=playMove(s,move(s),1002);expect(expired.moves).toHaveLength(0);expect(expired.result).toEqual({reason:'timeout',winner:'black'})
    const paused={...s,paused:true};expect(playMove(paused,move(paused))).toBe(paused)
  })
  it('assigns opposite colors and permits just one move before a reply',()=>{
    const white=newSession({...DEFAULT_SETTINGS,mode:'correspondence'})
    const p=playMove(white,move(white));expect(ownsTurn(p)).toBe(false);expect(playMove(p,move(p))).toBe(p)
    const black=receive(p);expect(black.seat).toBe('black');expect(ownsTurn(black)).toBe(true)
    const reply=playMove(black,move(black));expect(ownsTurn(reply)).toBe(false)
    const back=receive(reply,p);expect(back.seat).toBe('white');expect(ownsTurn(back)).toBe(true);expect(back.id).toBe(p.id)
  })
  it('supports a fresh invitation with the sender playing Black',()=>{
    const sender={...newSession({...DEFAULT_SETTINGS,mode:'correspondence'}),seat:'black' as const}
    const recipient=receive(sender);expect(recipient.seat).toBe('white');expect(ownsTurn(sender)).toBe(false)
    expect(ownsTurn(receive(playMove(recipient,move(recipient)),sender))).toBe(true)
  })
  it('rejects an outgoing link, rewound history, edited prefixes and extra moves',()=>{
    const s=newSession({...DEFAULT_SETTINGS,mode:'correspondence'}),p=playMove(s,move(s)),black=receive(p)
    expect(()=>receive(p,p)).toThrow(/outgoing/)
    expect(()=>receive({...black,moves:[]},p)).toThrow(/history/)
    const alternative=legalMoves(replay([]).pos).find(m=>m.to!==p.moves[0].to)!
    expect(()=>receive({...black,moves:[alternative]},p)).toThrow(/history/)
    const b=playMove(black,move(black)),w=receive(b,p),extra=playMove(w,move(w))
    expect(()=>receive({...extra,seat:'black'},p)).toThrow(/history/)
  })
  it('preserves the saved board when a conflicting link is opened on reload',()=>{
    const s=newSession({...DEFAULT_SETTINGS,mode:'correspondence'}),p=playMove(s,move(s)),black=receive(p)
    storage.set(STORAGE_KEY,JSON.stringify(p));vi.stubGlobal('location',{hash:'#'+hash({...black,moves:[]})})
    const restored=restore();expect(restored.error).toMatch(/unchanged/);expect(restored.session.moves).toEqual(p.moves)
  })
  it('requires an offer and the opponent’s acceptance for a shared draw',()=>{
    const white=newSession({...DEFAULT_SETTINGS,mode:'correspondence'}),offered=offerDraw(white)
    expect(offered.result).toBeNull();expect(offered.drawOffer).toBe('white')
    const black=receive(offered),accepted=offerDraw(black)
    expect(accepted.result).toEqual({reason:'agreement',winner:null});expect(receive(accepted,offered).result).toEqual(accepted.result)
    expect(()=>receive({...black,result:{reason:'agreement',winner:null}},white)).toThrow(/acceptance/)
  })
  it('rejects fabricated board results, invalid result scores and untimed flags',()=>{
    expect(()=>validateOutcome({reason:'checkmate',winner:'white'},[],DEFAULT_SETTINGS)).toThrow(/match/)
    expect(()=>validateOutcome({reason:'agreement',winner:'white'},[],DEFAULT_SETTINGS)).toThrow()
    expect(()=>receive({...newSession(),result:{reason:'resignation',winner:'white'}})).toThrow()
    expect(()=>importLink(encode({v:1,settings:DEFAULT_SETTINGS,moves:[],result:{reason:'timeout',winner:'black'}}))).toThrow()
  })
  it('lets the opponent decline a draw without ending or changing the board',()=>{
    const white=newSession({...DEFAULT_SETTINGS,mode:'correspondence'}),offered=offerDraw(white),black=receive(offered)
    expect(declineDraw(offered)).toBe(offered)
    const declined=declineDraw(black),back=receive(declined,offered)
    expect(back.result).toBeNull();expect(back.drawOffer).toBeNull();expect(back.moves).toEqual(white.moves)
  })
  it('validates imported results and round-trips an expired-clock export',()=>{
    const s={...newSession(),clocks:{white:0,black:600000},result:{reason:'timeout' as const,winner:'black' as const}}
    expect(importGame(exportGame(s)).result).toEqual(s.result)
    expect(()=>importGame({...exportGame(s),clocks:{white:100,black:600000}})).toThrow()
    expect(()=>importGame({...exportGame(newSession()),result:{reason:'checkmate',winner:'black'}})).toThrow()
    expect(importGame(exportGame(newSession({...DEFAULT_SETTINGS,mode:'local'}))).paused).toBe(false)
  })
  it('rejects prototype cell names, non-string promotions, and oversized histories',()=>{
    expect(()=>parseMoves([{from:'constructor',to:'f5'}])).toThrow()
    expect(()=>parseMoves([{from:'f5',to:'f6',promotion:false}])).toThrow()
    expect(()=>parseMoves(Array(2001).fill({from:'f5',to:'f6'}))).toThrow()
  })
  it('rejects inflated clocks and refuses to restore a pause in human games',()=>{
    const s=newSession({...DEFAULT_SETTINGS,mode:'local'});storage.set(STORAGE_KEY,JSON.stringify({...s,paused:true}));expect(restore().session.paused).toBe(false)
    storage.set(STORAGE_KEY,JSON.stringify({...s,clocks:{white:1e10,black:600000}}));expect(restore().error).toBeDefined()
  })
})
