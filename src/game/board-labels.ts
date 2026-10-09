import { CELLS } from './engine'

export const boardPoint=(q:number,r:number,flipped:boolean)=>({x:305+45*q*(flipped?-1:1),y:310+Math.sqrt(3)*30*(r+q/2)*(flipped?-1:1)})
export function boardLabels(flipped:boolean) {
  const labels:{cell:string;text:string;x:number;y:number;kind:'file'|'rank'}[]=[]
  for(const cell of CELLS){
    const point=boardPoint(cell.q,cell.r,flipped),sign=flipped?-1:1
    if(cell.r===Math.min(5,5-cell.q))labels.push({cell:cell.id,text:cell.id[0],x:point.x,y:point.y+(flipped?-36:42),kind:'file'})
    for(const side of [-1,1]){
      const onSlope=cell.q*side>=0&&cell.r===Math.max(-5,-5-cell.q)
      const onSide=cell.q===side*5
      if(onSlope||onSide)labels.push({cell:cell.id,text:cell.id.slice(1),x:point.x+(onSide?42:26)*side*sign,y:point.y+(onSide?0:-34*sign)+4,kind:'rank'})
    }
  }
  return labels
}
