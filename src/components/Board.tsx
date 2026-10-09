import { useState, useRef, useEffect } from 'react'
import { CELLS, CELL_MAP, PIECE_NAMES, inCheck } from '../game/engine'
import type { Color, Move, Position } from '../game/engine'
import type { PointerEvent, KeyboardEvent } from 'react'
import { Piece } from './Piece'
const SIZE=30
const coords=(q:number,r:number,flipped:boolean)=>({x:305+1.5*SIZE*q*(flipped?-1:1),y:310+Math.sqrt(3)*SIZE*(r+q/2)*(flipped?-1:1)})
const points=Array.from({length:6},(_,i)=>`${Math.cos(Math.PI*i/3)*(SIZE-.65)},${Math.sin(Math.PI*i/3)*(SIZE-.65)}`).join(' ')
type Mark={from:string;to:string;color:'amber'|'blue'|'red'|'green'}
type Gesture={from:string;pointer:number;kind:'arrow'|'draw'|'move';color:Mark['color']}
const markColor=(e:PointerEvent):Mark['color']=>e.shiftKey?'blue':e.ctrlKey||e.metaKey?'red':e.altKey?'green':'amber'
function Arrow({mark,flipped,preview=false}:{mark:Mark;flipped:boolean;preview?:boolean}) {
  const from=CELL_MAP[mark.from],to=CELL_MAP[mark.to],a=coords(from.q,from.r,flipped),b=coords(to.q,to.r,flipped)
  if(mark.from===mark.to)return <circle className={`board-mark mark-${mark.color} ${preview?'mark-preview':''}`} cx={a.x} cy={a.y} r={25} fill="none" strokeWidth={4}/>
  const angle=Math.atan2(b.y-a.y,b.x-a.x),dx=Math.cos(angle),dy=Math.sin(angle),base={x:b.x-dx*17,y:b.y-dy*17}
  return <g className={`board-arrow mark-${mark.color} ${preview?'mark-preview':''}`} data-arrow={`${mark.from}-${mark.to}`}><line x1={a.x+dx*9} y1={a.y+dy*9} x2={base.x} y2={base.y} strokeWidth={7} strokeLinecap="round"/><polygon points={`${b.x},${b.y} ${base.x-dy*11},${base.y+dx*11} ${base.x+dy*11},${base.y-dx*11}`}/></g>
}
export function Board({pos,selected,moves,onCell,flipped=false,coordinates=true,lastMove,hint,disabled=false,compact=false,interactionColor,premove,drawingMode=false,clearMarks=0,onMarksChange}: {pos:Position;selected?:string|null;moves?:Move[];onCell?:(id:string)=>void;flipped?:boolean;coordinates?:boolean;lastMove?:Move;hint?:Move|null;disabled?:boolean;compact?:boolean;interactionColor?:Color;premove?:Move;drawingMode?:boolean;clearMarks?:number;onMarksChange?:(count:number)=>void}) {
  const [focus,setFocus]=useState('f6'),[marks,setMarks]=useState<Mark[]>([]),[draft,setDraft]=useState<Mark|null>(null),[armed,setArmed]=useState<string|null>(null)
  const gesture=useRef<Gesture|null>(null),suppressClick=useRef(false),refs=useRef<Record<string,SVGGElement|null>>({})
  const checked=inCheck(pos)?Object.keys(pos.board).find(id=>pos.board[id].color===pos.turn&&pos.board[id].type==='K'):undefined
  const clear=()=>{setMarks([]);setDraft(null);setArmed(null);gesture.current=null}
  useEffect(()=>{clear()},[pos,clearMarks])
  useEffect(()=>{setArmed(null);setDraft(null);gesture.current=null},[drawingMode])
  useEffect(()=>{
    const onEscape=(e:globalThis.KeyboardEvent)=>{if(e.key==='Escape'&&(marks.length||armed||draft)&&!document.getElementById('root')?.inert){e.preventDefault();e.stopImmediatePropagation();clear()}}
    window.addEventListener('keydown',onEscape,true);return()=>window.removeEventListener('keydown',onEscape,true)
  },[marks.length,armed,draft])
  useEffect(()=>{onMarksChange?.(marks.length)},[marks.length,onMarksChange])
  const toggleMark=(mark:Mark)=>setMarks(old=>old.some(m=>m.from===mark.from&&m.to===mark.to&&m.color===mark.color)?old.filter(m=>!(m.from===mark.from&&m.to===mark.to&&m.color===mark.color)):[...old.filter(m=>!(m.from===mark.from&&m.to===mark.to)),mark].slice(-64))
  const annotateCell=(id:string)=>{if(armed){toggleMark({from:armed,to:id,color:'amber'});setArmed(null)}else setArmed(id)}
  const hit=(e:PointerEvent)=>document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-cell]')?.getAttribute('data-cell')??null
  const begin=(e:PointerEvent<SVGSVGElement>)=>{
    if(!onCell||e.button!==0&&e.button!==2)return
    const from=(e.target as Element).closest('[data-cell]')?.getAttribute('data-cell')
    if(!from)return
    suppressClick.current=false
    if(e.button===2||drawingMode) {
      e.preventDefault();gesture.current={from,pointer:e.pointerId,kind:e.button===2?'arrow':'draw',color:markColor(e)}
      setDraft({from,to:from,color:markColor(e)});e.currentTarget.setPointerCapture(e.pointerId);return
    }
    clear()
    if(!disabled&&e.pointerType==='mouse'&&pos.board[from]?.color===(interactionColor??pos.turn)) {
      gesture.current={from,pointer:e.pointerId,kind:'move',color:'amber'};onCell(from);e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId)
    }
  }
  const finish=(e:PointerEvent<SVGSVGElement>)=>{
    const g=gesture.current;if(!g||g.pointer!==e.pointerId)return
    const to=hit(e);gesture.current=null;setDraft(null)
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)
    if(!to)return
    if(g.kind==='move'){if(to!==g.from&&!disabled){suppressClick.current=true;onCell?.(to)}return}
    e.preventDefault();suppressClick.current=true
    if(g.kind==='draw'&&g.from===to)annotateCell(to)
    else {toggleMark({from:g.from,to,color:g.color});setArmed(null)}
  }
  const selectCell=(id:string)=>{
    if(suppressClick.current){suppressClick.current=false;return}
    if(drawingMode)annotateCell(id)
    else {clear();if(!disabled)onCell?.(id)}
  }
  const keyMove=(e:KeyboardEvent,id:string)=> {
    if(e.key==='Escape'&&(marks.length||armed||draft)){e.preventDefault();e.stopPropagation();clear();return}
    if(['Enter',' '].includes(e.key)){e.preventDefault();suppressClick.current=false;selectCell(id);return}
    const directions:Record<string,number[]>={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}
    if(directions[e.key]) {
      e.preventDefault();const [dq,dr]=directions[e.key],from=CELL_MAP[id],sign=flipped?-1:1
      const next=CELLS.find(c=>c.q===from.q+dq*sign&&c.r===from.r+dr*sign)
      if(next){setFocus(next.id);refs.current[next.id]?.focus()}
    }
  }
  return <div className={`board-wrap ${compact?'board-compact':''} ${drawingMode?'drawing-mode':''}`}>
    <svg className="hex-board" viewBox="0 0 610 620" aria-label="Gliński hexagonal chessboard, 91 cells" role="group" onContextMenu={e=>{if(onCell)e.preventDefault()}} onPointerDown={begin} onPointerMove={e=>{const g=gesture.current;if(g&&g.kind!=='move'&&g.pointer===e.pointerId){const to=hit(e);if(to)setDraft({from:g.from,to,color:g.color})}}} onPointerUp={finish} onPointerCancel={()=>{gesture.current=null;setDraft(null)}} onLostPointerCapture={()=>{gesture.current=null;setDraft(null)}}>
      <g>
        {CELLS.map(cell=>{
          const {x,y}=coords(cell.q,cell.r,flipped),p=pos.board[cell.id],legal=moves?.some(m=>m.to===cell.id),last=lastMove&&(lastMove.from===cell.id||lastMove.to===cell.id),ishint=hint&&(hint.from===cell.id||hint.to===cell.id),queued=premove&&(premove.from===cell.id||premove.to===cell.id)
          return <g key={cell.id} ref={el=>{refs.current[cell.id]=el}} transform={`translate(${x},${y})`} data-cell={cell.id} role={onCell?'button':undefined} tabIndex={onCell&&cell.id===focus?0:-1} aria-label={`${cell.id}${p?`, ${p.color} ${PIECE_NAMES[p.type]}`:', empty'}${legal?interactionColor&&interactionColor!==pos.turn?', premove destination':', legal destination':''}${selected===cell.id?', selected':''}${queued?', premove':''}`} aria-pressed={onCell?selected===cell.id:undefined} aria-disabled={disabled&&!drawingMode||undefined} className={`hex-cell shade-${cell.color} ${selected===cell.id?'selected':''} ${last?'last-move':''} ${checked===cell.id?'in-check':''} ${ishint?'hint-cell':''} ${queued?'premove-cell':''}`} onKeyDown={e=>keyMove(e,cell.id)} onFocus={()=>setFocus(cell.id)} onClick={()=>selectCell(cell.id)}>
            <polygon points={points}/>
            {coordinates&&<text x="0" y="-17" className="cell-coordinate" textAnchor="middle">{cell.id}</text>}
            {p&&<g transform="translate(-24,-26)"><Piece type={p.type} color={p.color} size={48}/></g>}
            {legal&&(p?<circle r="25" className="capture-ring"/>:<circle r="6.5" className="move-dot"/>)}
            {selected===cell.id&&<polygon points={points} className="selection-ring"/>}
          </g>
        })}
      </g>
      <g className="board-annotations" aria-hidden="true">{marks.map(m=><Arrow key={`${m.from}-${m.to}`} mark={m} flipped={flipped}/>)}{armed&&<Arrow mark={{from:armed,to:armed,color:'amber'}} flipped={flipped} preview/>}{draft&&<Arrow mark={draft} flipped={flipped} preview/>}</g>
      {!compact&&CELLS.filter(c=>c.r===Math.min(5,5-c.q)).map(c=>{
        const {x,y}=coords(c.q,c.r,flipped)
        return <text key={c.id} x={x} y={y+(flipped?-39:42)} textAnchor="middle" className="file-label">{c.id[0]}</text>
      })}
    </svg>
  </div>
}
