import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'

export default function AirportInput({ label, value, onChange, seed }) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const wrapper = useRef(null)

  // Permite ao pai pré-preencher (swap, última busca): seed = { code, text }
  useEffect(() => {
    if (seed?.code) {
      setQuery(seed.text || seed.code)
      setOpen(false)
    }
  }, [seed])

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapper.current && !wrapper.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleInput(text) {
    setQuery(text)
    onChange(null)
    clearTimeout(timer.current)
    if (text.trim().length < 2) {
      setOptions([])
      return
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await api.locations(text.trim())
        setOptions(res.data || [])
        setOpen(true)
      } catch {
        setOptions([])
      }
    }, 350)
  }

  function select(opt) {
    onChange(opt.code, `${opt.code} — ${opt.name}`)
    setQuery(`${opt.code} — ${opt.name}`)
    setOpen(false)
  }

  return (
    <div className="field autocomplete" ref={wrapper}>
      <label>{label}</label>
      <input
        value={value ? query : query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => options.length && setOpen(true)}
        placeholder="Cidade ou aeroporto"
        className={value ? 'selected' : ''}
      />
      {open && options.length > 0 && (
        <ul className="options">
          {options.map((opt) => (
            <li key={`${opt.type}-${opt.code}`} onClick={() => select(opt)}>
              <strong>{opt.code}</strong> {opt.name}
              {opt.cityName ? ` · ${opt.cityName}` : ''}
              {opt.countryName ? ` · ${opt.countryName}` : ''}
              {opt.type === 'city' ? ' (cidade)' : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
