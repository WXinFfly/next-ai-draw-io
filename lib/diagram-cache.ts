import { STORAGE_KEYS } from "@/lib/storage"

export type DiagramCache = {
    diagramId?: string
    xml: string
}

export function loadDiagramCache(): DiagramCache | null {
    if (typeof window === "undefined") return null

    const raw = localStorage.getItem(STORAGE_KEYS.diagramXml)
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw) as DiagramCache
        if (!parsed?.xml) {
            return null
        }
        return parsed
    } catch (error) {
        if (raw.trim().startsWith("<mxfile")) {
            return { xml: raw }
        }
        console.warn("Failed to parse cached diagram XML:", error)
        return null
    }
}

export function saveDiagramCache(diagramId: string, xml: string) {
    if (typeof window === "undefined") return
    if (!diagramId || !xml) return

    localStorage.setItem(
        STORAGE_KEYS.diagramXml,
        JSON.stringify({ diagramId, xml }),
    )
}

export function clearDiagramCache() {
    if (typeof window === "undefined") return
    localStorage.removeItem(STORAGE_KEYS.diagramXml)
}
