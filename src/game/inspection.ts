import { pseudoMoves } from './engine'
import type { Color, Move, Position } from './engine'

export type PiecePreview = {from:string;moves:Move[];pawnAttacks:Move[]}
export function piecePreview(pos:Position,from:string):PiecePreview|null {
  const piece=pos.board[from]
  if(!piece)return null
  // The current en passant right belongs only to the side whose turn it is.
  const context={...pos,ep:piece.color===pos.turn?pos.ep:null}
  return {from,moves:pseudoMoves(context,from),pawnAttacks:piece.type==='P'?pseudoMoves(context,from,true).filter(m=>pos.board[m.to]?.color!==piece.color):[]}
}
export type BoardChoice = {type:'move';moves:Move[]}|{type:'inspect';id:string|null}|{type:'select';id:string}|{type:'clear'}
export function boardChoice({pos,color,selected,moves,inspection,playable,premove,inspectAll}:{pos:Position;color:Color;selected:string|null;moves:Move[];inspection:string|null;playable:boolean;premove:boolean;inspectAll:boolean},id:string):BoardChoice {
  const canSelect=!inspectAll&&(playable||premove),piece=pos.board[id]
  // Capturing an opponent with an already selected piece takes priority over inspection.
  if(canSelect&&selected&&pos.board[selected]?.color===color){
    const targets=moves.filter(m=>m.to===id)
    if(targets.length)return {type:'move',moves:targets}
  }
  if(piece&&(inspectAll||piece.color!==color))return {type:'inspect',id:inspection===id?null:id}
  if(canSelect&&piece?.color===color)return {type:'select',id}
  return {type:'clear'}
}
