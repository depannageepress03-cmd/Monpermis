import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiBase } from '../api/config'

type NetInfoState = {
  isConnected: boolean
  isInternetReachable: boolean | null
}

type NetInfoListener = (state: NetInfoState) => void

const listeners = new Set<NetInfoListener>()
let currentState: NetInfoState = { isConnected: true, isInternetReachable: true }
let pollingTimer: ReturnType<typeof setInterval> | null = null
let initialized = false

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener(currentState)
    } catch {
      /* ignore */
    }
  }
}

async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const response = await fetch(`${getApiBase().replace(/\/api$/, '')}/api/health`, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    return response.ok
  } catch {
    return false
  }
}

function startPolling() {
  if (pollingTimer) return
  pollingTimer = setInterval(async () => {
    const reachable = await checkConnectivity()
    const next: NetInfoState = { isConnected: reachable, isInternetReachable: reachable }
    if (
      next.isConnected !== currentState.isConnected ||
      next.isInternetReachable !== currentState.isInternetReachable
    ) {
      currentState = next
      notifyListeners()
    }
  }, 10000)
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

async function initializeNetInfo() {
  if (initialized) return
  initialized = true
  const reachable = await checkConnectivity()
  currentState = { isConnected: reachable, isInternetReachable: reachable }
  notifyListeners()
  startPolling()
}

/**
 * Hook léger de détection réseau — aucun dépendance externe.
 * Pinge l'API toutes les 10 s et notifie les abonnés.
 */
export function useNetInfo(): NetInfoState {
  const [state, setState] = useState<NetInfoState>(currentState)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    void initializeNetInfo()

    const listener: NetInfoListener = (next) => {
      setState(next)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return state
}

/** Force un re-check immédiat (utile après un retour en ligne). */
export async function refreshNetInfo(): Promise<NetInfoState> {
  const reachable = await checkConnectivity()
  const next: NetInfoState = { isConnected: reachable, isInternetReachable: reachable }
  currentState = next
  notifyListeners()
  return next
}

/** État global en lecture seule (sans hook React). */
export function getNetInfoSnapshot(): NetInfoState {
  return currentState
}

/**
 * Attend que le réseau soit disponible (max `timeoutMs`).
 * Résout immédiatement si déjà connecté.
 */
export function waitForOnline(timeoutMs = 15000): Promise<boolean> {
  if (currentState.isConnected) return Promise.resolve(true)
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup()
      resolve(currentState.isConnected)
    }, timeoutMs)

    const listener: NetInfoListener = (next) => {
      if (next.isConnected) {
        cleanup()
        resolve(true)
      }
    }

    function cleanup() {
      clearTimeout(timer)
      listeners.delete(listener)
    }

    listeners.add(listener)
  })
}
