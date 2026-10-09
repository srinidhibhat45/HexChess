import type { Move } from './engine'

export type PointerPoint = {x:number;y:number}
export const movedPointer=(start:PointerPoint,current:PointerPoint)=>Math.hypot(current.x-start.x,current.y-start.y)>=4
// Use the selected piece's current targets, even when visual move hints are hidden.
// Preserve promotion alternatives so dropping a pawn opens the normal piece chooser.
export function dropTargets(from:string,to:string|null,moves:Move[]):Move[] {
  return to&&to!==from?moves.filter(move=>move.from===from&&move.to===to):[]
}
