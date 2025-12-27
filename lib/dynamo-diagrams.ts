import {
    DeleteItemCommand,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    UpdateItemCommand,
} from "@aws-sdk/client-dynamodb"

const DIAGRAMS_TABLE = process.env.DYNAMODB_DIAGRAMS_TABLE
const DYNAMODB_REGION = process.env.DYNAMODB_REGION || "ap-northeast-1"

const client = DIAGRAMS_TABLE
    ? new DynamoDBClient({ region: DYNAMODB_REGION })
    : null

export interface DiagramRecord {
    id: string
    userId: string
    title: string
    xml: string
    svg?: string | null
    createdAt: string
    updatedAt: string
    metadata?: Record<string, unknown> | null
}

export interface DiagramSummary {
    id: string
    title: string
    createdAt: string
    updatedAt: string
    metadata?: Record<string, unknown> | null
}

function diagramKey(userId: string, id: string) {
    return {
        PK: { S: `USER#${userId}` },
        SK: { S: `DIAGRAM#${id}` },
    }
}

function parseMetadata(value?: { S?: string }) {
    if (!value?.S) return null
    try {
        return JSON.parse(value.S) as Record<string, unknown>
    } catch (error) {
        console.warn("Failed to parse diagram metadata:", error)
        return null
    }
}

function fromItem(item?: Record<string, { S?: string }>): DiagramRecord | null {
    if (
        !item?.id?.S ||
        !item?.userId?.S ||
        !item?.title?.S ||
        !item?.xml?.S ||
        !item?.createdAt?.S ||
        !item?.updatedAt?.S
    ) {
        return null
    }

    return {
        id: item.id.S,
        userId: item.userId.S,
        title: item.title.S,
        xml: item.xml.S,
        svg: item.svg?.S ?? null,
        createdAt: item.createdAt.S,
        updatedAt: item.updatedAt.S,
        metadata: parseMetadata(item.metadata) ?? null,
    }
}

function toSummary(
    item?: Record<string, { S?: string }>,
): DiagramSummary | null {
    if (!item?.id?.S || !item?.title?.S || !item?.createdAt?.S) {
        return null
    }

    return {
        id: item.id.S,
        title: item.title.S,
        createdAt: item.createdAt.S,
        updatedAt: item.updatedAt?.S ?? item.createdAt.S,
        metadata: parseMetadata(item.metadata) ?? null,
    }
}

export function isDiagramsDbEnabled(): boolean {
    return !!DIAGRAMS_TABLE
}

export async function createDiagram(input: {
    id: string
    userId: string
    title: string
    xml: string
    svg?: string | null
    metadata?: Record<string, unknown> | null
}): Promise<DiagramRecord | null> {
    if (!client || !DIAGRAMS_TABLE) return null

    const createdAt = new Date().toISOString()
    const updatedAt = createdAt

    await client.send(
        new PutItemCommand({
            TableName: DIAGRAMS_TABLE,
            Item: {
                ...diagramKey(input.userId, input.id),
                id: { S: input.id },
                userId: { S: input.userId },
                title: { S: input.title },
                xml: { S: input.xml },
                svg: input.svg ? { S: input.svg } : undefined,
                metadata: input.metadata
                    ? { S: JSON.stringify(input.metadata) }
                    : undefined,
                createdAt: { S: createdAt },
                updatedAt: { S: updatedAt },
            },
            ConditionExpression: "attribute_not_exists(PK)",
        }),
    )

    return {
        id: input.id,
        userId: input.userId,
        title: input.title,
        xml: input.xml,
        svg: input.svg ?? null,
        createdAt,
        updatedAt,
        metadata: input.metadata ?? null,
    }
}

export async function listDiagrams(userId: string): Promise<DiagramSummary[]> {
    if (!client || !DIAGRAMS_TABLE) return []

    const response = await client.send(
        new QueryCommand({
            TableName: DIAGRAMS_TABLE,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: {
                ":pk": { S: `USER#${userId}` },
            },
        }),
    )

    return (response.Items || [])
        .map((item) => toSummary(item))
        .filter((item): item is DiagramSummary => item !== null)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getDiagram(
    userId: string,
    id: string,
): Promise<DiagramRecord | null> {
    if (!client || !DIAGRAMS_TABLE) return null

    const response = await client.send(
        new GetItemCommand({
            TableName: DIAGRAMS_TABLE,
            Key: diagramKey(userId, id),
        }),
    )

    return fromItem(response.Item)
}

export async function updateDiagram(input: {
    userId: string
    id: string
    title?: string
    xml?: string
    svg?: string | null
    metadata?: Record<string, unknown> | null
}): Promise<DiagramRecord | null> {
    if (!client || !DIAGRAMS_TABLE) return null

    const setExpressions: string[] = []
    const removeExpressions: string[] = []
    const attributeValues: Record<string, { S: string }> = {}
    const attributeNames: Record<string, string> = {}

    if (input.title !== undefined) {
        attributeNames["#title"] = "title"
        setExpressions.push("#title = :title")
        attributeValues[":title"] = { S: input.title }
    }

    if (input.xml !== undefined) {
        attributeNames["#xml"] = "xml"
        setExpressions.push("#xml = :xml")
        attributeValues[":xml"] = { S: input.xml }
    }

    if (input.svg !== undefined) {
        attributeNames["#svg"] = "svg"
        if (input.svg === null) {
            removeExpressions.push("#svg")
        } else {
            setExpressions.push("#svg = :svg")
            attributeValues[":svg"] = { S: input.svg }
        }
    }

    if (input.metadata !== undefined) {
        attributeNames["#metadata"] = "metadata"
        if (input.metadata === null) {
            removeExpressions.push("#metadata")
        } else {
            setExpressions.push("#metadata = :metadata")
            attributeValues[":metadata"] = {
                S: JSON.stringify(input.metadata),
            }
        }
    }

    attributeNames["#updatedAt"] = "updatedAt"
    setExpressions.push("#updatedAt = :updatedAt")
    attributeValues[":updatedAt"] = { S: new Date().toISOString() }

    const expressions: string[] = []
    if (setExpressions.length > 0) {
        expressions.push(`SET ${setExpressions.join(", ")}`)
    }
    if (removeExpressions.length > 0) {
        expressions.push(`REMOVE ${removeExpressions.join(", ")}`)
    }

    const response = await client.send(
        new UpdateItemCommand({
            TableName: DIAGRAMS_TABLE,
            Key: diagramKey(input.userId, input.id),
            UpdateExpression: expressions.join(" "),
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues,
            ReturnValues: "ALL_NEW",
        }),
    )

    return fromItem(response.Attributes)
}

export async function deleteDiagram(userId: string, id: string): Promise<void> {
    if (!client || !DIAGRAMS_TABLE) return

    await client.send(
        new DeleteItemCommand({
            TableName: DIAGRAMS_TABLE,
            Key: diagramKey(userId, id),
        }),
    )
}
