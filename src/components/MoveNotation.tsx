import { ArrowRight, X } from 'lucide-react'
import { PIECE_NAMES } from '../game/engine'
import type { moveDisplay } from '../game/move-display'
import { Piece } from './Piece'

export function MoveNotation({move}:{move:ReturnType<typeof moveDisplay>}) {
  return <span className="move-notation" aria-hidden="true">
    <span className="move-piece-name"><Piece type={move.piece.type} color={move.piece.color} size={18}/>{PIECE_NAMES[move.piece.type]}</span>
    <span className={`move-route ${move.capture?'is-capture':''}`}><span>{move.from}</span>{move.capture?<X size={12}/>:<ArrowRight size={12}/>}<span>{move.to}</span></span>
    {(move.capture||move.promotion||move.check||move.checkmate)&&<span className="move-tags">{move.capture&&<small>{move.enPassant?'En passant':'Capture'}</small>}{move.promotion&&<small className="promotion-tag">= {move.promotion}</small>}{(move.check||move.checkmate)&&<small className="check-tag">{move.checkmate?'Checkmate':'Check'}</small>}</span>}
  </span>
}
