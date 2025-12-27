import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUserId } from "@/lib/auth/get-current-user"
import { EMPTY_DIAGRAM_XML } from "@/lib/diagram-templates"
import {
    createDiagram,
    isDiagramsDbEnabled,
    listDiagrams,
} from "@/lib/dynamo-diagrams"

const createSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    xml: z.string().optional(),
    svg: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    userId: z.string().optional(),
})

export async function GET(request: Request) {
    if (!isDiagramsDbEnabled()) {
        return NextResponse.json(
            { error: "Diagrams storage is not configured." },
            { status: 503 },
        )
    }

    const userId = await getCurrentUserId(request)
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get("userId")
    if (requestedUserId && requestedUserId !== userId) {
        return NextResponse.json(
            { error: "User ID mismatch." },
            { status: 403 },
        )
    }

    const diagrams = await listDiagrams(userId)
    return NextResponse.json({ diagrams })
}

export async function POST(request: Request) {
    if (!isDiagramsDbEnabled()) {
        return NextResponse.json(
            { error: "Diagrams storage is not configured." },
            { status: 503 },
        )
    }

    const userId = await getCurrentUserId(request)
    let data: z.infer<typeof createSchema>

    try {
        data = createSchema.parse(await request.json())
    } catch (error) {
        return NextResponse.json(
            { error: "Invalid request payload." },
            { status: 400 },
        )
    }

    if (data.userId && data.userId !== userId) {
        return NextResponse.json(
            { error: "User ID mismatch." },
            { status: 403 },
        )
    }

    const diagram = await createDiagram({
        id: crypto.randomUUID(),
        userId,
        title: data.title?.trim() || "Untitled diagram",
        xml: data.xml || EMPTY_DIAGRAM_XML,
        svg: data.svg,
        metadata: data.metadata,
    })

    if (!diagram) {
        return NextResponse.json(
            { error: "Failed to create diagram." },
            { status: 500 },
        )
    }

    return NextResponse.json({ diagram }, { status: 201 })
}
