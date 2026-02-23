import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Users, Ticket, ArrowUpRight, LogOut } from "lucide-react"

export default function Dashboard() {
    const navigate = useNavigate()
    const { user, logout } = useAuthStore()

    const handleLogout = () => {
        logout()
        navigate("/login")
    }

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Top Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold">S</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight">SME POS</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 mr-4 text-sm text-muted-foreground border-r pr-4">
                            <span className="font-medium text-foreground">{user?.first_name} {user?.last_name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] uppercase font-bold tracking-tight">
                                {user?.role}
                            </span>
                        </div>
                        <ThemeToggle />
                        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                            <LogOut className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button size="sm">New Transaction</Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground">Overview of your business performance.</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                        Download Report <ArrowUpRight className="w-4 h-4" />
                    </Button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground uppercase text-xs font-bold tracking-widest">
                            <CardTitle className="text-xs font-bold">Total Revenue</CardTitle>
                            <DollarSign className="w-4 h-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱124,500.00</div>
                            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                                +12% <span className="text-muted-foreground opacity-50">from last month</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground uppercase text-xs font-bold tracking-widest">
                            <CardTitle className="text-xs font-bold">Active leads</CardTitle>
                            <Users className="w-4 h-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">48</div>
                            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                                +8 <span className="text-muted-foreground opacity-50">this week</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground uppercase text-xs font-bold tracking-widest">
                            <CardTitle className="text-xs font-bold">Open Tickets</CardTitle>
                            <Ticket className="w-4 h-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">14</div>
                            <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                                4 high priority <span className="text-muted-foreground opacity-50">needs action</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground uppercase text-xs font-bold tracking-widest">
                            <CardTitle className="text-xs font-bold">Conversion Rate</CardTitle>
                            <ArrowUpRight className="w-4 h-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">3.2%</div>
                            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                                +0.4% <span className="text-muted-foreground opacity-50">since yesterday</span>
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Layout Placeholder for Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                    <Card className="lg:col-span-4 min-h-[400px] border-none shadow-xl bg-card/50 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Sales Over Time</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                            [ Revenue Chart Placeholder ]
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-3 min-h-[400px] border-none shadow-xl bg-card/50 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="text-muted-foreground">
                            [ Activity Feed Placeholder ]
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
