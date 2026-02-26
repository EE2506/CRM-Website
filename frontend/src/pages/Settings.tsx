import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    ArrowLeft,
    Building2,
    CreditCard,
    Bell,
    Palette,
    Shield,
    LinkIcon,
    Users,
    Package
} from "lucide-react"

const CATEGORIES = [
    { id: "general", label: "General", icon: Building2 },
    { id: "pos", label: "POS & Payments", icon: CreditCard },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "users", label: "Users & Roles", icon: Users },
    { id: "inventory", label: "Inventory Alerts", icon: Package },
    { id: "integrations", label: "Integrations", icon: LinkIcon },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "security", label: "Security", icon: Shield },
]

function Toggle({ enabled, onChange }: { enabled: boolean, onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? "bg-green-500" : "bg-muted"}`}
        >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${enabled ? "right-0.5" : "left-0.5"}`} />
        </button>
    )
}

export default function Settings() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState("general")

    // General settings state
    const [businessName, setBusinessName] = useState("SME POS Store")
    const [businessAddress, setBusinessAddress] = useState("123 Quezon Ave, QC")
    const [currency, setCurrency] = useState("PHP")
    const [timezone, setTimezone] = useState("Asia/Manila")
    const [taxRate, setTaxRate] = useState("12")
    const [receiptFooter, setReceiptFooter] = useState("Thank you for your purchase!")

    // POS settings state
    const [paymentMethods, setPaymentMethods] = useState({
        cash: true, gcash: true, maya: true, card: true, bank: false
    })
    const [autoPrint, setAutoPrint] = useState(true)
    const [managerApproval, setManagerApproval] = useState(true)
    const [cashDrawer, setCashDrawer] = useState(true)

    // Notification settings state
    const [emailNotifs, setEmailNotifs] = useState(true)
    const [smsAlerts, setSmsAlerts] = useState(true)
    const [lowStockThreshold, setLowStockThreshold] = useState("5")
    const [dailySummary, setDailySummary] = useState(true)

    // Appearance settings state
    const [theme, setTheme] = useState("dark")
    const [accentColor, setAccentColor] = useState("indigo")
    const [compactSidebar, setCompactSidebar] = useState(false)
    const [showQuickActions, setShowQuickActions] = useState(true)

    const selectClass = "flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"

    const renderPanel = () => {
        switch (activeTab) {
            case "general":
                return (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold">General Settings</h2>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Business Name</Label>
                                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Business Address</Label>
                                <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Currency</Label>
                                    <select className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                                        <option value="PHP" className="bg-background text-foreground">PHP — Philippine Peso</option>
                                        <option value="USD" className="bg-background text-foreground">USD — US Dollar</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Timezone</Label>
                                    <select className={selectClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                                        <option value="Asia/Manila" className="bg-background text-foreground">Asia/Manila</option>
                                        <option value="UTC" className="bg-background text-foreground">UTC</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Tax Rate (%)</Label>
                                <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Receipt Footer Message</Label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                                    value={receiptFooter}
                                    onChange={(e) => setReceiptFooter(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button className="w-full bg-gradient-to-r from-primary to-violet-600 hover:opacity-90">Save Changes</Button>
                    </div>
                )
            case "pos":
                return (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold">POS & Payment Settings</h2>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">Enable or disable payment methods accepted at your POS.</p>
                            {Object.entries(paymentMethods).map(([key, val]) => (
                                <div key={key} className="flex items-center justify-between py-3 border-b border-white/5">
                                    <span className="text-sm font-medium capitalize">{key === "gcash" ? "GCash" : key === "maya" ? "Maya" : key}</span>
                                    <Toggle enabled={val} onChange={() => setPaymentMethods(p => ({ ...p, [key]: !p[key as keyof typeof p] }))} />
                                </div>
                            ))}
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <div>
                                    <span className="text-sm font-medium">Auto-print receipt</span>
                                    <p className="text-xs text-muted-foreground">Automatically print receipt after each sale</p>
                                </div>
                                <Toggle enabled={autoPrint} onChange={() => setAutoPrint(!autoPrint)} />
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <div>
                                    <span className="text-sm font-medium">Manager approval for discounts &gt;20%</span>
                                    <p className="text-xs text-muted-foreground">Require manager override for large discounts</p>
                                </div>
                                <Toggle enabled={managerApproval} onChange={() => setManagerApproval(!managerApproval)} />
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <span className="text-sm font-medium">Open cash drawer on sale</span>
                                    <p className="text-xs text-muted-foreground">Automatically open drawer for cash payments</p>
                                </div>
                                <Toggle enabled={cashDrawer} onChange={() => setCashDrawer(!cashDrawer)} />
                            </div>
                        </div>
                        <Button className="w-full bg-gradient-to-r from-primary to-violet-600 hover:opacity-90">Save Changes</Button>
                    </div>
                )
            case "notifications":
                return (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold">Notification Settings</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <div>
                                    <span className="text-sm font-medium">Email Notifications</span>
                                    <p className="text-xs text-muted-foreground">Receive important updates via email</p>
                                </div>
                                <Toggle enabled={emailNotifs} onChange={() => setEmailNotifs(!emailNotifs)} />
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <div>
                                    <span className="text-sm font-medium">SMS Alerts</span>
                                    <p className="text-xs text-muted-foreground">Get alerts on your phone via SMS</p>
                                </div>
                                <Toggle enabled={smsAlerts} onChange={() => setSmsAlerts(!smsAlerts)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Low Stock Threshold (units)</Label>
                                <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Ticket Overdue Alert After</Label>
                                <select className={selectClass}>
                                    <option value="24" className="bg-background text-foreground">24 hours</option>
                                    <option value="48" className="bg-background text-foreground">48 hours</option>
                                    <option value="72" className="bg-background text-foreground">72 hours</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <span className="text-sm font-medium">Daily Sales Summary Email</span>
                                    <p className="text-xs text-muted-foreground">Receive daily summary at 6:00 PM</p>
                                </div>
                                <Toggle enabled={dailySummary} onChange={() => setDailySummary(!dailySummary)} />
                            </div>
                        </div>
                        <Button className="w-full bg-gradient-to-r from-primary to-violet-600 hover:opacity-90">Save Changes</Button>
                    </div>
                )
            case "appearance":
                return (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold">Appearance</h2>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Theme</Label>
                                <div className="grid grid-cols-3 gap-3">
                                    {["dark", "light", "system"].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTheme(t)}
                                            className={`p-3 rounded-xl border text-center capitalize text-sm font-medium transition-all ${theme === t
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-white/10 hover:border-white/20 text-muted-foreground"
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Accent Color</Label>
                                <div className="flex gap-3">
                                    {[
                                        { id: "indigo", color: "bg-indigo-500" },
                                        { id: "violet", color: "bg-violet-500" },
                                        { id: "blue", color: "bg-blue-500" },
                                        { id: "teal", color: "bg-teal-500" },
                                        { id: "emerald", color: "bg-emerald-500" },
                                        { id: "amber", color: "bg-amber-500" },
                                    ].map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => setAccentColor(c.id)}
                                            className={`w-8 h-8 rounded-full ${c.color} transition-all ${accentColor === c.id ? "ring-2 ring-offset-2 ring-offset-background ring-white" : "hover:scale-110"
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <div>
                                    <span className="text-sm font-medium">Compact Sidebar</span>
                                    <p className="text-xs text-muted-foreground">Use a narrower sidebar layout</p>
                                </div>
                                <Toggle enabled={compactSidebar} onChange={() => setCompactSidebar(!compactSidebar)} />
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <span className="text-sm font-medium">Show Quick Actions Bar</span>
                                    <p className="text-xs text-muted-foreground">Display shortcut buttons on dashboard</p>
                                </div>
                                <Toggle enabled={showQuickActions} onChange={() => setShowQuickActions(!showQuickActions)} />
                            </div>
                        </div>
                        <Button className="w-full bg-gradient-to-r from-primary to-violet-600 hover:opacity-90">Save Changes</Button>
                    </div>
                )
            default:
                return (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                        <p className="text-sm">This settings panel is coming soon.</p>
                    </div>
                )
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>

            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Configure your store, payments, notifications, and preferences.</p>
            </div>

            <div className="flex gap-6">
                {/* Category Nav */}
                <Card className="w-52 shrink-0 border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 p-3 h-fit sticky top-28">
                    <nav className="space-y-1">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === cat.id
                                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    }`}
                            >
                                <cat.icon className="w-4 h-4 shrink-0" />
                                {cat.label}
                            </button>
                        ))}
                    </nav>
                </Card>

                {/* Active Panel */}
                <Card className="flex-1 border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 p-6">
                    {renderPanel()}
                </Card>
            </div>
        </div>
    )
}
