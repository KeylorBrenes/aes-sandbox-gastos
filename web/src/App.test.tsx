import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'

const categories = [
  { id: 'alimentacion', name: 'Alimentación' },
  { id: 'otros', name: 'Otros' },
]

function mockApi(post: () => Response) {
  let items: unknown[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/categories') return Response.json(categories)
      if (init?.method === 'POST') {
        const res = post()
        if (res.ok) items = [{ id: 1, amount: 12500.5, date: '2026-11-02', categoryId: 'otros', note: 'Super' }]
        return res
      }
      return Response.json({ month: '2026-11', items, total: items.length ? 12500.5 : 0 })
    }),
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('muestra el título de la aplicación', () => {
  mockApi(() => new Response(null, { status: 500 }))
  render(<App />)
  expect(screen.getByTestId('app-title').textContent).toBe('Control de gastos')
})

test('guardar con éxito agrega el gasto, actualiza el total y limpia el formulario', async () => {
  mockApi(() => Response.json({}, { status: 201 }))
  render(<App />)
  await screen.findByTestId('expense-form')

  fireEvent.change(screen.getByTestId('expense-amount'), { target: { value: '12500.5' } })
  fireEvent.change(screen.getByTestId('expense-note'), { target: { value: 'Super' } })
  fireEvent.click(screen.getByTestId('expense-submit'))

  await waitFor(() => expect(screen.getAllByTestId('expense-item')).toHaveLength(1))
  expect(screen.getByTestId('expense-item').getAttribute('data-amount')).toBe('12500.5')
  expect(screen.getByTestId('month-total').getAttribute('data-amount')).toBe('12500.5')
  expect((screen.getByTestId('expense-amount') as HTMLInputElement).value).toBe('')
  expect((screen.getByTestId('expense-note') as HTMLInputElement).value).toBe('')
})

test('un 400 muestra el error junto al campo y no agrega nada', async () => {
  mockApi(() => Response.json({ errors: { amount: ['El monto debe ser mayor a 0.'] } }, { status: 400 }))
  render(<App />)
  fireEvent.change(await screen.findByTestId("expense-amount"), { target: { value: "-5" } })
  fireEvent.click(screen.getByTestId('expense-submit'))

  expect((await screen.findByTestId('field-error-amount')).textContent).toBe('El monto debe ser mayor a 0.')
  expect(screen.queryAllByTestId('expense-item')).toHaveLength(0)
})

test('si la lista falla se muestra load-error con el formulario y al reintentar se carga', async () => {
  let failing = true
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url === '/api/categories') return Response.json(categories)
      if (failing) return new Response(null, { status: 500 })
      return Response.json({ month: '2026-11', items: [], total: 0 })
    }),
  )
  render(<App />)

  expect(await screen.findByTestId('load-error')).toBeTruthy()
  expect(screen.getByTestId('expense-form')).toBeTruthy()

  failing = false
  fireEvent.click(screen.getByTestId('load-retry'))
  await waitFor(() => expect(screen.queryByTestId('load-error')).toBeNull())
  expect(screen.getByTestId('expense-form')).toBeTruthy()
})

test('si las categorías fallan por red se muestra load-error y el formulario', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url === '/api/categories') throw new TypeError('network')
      return Response.json({ month: '2026-11', items: [], total: 0 })
    }),
  )
  render(<App />)

  expect(await screen.findByTestId('load-error')).toBeTruthy()
  expect(screen.getByTestId('load-retry')).toBeTruthy()
  expect(screen.getByTestId('expense-form')).toBeTruthy()
})

