import './app.css'
import App from './App.svelte'

/* Mounts root component (App component) to the html DOM (index.html) */
const app = new App({
  target: document.getElementById('app'), // The DOM element the component will be injected inside
})

export default app
