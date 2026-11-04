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

function App() {
  const [categories, setCategories] = useState<Category[]>([])
  const [month, setMonth] = useState<Month | null>(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [categoryId, setCategoryId] = useState('alimentacion')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const loadMonth = useCallback(async () => {
    const res = await fetch('/api/expenses')
    if (res.ok) setMonth(await res.json())
  }, [])

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories)
    fetch('/api/expenses')
      .then((r) => r.json())
      .then(setMonth)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount === '' ? null : Number(amount),
        date,
        categoryId,
        note,
      }),
    })
    if (res.status === 400) {
      setErrors((await res.json()).errors ?? {})
      return
    }
    if (!res.ok) return
    setErrors({})
    setAmount('')
    setNote('')
    setDate(today())
    await loadMonth()
  }

  return (
    <main>
      <h1 data-testid="app-title">Control de gastos</h1>

      {month && (
      <form data-testid="expense-form" noValidate onSubmit={submit}>
        <label>
          Monto
          <input data-testid="expense-amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        {errors.amount && <p data-testid="field-error-amount">{errors.amount.join(' ')}</p>}
        <label>
          Fecha
          <input data-testid="expense-date" value={date} onChange={(e) => setDate(e.target.value)} />
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
          Guardar
        </button>
      </form>
      )}

      <p>
        Total del mes:{' '}
        <strong data-testid="month-total" data-amount={month?.total ?? 0}>
          {money(month?.total ?? 0)}
        </strong>
      </p>
      <ul data-testid="expense-list">
        {month?.items.map((i) => (
          <li key={i.id} data-testid="expense-item" data-amount={i.amount}>
            {i.date} · {categories.find((c) => c.id === i.categoryId)?.name ?? i.categoryId} · {money(i.amount)}
            {i.note ? ` · ${i.note}` : ''}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App
