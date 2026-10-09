import { describe, expect, it } from 'vitest'
import { CELL_MAP, pseudoMoves } from '../src/game/engine'
import { attemptExercise, demoPosition, newExercise, TUTORIAL } from '../src/game/tutorial'

describe('guided tutorial',()=>{
  it.each(TUTORIAL.map((lesson,step)=>({lesson,step})))('completes the $lesson.type lesson through selection and a valid move',({lesson,step})=>{
    const start=newExercise(step),from=lesson.type==='P'?'f5':'f6'
    expect(pseudoMoves(start.pos,from).some(move=>move.to===lesson.target)).toBe(true)
    const selected=attemptExercise(start,from),done=attemptExercise(selected,lesson.target)
    expect(selected.done).toBe(false)
    expect(done.done).toBe(true)
    expect(done.pos.board[from]).toBeUndefined()
    expect(done.pos.board[lesson.target]).toEqual({type:lesson.type,color:'white'})
    expect(start.pos).toEqual(demoPosition(lesson.type))
    expect(attemptExercise(done,from)).toBe(done)
  })
  it('requires selecting the piece before moving to the target',()=>{
    const start=newExercise(0),attempt=attemptExercise(start,'f9')
    expect(attempt.done).toBe(false);expect(attempt.pos).toBe(start.pos)
    expect(attempt.message).toContain('First select')
  })
  it('explains other valid moves without moving the piece or completing the lesson',()=>{
    const selected=attemptExercise(newExercise(0),'f6'),attempt=attemptExercise(selected,'f7')
    expect(attempt.done).toBe(false);expect(attempt.pos).toBe(selected.pos)
    expect(attempt.selected).toBe('f6');expect(attempt.message).toContain('also a valid rook move')
  })
  it('rejects impossible moves and supports a fresh retry',()=>{
    const selected=attemptExercise(newExercise(0),'f6'),attempt=attemptExercise(selected,'g8')
    expect(attempt.done).toBe(false);expect(attempt.pos).toBe(selected.pos)
    expect(attempt.message).toContain('cannot move there')
    const done=attemptExercise(attempt,'f9');expect(done.done).toBe(true)
    expect(newExercise(0).selected).toBeNull();expect(newExercise(0).done).toBe(false)
  })
  it('preserves the bishop’s board shade and performs a pawn capture',()=>{
    expect(CELL_MAP.f6.color).toBe(CELL_MAP[TUTORIAL[1].target].color)
    const start=attemptExercise(newExercise(5),'f5'),done=attemptExercise(start,'g5')
    expect(Object.keys(done.pos.board)).toHaveLength(2)
    expect(done.pos.board.e5).toEqual({type:'P',color:'black'})
    expect(done.pos.board.g5).toEqual({type:'P',color:'white'})
  })
})
