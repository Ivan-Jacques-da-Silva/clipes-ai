import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import ListaVideos from './paginas/ListaVideos'
import EditorCortes from './paginas/EditorCortes'
import './estilos.css'

export default function App(){
  return (
    <div className="app">
      <nav className="topo">
        <Link to="/">📚 Vídeos</Link>
      </nav>
      <Routes>
        <Route path="/" element={<ListaVideos/>} />
        <Route path="/editor/:id" element={<EditorCortes/>} />
      </Routes>
    </div>
  )
}
