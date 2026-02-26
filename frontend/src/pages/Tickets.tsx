import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Ticket as TicketIcon,
    Plus,
    MoreHorizontal,
    MessageSquare,
    AlertCircle,
    CheckCircle2,
    Clock
} from "lucide-react"

interface Ticket {
    id: number
    ticket_code: string
    subject: string
    status: 'open' | 'in_progress' | 'awaiting_reply' | 'resolved' | 'closed'
    priority: 'low' | 'medium' | 'high' | 'critical'
    type: string
    assignee_id: number | null
    created_at: string
}

const STATUSES = [
    { id: 'open', label: 'Open', color: 'bg-blue-500' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-amber-500' },
    { id: 'awaiting_reply', label: 'Awaiting Reply', color: 'bg-purple-500' },
    { id: 'resolved', label: 'Resolved', color: 'bg-green-500' },
]

export default function Tickets() {
    const { data: tickets, isLoading } = useQuery<{ data: Ticket[] }>({
        queryKey: ['tickets'],
        queryFn: async () => {
            const response = await api.get("/tickets")
            return response.data
        }
    })

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'critical': return <AlertCircle className="w-4 h-4 text-destructive" />
            case 'high': return <AlertCircle className="w-4 h-4 text-amber-500" />
            case 'medium': return <CheckCircle2 className="w-4 h-4 text-blue-500" />
            default: return <Clock className="w-4 h-4 text-muted-foreground" />
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
                    <p className="text-muted-foreground">Manage customer inquiries and internal issues.</p>
                </div>
                <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> New Ticket
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
                {STATUSES.map((status) => {
                    const statusTickets = tickets?.data.filter(t => t.status === status.id) || []

                    return (
                        <div key={status.id} className="min-w-[250px] flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        {status.label}
                                    </span>
                                </div>
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-bold">
                                    {statusTickets.length}
                                </span>
                            </div>

                            <div className="flex flex-col gap-3 min-h-[500px] p-2 rounded-xl bg-card/20 backdrop-blur-sm border border-white/5 ring-1 ring-white/10">
                                {statusTickets.map((ticket) => (
                                    <Card key={ticket.id} className="p-4 bg-card/50 hover:bg-card transition-all cursor-pointer group border-none shadow-md ring-1 ring-white/5 hover:ring-primary/20">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-mono font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded">
                                                {ticket.ticket_code}
                                            </span>
                                            <Button variant="ghost" size="icon" className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                                            </Button>
                                        </div>
                                        <h4 className="text-sm font-semibold mb-3 line-clamp-2 leading-tight">
                                            {ticket.subject}
                                        </h4>
                                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                {getPriorityIcon(ticket.priority)}
                                                <span className="text-[10px] font-medium uppercase tracking-tighter text-muted-foreground">
                                                    {ticket.priority}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <MessageSquare className="w-3 h-3" />
                                                0
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                {isLoading && status.id === 'open' && (
                                    <div className="text-center py-10 text-xs text-muted-foreground animate-pulse">Loading tickets...</div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
