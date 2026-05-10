import { createContext, useContext } from 'react'

export const NavigationContext = createContext(null)

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) throw new Error('useNavigation must be used inside NavigationProvider')
  return context
}
