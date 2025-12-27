import "server-only"

import { signJwt, verifyJwt } from "./jwt"

export const SESSION_COOKIE_NAME = "session"
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

type SessionPayload = {
    sub: string
    iat: number
    exp: number
}

export type Session = {
    userId: string
    issuedAt: number
    expiresAt: number
}

type SessionTokenOptions = {
    ttlSeconds?: number
}

function getAuthSecret(): string {
    const secret = process.env.AUTH_SECRET
    if (!secret) {
        throw new Error("AUTH_SECRET is not set")
    }
    return secret
}

function parseCookieHeader(header: string): Record<string, string> {
    return header
        .split(";")
        .map((cookie) => cookie.trim())
        .filter(Boolean)
        .reduce<Record<string, string>>((acc, cookie) => {
            const [name, ...rest] = cookie.split("=")
            if (!name) {
                return acc
            }
            acc[name] = decodeURIComponent(rest.join("="))
            return acc
        }, {})
}

export function createSessionToken(
    userId: string,
    options: SessionTokenOptions = {},
): string {
    const ttlSeconds = options.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS
    const issuedAt = Math.floor(Date.now() / 1000)
    const expiresAt = issuedAt + ttlSeconds
    const payload: SessionPayload = {
        sub: userId,
        iat: issuedAt,
        exp: expiresAt,
    }
    return signJwt(payload, getAuthSecret())
}

export function verifySessionToken(token: string): Session | null {
    const payload = verifyJwt<SessionPayload>(token, getAuthSecret())
    if (!payload || typeof payload.sub !== "string") {
        return null
    }
    const now = Math.floor(Date.now() / 1000)
    if (typeof payload.exp !== "number" || payload.exp <= now) {
        return null
    }
    return {
        userId: payload.sub,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
    }
}

export function refreshSessionToken(
    token: string,
    options: SessionTokenOptions = {},
): string | null {
    const session = verifySessionToken(token)
    if (!session) {
        return null
    }
    return createSessionToken(session.userId, options)
}

export function getSessionTokenFromRequest(request: Request): string | null {
    const cookieHeader = request.headers.get("cookie")
    if (!cookieHeader) {
        return null
    }
    const cookies = parseCookieHeader(cookieHeader)
    return cookies[SESSION_COOKIE_NAME] ?? null
}
