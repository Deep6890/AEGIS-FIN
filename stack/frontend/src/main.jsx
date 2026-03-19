import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { AppDataProvider } from './context/AppDataContext.jsx'

createRoot(document.getElementById('root')).render(
  <AppDataProvider>
    <App />
  </AppDataProvider>
)
