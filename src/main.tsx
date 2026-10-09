import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
createRoot(document.getElementById('root')!).render(<App />)
if('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load',()=>{
    void navigator.serviceWorker.register('/sw.js').then(reg=>{
      void navigator.serviceWorker.ready.then(()=>window.dispatchEvent(new Event('hexchess:offline-ready')))
      reg.addEventListener('updatefound',()=>{
        const installing=reg.installing
        installing?.addEventListener('statechange',()=>{
          if(installing.state==='installed'&&navigator.serviceWorker.controller) {
            // Keep the current game uninterrupted; the update takes over next visit.
            console.info('A HexChess update is ready for your next visit.')
          }
        })
      })
    }).catch(()=>console.info('Offline caching is unavailable in this browser.'))
  })
}
