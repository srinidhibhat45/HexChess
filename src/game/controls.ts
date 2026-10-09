import { legalMoves, opposite, outcome, replay } from './engine'
import type { Move } from './engine'
import { clockValues } from './session'
import type { Session } from './session'

export const canUseHints = (s: Session) => s.settings.mode === 'computer'
export const canTakeBack = (s: Session) => s.settings.mode === 'computer'
export const canPause = (s: Session) => s.settings.mode === 'computer'
export const zenEnabled = (s: Session) => s.zen ?? (s.started || s.moves.length > 0)
export function ownsTurn(s: Session) {
  const turn = replay(s.moves).pos.turn
  return s.settings.mode === 'computer' ? turn === s.settings.side : s.settings.mode === 'correspondence' ? turn === s.seat : true
}
// Every move, including computer responses, passes the same legal-move gate.
export function playMove(s: Session, move: Move, now = Date.now(), computer = false): Session {
  const {pos, keys} = replay(s.moves)
  if(s.result || outcome(pos, keys) || s.paused) return s
  if(s.settings.mode === 'correspondence' && s.seat !== pos.turn) return s
  if(s.settings.mode === 'computer' && (computer ? pos.turn === s.settings.side : pos.turn !== s.settings.side)) return s
  const valid = legalMoves(pos, move.from).find(m => m.to === move.to && m.promotion === move.promotion)
  if(!valid) return s
  const clocks = clockValues(s, pos.turn, now)
  if(s.settings.minutes > 0 && s.started && clocks[pos.turn] <= 0) {
    const winner = opposite(pos.turn)
    const canWin = Object.values(pos.board).some(p => p.color === winner && p.type !== 'K')
    return {...s, clocks, result: {reason: 'timeout', winner: canWin ? winner : null}}
  }
  const before = {...clocks}
  clocks[pos.turn] += s.settings.increment * 1000
  // Explicitly leaving zen mode is respected, including before the opening move.
  const zen = s.zen ?? true
  return {...s, moves: [...s.moves, valid], clocks, clockHistory: [...s.clockHistory, before], started: true, anchor: now, zen, drawOffer: null}
}
export function offerDraw(s: Session): Session {
  const {pos, keys} = replay(s.moves)
  if(s.result || outcome(pos, keys)) return s
  if(s.settings.mode !== 'correspondence') return {...s, clocks: clockValues(s, pos.turn), result: {reason: 'agreement', winner: null}}
  if(s.drawOffer && s.drawOffer !== s.seat) return {...s, result: {reason: 'agreement', winner: null}, drawOffer: null}
  if(!s.seat||s.seat!==pos.turn)return s
  return {...s, drawOffer: s.seat}
}

export function declineDraw(s:Session):Session {
  return s.settings.mode==='correspondence'&&!s.result&&s.drawOffer&&s.drawOffer!==s.seat?{...s,drawOffer:null}:s
}
