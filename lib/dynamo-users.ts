import {
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    UpdateItemCommand,
} from "@aws-sdk/client-dynamodb"

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE
const DYNAMODB_REGION = process.env.DYNAMODB_REGION || "ap-northeast-1"

const client = USERS_TABLE
    ? new DynamoDBClient({ region: DYNAMODB_REGION })
    : null

export interface UserRecord {
    id: string
    email: string
    name?: string | null
    avatar?: string | null
    createdAt: string
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
}

function userKey(id: string) {
    return {
        PK: { S: `USER#${id}` },
        SK: { S: "PROFILE" },
    }
}

function fromItem(item?: Record<string, { S?: string }>): UserRecord | null {
    if (!item?.id?.S || !item?.email?.S || !item?.createdAt?.S) {
        return null
    }

    return {
        id: item.id.S,
        email: item.email.S,
        name: item.name?.S ?? null,
        avatar: item.avatar?.S ?? null,
        createdAt: item.createdAt.S,
    }
}

export function isUsersDbEnabled(): boolean {
    return !!USERS_TABLE
}

export async function createUser(input: {
    id: string
    email: string
    name?: string | null
    avatar?: string | null
}): Promise<UserRecord | null> {
    if (!client || !USERS_TABLE) return null

    const normalizedEmail = normalizeEmail(input.email)
    const createdAt = new Date().toISOString()

    await client.send(
        new PutItemCommand({
            TableName: USERS_TABLE,
            Item: {
                ...userKey(input.id),
                GSI1PK: { S: `EMAIL#${normalizedEmail}` },
                GSI1SK: { S: `USER#${input.id}` },
                id: { S: input.id },
                email: { S: normalizedEmail },
                name:
                    input.name !== undefined && input.name !== null
                        ? { S: input.name }
                        : undefined,
                avatar:
                    input.avatar !== undefined && input.avatar !== null
                        ? { S: input.avatar }
                        : undefined,
                createdAt: { S: createdAt },
            },
            ConditionExpression: "attribute_not_exists(PK)",
        }),
    )

    return {
        id: input.id,
        email: normalizedEmail,
        name: input.name ?? null,
        avatar: input.avatar ?? null,
        createdAt,
    }
}

export async function getUserById(id: string): Promise<UserRecord | null> {
    if (!client || !USERS_TABLE) return null

    const response = await client.send(
        new GetItemCommand({
            TableName: USERS_TABLE,
            Key: userKey(id),
        }),
    )

    return fromItem(response.Item)
}

export async function getUserByEmail(
    email: string,
): Promise<UserRecord | null> {
    if (!client || !USERS_TABLE) return null

    const response = await client.send(
        new QueryCommand({
            TableName: USERS_TABLE,
            IndexName: "GSI1",
            KeyConditionExpression: "GSI1PK = :email",
            ExpressionAttributeValues: {
                ":email": { S: `EMAIL#${normalizeEmail(email)}` },
            },
            Limit: 1,
        }),
    )

    return fromItem(response.Items?.[0])
}

export async function updateUserProfile(input: {
    id: string
    name?: string | null
    avatar?: string | null
}): Promise<UserRecord | null> {
    if (!client || !USERS_TABLE) return null

    const setExpressions: string[] = []
    const removeExpressions: string[] = []
    const attributeValues: Record<string, { S: string }> = {}
    const attributeNames: Record<string, string> = {}

    if (input.name !== undefined) {
        attributeNames["#name"] = "name"
        if (input.name === null) {
            removeExpressions.push("#name")
        } else {
            setExpressions.push("#name = :name")
            attributeValues[":name"] = { S: input.name }
        }
    }
    if (input.avatar !== undefined) {
        attributeNames["#avatar"] = "avatar"
        if (input.avatar === null) {
            removeExpressions.push("#avatar")
        } else {
            setExpressions.push("#avatar = :avatar")
            attributeValues[":avatar"] = { S: input.avatar }
        }
    }

    if (setExpressions.length === 0 && removeExpressions.length === 0) {
        return getUserById(input.id)
    }

    const expressions: string[] = []
    if (setExpressions.length > 0) {
        expressions.push(`SET ${setExpressions.join(", ")}`)
    }
    if (removeExpressions.length > 0) {
        expressions.push(`REMOVE ${removeExpressions.join(", ")}`)
    }

    const response = await client.send(
        new UpdateItemCommand({
            TableName: USERS_TABLE,
            Key: userKey(input.id),
            UpdateExpression: expressions.join(" "),
            ExpressionAttributeNames:
                Object.keys(attributeNames).length > 0
                    ? attributeNames
                    : undefined,
            ExpressionAttributeValues:
                Object.keys(attributeValues).length > 0
                    ? attributeValues
                    : undefined,
            ReturnValues: "ALL_NEW",
        }),
    )

    return fromItem(response.Attributes)
}
