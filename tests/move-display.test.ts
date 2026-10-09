import { describe, expect, it } from 'vitest'
import { applyMove, initialPosition } from '../src/game/engine'
import type { Position } from '../src/game/engine'
import { moveDisplay } from '../src/game/move-display'
const kings={g1:{type:'K' as const,color:'white' as const},g10:{type:'K' as const,color:'black' as const}}
const position=(board:Position['board'],turn:Position['turn']='white'):Position=>({board,turn,ep:null,halfmove:0,fullmove:1})
describe('readable move notation',()=>{
  it('names pawns and keeps both coordinates and compact notation',()=>{
    const move=moveDisplay(initialPosition(),{from:'f5',to:'f6'})
    expect(move.description).toBe('White pawn from f5 to f6')
    expect(move.compact).toBe('f5–f6');expect(move.capture||move.check||move.checkmate).toBe(false)
  })
  it('names the captured piece and its color',()=>{
    const pos=position({...kings,f5:{type:'P',color:'white'},g5:{type:'N',color:'black'}}),move=moveDisplay(pos,{from:'f5',to:'g5'})
    expect(move.description).toBe('White pawn from f5 captures black knight on g5');expect(move.capture).toBe(true)
  })
  it('recognizes en passant even though the destination is empty',()=>{
    const start=position({...kings,b5:{type:'P',color:'white'},c7:{type:'P',color:'black'}},'black'),pos=applyMove(start,{from:'c7',to:'c5'})
    const move=moveDisplay(pos,{from:'b5',to:'c6'})
    expect(move.capture&&move.enPassant).toBe(true);expect(move.description).toContain('en passant')
  })
  it.each(['Q','R','B','N'] as const)('spells out %s promotion',promotion=>{
    const move=moveDisplay(position({...kings,a5:{type:'P',color:'white'}}),{from:'a5',to:'a6',promotion})
    expect(move.promotion).toBe(({Q:'Queen',R:'Rook',B:'Bishop',N:'Knight'})[promotion])
    expect(move.description).toContain(`promotes to ${move.promotion!.toLowerCase()}`)
  })
  it('distinguishes check from checkmate',()=>{
    const check=moveDisplay(position({...kings,f6:{type:'R',color:'white'}}),{from:'f6',to:'g6'})
    expect(check.check).toBe(true);expect(check.checkmate).toBe(false);expect(check.description).toMatch(/, check$/)
    const mate=moveDisplay(position({f9:{type:'K',color:'white'},f11:{type:'K',color:'black'},e9:{type:'R',color:'white'}}),{from:'e9',to:'e10'})
    expect(mate.checkmate).toBe(true);expect(mate.check).toBe(false);expect(mate.description).toMatch(/, checkmate$/)
  })
})
