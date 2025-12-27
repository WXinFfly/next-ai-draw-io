import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/get-current-user"
import { SESSION_COOKIE_NAME } from "@/lib/auth/session"

export async function GET() {
    const user = await getCurrentUser()
    return NextResponse.json({ user })
}

export async function DELETE() {
    const cookieStore = cookies()
    cookieStore.set(SESSION_COOKIE_NAME, "", {
        expires: new Date(0),
        path: "/",
    })
    return NextResponse.json({ success: true })
}
