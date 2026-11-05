import { useCallback, useEffect, useState } from 'react'

type Category = { id: string; name: string }
type Expense = { id: number; amount: number; date: string; categoryId: string; note: string | null }
type Month = { month: string; items: Expense[]; total: number }

function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Loaded = { month: Month | null; categories: Category[] | null }

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

async function fetchAll(): Promise<Loaded> {
  const [month, categories] = await Promise.all([getJson<Month>('/api/expenses'), getJson<Category[]>('/api/categories')])
  return { month, categories }
}

function App() {
  const [categories, setCategories] = useState<Category[]>([])
  const [month, setMonth] = useState<Month | null>(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [categoryId, setCategoryId] = useState('alimentacion')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const applyLoaded = useCallback((r: Loaded) => {
    if (r.month) setMonth(r.month)
    if (r.categories) setCategories(r.categories)
    setLoadError(!r.month || !r.categories)
  }, [])

  const loadAll = useCallback(() => fetchAll().then(applyLoaded), [applyLoaded])

  useEffect(() => {
    void fetchAll().then(applyLoaded)
  }, [applyLoaded])

  function resetForm() {
    setEditingId(null)
    setErrors({})
    setActionError(null)
    setAmount('')
    setNote('')
    setDate(today())
    setCategoryId('alimentacion')
  }

  function startEdit(i: Expense) {
    setEditingId(i.id)
    setErrors({})
    setActionError(null)
    setAmount(String(i.amount))
    setDate(i.date)
    setCategoryId(i.categoryId)
    setNote(i.note ?? '')
  }

  function askDelete(id: number) {
    setActionError(null)
    setConfirmingId(id)
  }

  function cancelDelete() {
    setActionError(null)
    setConfirmingId(null)
  }

  async function remove(id: number) {
    let res: Response
    try {
      res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    } catch {
      setActionError('No se pudo eliminar el gasto. Revisa tu conexión e inténtalo de nuevo.')
      return
    }
    if (!res.ok && res.status !== 404) {
      setActionError('No se pudo eliminar el gasto. Inténtalo de nuevo.')
      return
    }
    setActionError(null)
    setConfirmingId(null)
    if (editingId === id) resetForm()
    await loadAll()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    let res: Response
    try {
      res = await fetch(editingId === null ? '/api/expenses' : `/api/expenses/${editingId}`, {
        method: editingId === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount === '' ? null : Number(amount),
          date,
          categoryId,
          note,
        }),
      })
    } catch {
      setActionError('No se pudo guardar el gasto. Revisa tu conexión e inténtalo de nuevo.')
      return
    }
    if (res.status === 400) {
      setActionError(null)
      setErrors((await res.json()).errors ?? {})
      return
    }
    if (!res.ok) {
      setActionError('No se pudo guardar el gasto. Inténtalo de nuevo.')
      return
    }
    resetForm()
    await loadAll()
  }

  return (
    <main>
      <h1 data-testid="app-title">Control de gastos</h1>

      {loadError && (
        <div data-testid="load-error" role="alert">
          <p>No se pudieron cargar los datos.</p>
          <button type="button" data-testid="load-retry" onClick={() => void loadAll()}>
            Reintentar
          </button>
        </div>
      )}

      <form data-testid="expense-form" data-mode={editingId === null ? 'create' : 'edit'} noValidate onSubmit={submit}>
        <label>
          Monto
          <input data-testid="expense-amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        {errors.amount && <p data-testid="field-error-amount">{errors.amount.join(' ')}</p>}
        <label>
          Fecha
          <input data-testid="expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {errors.date && <p data-testid="field-error-date">{errors.date.join(' ')}</p>}
        <label>
          Categoría
          <select data-testid="expense-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {errors.categoryId && <p data-testid="field-error-categoryId">{errors.categoryId.join(' ')}</p>}
        <label>
          Nota
          <input data-testid="expense-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {errors.note && <p data-testid="field-error-note">{errors.note.join(' ')}</p>}
        <button type="submit" data-testid="expense-submit">
          {editingId === null ? 'Guardar' : 'Guardar cambios'}
        </button>
        {editingId !== null && (
          <button type="button" data-testid="edit-cancel" onClick={resetForm}>
            Cancelar
          </button>
        )}
      </form>

      {actionError && (
        <p data-testid="action-error" role="alert">
          {actionError}
        </p>
      )}

      <p>
        Total del mes:{' '}
        <strong data-testid="month-total" data-amount={month?.total ?? 0}>
          {money(month?.total ?? 0)}
        </strong>
      </p>
      <ul data-testid="expense-list">
        {month?.items.map((i) => (
          <li key={i.id} data-testid="expense-item" data-id={i.id} data-amount={i.amount}>
            {i.date} · {categories.find((c) => c.id === i.categoryId)?.name ?? i.categoryId} · {money(i.amount)}
            {i.note ? ` · ${i.note}` : ''}{' '}
            <button type="button" data-testid="expense-edit" onClick={() => startEdit(i)}>
              Editar
            </button>{' '}
            <button type="button" data-testid="expense-delete" onClick={() => askDelete(i.id)}>
              Eliminar
            </button>
            {confirmingId === i.id && (
              <span data-testid="delete-confirm">
                {' '}¿Eliminar este gasto?{' '}
                <button type="button" data-testid="delete-confirm-yes" onClick={() => void remove(i.id)}>
                  Confirmar
                </button>{' '}
                <button type="button" data-testid="delete-confirm-no" onClick={cancelDelete}>
                  Cancelar
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App
