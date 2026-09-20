import { createContext, useEffect, useState } from 'react'

export const NetworkContext = createContext(null)

export function NetworkProvider({ children }) {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return (
    <NetworkContext.Provider value={{ online }}>
      {children}
    </NetworkContext.Provider>
  )
}