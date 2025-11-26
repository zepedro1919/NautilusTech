/*
  This is the javascript entrypoint. It finds the root div in index html and renders
  the main <App /> component into it.
*/

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '../App/App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)