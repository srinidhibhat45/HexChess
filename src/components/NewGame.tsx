import { useState } from 'react'
import { Bot, Users, Link2, Check, Clock3 } from 'lucide-react'
import { Dialog } from './Dialog'
import { DEFAULT_SETTINGS } from '../game/session'
import type { Settings, Mode } from '../game/session'
import { Piece } from './Piece'
export const MODE_LABELS:Record<Mode,string>={computer:'Computer',local:'Pass & play',correspondence:'Play by link'}
export function NewGame({current,onStart,onClose,initialMode}: {current?:Settings;onStart:(s:Settings)=>void;onClose:()=>void;initialMode?:Mode}) {
  const [s,setS]=useState<Settings>({...current||DEFAULT_SETTINGS,...(initialMode?{mode:initialMode}: {})})
  const [custom,setCustom]=useState(false)
  const patch=(p:Partial<Settings>)=>setS({...s,...p})
  const start=()=>{
    const names=s.mode==='computer'?{whiteName:s.side==='white'?'You':'Computer',blackName:s.side==='black'?'You':'Computer'}:{whiteName:s.whiteName==='You'||s.whiteName==='Computer'?'White':s.whiteName||'White',blackName:s.blackName==='You'||s.blackName==='Computer'?'Black':s.blackName||'Black'}
    onStart({...s,...names})
  }
  return <Dialog title="A fresh perspective." subtitle="Make this game your own." onClose={onClose}>
    <div className="mode-picker" role="group" aria-label="Game mode">{(['computer','local','correspondence'] as Mode[]).map(mode=>{
      const Icon=mode==='computer'?Bot:mode==='local'?Users:Link2
      return <button className={s.mode===mode?'active':''} key={mode} onClick={()=>patch({mode})}><Icon size={19}/>{MODE_LABELS[mode]}</button>
    })}</div>
    <p className="form-note">{s.mode==='computer'?'Find your rhythm against an opponent that is always ready.':s.mode==='local'?'Two players. One device. Take turns and enjoy the game together.':'Make a move, then send the updated link to your friend. No accounts or live connection needed. Correspondence games are untimed.'}</p>
    {s.mode==='computer'?<><div className="field-label">YOUR SIDE</div><div className="side-picker">{(['white','black'] as const).map(side=><button key={side} className={s.side===side?'active':''} onClick={()=>patch({side})}><Piece type="K" color={side} size={36}/><span>{side==='white'?'White':'Black'}</span>{s.side===side&&<Check size={16}/>}</button>)}</div>
      <label className="field-label" htmlFor="difficulty">COMPUTER LEVEL</label><select id="difficulty" value={s.difficulty} onChange={e=>patch({difficulty:e.target.value as Settings['difficulty']})}><option value="beginner">Beginner · room to learn</option><option value="club">Club · a thoughtful challenge</option><option value="advanced">Advanced · deeper calculation</option></select>
    </>:<div className="name-fields"><label>White player<input maxLength={32} value={['You','Computer'].includes(s.whiteName)?'':s.whiteName} placeholder="White" onChange={e=>patch({whiteName:e.target.value})}/></label><label>Black player<input maxLength={32} value={['You','Computer'].includes(s.blackName)?'':s.blackName} placeholder="Black" onChange={e=>patch({blackName:e.target.value})}/></label></div>}
    {s.mode!=='correspondence'&&<><div className="field-label"><Clock3 size={14}/> TIME CONTROL</div><div className="time-presets">{[[3,2],[5,3],[10,5],[15,10],[30,0],[0,0]].map(([minutes,increment])=><button key={minutes} className={!custom&&s.minutes===minutes&&s.increment===increment?'active':''} onClick={()=>{setCustom(false);patch({minutes,increment})}}>{minutes===0?'Unlimited':`${minutes} + ${increment}`}<small>{minutes===0?'take your time':minutes<=5?'blitz':minutes<30?'rapid':'classical'}</small></button>)}</div><button className="text-button custom-button" onClick={()=>setCustom(!custom)}>{custom?'Hide custom settings':'Custom time control'}</button>
    {custom&&<div className="name-fields"><label>Minutes per player<input type="number" min="0" max="180" step="1" value={s.minutes} onChange={e=>patch({minutes:Math.min(180,Math.max(0,Number(e.target.value)))})}/></label><label>Increment in seconds<input type="number" min="0" max="120" step="1" value={s.increment} onChange={e=>patch({increment:Math.min(120,Math.max(0,Number(e.target.value)))})}/></label></div>}
    <p className="form-note small">{s.minutes?`${s.minutes} minutes each, plus ${s.increment} seconds after every move. The clock begins after the opening move.`:'No clock. Take all the time you need.'}</p></>}
    <button className="button primary full-width" onClick={start}>{s.mode==='correspondence'?'Create a link game':'Start game'}</button>
    {current&&<p className="form-note small center">Starting a new game replaces your current board. You can export it first.</p>}
  </Dialog>
}
