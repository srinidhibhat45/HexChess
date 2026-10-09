import { describe, expect, it } from 'vitest'
import { applyMove, at, attacked, BISHOP_DIRS, CELLS, CELL_MAP, initialPosition, inCheck, KNIGHT_DIRS, legalMoves, notation, opposite, outcome, PAWN_START, positionKey, pseudoMoves, replay } from '../src/game/engine'
import type { Piece, PieceType, Position } from '../src/game/engine'
import { findBestMove } from '../src/game/ai'
const position=(board:Record<string,Piece>,turn:'white'|'black'='white'):Position=>({board,turn,ep:null,halfmove:0,fullmove:1})
const kings={g1:{type:'K',color:'white'},g10:{type:'K',color:'black'}} as const
const demo=(type:PieceType)=>position({f6:{type,color:'white'}})
describe('Gliński geometry and starting position',()=>{
  it('has 91 unique cells and correct file lengths and notation',()=>{
    expect(CELLS).toHaveLength(91);expect(new Set(CELLS.map(c=>c.id)).size).toBe(91)
    expect(CELLS.filter(c=>c.q===0)).toHaveLength(11);expect(CELLS.filter(c=>c.q===-5)).toHaveLength(6)
    expect(at(0,0)).toBe('f6');expect(CELL_MAP.j1).toBeUndefined()
  })
  it('starts with 18 pieces on each side, three bishop colors, and mirrored armies',()=>{
    const pos=initialPosition()
    for(const color of ['white','black'] as const){expect(Object.values(pos.board).filter(p=>p.color===color)).toHaveLength(18);expect(new Set(Object.entries(pos.board).filter(([,p])=>p.color===color&&p.type==='B').map(([id])=>CELL_MAP[id].color)).size).toBe(3);expect(Object.keys(pos.board).filter(id=>pos.board[id].color===color&&pos.board[id].type==='P').sort()).toEqual([...PAWN_START[color]].sort())}
    expect(pos.board.g1).toEqual({type:'K',color:'white'});expect(pos.board.g10).toEqual({type:'K',color:'black'})
    expect(inCheck(pos,'white')).toBe(false);expect(inCheck(pos,'black')).toBe(false)
  })
  it('gives each piece the full correct reach from the center',()=>{
    for(const [type,n] of [['R',30],['B',12],['N',12],['Q',42],['K',12]] as const) expect(pseudoMoves(demo(type),'f6')).toHaveLength(n)
    expect(new Set(KNIGHT_DIRS.map(d=>d.join())).size).toBe(12)
  })
  it('keeps all bishop destinations on their starting color',()=>{
    for(const cell of CELLS) for(const [q,r] of BISHOP_DIRS) {const id=at(cell.q+q,cell.r+r);if(id)expect(CELL_MAP[id].color).toBe(cell.color)}
  })
  it('has all six tutorial targets as valid piece moves',()=>{
    for(const [type,to] of [['R','f9'],['B','d5'],['N','g8'],['Q','i3'],['K','h5']] as const)expect(pseudoMoves(demo(type),'f6').some(m=>m.to===to)).toBe(true)
  })
})
describe('legal movement and king safety',()=>{
  it('blocks sliders at occupied cells but lets a knight leap',()=>{
    const p=position({f6:{type:'R',color:'white'},f7:{type:'P',color:'white'},g6:{type:'P',color:'black'}})
    const moves=pseudoMoves(p,'f6');expect(moves.some(m=>m.to==='f7'||m.to==='f8')).toBe(false);expect(moves.some(m=>m.to==='g6')).toBe(true);expect(moves.some(m=>m.to==='h6')).toBe(false)
    p.board.f6.type='N';expect(pseudoMoves(p,'f6').some(m=>m.to==='g8')).toBe(true)
  })
  it('rejects a pinned piece exposing the king',()=>{
    const p=position({f1:{type:'K',color:'white'},l6:{type:'K',color:'black'},f6:{type:'R',color:'white'},f11:{type:'R',color:'black'}})
    expect(pseudoMoves(p,'f6').some(m=>m.to==='e5')).toBe(true)
    expect(legalMoves(p,'f6').some(m=>m.to==='e5')).toBe(false)
    expect(legalMoves(p,'f6').some(m=>m.to==='f11')).toBe(true)
  })
  it('never offers a king capture or a king move into attack',()=>{
    const p=position({f6:{type:'K',color:'white'},f8:{type:'K',color:'black'}})
    expect(legalMoves(p,'f6').some(m=>m.to==='f7')).toBe(false)
    const q=position({...kings,f6:{type:'R',color:'white'}})
    q.board.f11={type:'K',color:'black'};delete q.board.g10
    expect(pseudoMoves(q,'f6').some(m=>m.to==='f11')).toBe(false);expect(attacked(q,'f11','white')).toBe(true)
  })
  it('detects checkmate and original stalemate scoring',()=>{
    const p=position({f9:{type:'K',color:'white'},f11:{type:'K',color:'black'}},'black')
    expect(outcome(p)).toEqual({reason:'stalemate',winner:'white'})
    p.board.e10={type:'R',color:'white'}
    expect(outcome(p)).toEqual({reason:'checkmate',winner:'white'})
  })
})
describe('pawn rules',()=>{
  it('uses forward-edge captures instead of bishop captures',()=>{
    const p=position({...kings,f5:{type:'P',color:'white'},g5:{type:'N',color:'black'},e5:{type:'N',color:'black'}})
    const moves=legalMoves(p,'f5');expect(['f6','f7','e5','g5'].every(to=>moves.some(m=>m.to===to))).toBe(true)
    expect(moves.some(m=>m.to==='g6')).toBe(false)
    p.board.f6={type:'R',color:'black'};expect(legalMoves(p,'f5').some(m=>m.to==='f6'||m.to==='f7')).toBe(false)
  })
  it('allows a double step after a capture onto another friendly start cell',()=>{
    const p=position({...kings,e4:{type:'P',color:'white'},f5:{type:'P',color:'black'}})
    const next=applyMove(p,{from:'e4',to:'f5'});next.turn='white'
    expect(legalMoves(next,'f5').some(m=>m.to==='f7')).toBe(true)
  })
  it('captures en passant immediately, removes the passed pawn, and expires the right',()=>{
    let p=position({...kings,b5:{type:'P',color:'white'},c7:{type:'P',color:'black'}},'black')
    p=applyMove(p,{from:'c7',to:'c5'})
    expect(p.ep).toEqual({target:'c6',pawn:'c5'});expect(legalMoves(p,'b5').some(m=>m.to==='c6')).toBe(true)
    const capture=applyMove(p,{from:'b5',to:'c6'});expect(capture.board.c5).toBeUndefined();expect(capture.board.c6).toEqual({type:'P',color:'white'});expect(capture.halfmove).toBe(0)
    const other=applyMove(p,legalMoves(p,'g1')[0]);expect(other.ep).toBeNull()
  })
  it('rejects en passant when it exposes the king',()=>{
    let p=position({b1:{type:'K',color:'white'},l6:{type:'K',color:'black'},b5:{type:'P',color:'white'},c7:{type:'P',color:'black'},b7:{type:'R',color:'black'}},'black')
    p=applyMove(p,{from:'c7',to:'c5'})
    expect(pseudoMoves(p,'b5').some(m=>m.to==='c6')).toBe(true)
    expect(legalMoves(p,'b5').some(m=>m.to==='c6')).toBe(false)
    expect(inCheck(applyMove(p,{from:'b5',to:'c6'}),'white')).toBe(true)
  })
  it('offers all four promotions and applies underpromotion',()=>{
    const p=position({...kings,a5:{type:'P',color:'white'}})
    expect(legalMoves(p,'a5').filter(m=>m.to==='a6').map(m=>m.promotion).sort()).toEqual(['B','N','Q','R'])
    expect(applyMove(p,{from:'a5',to:'a6',promotion:'N'}).board.a6.type).toBe('N')
    expect(notation(p,{from:'a5',to:'a6',promotion:'N'})).toContain('=N')
  })
})
describe('history, endings, and computer play',()=>{
  it('replays legal history and rejects invalid moves and malformed cells',()=>{
    const move=legalMoves(initialPosition(),'f5')[0];expect(replay([move]).pos.turn).toBe('black')
    expect(()=>replay([{from:'f5',to:'a6'}])).toThrow();expect(()=>replay([{from:'bad',to:'f6'}])).toThrow()
  })
  it('recognizes repetition, fifty-move endings and conservative material draws',()=>{
    const p=initialPosition(),key=positionKey(p)
    expect(outcome(p,[key,key,key])).toEqual({reason:'repetition',winner:null})
    p.halfmove=100;expect(outcome(p)?.reason).toBe('fifty-move')
    expect(outcome(position({...kings}))?.reason).toBe('material')
    expect(outcome(position({...kings,f6:{type:'N',color:'white'}}))?.reason).toBe('material')
    expect(outcome(position({...kings,f6:{type:'N',color:'white'},f5:{type:'N',color:'white'}}))).toBeNull()
  })
  it('ignores uncapturable en passant markers for repetition keys',()=>{
    const p=initialPosition(),next=applyMove(p,{from:'b1',to:'b3'}),without={...next,ep:null}
    expect(positionKey(next)).toBe(positionKey(without))
  })
  it('computers return legal moves at each level and find an immediate mate',()=>{
    for(const level of ['beginner','club','advanced'] as const) {
      const p=initialPosition(),m=findBestMove(p,level,140)
      expect(m).not.toBeNull();expect(legalMoves(p)).toContainEqual(m)
    }
    const p=position({f9:{type:'K',color:'white'},f11:{type:'K',color:'black'},e9:{type:'R',color:'white'}})
    const m=findBestMove(p,'advanced',800)!
    expect(outcome(applyMove(p,m))?.winner).toBe('white')
  })
  it('can play a complete legal sequence without losing kings',()=>{
    let p=initialPosition()
    for(let i=0;i<80;i++) {
      const moves=legalMoves(p);if(!moves.length||outcome(p))break
      p=applyMove(p,moves[(i*17+3)%moves.length]);expect(inCheck(p,opposite(p.turn))).toBe(false)
      expect(Object.values(p.board).filter(p=>p.type==='K')).toHaveLength(2)
    }
  })
})
