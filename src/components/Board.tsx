import { useState, useRef } from 'react'
import { CELLS, CELL_MAP, PIECE_NAMES, inCheck } from '../game/engine'
import type { Move, Position } from '../game/engine'
import { Piece } from './Piece'
const SIZE=30
const coords=(q:number,r:number,flipped:boolean)=>({x:305+1.5*SIZE*q*(flipped?-1:1),y:310+Math.sqrt(3)*SIZE*(r+q/2)*(flipped?-1:1)})
const points=Array.from({length:6},(_,i)=>`${Math.cos(Math.PI*i/3)*(SIZE-.65)},${Math.sin(Math.PI*i/3)*(SIZE-.65)}`).join(' ')
export function Board({pos,selected,moves,onCell,flipped=false,coordinates=true,lastMove,hint,disabled=false,compact=false}: {pos:Position;selected?:string|null;moves?:Move[];onCell?:(id:string)=>void;flipped?:boolean;coordinates?:boolean;lastMove?:Move;hint?:Move|null;disabled?:boolean;compact?:boolean}) {
  const [focus,setFocus]=useState('f6'),[drag,setDrag]=useState<string|null>(null)
  const refs=useRef<Record<string,SVGGElement|null>>({})
  const checked = inCheck(pos) ? Object.keys(pos.board).find(id=>pos.board[id].color===pos.turn&&pos.board[id].type==='K'):undefined
  const keyMove=(e:React.KeyboardEvent,id:string)=> {
    if(['Enter',' '].includes(e.key)) {e.preventDefault();if(!disabled)onCell?.(id);return}
    const directions:Record<string,number[]>={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}
    if(directions[e.key]) {
      e.preventDefault();const [dq,dr]=directions[e.key],from=CELL_MAP[id],sign=flipped?-1:1
      const next=CELLS.find(c=>c.q===from.q+dq*sign&&c.r===from.r+dr*sign)
      if(next){setFocus(next.id);refs.current[next.id]?.focus()}
    }
  }
  return <div className={`board-wrap ${compact?'board-compact':''}`}>
    <svg className="hex-board" viewBox="0 0 610 620" aria-label="Gliński hexagonal chessboard, 91 cells" role="group" onPointerUp={e=>{
      if(drag) {
        const target=(e.target as Element).closest('[data-cell]')?.getAttribute('data-cell')
        if(target&&target!==drag&&!disabled)onCell?.(target)
        setDrag(null)
      }
    }} onPointerCancel={()=>setDrag(null)}>
      <defs><filter id="boardShadow" x="-15%" y="-15%" width="130%" height="130%"><feDropShadow dx="0" dy="7" stdDeviation="8" floodColor="#294a37" floodOpacity=".1"/></filter></defs>
      <g filter="url(#boardShadow)">
        {CELLS.map(cell=>{
          const {x,y}=coords(cell.q,cell.r,flipped),p=pos.board[cell.id],legal=moves?.some(m=>m.to===cell.id),last=lastMove&&(lastMove.from===cell.id||lastMove.to===cell.id),ishint=hint&&(hint.from===cell.id||hint.to===cell.id)
          return <g key={cell.id} ref={el=>{refs.current[cell.id]=el}} transform={`translate(${x},${y})`} data-cell={cell.id} role={onCell?'button':undefined} tabIndex={onCell&&(cell.id===focus)?0:-1} aria-label={`${cell.id}${p?`, ${p.color} ${PIECE_NAMES[p.type]}`:', empty'}${legal?', legal destination':''}${selected===cell.id?', selected':''}`} aria-pressed={onCell?selected===cell.id:undefined} aria-disabled={disabled||undefined} className={`hex-cell shade-${cell.color} ${selected===cell.id?'selected':''} ${last?'last-move':''} ${checked===cell.id?'in-check':''} ${ishint?'hint-cell':''}`} onKeyDown={e=>keyMove(e,cell.id)} onFocus={()=>setFocus(cell.id)} onClick={()=>{if(!disabled)onCell?.(cell.id)}} onPointerDown={e=>{if(p?.color===pos.turn&&onCell&&!disabled&&e.pointerType==='mouse'){setDrag(cell.id);onCell(cell.id);e.preventDefault()}}}>
            <polygon points={points}/>
            {coordinates&&<text x="0" y="-17" className="cell-coordinate" textAnchor="middle">{cell.id}</text>}
            {p&&<g transform="translate(-24,-26)"><Piece type={p.type} color={p.color} size={48}/></g>}
            {legal&&(p?<circle r="25" className="capture-ring"/>:<circle r="6.5" className="move-dot"/>)}
            {selected===cell.id&&<polygon points={points} className="selection-ring"/>}
          </g>
        })}
      </g>
      {!compact&&CELLS.filter(c=>c.r===Math.min(5,5-c.q)).map(c=>{
        const {x,y}=coords(c.q,c.r,flipped)
        return <text key={c.id} x={x} y={y+(flipped?-39:42)} textAnchor="middle" className="file-label">{c.id[0]}</text>
      })}
    </svg>
  </div>
}
