import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

// Component that throws an error
const ProblemChild = () => {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>Success content</div>
      </ErrorBoundary>
    )
    
    expect(getByText('Success content')).toBeTruthy()
  })

  it('should catch errors and show fallback', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    )
    
    expect(getByText('Something went wrong')).toBeTruthy()
    expect(getByText('Test error')).toBeTruthy()
  })

  it('should allow reset via onReset callback', () => {
    const shouldError = true
    const ToggleChild = () => {
      if (shouldError) throw new Error('Toggle error')
      return <div>Recovered!</div>
    }
    
    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <ToggleChild />
      </ErrorBoundary>
    )
    
    // Should show error
    expect(queryByText('Recovered!')).toBeNull()
    expect(getByText('Something went wrong')).toBeTruthy()
  })
})