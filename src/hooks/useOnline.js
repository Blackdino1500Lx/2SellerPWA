import { useContext } from 'react'
import { NetworkContext } from '../context/NetworkContext'

export function useOnline() {
  const ctx = useContext(NetworkContext)
  if (!ctx) {
    throw new Error('useOnline debe usarse dentro de <NetworkProvider>')
  }
  return ctx.online
}