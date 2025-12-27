"use client"

import type React from "react"
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react"
import { getApiEndpoint } from "@/lib/base-path"

type SessionUser = {
    id: string
}

type SessionResponse = {
    user: SessionUser | null
}

type SessionStatus = "loading" | "authenticated" | "unauthenticated"

type SessionContextValue = {
    user: SessionUser | null
    status: SessionStatus
    refresh: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null)
    const [status, setStatus] = useState<SessionStatus>("loading")

    const refresh = useCallback(async () => {
        try {
            setStatus("loading")
            const response = await fetch(getApiEndpoint("/api/session"), {
                cache: "no-store",
            })
            if (!response.ok) {
                setUser(null)
                setStatus("unauthenticated")
                return
            }
            const data = (await response.json()) as SessionResponse
            if (data.user) {
                setUser(data.user)
                setStatus("authenticated")
            } else {
                setUser(null)
                setStatus("unauthenticated")
            }
        } catch {
            setUser(null)
            setStatus("unauthenticated")
        }
    }, [])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return (
        <SessionContext.Provider value={{ user, status, refresh }}>
            {children}
        </SessionContext.Provider>
    )
}

export function useSession() {
    const context = useContext(SessionContext)
    if (!context) {
        throw new Error("useSession must be used within a SessionProvider")
    }
    return context
}
