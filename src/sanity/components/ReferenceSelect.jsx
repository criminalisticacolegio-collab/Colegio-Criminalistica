import { useCallback, useEffect, useState } from 'react'
import { set, unset, useClient } from 'sanity'

function ReferenceSelect({ value, onChange, readOnly, documentType }) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const client = useClient({ apiVersion: '2023-05-03' })

  useEffect(() => {
    client
      .fetch(
        `*[_type == $type && (activa == true || !defined(activa))] | order(titulo asc) { _id, titulo }`,
        { type: documentType }
      )
      .then((docs) => {
        setOptions(docs)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [client, documentType])

  const handleChange = useCallback(
    (e) => {
      const val = e.target.value
      onChange(val ? set({ _type: 'reference', _ref: val }) : unset())
    },
    [onChange]
  )

  return (
    <select
      disabled={readOnly || loading}
      value={value?._ref || ''}
      onChange={handleChange}
      style={{
        padding: '8px 12px',
        borderRadius: 4,
        border: '1px solid #ccc',
        fontSize: 14,
        width: '100%',
        background: readOnly ? '#f5f5f5' : '#fff',
        cursor: readOnly ? 'not-allowed' : 'pointer',
      }}
    >
      <option value="">{loading ? 'Cargando...' : '— Seleccionar —'}</option>
      {options.map((opt) => (
        <option key={opt._id} value={opt._id}>
          {opt.titulo}
        </option>
      ))}
    </select>
  )
}

export function JurisdiccionSelect(props) {
  return <ReferenceSelect {...props} documentType="jurisdiccion" />
}

export function EspecialidadSelect(props) {
  return <ReferenceSelect {...props} documentType="especialidad" />
}
