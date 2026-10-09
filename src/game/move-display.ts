import { notation, PIECE_NAMES } from './engine'
import type { Move, Position } from './engine'

export function moveDisplay(pos:Position,move:Move) {
  const piece=pos.board[move.from]
  const enPassant=piece.type==='P'&&!pos.board[move.to]&&pos.ep?.target===move.to
  const captured=pos.board[move.to]||(enPassant&&pos.ep?pos.board[pos.ep.pawn]:undefined)
  const compact=notation(pos,move),checkmate=compact.endsWith('#'),check=!checkmate&&compact.endsWith('+')
  const promotion=move.promotion?PIECE_NAMES[move.promotion]:null
  const description=`${piece.color==='white'?'White':'Black'} ${PIECE_NAMES[piece.type].toLowerCase()} from ${move.from} ${captured?`captures ${captured.color} ${PIECE_NAMES[captured.type].toLowerCase()} on`:'to'} ${move.to}${enPassant?', en passant':''}${promotion?`, promotes to ${promotion.toLowerCase()}`:''}${checkmate?', checkmate':check?', check':''}`
  return {piece,from:move.from,to:move.to,capture:!!captured,enPassant:!!enPassant,promotion,check,checkmate,compact,description}
}
