"use client"

import { LogIn, LogOut, UserRound } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useSession } from "@/contexts/session-context"
import { useDictionary } from "@/hooks/use-dictionary"
import { getApiEndpoint, getBasePath } from "@/lib/base-path"
import { i18n, type Locale } from "@/lib/i18n/config"

function getLocaleFromPath(pathname: string): Locale {
    const basePath = getBasePath()
    const normalized =
        basePath && pathname.startsWith(basePath)
            ? pathname.slice(basePath.length)
            : pathname
    const [segment] = normalized.split("/").filter(Boolean)
    if (segment && i18n.locales.includes(segment as Locale)) {
        return segment as Locale
    }
    return i18n.defaultLocale
}

export function UserMenu() {
    const { user, status, refresh } = useSession()
    const dict = useDictionary()
    const pathname = usePathname()
    const locale = getLocaleFromPath(pathname)
    const basePath = getBasePath()
    const loginHref = `${basePath}/${locale}/login`

    const handleSignOut = async () => {
        await fetch(getApiEndpoint("/api/session"), {
            method: "DELETE",
        })
        await refresh()
    }

    const isLoading = status === "loading"
    const isAuthenticated = status === "authenticated"

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-accent">
                    <UserRound className="h-5 w-5 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
                <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground">
                        {dict.nav.userMenu}
                    </div>
                    <div className="text-sm">
                        {isLoading
                            ? dict.common.loading
                            : isAuthenticated
                              ? `${dict.nav.signedInAs} ${user?.id ?? "-"}`
                              : dict.nav.guest}
                    </div>
                    <div className="pt-1">
                        {isAuthenticated ? (
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={handleSignOut}
                            >
                                <LogOut className="h-4 w-4" />
                                {dict.nav.signOut}
                            </Button>
                        ) : (
                            <Button
                                asChild
                                variant="outline"
                                className="w-full justify-start"
                            >
                                <Link href={loginHref}>
                                    <LogIn className="h-4 w-4" />
                                    {dict.nav.signIn}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
