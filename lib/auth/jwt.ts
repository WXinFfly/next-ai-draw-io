import { createHmac, timingSafeEqual } from "crypto"

type JwtPayload = Record<string, unknown>

const jwtHeader = {
    alg: "HS256",
    typ: "JWT",
} as const

function base64UrlEncode(input: string | Buffer): string {
    return Buffer.from(input).toString("base64url")
}

function base64UrlDecode(input: string): string {
    return Buffer.from(input, "base64url").toString("utf8")
}

function sign(input: string, secret: string): string {
    return createHmac("sha256", secret).update(input).digest("base64url")
}

export function signJwt(payload: JwtPayload, secret: string): string {
    const headerSegment = base64UrlEncode(JSON.stringify(jwtHeader))
    const payloadSegment = base64UrlEncode(JSON.stringify(payload))
    const signature = sign(`${headerSegment}.${payloadSegment}`, secret)
    return `${headerSegment}.${payloadSegment}.${signature}`
}

export function verifyJwt<TPayload extends JwtPayload>(
    token: string,
    secret: string,
): TPayload | null {
    const [headerSegment, payloadSegment, signature] = token.split(".")
    if (!headerSegment || !payloadSegment || !signature) {
        return null
    }
    const expectedSignature = sign(`${headerSegment}.${payloadSegment}`, secret)
    const provided = Buffer.from(signature)
    const expected = Buffer.from(expectedSignature)
    if (provided.length !== expected.length) {
        return null
    }
    if (!timingSafeEqual(provided, expected)) {
        return null
    }
    const payloadJson = base64UrlDecode(payloadSegment)
    try {
        return JSON.parse(payloadJson) as TPayload
    } catch {
        return null
    }
}
