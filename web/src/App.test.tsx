import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('muestra el título de la aplicación', () => {
  render(<App />)
  expect(screen.getByTestId('app-title').textContent).toBe('Control de gastos')
})
