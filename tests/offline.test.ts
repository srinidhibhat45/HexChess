import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
function setup() {
  const handlers:Record<string,(e:unknown)=>void>={}
  const cache={addAll:vi.fn().mockResolvedValue(undefined),put:vi.fn().mockResolvedValue(undefined)}
  const caches={open:vi.fn().mockResolvedValue(cache),keys:vi.fn().mockResolvedValue(['other-app','hexchess-old','hexchess-test']),delete:vi.fn().mockResolvedValue(true),match:vi.fn()}
  const fetch=vi.fn(),claim=vi.fn().mockResolvedValue(undefined)
  const self={location:{origin:'https://hexchess.test'},clients:{claim},addEventListener:(name:string,fn:(e:unknown)=>void)=>{handlers[name]=fn}}
  const source=readFileSync('public/sw.js','utf8').replace('__VERSION__','test').replace('__PRECACHE__',JSON.stringify(['/index.html','/assets/app.js']))
  runInNewContext(source,{self,caches,fetch,URL})
  const dispatch=async(name:string,request?:unknown)=>{
    let response:Promise<unknown>|undefined
    const waits:Promise<unknown>[]=[]
    handlers[name]({request,waitUntil:(p:Promise<unknown>)=>waits.push(p),respondWith:(p:Promise<unknown>)=>{response=p}})
    const value=response?await response:undefined
    await Promise.all(waits)
    return value
  }
  return {handlers,cache,caches,fetch,claim,dispatch}
}
describe('production offline caching',()=>{
  it('preloads the full app and only removes older HexChess caches',async()=>{
    const s=setup();await s.dispatch('install');expect(s.cache.addAll).toHaveBeenCalledWith(['/index.html','/assets/app.js'])
    await s.dispatch('activate');expect(s.caches.delete).toHaveBeenCalledExactlyOnceWith('hexchess-old');expect(s.claim).toHaveBeenCalledOnce()
  })
  it('falls back to the saved HTML when the server is unavailable',async()=>{
    const s=setup();s.fetch.mockRejectedValue(new Error('offline'));s.caches.match.mockResolvedValue('saved HTML')
    expect(await s.dispatch('fetch',{url:'https://hexchess.test/',method:'GET',mode:'navigate'})).toBe('saved HTML')
    expect(s.caches.match).toHaveBeenCalledWith('/index.html')
  })
  it('serves cached modules despite differing Origin request headers',async()=>{
    const s=setup();s.caches.match.mockResolvedValue('cached module')
    const request={url:'https://hexchess.test/assets/app.js',method:'GET',mode:'cors'}
    expect(await s.dispatch('fetch',request)).toBe('cached module')
    expect(s.caches.match).toHaveBeenCalledWith(request,{ignoreVary:true});expect(s.fetch).not.toHaveBeenCalled()
  })
  it('caches successful newly loaded assets for later offline use',async()=>{
    const s=setup();s.caches.match.mockResolvedValue(undefined)
    const response={ok:true,clone:()=> 'copy'};s.fetch.mockResolvedValue(response)
    const request={url:'https://hexchess.test/assets/updated.js',method:'GET',mode:'cors'}
    expect(await s.dispatch('fetch',request)).toBe(response);expect(s.cache.put).toHaveBeenCalledWith(request,'copy')
  })
  it('leaves videos, external resources, and non-GET requests to the browser',()=>{
    const s=setup();s.handlers.fetch({request:{url:'https://www.youtube-nocookie.com/embed/bgR3yESAEVE',method:'GET'}})
    s.handlers.fetch({request:{url:'https://hexchess.test/',method:'POST'}})
    expect(s.fetch).not.toHaveBeenCalled();expect(s.caches.match).not.toHaveBeenCalled()
  })
})
