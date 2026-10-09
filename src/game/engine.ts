export type Color = 'white' | 'black'
export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'
export type Piece = { type: PieceType; color: Color }
export type Cell = { q: number; r: number; id: string; color: number }
export type Move = { from: string; to: string; promotion?: Exclude<PieceType, 'K' | 'P'> }
export type Position = { board: Record<string, Piece>; turn: Color; ep: { target: string; pawn: string } | null; halfmove: number; fullmove: number }
export type Outcome = { reason: 'checkmate' | 'stalemate' | 'repetition' | 'fifty-move' | 'material' | 'resignation' | 'timeout' | 'agreement'; winner: Color | null }
export const FILES = 'abcdefghikl'
export const opposite = (c: Color): Color => c === 'white' ? 'black' : 'white'
export const ROOK_DIRS = [[0,-1],[1,-1],[1,0],[0,1],[-1,1],[-1,0]]
export const BISHOP_DIRS = [[1,-2],[2,-1],[1,1],[-1,2],[-2,1],[-1,-1]]
export const KNIGHT_DIRS = ROOK_DIRS.flatMap(([q,r], i) => [1,5].map(offset => [q * 2 + ROOK_DIRS[(i+offset)%6][0], r * 2 + ROOK_DIRS[(i+offset)%6][1]]))
export const CELLS: Cell[] = []
for(let q=-5;q<=5;q++) {
  const min = Math.max(-5,-5-q), max = Math.min(5,5-q)
  for(let r=min;r<=max;r++) CELLS.push({q,r,id: FILES[q+5]+(max-r+1),color:((q-r)%3+3)%3})
}
export const CELL_MAP = Object.fromEntries(CELLS.map(c=>[c.id,c]))
const COORD_MAP = Object.fromEntries(CELLS.map(c=>[`${c.q},${c.r}`,c.id]))
export const at = (q:number,r:number): string | undefined => COORD_MAP[`${q},${r}`]
export const PIECE_NAMES: Record<PieceType,string> = {K:'King',Q:'Queen',R:'Rook',B:'Bishop',N:'Knight',P:'Pawn'}
export const VALUES: Record<PieceType,number> = {K:20000,Q:1000,R:550,B:330,N:400,P:100}
export const PAWN_START: Record<Color,string[]> = {white:['b1','c2','d3','e4','f5','g4','h3','i2','k1'],black:['b7','c7','d7','e7','f7','g7','h7','i7','k7']}
export function initialPosition(): Position {
  const board: Record<string,Piece> = {}
  const setup: Record<PieceType,string[]> = {K:['g1'],Q:['e1'],R:['c1','i1'],N:['d1','h1'],B:['f1','f2','f3'],P:PAWN_START.white}
  for(const [type,ids] of Object.entries(setup)) for(const id of ids) {
    board[id] = {type:type as PieceType,color:'white'}
    const {q,r}=CELL_MAP[id]
    board[at(q,-r-q)!] = {type:type as PieceType,color:'black'}
  }
  return {board,turn:'white',ep:null,halfmove:0,fullmove:1}
}
export function isPromotion(id:string,color:Color) {
  const {q,r} = CELL_MAP[id]
  return !at(q,r+(color==='white'?-1:1))
}
export function pseudoMoves(pos:Position,from:string,attacks=false): Move[] {
  const piece = pos.board[from], cell = CELL_MAP[from]
  if(!piece || !cell) return []
  const {q,r}=cell, moves:Move[]=[]
  const add = (to:string) => {
    if(piece.type==='P' && isPromotion(to,piece.color) && !attacks) for(const promotion of ['Q','R','B','N'] as const) moves.push({from,to,promotion})
    else moves.push({from,to})
  }
  if(piece.type==='P') {
    const dir = piece.color==='white'?-1:1
    for(const [dq,dr] of [[1,dir<0?-1:0],[-1,dir<0?0:1]]) {
      const to=at(q+dq,r+dr)
      if(to && (attacks || (pos.board[to]?.color===opposite(piece.color) && pos.board[to]?.type!=='K') || (!pos.board[to] && pos.ep?.target===to && pos.board[pos.ep.pawn]?.type==='P' && pos.board[pos.ep.pawn]?.color===opposite(piece.color)))) add(to)
    }
    if(!attacks) {
      const one=at(q,r+dir), two=at(q,r+2*dir)
      if(one&&!pos.board[one]) {
        add(one)
        if(two&&!pos.board[two]&&PAWN_START[piece.color].includes(from)) add(two)
      }
    }
    return moves
  }
  const dirs = piece.type==='R'?ROOK_DIRS:piece.type==='B'?BISHOP_DIRS:piece.type==='N'?KNIGHT_DIRS:[...ROOK_DIRS,...BISHOP_DIRS]
  const sliding = ['R','B','Q'].includes(piece.type)
  for(const [dq,dr] of dirs) for(let n=1;n<=(sliding?10:1);n++) {
    const to=at(q+dq*n,r+dr*n)
    if(!to) break
    const occupant = pos.board[to]
    if(attacks || !occupant || (occupant.color!==piece.color&&occupant.type!=='K')) add(to)
    if(occupant) break
  }
  return moves
}
export function attacked(pos:Position,id:string,by:Color): boolean {
  return Object.entries(pos.board).some(([from,p])=>p.color===by&&pseudoMoves(pos,from,true).some(m=>m.to===id))
}
export function inCheck(pos:Position,color:Color=pos.turn) {
  const king = Object.keys(pos.board).find(id=>pos.board[id].type==='K'&&pos.board[id].color===color)
  return !king || attacked(pos,king,opposite(color))
}
export function applyMove(pos:Position,move:Move): Position {
  const piece=pos.board[move.from],board={...pos.board}
  let capture=!!board[move.to]
  if(piece.type==='P'&&pos.ep?.target===move.to&&!board[move.to]) {delete board[pos.ep.pawn];capture=true}
  delete board[move.from]
  board[move.to]={...piece,type:move.promotion||piece.type}
  const from=CELL_MAP[move.from],to=CELL_MAP[move.to]
  const ep=piece.type==='P'&&from.q===to.q&&Math.abs(from.r-to.r)===2 ? {target:at(from.q,(from.r+to.r)/2)!,pawn:move.to}:null
  return {board,turn:opposite(pos.turn),ep,halfmove:capture||piece.type==='P'?0:pos.halfmove+1,fullmove:pos.fullmove+(pos.turn==='black'?1:0)}
}
export function legalMoves(pos:Position,from?:string): Move[] {
  return (from?[from]:Object.keys(pos.board)).filter(id=>pos.board[id]?.color===pos.turn).flatMap(id=>pseudoMoves(pos,id).filter(m=>!inCheck(applyMove(pos,m),pos.turn)))
}
export function positionKey(pos:Position): string {
  // An en-passant marker only changes repetition rights when the capture is legal.
  const effectiveEP = pos.ep && legalMoves(pos).some(m=>m.to===pos.ep!.target&&pos.board[m.from].type==='P') ? pos.ep.target : '-'
  return Object.keys(pos.board).sort().map(id=>`${id}:${pos.board[id].color[0]}${pos.board[id].type}`).join('|')+pos.turn+effectiveEP
}
export function outcome(pos:Position,keys:string[]=[]): Outcome | null {
  if(legalMoves(pos).length===0) return {reason:inCheck(pos)?'checkmate':'stalemate',winner:opposite(pos.turn)}
  if(pos.halfmove>=100) return {reason:'fifty-move',winner:null}
  if(keys.length && keys.filter(k=>k===keys[keys.length-1]).length>=3) return {reason:'repetition',winner:null}
  // Conservatively recognize bare kings and king + one minor against a bare king.
  // Two knights and even rare two-bishop positions can mate on a hexagonal board.
  const material=Object.values(pos.board).filter(p=>p.type!=='K')
  if(material.length===0 || (material.length===1&&['B','N'].includes(material[0].type))) return {reason:'material',winner:null}
  return null
}
export function notation(pos:Position,m:Move) {
  const p=pos.board[m.from],capture=!!pos.board[m.to]||(p.type==='P'&&pos.ep?.target===m.to)
  const next=applyMove(pos,m),check=inCheck(next)
  return `${p.type==='P'?'':p.type}${m.from}${capture?'×':'–'}${m.to}${m.promotion?'='+m.promotion:''}${check?(legalMoves(next).length?'+' :'#'):''}`
}
export function replay(moves:Move[]) {
  let pos=initialPosition()
  const positions=[pos],keys=[positionKey(pos)]
  for(const move of moves) {
    const valid=legalMoves(pos,move.from).find(m=>m.to===move.to&&m.promotion===move.promotion)
    if(!valid || outcome(pos,keys)) throw new Error('This game contains an invalid move.')
    pos=applyMove(pos,valid);positions.push(pos);keys.push(positionKey(pos))
  }
  return {pos,positions,keys}
}
