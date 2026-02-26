import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Users, Ticket, ArrowUpRight, Phone, Mail, MessageSquare, Calendar, Shield } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts"
import { format } from "date-fns"

interface DashboardData {
    kpis: {
        total_revenue: number
        active_leads: number
        open_tickets: number
        high_priority_tickets: number
        conversion_rate: number
    }
    sales_chart: Array<{ date: string, total: number }>
    recent_activity: Array<{
        id: number
        type: string
        description: string
        contact_name: string
        timestamp: string
    }>
}

export default function Dashboard() {
    const { user } = useAuthStore()

    const { data, isLoading, error } = useQuery<DashboardData>({
        queryKey: ['dashboard-data'],
        queryFn: async () => {
            const response = await api.get('/crm/dashboard')
            return response.data.data
        }
    })

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'call': return <Phone className="w-4 h-4" />
            case 'email': return <Mail className="w-4 h-4" />
            case 'meeting': return <Calendar className="w-4 h-4" />
            case 'note': return <MessageSquare className="w-4 h-4" />
            default: return <Users className="w-4 h-4" />
        }
    }

    if (isLoading) return <div className="flex items-center justify-center h-96">Loading metrics...</div>
    if (error) {
        const isForbidden = (error as any).response?.status === 403;
        if (isForbidden) {
            return (
                <div className="flex flex-col items-center justify-center h-96 space-y-4 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                        <Shield className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Access Restricted</h2>
                        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                            You don't have the required permissions to view the analytics dashboard. Please contact your company administrator.
                        </p>
                    </div>
                </div>
            )
        }
        return <div className="text-destructive p-4 border border-destructive rounded-lg bg-destructive/10">Failed to load dashboard data. Please try again.</div>
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back, {user?.first_name}. Here's what's happening with {user?.company_name || 'your business'}.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" size="sm" className="gap-2">
                        Download Report <ArrowUpRight className="w-4 h-4" />
                    </Button>
                    <Button size="sm">New Transaction</Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur ring-1 ring-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                        <CardTitle className="text-xs font-bold">Total Revenue</CardTitle>
                        <DollarSign className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{data?.kpis.total_revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] text-green-500 mt-1 font-medium flex items-center gap-1">
                            Live <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                        </p>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur ring-1 ring-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                        <CardTitle className="text-xs font-bold">Active leads</CardTitle>
                        <Users className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.kpis.active_leads}</div>
                        <p className="text-[10px] text-blue-500 mt-1 font-medium">Ready for follow-up</p>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur ring-1 ring-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                        <CardTitle className="text-xs font-bold">Open Tickets</CardTitle>
                        <Ticket className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.kpis.open_tickets}</div>
                        <p className="text-[10px] text-amber-500 mt-1 font-medium">
                            {data?.kpis.high_priority_tickets} high priority
                        </p>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur ring-1 ring-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                        <CardTitle className="text-xs font-bold">Conversion Rate</CardTitle>
                        <ArrowUpRight className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.kpis.conversion_rate}%</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Lead to Deal Won</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                <Card className="lg:col-span-4 border-none shadow-xl bg-card/50 backdrop-blur ring-1 ring-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg">Revenue Trend (30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px] pl-2 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.sales_chart}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                    tickFormatter={(str) => format(new Date(str), 'MMM d')}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                    tickFormatter={(val) => `₱${val / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value: any) => [`₱${(value || 0).toLocaleString()}`, 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="var(--primary)"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 border-none shadow-xl bg-card/50 backdrop-blur ring-1 ring-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {data?.recent_activity.map((activity) => (
                            <div key={activity.id} className="flex gap-4 items-start group">
                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium leading-none mb-1">{activity.contact_name}</span>
                                    <span className="text-xs text-muted-foreground truncate">{activity.description}</span>
                                    <span className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-tight">
                                        {format(new Date(activity.timestamp), 'h:mm a · MMM d')}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {data?.recent_activity.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground text-sm italic">
                                No recent activities logged yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
