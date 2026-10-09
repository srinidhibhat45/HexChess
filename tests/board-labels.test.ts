import { describe, expect, it } from 'vitest'
import { FILES } from '../src/game/engine'
import { boardLabels, boardPoint } from '../src/game/board-labels'
describe('board coordinate labels',()=>{
  it.each([false,true])('labels all eleven files and ranks 1–11 with flip=%s',flipped=>{
    const labels=boardLabels(flipped)
    expect(labels.filter(l=>l.kind==='file').map(l=>l.text).join('')).toBe(FILES)
    expect(new Set(labels.filter(l=>l.kind==='rank').map(l=>Number(l.text)))).toEqual(new Set(Array.from({length:11},(_,i)=>i+1)))
    for(const label of labels){expect(label.x).toBeGreaterThan(15);expect(label.x).toBeLessThan(595);expect(label.y).toBeGreaterThan(12);expect(label.y).toBeLessThan(615)}
  })
  it('puts slope labels outside the upper boundary and preserves cell names when flipped',()=>{
    const normal=boardLabels(false),flipped=boardLabels(true),point=boardPoint(-2,-3,false)
    expect(normal.find(l=>l.kind==='rank'&&l.cell==='d9')!.y).toBeLessThan(point.y-25)
    expect(normal.map(l=>`${l.cell}:${l.text}`)).toEqual(flipped.map(l=>`${l.cell}:${l.text}`))
    expect(normal.find(l=>l.kind==='file'&&l.text==='a')!.x).toBeLessThan(normal.find(l=>l.kind==='file'&&l.text==='l')!.x)
    expect(flipped.find(l=>l.kind==='file'&&l.text==='a')!.x).toBeGreaterThan(flipped.find(l=>l.kind==='file'&&l.text==='l')!.x)
  })
})
