"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useDictionary } from "@/hooks/use-dictionary"
import { getApiEndpoint } from "@/lib/base-path"

interface DiagramRecord {
    id: string
    name: string
    xml: string
    createdAt: string
}

interface DiagramLibraryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DiagramLibraryDialog({
    open,
    onOpenChange,
}: DiagramLibraryDialogProps) {
    const dict = useDictionary()
    const [diagrams, setDiagrams] = useState<DiagramRecord[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const fetchDiagrams = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await fetch(getApiEndpoint("/api/diagrams"))
            if (!response.ok) {
                throw new Error("Failed to fetch diagrams")
            }
            const data = (await response.json()) as DiagramRecord[]
            setDiagrams(data)
        } catch (error) {
            console.error(error)
            toast.error(dict.library.loadFailed)
        } finally {
            setIsLoading(false)
        }
    }, [dict.library.loadFailed])

    useEffect(() => {
        if (open) {
            fetchDiagrams()
        }
    }, [open, fetchDiagrams])

    const handleExport = (diagram: DiagramRecord) => {
        try {
            const blob = new Blob([diagram.xml], {
                type: "application/xml",
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${diagram.name || "diagram"}.drawio`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(url), 100)
        } catch (error) {
            console.error(error)
            toast.error(dict.library.exportFailed)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{dict.library.title}</DialogTitle>
                    <DialogDescription>
                        {dict.library.description}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="text-sm text-muted-foreground">
                        {dict.common.loading}
                    </div>
                ) : diagrams.length === 0 ? (
                    <div className="text-center p-4 text-muted-foreground">
                        {dict.library.empty}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {diagrams.map((diagram) => (
                            <div
                                key={diagram.id}
                                className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <div className="font-medium text-sm">
                                        {diagram.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {dict.library.importedAt}{" "}
                                        {new Date(
                                            diagram.createdAt,
                                        ).toLocaleString()}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleExport(diagram)}
                                >
                                    {dict.library.export}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={fetchDiagrams}>
                        {dict.library.refresh}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {dict.common.close}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
