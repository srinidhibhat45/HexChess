import { applyMove, CELLS, CELL_MAP, inCheck, legalMoves, opposite, VALUES } from './engine'
import type { Move, Position } from './engine'
export type Difficulty = 'beginner' | 'club' | 'advanced'
export function evaluate(pos:Position) {
  let value=0
  for(const [id,p] of Object.entries(pos.board)) {
    const {q,r}=CELL_MAP[id], center=5-Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))
    const advance=p.type==='P'?(p.color==='white'?5-r:r+5)*7:0
    value+=(p.color===pos.turn?1:-1)*(VALUES[p.type]+center*(p.type==='K'?-2:6)+advance)
  }
  return value
}
export function findBestMove(pos:Position,difficulty:Difficulty='club',budget?:number): Move | null {
  const moves=legalMoves(pos)
  if(!moves.length) return null
  const limit=Date.now()+(budget??(difficulty==='advanced'?1800:difficulty==='club'?650:220))
  const order=(p:Position,ms:Move[])=>ms.sort((a,b)=>score(p,b)-score(p,a))
  const score=(p:Position,m:Move)=> (p.board[m.to]?10*VALUES[p.board[m.to].type]-VALUES[p.board[m.from].type]:0)+(m.promotion?VALUES[m.promotion]:0)+5-Math.max(Math.abs(CELL_MAP[m.to].q),Math.abs(CELL_MAP[m.to].r),Math.abs(CELL_MAP[m.to].q+CELL_MAP[m.to].r))
  let nodes=0
  function search(p:Position,depth:number,alpha:number,beta:number,ply:number):number {
    if(++nodes%16===0 && Date.now()>limit) throw new Error('budget')
    const ms=legalMoves(p)
    if(!ms.length) return inCheck(p)?-100000+ply:-75000+ply
    if(p.halfmove>=100) return 0
    if(depth===0) return evaluate(p)
    let best=-Infinity
    for(const m of order(p,ms)) {
      const val=-search(applyMove(p,m),depth-1,-beta,-alpha,ply+1)
      best=Math.max(best,val);alpha=Math.max(alpha,val)
      if(alpha>=beta) break
    }
    return best
  }
  let best=order(pos,moves)[0]
  const scored: {move:Move;value:number}[]=[]
  for(let depth=1;depth<=(difficulty==='beginner'?1:difficulty==='club'?2:3);depth++) {
    let candidate=best,value=-Infinity
    try {
      let alpha=-Infinity
      for(const m of order(pos,[...moves])) {
        if(Date.now()>limit) throw new Error('budget')
        const val=-search(applyMove(pos,m),depth-1,-Infinity,-alpha,1)
        if(depth===1) scored.push({move:m,value:val})
        if(val>value) {value=val;candidate=m}
        alpha=Math.max(alpha,val)
      }
      best=candidate
    } catch { break }
  }
  if(difficulty==='beginner' && scored.length) {
    const options=scored.sort((a,b)=>b.value-a.value).filter(m=>m.value>=scored[0].value-140).slice(0,5)
    best=options[Math.floor(Math.random()*options.length)].move
  }
  return best
}
// Compact data helps keep opening analysis inside the worker.
export const boardSize = CELLS.length
export const otherColor = opposite
