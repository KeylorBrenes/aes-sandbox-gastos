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
