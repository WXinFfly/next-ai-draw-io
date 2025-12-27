import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUserId } from "@/lib/auth/get-current-user"
import {
    deleteDiagram,
    getDiagram,
    isDiagramsDbEnabled,
    updateDiagram,
} from "@/lib/dynamo-diagrams"

const updateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    xml: z.string().optional(),
    svg: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
    userId: z.string().optional(),
})

export async function GET(
    request: Request,
    { params }: { params: { id: string } },
) {
    if (!isDiagramsDbEnabled()) {
        return NextResponse.json(
            { error: "Diagrams storage is not configured." },
            { status: 503 },
        )
    }

    const userId = await getCurrentUserId(request)
    const diagram = await getDiagram(userId, params.id)

    if (!diagram) {
        return NextResponse.json(
            { error: "Diagram not found." },
            { status: 404 },
        )
    }

    return NextResponse.json({ diagram })
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } },
) {
    if (!isDiagramsDbEnabled()) {
        return NextResponse.json(
            { error: "Diagrams storage is not configured." },
            { status: 503 },
        )
    }

    const userId = await getCurrentUserId(request)
    let data: z.infer<typeof updateSchema>

    try {
        data = updateSchema.parse(await request.json())
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

    const diagram = await updateDiagram({
        userId,
        id: params.id,
        title: data.title,
        xml: data.xml,
        svg: data.svg,
        metadata: data.metadata,
    })

    if (!diagram) {
        return NextResponse.json(
            { error: "Diagram not found." },
            { status: 404 },
        )
    }

    return NextResponse.json({ diagram })
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } },
) {
    if (!isDiagramsDbEnabled()) {
        return NextResponse.json(
            { error: "Diagrams storage is not configured." },
            { status: 503 },
        )
    }

    const userId = await getCurrentUserId(request)
    await deleteDiagram(userId, params.id)
    return NextResponse.json({ success: true })
}
