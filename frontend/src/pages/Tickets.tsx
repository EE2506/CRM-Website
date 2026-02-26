import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/services/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
    Ticket as TicketIcon,
    Plus,
    MoreHorizontal,
    MessageSquare,
    AlertCircle,
    CheckCircle2,
    Clock,
    Send,
    ArrowLeft,
    X
} from "lucide-react"

interface Ticket {
    id: number
    ticket_code: string
    subject: string
    description?: string
    status: 'open' | 'in_progress' | 'awaiting_reply' | 'resolved' | 'closed'
    priority: 'low' | 'medium' | 'high' | 'critical'
    type: string
    assignee_id: number | null
    created_at: string
}

interface TicketDetail extends Ticket {
    replies: Array<{
        id: number
        content: string
        is_internal: boolean
        user_id: number
        created_at: string
    }>
}

const STATUSES = [
    { id: 'open', label: 'Open', color: 'bg-blue-500' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-amber-500' },
    { id: 'awaiting_reply', label: 'Awaiting Reply', color: 'bg-purple-500' },
    { id: 'resolved', label: 'Resolved', color: 'bg-green-500' },
]

const PRIORITIES = [
    { id: 'low', label: 'Low' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'High' },
    { id: 'critical', label: 'Critical' },
]

const TYPES = [
    { id: 'customer', label: 'Customer' },
    { id: 'internal', label: 'Internal' },
    { id: 'pos', label: 'POS' },
    { id: 'escalated', label: 'Escalated' },
]

export default function Tickets() {
    const queryClient = useQueryClient()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
    const [replyContent, setReplyContent] = useState("")
    const [formData, setFormData] = useState({ subject: '', description: '', priority: 'medium', type: 'customer' })

    const { data: tickets, isLoading } = useQuery<{ data: Ticket[] }>({
        queryKey: ['tickets'],
        queryFn: async () => {
            const response = await api.get("/tickets")
            return response.data
        }
    })

    const { data: ticketDetail } = useQuery<{ data: TicketDetail }>({
        queryKey: ['ticket-detail', selectedTicketId],
        queryFn: async () => {
            const response = await api.get(`/tickets/${selectedTicketId}`)
            return response.data
        },
        enabled: !!selectedTicketId,
    })

    const createMutation = useMutation({
        mutationFn: async () => await api.post('/tickets', formData),
        onSuccess: () => {
            toast.success('Ticket created successfully!')
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            setIsCreateOpen(false)
            setFormData({ subject: '', description: '', priority: 'medium', type: 'customer' })
        }
    })

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number, status: string }) =>
            await api.put(`/tickets/${id}`, { status }),
        onSuccess: () => {
            toast.success('Status updated!')
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            queryClient.invalidateQueries({ queryKey: ['ticket-detail', selectedTicketId] })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => await api.delete(`/tickets/${id}`),
        onSuccess: () => {
            toast.success('Ticket deleted!')
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            setSelectedTicketId(null)
        }
    })

    const replyMutation = useMutation({
        mutationFn: async () => {
            if (!selectedTicketId || !replyContent.trim()) return
            return await api.post(`/tickets/${selectedTicketId}/replies`, { content: replyContent })
        },
        onSuccess: () => {
            toast.success('Reply added!')
            setReplyContent("")
            queryClient.invalidateQueries({ queryKey: ['ticket-detail', selectedTicketId] })
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-destructive bg-destructive/10 border-destructive/20'
            case 'high': return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
            case 'medium': return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
            default: return 'text-muted-foreground bg-muted/50 border-muted'
        }
    }

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this ticket?")) {
            deleteMutation.mutate(id)
        }
    }

    // Detail side panel view
    if (selectedTicketId && ticketDetail) {
        const ticket = ticketDetail.data
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTicketId(null)} className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Tickets
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main ticket content */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="p-6 border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <span className="text-[10px] font-mono font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded">{ticket.ticket_code}</span>
                                    <h2 className="text-xl font-bold mt-2">{ticket.subject}</h2>
                                </div>
                                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setSelectedTicketId(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            {ticket.description ? (
                                <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description}</p>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No description provided.</p>
                            )}
                        </Card>

                        {/* Replies Thread */}
                        <Card className="border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10">
                            <div className="p-4 border-b border-white/5">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-primary" />
                                    Conversation ({ticket.replies.length})
                                </h3>
                            </div>
                            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                                {ticket.replies.length === 0 && (
                                    <p className="text-center text-sm text-muted-foreground py-8">No replies yet. Start the conversation below.</p>
                                )}
                                {ticket.replies.map((reply) => (
                                    <div key={reply.id} className={`p-3 rounded-lg text-sm ${reply.is_internal ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-white/5'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                                User #{reply.user_id}
                                                {reply.is_internal && <span className="ml-2 text-amber-500">(Internal Note)</span>}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(reply.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="leading-relaxed">{reply.content}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-white/5">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Write a reply..."
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && replyMutation.mutate()}
                                        className="flex-1"
                                    />
                                    <Button
                                        size="icon"
                                        onClick={() => replyMutation.mutate()}
                                        disabled={replyMutation.isPending || !replyContent.trim()}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar metadata */}
                    <div className="space-y-4">
                        <Card className="p-5 border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 space-y-4">
                            <h3 className="text-sm font-semibold">Ticket Details</h3>

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</Label>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {STATUSES.map(s => (
                                            <Button
                                                key={s.id}
                                                size="sm"
                                                variant={ticket.status === s.id ? "default" : "outline"}
                                                className="h-7 text-[10px]"
                                                onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: s.id })}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full ${s.color} mr-1.5`} />
                                                {s.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Priority</Label>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        {getPriorityIcon(ticket.priority)}
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(ticket.priority)} capitalize`}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Type</Label>
                                    <p className="text-sm capitalize mt-1">{ticket.type}</p>
                                </div>
                                <div>
                                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Created</Label>
                                    <p className="text-sm mt-1">{new Date(ticket.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </Card>

                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => handleDelete(ticket.id)}
                        >
                            Delete Ticket
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
                    <p className="text-muted-foreground">Manage customer inquiries and internal issues.</p>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsCreateOpen(true)}>
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
                                    <Card
                                        key={ticket.id}
                                        className="p-4 bg-card/50 hover:bg-card transition-all cursor-pointer group border-none shadow-md ring-1 ring-white/5 hover:ring-primary/20"
                                        onClick={() => setSelectedTicketId(ticket.id)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-mono font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded">
                                                {ticket.ticket_code}
                                            </span>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {STATUSES.map(s => (
                                                            <DropdownMenuItem
                                                                key={s.id}
                                                                onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: s.id })}
                                                            >
                                                                <div className={`w-2 h-2 rounded-full ${s.color} mr-2`} />
                                                                Move to {s.label}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => handleDelete(ticket.id)}
                                                        >
                                                            Delete Ticket
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
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

            {/* Create Ticket Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TicketIcon className="w-5 h-5 text-primary" /> New Support Ticket
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject <span className="text-destructive">*</span></Label>
                            <Input
                                id="subject"
                                placeholder="Brief summary of the issue..."
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="Detailed description of the issue..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {PRIORITIES.map(p => (
                                        <Button
                                            key={p.id}
                                            size="sm"
                                            type="button"
                                            variant={formData.priority === p.id ? "default" : "outline"}
                                            className="h-7 text-[11px]"
                                            onClick={() => setFormData({ ...formData, priority: p.id })}
                                        >
                                            {p.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {TYPES.map(t => (
                                        <Button
                                            key={t.id}
                                            size="sm"
                                            type="button"
                                            variant={formData.type === t.id ? "default" : "outline"}
                                            className="h-7 text-[11px]"
                                            onClick={() => setFormData({ ...formData, type: t.id })}
                                        >
                                            {t.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => createMutation.mutate()}
                            disabled={createMutation.isPending || !formData.subject.trim()}
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
