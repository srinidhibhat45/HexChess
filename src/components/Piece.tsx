import { useId } from 'react'
import type { PieceType, Color } from '../game/engine'
const paths: Record<PieceType,string[]> = {
  P:['M22 22 C15 20 15 10 22 9 C29 10 29 20 22 22 Z','M17 24 H27 L26 28 C26 34 28 36 31 39 H13 C16 36 18 34 18 28 Z'],
  R:['M12 9 H17 V14 H20 V9 H24 V14 H27 V9 H32 V20 L28 24 H16 L12 20 Z','M17 25 H27 L26 34 L31 39 H13 L18 34 Z'],
  N:['M13 39 L15 29 C18 26 22 25 22 21 L16 23 L10 21 L11 16 L16 13 L17 7 L22 10 C35 12 34 27 29 34 L32 39 Z','M14 19 L17 19'],
  B:['M22 6 C19 11 12 15 16 21 C19 25 25 25 28 21 C32 15 25 11 22 6 Z','M18 26 H26 L25 31 C25 35 28 37 31 39 H13 C16 37 19 35 19 31 Z','M22 11 L25 17'],
  Q:['M11 14 L14 27 H30 L33 14 L27 21 L22 11 L17 21 Z','M16 29 H28 L26 33 L31 39 H13 L18 33 Z'],
  K:['M22 4 V13 M18 8 H26','M16 15 C12 11 8 16 12 22 L16 27 H28 L32 22 C36 16 32 11 28 15 L22 13 Z','M16 29 H28 L26 34 L31 39 H13 L18 34 Z'],
}
export function Piece({type,color,size=44}: {type:PieceType;color:Color;size?:number}) {
  const id=useId().replaceAll(':',''),white=color==='white'
  return <svg width={size} height={size} viewBox="0 0 44 48" className={`piece piece-${color}`} aria-hidden="true">
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={white?'#fffefb':'#34373c'}/><stop offset=".45" stopColor={white?'#f5f4ef':'#202226'}/><stop offset="1" stopColor={white?'#e3e1d9':'#141619'}/></linearGradient></defs>
    <g fill={`url(#${id})`} stroke={white?'#45474a':'#08090b'} strokeWidth="1.65" strokeLinejoin="round" strokeLinecap="round">
      {paths[type].map((d,i)=><path d={d} key={i} stroke={((type==='B'&&i===2)||(type==='N'&&i===1))?(white?'#45474a':'#a2a5a8'):undefined} fill={(type==='K'&&i===0)||(type==='B'&&i===2)||(type==='N'&&i===1)?'none':undefined}/>)}
      {type==='Q'&&<><circle cx="10.5" cy="12" r="2.5"/><circle cx="22" cy="9" r="2.5"/><circle cx="33.5" cy="12" r="2.5"/></>}
      {type==='N'&&<circle cx="23" cy="15" r="1.3" fill={white?'#34373b':'#d7d8d9'} stroke="none"/>}
      <path d="M13 40 H31 L33 44 H11 Z"/>
      <path d="M15 42 H29" stroke={white?'#fffefb':'#a2a5a8'} strokeWidth=".9"/>
    </g>
  </svg>
}
