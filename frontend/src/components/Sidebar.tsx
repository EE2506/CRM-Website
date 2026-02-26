import { useNavigate, useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    Users,
    Briefcase,
    Ticket,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ShoppingBag,
    Shield
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function Sidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const { logout, user } = useAuthStore()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const menuItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/" },
        { icon: Users, label: "Contacts", path: "/contacts" },
        { icon: Briefcase, label: "Deals", path: "/deals" },
        { icon: Ticket, label: "Tickets", path: "/tickets" },
        { icon: ShoppingBag, label: "Inventory", path: "/inventory" },
        { icon: Shield, label: "Team", path: "/team" },
    ]

    const handleLogout = () => {
        logout()
        navigate("/login")
    }

    return (
        <aside className={cn(
            "h-screen sticky top-0 border-r bg-card/30 backdrop-blur-xl transition-all duration-300 flex flex-col",
            isCollapsed ? "w-20" : "w-64"
        )}>
            {/* Logo Section */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground font-bold">S</span>
                </div>
                {!isCollapsed && <span className="font-bold text-lg tracking-tight truncate">SME POS</span>}
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 px-3 space-y-1">
                {menuItems.map((item) => (
                    <Button
                        key={item.path}
                        variant={location.pathname === item.path ? "secondary" : "ghost"}
                        className={cn(
                            "w-full justify-start gap-4 h-12 transition-all",
                            isCollapsed ? "px-2 justify-center" : "px-4"
                        )}
                        onClick={() => navigate(item.path)}
                    >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                    </Button>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t space-y-4">
                <div className={cn(
                    "flex items-center gap-3",
                    isCollapsed ? "justify-center" : "px-2"
                )}>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{user?.first_name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{user?.role}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("w-full justify-start gap-4 h-10 text-muted-foreground", isCollapsed && "justify-center px-0")}
                        onClick={() => navigate("/settings")}
                    >
                        <Settings className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span className="text-sm">Settings</span>}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("w-full justify-start gap-4 h-10 text-destructive hover:text-destructive hover:bg-destructive/10", isCollapsed && "justify-center px-0")}
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span className="text-sm">Logout</span>}
                    </Button>
                </div>
            </div>

            {/* Toggle button */}
            <Button
                variant="outline"
                size="icon"
                className="absolute -right-3 top-20 w-6 h-6 rounded-full shadow-md z-50 bg-background"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </Button>
        </aside>
    )
}
