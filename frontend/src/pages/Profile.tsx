import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    ArrowLeft,
    Shield,
    Clock,
    ShoppingCart,
    DollarSign,
    Pencil,
    CheckCircle2,
    Package,
    Ticket,
    TrendingUp,
} from "lucide-react"

export default function Profile() {
    const navigate = useNavigate()
    const { user } = useAuthStore()

    const initials = `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`

    const stats = [
        { label: "Transactions Processed", value: "1,248", icon: ShoppingCart, color: "text-primary" },
        { label: "Total Revenue Handled", value: "₱2.4M", icon: DollarSign, color: "text-green-500" },
        { label: "Shift Hours This Month", value: "142 hrs", icon: Clock, color: "text-amber-500" },
    ]

    const profileFields = [
        { label: "Full Name", value: `${user?.first_name || ""} ${user?.last_name || ""}` },
        { label: "Email", value: user?.email || "—" },
        { label: "Phone", value: (user as any)?.phone || "+63 917 123 4567" },
        { label: "Position", value: user?.role || "Staff" },
        { label: "Department", value: "Operations" },
        { label: "Employee ID", value: `EMP-${String(user?.id || 1).padStart(4, "0")}` },
        { label: "Date Joined", value: "January 2024" },
        { label: "Last Login", value: "Today" },
    ]

    const activityLog = [
        { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", text: "Processed transaction #TXN-0091", time: "2 mins ago" },
        { icon: Package, color: "text-blue-500", bg: "bg-blue-500/10", text: "Updated inventory: Oat Milk", time: "1 hour ago" },
        { icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", text: "Created lead: TechStartup PH", time: "Yesterday" },
        { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", text: "Processed transaction #TXN-0085", time: "Yesterday" },
        { icon: Ticket, color: "text-red-500", bg: "bg-red-500/10", text: "Closed ticket #TKT-0023", time: "2 days ago" },
    ]

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            {/* Back Button */}
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>

            {/* Profile Header */}
            <Card className="border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary/25">
                        {initials}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl font-bold">{user?.first_name} {user?.last_name}</h1>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 mt-2">
                            {user?.role || "Staff"}
                        </span>
                        <p className="text-muted-foreground text-sm mt-2">Member since January 2024 · SME POS</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                            <Pencil className="w-3 h-3" /> Edit Profile
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.label} className="border-none shadow-xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 p-5">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Personal Information */}
            <Card className="border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 p-6">
                <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profileFields.map((field) => (
                        <div key={field.label} className="group flex items-center justify-between border-b border-white/5 pb-3">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{field.label}</p>
                                <p className="text-sm font-medium mt-1">{field.value}</p>
                            </div>
                            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                        </div>
                    ))}
                </div>
            </Card>

            {/* Account Security */}
            <Card className="border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" /> Account Security
                </h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                        <div>
                            <p className="text-sm font-medium">Password</p>
                            <p className="text-xs text-muted-foreground">••••••••••</p>
                        </div>
                        <Button variant="outline" size="sm">Change Password</Button>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                        <div>
                            <p className="text-sm font-medium">Two-Factor Authentication</p>
                            <p className="text-xs text-muted-foreground">Extra layer of security for your account</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-5 bg-green-500 rounded-full relative">
                                <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-all" />
                            </div>
                            <span className="text-xs text-green-500 font-medium">ON</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="text-sm font-medium">Active Sessions</p>
                            <p className="text-xs text-muted-foreground">2 active devices</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-primary">Manage</Button>
                    </div>
                </div>
            </Card>

            {/* Recent Activity */}
            <Card className="border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                <div className="space-y-3">
                    {activityLog.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 py-2">
                            <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                                <item.icon className={`w-4 h-4 ${item.color}`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{item.text}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">{item.time}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
}
