import { applyMove, PIECE_NAMES, pseudoMoves } from './engine'
import type { PieceType, Position } from './engine'

export const TUTORIAL: {type:PieceType;target:string;title:string;instruction:string;tip:string;success:string}[] = [
  {type:'R',target:'f9',title:'Move in a straight line.',instruction:'A rook slides through the edges of neighboring hexagons in six directions. Move from f6 to the target on f9.',tip:'A rook can travel several cells, but cannot jump over another piece.',success:'That is a rook move: three cells straight up, through shared edges.'},
  {type:'B',target:'d5',title:'Follow the same shade.',instruction:'A bishop moves diagonally through cell corners. Move from f6 to the target on d5. Both cells have the same board shade.',tip:'The board has three shades. Each of your three bishops stays on its own shade for the whole game.',success:'Notice the matching shades on f6 and d5. A bishop stays on the same shade.'},
  {type:'N',target:'g8',title:'Make a knight’s jump.',instruction:'Move the knight from f6 to the target on g8: two steps straight up, then one step at a 60° turn to the right.',tip:'A knight jumps over pieces. From the center, it has twelve possible destinations.',success:'That is one of the knight’s twelve jumps. Pieces in between would not block it.'},
  {type:'Q',target:'i3',title:'Combine rook and bishop moves.',instruction:'A queen can slide along any rook line or bishop diagonal. Move from f6 to the target on i3 using a rook line.',tip:'Like a rook or bishop, a queen stops at other pieces. It captures by landing on an enemy piece.',success:'You followed a rook line. A queen can also use all six bishop diagonals.'},
  {type:'K',target:'h5',title:'Take one king step.',instruction:'A king moves one step along a rook line or bishop diagonal. Move from f6 to the target on h5 using one bishop step.',tip:'In a game, your king must stay safe from enemy attacks. HexChess prevents moves that leave it in check.',success:'One bishop step reaches h5. The king can also take one rook step; there is no castling.'},
  {type:'P',target:'g5',title:'Capture with a pawn.',instruction:'Pawns move straight forward into an empty cell, but capture along either forward edge. Move the white pawn from f5 to the target on g5 to capture the black pawn.',tip:'White moves toward the top of this board; Black moves toward the bottom. Pawns never move backward.',success:'The black pawn is removed. Pawn captures go at an angle; ordinary pawn moves go straight ahead.'},
]
export function demoPosition(type:PieceType):Position {
  const board:Position['board']={[type==='P'?'f5':'f6']:{type,color:'white'}}
  if(type==='P'){board.e5={type:'P',color:'black'};board.g5={type:'P',color:'black'}}
  return {board,turn:'white',ep:null,halfmove:0,fullmove:1}
}
export type Exercise = {step:number;pos:Position;selected:string|null;done:boolean;message:string}
export function newExercise(step:number):Exercise {
  return {step,pos:demoPosition(TUTORIAL[step].type),selected:null,done:false,message:''}
}
// These isolated boards teach movement; king safety is explained in the king lesson.
export function attemptExercise(exercise:Exercise,id:string):Exercise {
  if(exercise.done)return exercise
  const lesson=TUTORIAL[exercise.step],from=lesson.type==='P'?'f5':'f6',name=PIECE_NAMES[lesson.type].toLowerCase()
  if(id===from)return {...exercise,selected:from,message:`${PIECE_NAMES[lesson.type]} selected. Now choose the outlined target on ${lesson.target}.`}
  if(!exercise.selected)return {...exercise,message:`First select the white ${name} on ${from}.`}
  const move=pseudoMoves(exercise.pos,from).find(m=>m.to===id)
  if(id===lesson.target&&move)return {...exercise,pos:applyMove(exercise.pos,move),selected:id,done:true,message:lesson.success}
  return {...exercise,message:move?`That is also a valid ${name} move. For this lesson, choose the outlined target on ${lesson.target}.`:`A ${name} cannot move there. Choose the outlined target on ${lesson.target}.`}
}
