import { useState, useEffect } from 'react'
import { getSession, clearSession, setNotificationCount, getNotificationCount } from '../shared/storage'
import { loginWithEmail, getNotifications, markNotificationRead } from '../shared/kreoon-api'
import type { AuthSession, KreoonNotification } from '../shared/types'

export default function Popup() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [notifications, setNotifications] = useState<KreoonNotification[]>([])
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    getSession().then(s => {
      setSession(s)
      setLoading(false)
      if (s) loadNotifications(s)
    })
    getNotificationCount().then(setNotifCount)
  }, [])

  async function loadNotifications(s: AuthSession) {
    const notifs = await getNotifications(s.access_token, s.user.id)
    setNotifications(notifs)
    setNotifCount(notifs.length)
    await setNotificationCount(notifs.length)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      const s = await loginWithEmail(email, password)
      await import('../shared/storage').then(m => m.saveSession(s))
      setSession(s)
      await loadNotifications(s)
      chrome.runtime.sendMessage({ type: 'AUTH_CHANGED', payload: { isLoggedIn: true } })
    } catch (err: any) {
      setLoginError(err.message || 'Credenciales incorrectas')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    await clearSession()
    await setNotificationCount(0)
    setSession(null)
    setNotifications([])
    chrome.runtime.sendMessage({ type: 'AUTH_CHANGED', payload: { isLoggedIn: false } })
  }

  async function handleNotifClick(n: KreoonNotification) {
    await markNotificationRead(session!.access_token, n.id)
    setNotifications(prev => prev.filter(x => x.id !== n.id))
    setNotifCount(prev => Math.max(0, prev - 1))
    await setNotificationCount(Math.max(0, notifCount - 1))
    if (n.link) chrome.tabs.create({ url: n.link })
  }

  async function openSidePanel() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id })
      window.close()
    }
  }

  if (loading) {
    return (
      <div className="w-80 bg-[#0a0a0a] flex items-center justify-center h-24">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="w-80 bg-[#0a0a0a] text-white p-5">
        <div className="flex items-center gap-2 mb-5">
          <KreoonLogo />
          <span className="font-semibold text-sm">Kreoon Capture</span>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
            />
          </div>
          {loginError && (
            <p className="text-red-400 text-xs">{loginError}</p>
          )}
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            {loggingIn ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-80 bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <KreoonLogo />
          <div>
            <p className="text-xs font-semibold">{session.organizationName || 'Kreoon'}</p>
            <p className="text-[10px] text-gray-500">{session.user.email}</p>
          </div>
        </div>
        <button
          onClick={openSidePanel}
          className="text-[10px] text-green-500 hover:text-green-400"
        >
          Abrir panel →
        </button>
      </div>

      {/* Quick stats */}
      <div className="px-4 py-3 border-b border-[#1f1f1f]">
        <div className="flex gap-2">
          <button
            onClick={openSidePanel}
            className="flex-1 bg-green-500 hover:bg-green-400 text-black text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            Capturar video
          </button>
          <a
            href="https://kreoon.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#111] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-white text-xs font-semibold py-2 rounded-lg transition-colors text-center"
          >
            Dashboard
          </a>
        </div>
      </div>

      {/* Notifications */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400">Notificaciones</span>
          {notifCount > 0 && (
            <span className="bg-green-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {notifCount}
            </span>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="text-xs text-gray-600 py-2">Sin notificaciones pendientes</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className="w-full text-left bg-[#111] hover:bg-[#161616] border border-[#1f1f1f] rounded-lg p-2 transition-colors"
              >
                <p className="text-xs font-medium text-white truncate">{n.title}</p>
                {n.body && <p className="text-[10px] text-gray-500 truncate mt-0.5">{n.body}</p>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#1f1f1f]">
        <button
          onClick={handleLogout}
          className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function KreoonLogo() {
  return (
    <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
      <span className="text-black font-bold text-[10px]">K</span>
    </div>
  )
}
