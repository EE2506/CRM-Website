import { Sidebar } from "@/components/Sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    )
}
