import { useEffect, useState } from 'react'
import type { Note } from './types/note'
import './App.css'

const STORAGE_KEY = 'modul5_pemweb_notes'

const DEFAULT_NOTES: Note[] = [
  {
    id: '1',
    title: 'Belajar React Hook',
    content: 'Memahami useState dan useEffect.',
    category: 'Kuliah',
  },
  {
    id: '2',
    title: 'Persiapan Modul 5',
    content: 'Menyiapkan fitur filter judul dan localStorage.',
    category: 'Praktikum',
  },
]

function App() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return DEFAULT_NOTES

      const parsed: unknown = JSON.parse(saved)
      return Array.isArray(parsed) ? (parsed as Note[]) : DEFAULT_NOTES
    } catch {
      return DEFAULT_NOTES
    }
  })

  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
    } catch (error) {
      console.error('Gagal menyimpan catatan ke localStorage:', error)
    }
  }, [notes])

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )

  return (
    <main>
      <h1>Notes App</h1>

      <input
        type="text"
        placeholder="Cari judul catatan..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {filteredNotes.length === 0 ? (
        <p>Tidak ada catatan yang cocok.</p>
      ) : (
        <ul>
          {filteredNotes.map((note) => (
            <li key={note.id}>
              <h2>{note.title}</h2>
              <p>{note.content}</p>
              <span>Kategori: {note.category}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App