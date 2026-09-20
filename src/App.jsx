import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NetworkProvider } from './context/NetworkContext'
import { ToastProvider } from './context/ToastContext'
import { SyncProvider } from './context/SyncContext'
import { router } from './router'

export default function App() {
  return (
    <AuthProvider>
      <NetworkProvider>
        <ToastProvider>
          <SyncProvider>
            <RouterProvider router={router} />
          </SyncProvider>
        </ToastProvider>
      </NetworkProvider>
    </AuthProvider>
  )
}