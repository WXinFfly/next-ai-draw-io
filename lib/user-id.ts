import { getSessionTokenFromRequest, verifySessionToken } from "./auth/session"

/**
 * Resolve a userId from the authenticated session cookie.
 * Falls back to "anonymous" when no valid session exists.
 */
export function getUserIdFromRequest(req: Request): string {
    const token = getSessionTokenFromRequest(req)
    if (!token) {
        return "anonymous"
    }
    const session = verifySessionToken(token)
    return session?.userId ?? "anonymous"
}
