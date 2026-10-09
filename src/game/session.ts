import { CELL_MAP, opposite, outcome, replay } from './engine'
import type { Color, Move, Outcome } from './engine'
import { validatedPremove } from './premoves'
import type { Premove } from './premoves'
import type { Difficulty } from './ai'
export type Mode = 'computer' | 'local' | 'correspondence'
export type Settings = { mode:Mode; side:Color; difficulty:Difficulty; minutes:number; increment:number; whiteName:string; blackName:string }
export type Clocks = Record<Color,number>
export type Session = { settings:Settings; moves:Move[]; clocks:Clocks; clockHistory:Clocks[]; anchor:number; started:boolean; paused:boolean; result:Outcome|null; id:string; zen?:boolean; seat?:Color; drawOffer?:Color|null; premove?:Premove }
export const DEFAULT_SETTINGS: Settings = {mode:'computer',side:'white',difficulty:'club',minutes:10,increment:5,whiteName:'You',blackName:'Computer'}
export const STORAGE_KEY='hexchess.game.v1'
const sessionId=()=>globalThis.crypto?.randomUUID?.()||`game-${Date.now()}-${Math.random().toString(36).slice(2)}`
export function newSession(settings:Settings=DEFAULT_SETTINGS):Session {
  settings=validateSettings(settings)
  const normalized={...settings,minutes:settings.mode==='correspondence'?0:settings.minutes,increment:settings.minutes===0||settings.mode==='correspondence'?0:settings.increment}
  return {settings:normalized,moves:[],clocks:{white:normalized.minutes*60000,black:normalized.minutes*60000},clockHistory:[],anchor:Date.now(),started:false,paused:false,result:null,id:sessionId(),seat:normalized.mode==='correspondence'?'white':undefined,drawOffer:null}
}
export function clockValues(s:Session,turn:Color,now=Date.now()):Clocks {
  const clocks={...s.clocks}
  if(s.settings.minutes>0&&s.started&&!s.paused&&!s.result) clocks[turn]=Math.max(0,clocks[turn]-Math.max(0,now-s.anchor))
  return clocks
}
export function validateSettings(value:unknown):Settings {
  if(!value||typeof value!=='object') throw new Error('Invalid game settings.')
  const s=value as Settings
  if(!['computer','local','correspondence'].includes(s.mode)||!['white','black'].includes(s.side)||!['beginner','club','advanced'].includes(s.difficulty)||!Number.isFinite(s.minutes)||s.minutes<0||s.minutes>180||!Number.isFinite(s.increment)||s.increment<0||s.increment>120) throw new Error('Invalid game settings.')
  return {mode:s.mode,side:s.side,difficulty:s.difficulty,minutes:s.minutes,increment:s.increment,whiteName:typeof s.whiteName==='string'?s.whiteName.slice(0,32):'White',blackName:typeof s.blackName==='string'?s.blackName.slice(0,32):'Black'}
}
export function parseMoves(value:unknown):Move[] {
  if(!Array.isArray(value)||value.length>2000) throw new Error('This game link is too large.')
  const moves=value.map(m=>{
    if(!m||typeof m.from!=='string'||typeof m.to!=='string'||!Object.hasOwn(CELL_MAP,m.from)||!Object.hasOwn(CELL_MAP,m.to)||(m.promotion!==undefined&&!['Q','R','B','N'].includes(m.promotion))) throw new Error('Invalid game link.')
    return {from:m.from,to:m.to,...(m.promotion?{promotion:m.promotion}:{})} as Move
  })
  replay(moves)
  return moves
}
export function gameLink(s:Session) {
  const data={v:1,id:s.id,sender:s.settings.mode==='correspondence'?s.seat:s.result?.reason==='resignation'&&s.settings.mode==='computer'?s.settings.side:undefined,settings:{...s.settings,mode:'correspondence',minutes:0,increment:0,whiteName:s.settings.mode==='computer'?'White':s.settings.whiteName,blackName:s.settings.mode==='computer'?'Black':s.settings.blackName},moves:s.moves,drawOffer:s.drawOffer??null,result:s.result?.reason==='resignation'||s.result?.reason==='agreement'?s.result:null}
  const bytes=new TextEncoder().encode(JSON.stringify(data))
  const base64=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')
  return `${location.origin}${location.pathname}#game=${base64}`
}
export function validateOutcome(value:unknown, moves?:Move[], settings?:Settings, clocks?:Clocks):Outcome|null {
  if(value===null||value===undefined) return null
  if(typeof value!=='object') throw new Error('Invalid game result.')
  const r=value as Outcome
  if(!['checkmate','stalemate','repetition','fifty-move','material','resignation','timeout','agreement'].includes(r.reason)||![null,'white','black'].includes(r.winner)) throw new Error('Invalid game result.')
  if(r.reason==='agreement' && r.winner!==null) throw new Error('An agreed draw cannot have a winner.')
  if(r.reason==='resignation' && r.winner===null) throw new Error('A resignation must have a winner.')
  if(moves) {
    const {pos,keys}=replay(moves), actual=outcome(pos,keys)
    if(['checkmate','stalemate','repetition','fifty-move','material'].includes(r.reason)) {
      if(!actual||actual.reason!==r.reason||actual.winner!==r.winner) throw new Error('The claimed result does not match the moves.')
    } else if(actual) throw new Error('This game has already ended on the board.')
    else if(r.reason==='resignation') {
      const resigning=settings?.mode==='computer'?settings.side:pos.turn
      if(r.winner!==opposite(resigning)) throw new Error('The resignation winner is inconsistent.')
    } else if(r.reason==='timeout') {
      if(!settings?.minutes||settings.mode==='correspondence'||!clocks||clocks[pos.turn]!==0) throw new Error('This game has no verified expired clock.')
      const winner=opposite(pos.turn), hasPiece=Object.values(pos.board).some(p=>p.color===winner&&p.type!=='K')
      if(r.winner!==(hasPiece?winner:null)) throw new Error('The timeout winner is inconsistent.')
    }
  }
  return {reason:r.reason,winner:r.winner}
}
export function validateDrawOffer(value:unknown):Color|null {
  if(value===undefined||value===null) return null
  if(value!=='white'&&value!=='black')throw new Error('Invalid draw offer.')
  return value
}
export function importLink(hash:string, trusted?:Session):Session {
  const raw=hash.replace(/^#game=/,'').replaceAll('-','+').replaceAll('_','/')
  if(!/^#game=[A-Za-z0-9_-]+={0,2}$/.test(hash))throw new Error('Invalid game link.')
  if(raw.length>90000) throw new Error('This game link is too large.')
  const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw),c=>c.charCodeAt(0))))
  if(data.v!==1) throw new Error('This game link uses an unsupported version.')
  const settings=validateSettings(data.settings),moves=parseMoves(data.moves)
  const result=validateOutcome(data.result,moves,{...settings,mode:data.sender&&data.result?.reason==='resignation'?'computer':'correspondence',side:data.sender??settings.side,minutes:0})
  const fresh=newSession({...settings,mode:'correspondence',minutes:0,increment:0})
  const id=typeof data.id==='string'&&/^[A-Za-z0-9-]{1,100}$/.test(data.id)?data.id:fresh.id
  if(data.sender!==undefined&&data.sender!=='white'&&data.sender!=='black')throw new Error('Invalid player color.')
  let seat:Color=data.sender?opposite(data.sender):replay(moves).pos.turn
  if(trusted?.settings.mode==='correspondence'&&trusted.id===id) {
    if(data.sender&&data.sender===trusted.seat)throw new Error('This is your outgoing link. Ask your friend for their reply.')
    const equal=(a:Move,b:Move)=>a.from===b.from&&a.to===b.to&&a.promotion===b.promotion
    if(trusted.result||outcome(replay(trusted.moves).pos,replay(trusted.moves).keys))throw new Error('Your saved game has already ended.')
    if(moves.length<trusted.moves.length||moves.length>trusted.moves.length+1||!trusted.moves.every((m,i)=>equal(m,moves[i])))throw new Error('This link conflicts with your saved move history.')
    if(moves.length>trusted.moves.length&&replay(trusted.moves).pos.turn===trusted.seat)throw new Error('This link contains a move for your own color.')
    if(result?.reason==='agreement'&&trusted.drawOffer!==trusted.seat)throw new Error('No draw acceptance was expected.')
    if(result?.reason==='resignation'&&result.winner!==trusted.seat)throw new Error('The opponent cannot resign your color.')
    if(settings.whiteName!==trusted.settings.whiteName||settings.blackName!==trusted.settings.blackName)throw new Error('Player names do not match the saved game.')
    seat=trusted.seat??seat
  }
  const drawOffer=validateDrawOffer(data.drawOffer)
  if(drawOffer&&data.sender&&drawOffer!==data.sender)throw new Error('The draw offer belongs to a different color.')
  if(drawOffer&&drawOffer!==replay(moves).pos.turn)throw new Error('Only the player to move can offer a draw.')
  return {...fresh,id,moves,started:moves.length>0,clockHistory:moves.map(()=>({white:0,black:0})),result,zen:true,seat,drawOffer,premove:trusted&&trusted.id===id?validatedPremove(trusted.premove,{...fresh,id,moves,seat}):undefined}

}
export function restore(skipLink=false):{session:Session;error?:string;imported?:boolean} {
  try {
    if(!skipLink&&location.hash.startsWith('#game=')) {
      const saved=restore(true).session
      try{return {session:importLink(location.hash,saved),imported:true}}
      catch{return {session:saved,error:'This link is invalid or conflicts with your saved game. Your board is unchanged.'}}
    }
    const raw=localStorage.getItem(STORAGE_KEY)
    if(raw) {
      const s=JSON.parse(raw) as Session
      const settings=validateSettings(s.settings),moves=parseMoves(s.moves)
      const limit=settings.minutes*60000+moves.length*settings.increment*1000
      const validClocks=(c:Clocks)=>c&&Number.isFinite(c.white)&&Number.isFinite(c.black)&&c.white>=0&&c.black>=0&&c.white<=limit&&c.black<=limit
      if(!validClocks(s.clocks)||!Number.isFinite(s.anchor)||s.anchor>Date.now()+1000||!Array.isArray(s.clockHistory)||s.clockHistory.length!==moves.length||!s.clockHistory.every(validClocks)) throw new Error('Invalid saved clock.')
      const saved:Session={...s,settings,moves,result:validateOutcome(s.result,moves,settings,s.clocks),drawOffer:validateDrawOffer(s.drawOffer),zen:typeof s.zen==='boolean'?s.zen:undefined,seat:settings.mode==='correspondence'?s.seat==='white'||s.seat==='black'?s.seat:replay(moves).pos.turn:undefined,started:!!s.started||moves.length>0,paused:settings.mode==='computer'&&!!s.paused,id:typeof s.id==='string'&&/^[A-Za-z0-9-]{1,100}$/.test(s.id)?s.id:sessionId()}
      saved.premove=saved.result?undefined:validatedPremove(s.premove,saved)
      return {session:saved}
    }
  } catch {return {session:newSession(),error:location.hash.startsWith('#game=')?'This game link could not be opened. A fresh board is ready.':'Your saved game could not be restored. A fresh board is ready.'}}
  return {session:newSession()}
}
export function exportGame(s:Session) {
  const {positions}=replay(s.moves)
  return {format:'HexChess',version:1,variant:'Glinski',settings:s.settings,moves:s.moves,position:positions.at(-1),clocks:clockValues(s,positions.at(-1)!.turn),result:s.result,drawOffer:s.drawOffer??null}
}

export function importGame(data:unknown):Session {
  if(!data||typeof data!=='object')throw new Error('Choose a HexChess game file.')
  const d=data as ReturnType<typeof exportGame>
  if(d.format!=='HexChess'||d.version!==1)throw new Error('Choose a HexChess game file.')
  const settings=validateSettings(d.settings),moves=parseMoves(d.moves),fresh=newSession(settings)
  let clocks=fresh.clocks
  if(d.result?.reason==='timeout') {
    const c=d.clocks,limit=settings.minutes*60000+moves.length*settings.increment*1000
    if(!c||!Number.isFinite(c.white)||!Number.isFinite(c.black)||c.white<0||c.black<0||c.white>limit||c.black>limit)throw new Error('Invalid expired clocks in this export.')
    clocks={white:c.white,black:c.black}
  }
  return {...fresh,moves,clocks,started:moves.length>0,clockHistory:moves.map(()=>({...fresh.clocks})),paused:settings.mode==='computer'&&!!settings.minutes,zen:true,seat:settings.mode==='correspondence'?replay(moves).pos.turn:undefined,result:validateOutcome(d.result,moves,settings,clocks),drawOffer:validateDrawOffer(d.drawOffer)}
}
