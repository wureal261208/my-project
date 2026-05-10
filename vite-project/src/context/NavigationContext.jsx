import { NavigationContext } from './navigation'

export function NavigationProvider({ children, value }) {
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}
