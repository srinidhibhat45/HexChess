import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
export function Dialog({title,subtitle,onClose,children,wide=false}: {title:string;subtitle?:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}) {
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null
    const root=document.getElementById('root')!
    root.inert=true
    const overflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    ref.current?.focus()
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape')onClose()
      if(e.key==='Tab') {
        const items=ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]')
        if(!items?.length)return
        const first=items[0],last=items[items.length-1]
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
      }
    }
    document.addEventListener('keydown',key)
    return ()=>{root.inert=false;document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus()}
  },[onClose])
  return createPortal(<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={ref} className={`dialog ${wide?'dialog-wide':''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
    <div className="dialog-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={21}/></button></div>{children}
  </div></div>,document.body)
}
