import { at, CELL_MAP, isPromotion, PAWN_START, pseudoMoves } from './engine'
import type { Color, Move, Position } from './engine'
import type { Session } from './session'
export type Premove = { move:Move; after:number; gameId:string }
export function playerColor(s:Session):Color|undefined {
  return s.settings.mode==='computer'?s.settings.side:s.settings.mode==='correspondence'?s.seat:undefined
}
// These are possible future destinations, not a claim that the move is legal now.
export function premoveTargets(pos:Position,from:string,color:Color):Move[] {
  const piece=pos.board[from]
  if(!Object.hasOwn(CELL_MAP,from)||!piece||piece.color!==color)return []
  const empty:Position={...pos,board:{[from]:piece},turn:color,ep:null}
  if(piece.type!=='P')return pseudoMoves(empty,from)
  const {q,r}=CELL_MAP[from],dir=color==='white'?-1:1
  const cells=[at(q,r+dir),...(PAWN_START[color].includes(from)?[at(q,r+dir*2)]:[]),at(q+1,r+(dir<0?-1:0)),at(q-1,r+(dir<0?0:1))]
  return cells.flatMap(to=>!to?[]:isPromotion(to,color)?(['Q','R','B','N'] as const).map(promotion=>({from,to,promotion})):[{from,to}])
}
export function validatedPremove(value:unknown,s:Session):Premove|undefined {
  if(!value||typeof value!=='object')return undefined
  const p=value as Premove,m=p.move,color=playerColor(s)
  if(!color||p.gameId!==s.id||!Number.isInteger(p.after)||p.after<0||p.after>s.moves.length||s.moves.length>p.after+1||!m||typeof m.from!=='string'||typeof m.to!=='string'||!Object.hasOwn(CELL_MAP,m.from)||!Object.hasOwn(CELL_MAP,m.to)||(m.promotion!==undefined&&!['Q','R','B','N'].includes(m.promotion)))return undefined
  return {move:{from:m.from,to:m.to,...(m.promotion?{promotion:m.promotion}:{})},after:p.after,gameId:p.gameId}
}
