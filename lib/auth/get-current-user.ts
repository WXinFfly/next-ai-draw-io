import "server-only"

import { cookies } from "next/headers"
import { getUserIdFromRequest } from "../user-id"
import {
    getSessionTokenFromRequest,
    SESSION_COOKIE_NAME,
    verifySessionToken,
} from "./session"

export type CurrentUser = {
    id: string
}

export async function getCurrentUser(
    request?: Request,
): Promise<CurrentUser | null> {
    const token = request
        ? getSessionTokenFromRequest(request)
        : (await cookies()).get(SESSION_COOKIE_NAME)?.value
    if (!token) {
        return null
    }
    const session = verifySessionToken(token)
    if (!session) {
        return null
    }
    return {
        id: session.userId,
    }
}

export async function getCurrentUserId(request: Request): Promise<string> {
    const currentUser = await getCurrentUser(request)
    return currentUser?.id ?? getUserIdFromRequest(request)
}