test('expense-date es un input type="date" sin validación nativa', async () => {
  mockApi(() => new Response(null, { status: 500 }))
  render(<App />)
  const date = (await screen.findByTestId('expense-date')) as HTMLInputElement
  expect(date.type).toBe('date')
  expect(date.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(date.required).toBe(false)
  expect(date.min).toBe('')
  expect(date.max).toBe('')
})

type Item = { id: number; amount: number; date: string; categoryId: string; note: string | null }

function mockCrud(putStatus = 200) {
  let items: Item[] = [{ id: 7, amount: 1250.5, date: '2026-11-02', categoryId: 'otros', note: 'Super' }]
  const calls: { method: string; url: string; body?: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (url === '/api/categories') return Response.json(categories)
      if (method === 'GET') {
        return Response.json({ month: '2026-11', items, total: items.reduce((s, i) => s + i.amount, 0) })
      }
      const body = init?.body ? JSON.parse(init.body as string) : undefined
      calls.push({ method, url, body })
      if (method === 'PUT') {
        if (putStatus === 400) return Response.json({ errors: { amount: ['Monto inválido.'] } }, { status: 400 })
        items = items.map((i) => (url === `/api/expenses/${i.id}` ? { ...i, ...body } : i))
        return Response.json(items[0])
      }
      if (method === 'DELETE') {
        items = items.filter((i) => url !== `/api/expenses/${i.id}`)
        return new Response(null, { status: 204 })
      }
      return Response.json({}, { status: 201 })
    }),
  )
  return calls
}

const input = (id: string) => screen.getByTestId(id) as HTMLInputElement

test('Editar llena el formulario, cambia a modo edición y Cancelar lo restablece', async () => {
  mockCrud()
  render(<App />)
  fireEvent.click(await screen.findByTestId('expense-edit'))

  expect(screen.getByTestId('expense-form').getAttribute('data-mode')).toBe('edit')
  expect(input('expense-amount').value).toBe('1250.5')
  expect(input('expense-date').value).toBe('2026-11-02')
  expect(input('expense-category').value).toBe('otros')
  expect(input('expense-note').value).toBe('Super')
  expect(screen.getByTestId('expense-submit').textContent).toBe('Guardar cambios')

  fireEvent.click(screen.getByTestId('edit-cancel'))

  expect(screen.getByTestId('expense-form').getAttribute('data-mode')).toBe('create')
  expect(input('expense-amount').value).toBe('')
  expect(input('expense-note').value).toBe('')
  expect(input('expense-category').value).toBe('alimentacion')
  expect(screen.getByTestId('expense-submit').textContent).toBe('Guardar')
  expect(screen.queryByTestId('edit-cancel')).toBeNull()
})

test('guardar la edición hace PUT, actualiza la lista y vuelve a modo alta', async () => {
  const calls = mockCrud()
  render(<App />)
  fireEvent.click(await screen.findByTestId('expense-edit'))
  fireEvent.change(input('expense-amount'), { target: { value: '99.9' } })
  fireEvent.click(screen.getByTestId('expense-submit'))

  await waitFor(() => expect(screen.getByTestId('expense-item').getAttribute('data-amount')).toBe('99.9'))
  expect(calls).toHaveLength(1)
  expect(calls[0]).toMatchObject({ method: 'PUT', url: '/api/expenses/7', body: { amount: 99.9, categoryId: 'otros' } })
  expect(screen.getByTestId('month-total').getAttribute('data-amount')).toBe('99.9')
  expect(screen.getByTestId('expense-form').getAttribute('data-mode')).toBe('create')
  expect(input('expense-amount').value).toBe('')
})

test('un 400 al editar muestra el error y mantiene el modo edición', async () => {
  mockCrud(400)
  render(<App />)
  fireEvent.click(await screen.findByTestId('expense-edit'))
  fireEvent.change(input('expense-amount'), { target: { value: '-5' } })
  fireEvent.click(screen.getByTestId('expense-submit'))

  expect((await screen.findByTestId('field-error-amount')).textContent).toBe('Monto inválido.')
  expect(screen.getByTestId('expense-form').getAttribute('data-mode')).toBe('edit')
  expect(screen.getByTestId('expense-item').getAttribute('data-amount')).toBe('1250.5')
})
