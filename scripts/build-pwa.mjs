import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
async function list(dir) {
  const entries=await readdir(dir,{withFileTypes:true})
  return (await Promise.all(entries.map(e=>e.isDirectory()?list(`${dir}/${e.name}`):`${dir}/${e.name}`))).flat()
}
const assets=(await list('dist')).filter(f=>!f.endsWith('sw.js')&&!f.endsWith('.map'))
const hash=createHash('sha256')
for(const file of assets.sort())hash.update(file).update(await readFile(file))
const template=await readFile('public/sw.js','utf8')
const version=hash.update(template).digest('hex').slice(0,12)
await writeFile('dist/sw.js',template.replace('__VERSION__',version).replace('__PRECACHE__',JSON.stringify(assets.map(f=>'/'+f.slice(5)))))
console.log(`Offline ready: ${assets.length} local assets, version ${version}`)
