import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyMove, initialPosition, legalMoves, replay } from '../src/game/engine'
import { playMove, queuePremove, resolvePremove } from '../src/game/controls'
import { premoveTargets } from '../src/game/premoves'
import { DEFAULT_SETTINGS, gameLink, importLink, newSession, restore, STORAGE_KEY } from '../src/game/session'
import type { Session } from '../src/game/session'
const hash=(s:Session)=>new URL(gameLink(s)).hash
const waiting=()=>playMove(newSession(),{from:'f5',to:'f6'},1000)
beforeEach(()=>vi.stubGlobal('location',{origin:'https://hexchess.test',pathname:'/',hash:''}))
describe('premoves',()=>{
  it('queues only the assigned color while waiting, without changing the board',()=>{
    const s=waiting(),queued=queuePremove(s,{from:'e4',to:'e5'})
    expect(queued.moves).toEqual(s.moves);expect(queued.premove?.after).toBe(1)
    expect(resolvePremove(queued)).toBe(queued)
    expect(queuePremove(s,{from:'g7',to:'g6'})).toBe(s)
    const own=newSession();expect(queuePremove(own,{from:'e4',to:'e5'})).toBe(own)
    const local=playMove(newSession({...DEFAULT_SETTINGS,mode:'local'}),{from:'f5',to:'f6'})
    expect(queuePremove(local,{from:'e4',to:'e5'})).toBe(local)
  })
  it('executes exactly once after the reply and uses normal clock accounting',()=>{
    const queued=queuePremove(waiting(),{from:'e4',to:'e5'}),reply=playMove(queued,{from:'g7',to:'g6'},2000,true),done=resolvePremove(reply,2003)
    expect(done.moves).toHaveLength(3);expect(done.moves.at(-1)).toEqual({from:'e4',to:'e5'})
    expect(done.premove).toBeUndefined();expect(done.clocks.white).toBe(609997)
    expect(resolvePremove(done)).toBe(done);expect(()=>replay(done.moves)).not.toThrow()
  })
  it('rechecks an anticipated en passant capture after a new pawn double step',()=>{
    let s=newSession()
    for(const [from,to] of [['f5','f6'],['g7','g6'],['f6','g6'],['b7','b6'],['e4','e5']])s=playMove(s,{from,to},Date.now(),replay(s.moves).pos.turn==='black')
    expect(s.moves).toHaveLength(5)
    const queued=queuePremove(s,{from:'e5',to:'f6'}),reply=playMove(queued,{from:'f7',to:'f5'},Date.now(),true),done=resolvePremove(reply)
    expect(done.moves).toHaveLength(7);expect(replay(done.moves).pos.board.f5).toBeUndefined();expect(replay(done.moves).pos.board.f6.color).toBe('white')
  })
  it('cannot bypass an expired clock when the premove is resolved',()=>{
    const queued=queuePremove({...waiting(),clocks:{white:1,black:600000}},{from:'e4',to:'e5'}),reply=playMove(queued,{from:'g7',to:'g6'},2000,true),done=resolvePremove(reply,2002)
    expect(done.moves).toHaveLength(2);expect(done.result).toEqual({reason:'timeout',winner:'black'});expect(done.premove).toBeUndefined()
  })
  it('cancels a pawn push if the opponent occupies its destination',()=>{
    const queued=queuePremove(waiting(),{from:'g4',to:'g5'}),reply=playMove(queued,{from:'g7',to:'g5'},2000,true),done=resolvePremove(reply,2001)
    expect(done.moves).toHaveLength(2);expect(done.premove).toBeUndefined();expect(replay(done.moves).pos.board.g5.color).toBe('black')
  })
  it('cancels if the queued piece has been captured',()=>{
    const s=playMove(newSession(),{from:'g4',to:'g6'},1000),queued=queuePremove(s,{from:'g6',to:'g7'}),reply=playMove(queued,{from:'f7',to:'g6'},2000,true)
    expect(reply.moves).toHaveLength(2);const done=resolvePremove(reply)
    expect(done.moves).toHaveLength(2);expect(done.premove).toBeUndefined()
  })
  it('never executes through pause, game end, a different game, or stale history',()=>{
    const queued=queuePremove(waiting(),{from:'e4',to:'e5'})
    for(const s of [{...queued,paused:true},{...queued,result:{reason:'agreement' as const,winner:null}},{...queued,id:'different'},{...queued,moves:[]}]){
      const done=resolvePremove(s);expect(done.moves).toEqual(s.moves);expect(done.premove).toBeUndefined()
    }
  })
  it('allows speculative captures and promotions but rejects impossible geometry',()=>{
    const pos=applyMove(initialPosition(),{from:'f5',to:'f6'})
    expect(premoveTargets(pos,'g4','white').some(m=>m.to==='f5')).toBe(true)
    expect(queuePremove(waiting(),{from:'e4',to:'a6'}).premove).toBeUndefined()
    const targets=premoveTargets({...pos,board:{g9:{type:'P',color:'white'}}},'g9','white')
    expect(targets.filter(m=>m.to==='g10').map(m=>m.promotion)).toEqual(['Q','R','B','N'])
  })
  it('persists a pending move on the device but never puts it in shared links',()=>{
    const queued=queuePremove(waiting(),{from:'e4',to:'e5'})
    vi.stubGlobal('localStorage',{getItem:(k:string)=>k===STORAGE_KEY?JSON.stringify(queued):null})
    expect(restore().session.premove).toEqual(queued.premove)
    const payload=JSON.parse(atob(hash(queued).slice(6).replaceAll('-','+').replaceAll('_','/')))
    expect(payload.premove).toBeUndefined()
  })
  it('resolves a known correspondence reply without losing the saved premove',()=>{
    const s=playMove(newSession({...DEFAULT_SETTINGS,mode:'correspondence'}),{from:'f5',to:'f6'}),queued=queuePremove(s,{from:'e4',to:'e5'}),black=importLink(hash(s)),reply=playMove(black,legalMoves(replay(black.moves).pos,'g7').find(m=>m.to==='g6')!)
    const incoming=importLink(hash(reply),queued)
    expect(incoming.premove).toEqual(queued.premove)
    expect(resolvePremove(incoming).moves).toHaveLength(3)
    expect(importLink(hash(reply)).premove).toBeUndefined()
  })
})
