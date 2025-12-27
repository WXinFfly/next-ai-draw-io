import { NextResponse } from "next/server"

interface DiagramRecord {
    id: string
    name: string
    xml: string
    createdAt: string
}

const diagrams = new Map<string, DiagramRecord>()

export async function GET() {
    return NextResponse.json(Array.from(diagrams.values()))
}

export async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as {
        name?: string
        xml?: string
    } | null

    if (!body?.name || !body?.xml) {
        return NextResponse.json(
            { error: "Missing diagram name or XML" },
            { status: 400 },
        )
    }

    const id = crypto.randomUUID()
    const record: DiagramRecord = {
        id,
        name: body.name,
        xml: body.xml,
        createdAt: new Date().toISOString(),
    }

    diagrams.set(id, record)

    return NextResponse.json(record, { status: 201 })
}
