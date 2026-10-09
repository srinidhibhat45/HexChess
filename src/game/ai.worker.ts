import { findBestMove } from './ai'
import type { Difficulty } from './ai'
import type { Position } from './engine'
self.onmessage = (event:MessageEvent<{pos:Position;difficulty:Difficulty;hint?:boolean}>) => {
  try { self.postMessage({move:findBestMove(event.data.pos,event.data.difficulty,event.data.hint?1100:undefined)}) }
  catch { self.postMessage({move:null,error:'Could not analyze this position.'}) }
}
