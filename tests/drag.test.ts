import { describe, expect, it } from 'vitest'
import { legalMoves, initialPosition } from '../src/game/engine'
import type { Position } from '../src/game/engine'
import { dropTargets, movedPointer } from '../src/game/drag'
import { premoveTargets } from '../src/game/premoves'

describe('piece drops',()=>{
  it('distinguishes a steady click from a drag',()=>{
    expect(movedPointer({x:100,y:100},{x:102,y:101})).toBe(false)
    expect(movedPointer({x:100,y:100},{x:104,y:100})).toBe(true)
  })
  it('offers only the selected piece’s legal destinations',()=>{
    const moves=legalMoves(initialPosition())
    expect(dropTargets('f5','f6',moves)).toEqual([{from:'f5',to:'f6'}])
    expect(dropTargets('f5','f11',moves)).toEqual([])
    expect(dropTargets('g7','g6',moves)).toEqual([])
    expect(dropTargets('f5','e5',moves)).toEqual([])
  })
  it('rejects a release outside the board or on the starting cell',()=>{
    const moves=legalMoves(initialPosition(),'f5')
    expect(dropTargets('f5',null,moves)).toEqual([])
    expect(dropTargets('f5','f5',moves)).toEqual([])
  })
  it('does not allow dropping a pinned piece away from its king',()=>{
    const pos:Position={board:{f1:{type:'K',color:'white'},l6:{type:'K',color:'black'},f6:{type:'R',color:'white'},f11:{type:'R',color:'black'}},turn:'white',ep:null,halfmove:0,fullmove:1}
    expect(dropTargets('f6','e5',legalMoves(pos,'f6'))).toEqual([])
    expect(dropTargets('f6','f11',legalMoves(pos,'f6'))).toEqual([{from:'f6',to:'f11'}])
  })
  it('preserves all four promotion choices instead of auto-queening',()=>{
    const pos:Position={board:{g1:{type:'K',color:'white'},g10:{type:'K',color:'black'},b6:{type:'P',color:'white'},a6:{type:'R',color:'black'}},turn:'white',ep:null,halfmove:0,fullmove:1}
    expect(dropTargets('b6','a6',legalMoves(pos,'b6')).map(m=>m.promotion)).toEqual(['Q','R','B','N'])
  })
  it('uses speculative targets for a queued premove without relaxing normal drops',()=>{
    const pos=initialPosition();pos.turn='black'
    expect(dropTargets('e4','e5',legalMoves(pos,'e4'))).toEqual([])
    expect(dropTargets('e4','e5',premoveTargets(pos,'e4','white'))).toEqual([{from:'e4',to:'e5'}])
  })
})
