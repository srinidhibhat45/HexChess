import { describe, expect, it } from 'vitest'
import { applyMove, initialPosition, legalMoves } from '../src/game/engine'
import type { Position } from '../src/game/engine'
import { boardChoice, piecePreview } from '../src/game/inspection'
import { DEFAULT_SETTINGS, newSession } from '../src/game/session'
import { playMove, queuePremove } from '../src/game/controls'

const position=(board:Position['board'],turn:Position['turn']='white'):Position=>({board,turn,ep:null,halfmove:0,fullmove:1})
const choose=(pos:Position,id:string,extra:Partial<Parameters<typeof boardChoice>[0]>={})=>boardChoice({pos,color:'white',selected:null,moves:[],inspection:null,playable:true,premove:false,inspectAll:false,...extra},id)
describe('piece inspection',()=>{
  it('previews either color without changing the position or turn',()=>{
    const pos=initialPosition(),before=JSON.stringify(pos),preview=piecePreview(pos,'d9')!
    expect(preview.moves.length).toBeGreaterThan(0);expect(preview.moves.every(m=>m.from==='d9')).toBe(true)
    expect(preview.moves.some(m=>m.to==='f8')).toBe(true)
    expect(JSON.stringify(pos)).toBe(before);expect(piecePreview(pos,'a6')).toBeNull()
  })
  it('stops sliders at blockers and allows enemy captures but not friendly landings',()=>{
    const pos=position({f6:{type:'R',color:'black'},f8:{type:'P',color:'black'},f4:{type:'N',color:'white'}})
    const targets=piecePreview(pos,'f6')!.moves.map(m=>m.to)
    expect(targets).toContain('f7');expect(targets).not.toContain('f8');expect(targets).not.toContain('f9')
    expect(targets).toContain('f4');expect(targets).not.toContain('f3')
  })
  it('shows movement geometry while keeping pinned moves out of the legal gate',()=>{
    const pos=position({f1:{type:'K',color:'white'},l6:{type:'K',color:'black'},f6:{type:'R',color:'white'},f11:{type:'R',color:'black'}})
    expect(piecePreview(pos,'f6')!.moves.some(m=>m.to==='e5')).toBe(true)
    expect(legalMoves(pos,'f6').some(m=>m.to==='e5')).toBe(false)
  })
  it('distinguishes pawn advances from capture directions and omits friendly captures',()=>{
    const pos=position({f7:{type:'P',color:'black'},g6:{type:'N',color:'white'}}),preview=piecePreview(pos,'f7')!
    expect(preview.moves.map(m=>m.to)).toEqual(expect.arrayContaining(['f6','f5','g6']))
    expect(preview.pawnAttacks.map(m=>m.to).sort()).toEqual(['e6','g6'])
    pos.board.e6={type:'N',color:'black'}
    expect(piecePreview(pos,'f7')!.pawnAttacks.map(m=>m.to)).not.toContain('e6')
    expect(preview.moves.map(m=>m.to)).not.toContain('e6')
  })
  it('does not lend the current en passant right to the other color',()=>{
    const own=position({b5:{type:'P',color:'white'},c7:{type:'P',color:'black'}},'black'),reply=applyMove(own,{from:'c7',to:'c5'})
    expect(piecePreview(reply,'b5')!.moves.some(m=>m.to==='c6')).toBe(true)
    const stale={...reply,turn:'black' as const}
    expect(piecePreview(stale,'b5')!.moves.some(m=>m.to==='c6')).toBe(false)
  })
  it('allows inspection while waiting, and toggle, clear and own-piece selection',()=>{
    const pos=initialPosition()
    expect(choose(pos,'d9',{playable:false})).toEqual({type:'inspect',id:'d9'})
    expect(choose(pos,'d9',{inspection:'d9'})).toEqual({type:'inspect',id:null})
    expect(choose(pos,'a6',{inspection:'d9'})).toEqual({type:'clear'})
    expect(choose(pos,'f5',{inspection:'d9'})).toEqual({type:'select',id:'f5'})
    expect(choose(pos,'f5',{playable:false})).toEqual({type:'clear'})
    expect(choose(pos,'f5',{playable:false,premove:true})).toEqual({type:'select',id:'f5'})
  })
  it('gives a legal capture priority over inspecting the opponent',()=>{
    const pos=position({g1:{type:'K',color:'white'},g10:{type:'K',color:'black'},f5:{type:'P',color:'white'},g5:{type:'N',color:'black'}})
    const moves=legalMoves(pos,'f5'),choice=choose(pos,'g5',{selected:'f5',moves})
    expect(choice).toEqual({type:'move',moves:[{from:'f5',to:'g5'}]})
    expect(choose(pos,'g5',{selected:'f5',moves:[]})).toEqual({type:'inspect',id:'g5'})
  })
  it('retains all four choices for a capture that promotes',()=>{
    const pos=position({g1:{type:'K',color:'white'},g10:{type:'K',color:'black'},b6:{type:'P',color:'white'},a6:{type:'R',color:'black'}})
    const choice=choose(pos,'a6',{selected:'b6',moves:legalMoves(pos,'b6')})
    expect(choice.type).toBe('move')
    if(choice.type==='move')expect(choice.moves.map(m=>m.promotion)).toEqual(['Q','R','B','N'])
  })
  it('never turns review or an ended game into an executable move',()=>{
    const pos=initialPosition(),moves=legalMoves(pos,'f5')
    expect(choose(pos,'f6',{selected:'f5',moves,inspectAll:true})).toEqual({type:'clear'})
    expect(choose(pos,'f5',{inspectAll:true})).toEqual({type:'inspect',id:'f5'})
  })
  it('cannot play or queue an opponent’s preview move through the move gates',()=>{
    for(const mode of ['computer','correspondence'] as const){
      const session=newSession({...DEFAULT_SETTINGS,mode}),pos=initialPosition(),move=piecePreview(pos,'d9')!.moves[0]
      expect(playMove(session,move)).toBe(session);expect(queuePremove(session,move)).toBe(session)
    }
  })
})
