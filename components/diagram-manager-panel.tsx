"use client"

import { Check, FilePlus, FolderOpen, Pencil, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDiagram } from "@/contexts/diagram-context"
import { useDictionary } from "@/hooks/use-dictionary"
import { getApiEndpoint } from "@/lib/base-path"
import { EMPTY_DIAGRAM_XML } from "@/lib/diagram-templates"

interface DiagramSummary {
    id: string
    title: string
    createdAt: string
    updatedAt: string
}

interface DiagramRecord extends DiagramSummary {
    xml: string
    svg?: string | null
}

export function DiagramManagerPanel() {
    const dict = useDictionary()
    const { diagramId, setActiveDiagram, setDiagramId, clearDiagram } =
        useDiagram()
    const [diagrams, setDiagrams] = useState<DiagramSummary[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingTitle, setEditingTitle] = useState("")

    const loadDiagrams = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetch(getApiEndpoint("/api/diagrams"))
            if (!response.ok) {
                throw new Error("Failed to load diagrams")
            }
            const data = (await response.json()) as {
                diagrams: DiagramSummary[]
            }
            setDiagrams(data.diagrams || [])
        } catch (err) {
            setError(dict.diagrams.failedToLoad)
        } finally {
            setIsLoading(false)
        }
    }, [dict.diagrams.failedToLoad])

    useEffect(() => {
        loadDiagrams()
    }, [loadDiagrams])

    const formattedDate = useMemo(() => {
        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }, [])

    const handleCreate = async () => {
        try {
            const response = await fetch(getApiEndpoint("/api/diagrams"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: dict.diagrams.untitled,
                    xml: EMPTY_DIAGRAM_XML,
                }),
            })
            if (!response.ok) {
                throw new Error("Failed to create diagram")
            }
            const data = (await response.json()) as { diagram: DiagramRecord }
            setDiagrams((prev) => [data.diagram, ...prev])
            setActiveDiagram(data.diagram.id, data.diagram.xml, true)
        } catch (err) {
            setError(dict.diagrams.failedToCreate)
        }
    }

    const handleOpen = async (id: string) => {
        try {
            const response = await fetch(getApiEndpoint(`/api/diagrams/${id}`))
            if (!response.ok) {
                throw new Error("Failed to load diagram")
            }
            const data = (await response.json()) as { diagram: DiagramRecord }
            setActiveDiagram(data.diagram.id, data.diagram.xml, true)
        } catch (err) {
            setError(dict.diagrams.failedToOpen)
        }
    }

    const startRename = (diagram: DiagramSummary) => {
        setEditingId(diagram.id)
        setEditingTitle(diagram.title)
    }

    const cancelRename = () => {
        setEditingId(null)
        setEditingTitle("")
    }

    const confirmRename = async (diagram: DiagramSummary) => {
        const nextTitle = editingTitle.trim()
        if (!nextTitle) {
            setError(dict.diagrams.titleRequired)
            return
        }

        try {
            const response = await fetch(
                getApiEndpoint(`/api/diagrams/${diagram.id}`),
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: nextTitle }),
                },
            )

            if (!response.ok) {
                throw new Error("Failed to rename diagram")
            }

            const data = (await response.json()) as { diagram: DiagramRecord }
            setDiagrams((prev) =>
                prev.map((item) =>
                    item.id === diagram.id
                        ? { ...item, title: data.diagram.title }
                        : item,
                ),
            )
            cancelRename()
        } catch (err) {
            setError(dict.diagrams.failedToRename)
        }
    }

    const handleDelete = async (diagram: DiagramSummary) => {
        const confirmed = window.confirm(dict.diagrams.confirmDelete)
        if (!confirmed) return

        try {
            const response = await fetch(
                getApiEndpoint(`/api/diagrams/${diagram.id}`),
                { method: "DELETE" },
            )
            if (!response.ok) {
                throw new Error("Failed to delete diagram")
            }

            setDiagrams((prev) => prev.filter((item) => item.id !== diagram.id))

            if (diagramId === diagram.id) {
                setDiagramId(null)
                clearDiagram()
            }
        } catch (err) {
            setError(dict.diagrams.failedToDelete)
        }
    }

    return (
        <section className="border-b border-border/40 bg-card/70">
            <div className="flex items-center justify-between px-4 py-3">
                <div>
                    <h2 className="text-sm font-semibold text-foreground">
                        {dict.diagrams.title}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {dict.diagrams.subtitle}
                    </p>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={handleCreate}
                >
                    <FilePlus className="h-4 w-4" />
                    {dict.diagrams.newDiagram}
                </Button>
            </div>

            {error && (
                <div className="px-4 pb-2 text-xs text-destructive">
                    {error}
                </div>
            )}

            <ScrollArea className="h-48 px-2 pb-3">
                <div className="space-y-2 px-2">
                    {isLoading ? (
                        <p className="text-xs text-muted-foreground">
                            {dict.common.loading}
                        </p>
                    ) : diagrams.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            {dict.diagrams.empty}
                        </p>
                    ) : (
                        diagrams.map((diagram) => {
                            const isActive = diagramId === diagram.id
                            return (
                                <div
                                    key={diagram.id}
                                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                                        isActive
                                            ? "border-primary bg-primary/10"
                                            : "border-border/60 bg-background"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        {editingId === diagram.id ? (
                                            <Input
                                                value={editingTitle}
                                                onChange={(event) =>
                                                    setEditingTitle(
                                                        event.target.value,
                                                    )
                                                }
                                                className="h-8 text-sm"
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-foreground">
                                                    {diagram.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formattedDate.format(
                                                        new Date(
                                                            diagram.updatedAt,
                                                        ),
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1">
                                            {editingId === diagram.id ? (
                                                <>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            confirmRename(
                                                                diagram,
                                                            )
                                                        }
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={cancelRename}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            handleOpen(
                                                                diagram.id,
                                                            )
                                                        }
                                                    >
                                                        <FolderOpen className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            startRename(diagram)
                                                        }
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            handleDelete(
                                                                diagram,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </ScrollArea>
        </section>
    )
}
