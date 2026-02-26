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
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
    DndContext,
    useDraggable,
    useDroppable,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
    Briefcase,
    Plus,
    MoreHorizontal,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock
} from "lucide-react"

interface Deal {
    id: number
    name: string
    value: number
    stage: 'new' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost'
    probability: number
    contact_id: number
}

const STAGES = [
    { id: 'new', label: 'New', color: 'bg-blue-500' },
    { id: 'discovery', label: 'Discovery', color: 'bg-indigo-500' },
    { id: 'proposal', label: 'Proposal', color: 'bg-purple-500' },
    { id: 'negotiation', label: 'Negotiation', color: 'bg-amber-500' },
    { id: 'won', label: 'Won', color: 'bg-green-500' },
    { id: 'lost', label: 'Lost', color: 'bg-destructive' },
]

// --- DnD Components ---
function DroppableColumn(props: { id: string, children: React.ReactNode, stage: any, count: number }) {
    const { isOver, setNodeRef } = useDroppable({
        id: props.id,
    });
    const style = {
        background: isOver ? 'rgba(255,255,255,0.05)' : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} className="min-w-[200px] flex flex-col gap-4 rounded-xl transition-colors">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${props.stage.color}`} />
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {props.stage.label}
                    </span>
                </div>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-bold">
                    {props.count} Deals
                </span>
            </div>
            <div className="flex flex-col gap-3 min-h-[500px] p-2 rounded-xl bg-card/20 backdrop-blur-sm border border-white/5 ring-1 ring-white/10">
                {props.children}
            </div>
        </div>
    );
}

function DraggableCard(props: { id: number, deal: Deal, getStageIcon: any, onEdit: any, onDelete: any }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: props.id.toString(),
        data: props.deal
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
            <Card className="p-3 bg-card/50 hover:bg-card transition-all cursor-grab active:cursor-grabbing group border-none shadow-md ring-1 ring-white/5 hover:ring-primary/20">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xs font-semibold truncate pr-4">{props.deal.name}</h4>
                    {props.getStageIcon(props.deal.stage)}
                </div>
                <div className="text-sm font-bold text-primary mb-3">
                    ₱{props.deal.value.toLocaleString()}
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        {props.deal.probability}%
                    </div>
                    {/* Intercept pointer down on the menu so it doesn't trigger drag */}
                    <div onPointerDown={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => props.onEdit(props.deal)}>
                                    Edit Deal
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => props.onDelete(props.deal.id)}>
                                    Delete Deal
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default function Deals() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
    const [formData, setFormData] = useState({ name: '', value: 0, stage: 'new', probability: 10, contact_id: '' })
    const queryClient = useQueryClient()

    // Sensors specifically tuned so clicks on buttons don't start drags immediately
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const { data: deals, isLoading } = useQuery<{ data: Deal[] }>({
        queryKey: ['deals'],
        queryFn: async () => {
            const response = await api.get("/crm/deals")
            return response.data
        }
    })

    const getStageIcon = (stage: string) => {
        switch (stage) {
            case 'won': return <CheckCircle2 className="w-4 h-4 text-green-500" />
            case 'lost': return <AlertCircle className="w-4 h-4 text-destructive" />
            case 'new': return <Plus className="w-4 h-4 text-blue-500" />
            default: return <Clock className="w-4 h-4 text-muted-foreground" />
        }
    }

    const { data: contacts } = useQuery<{ data: any[] }>({
        queryKey: ['contacts-min'],
        queryFn: async () => {
            const response = await api.get("/crm/contacts?per_page=100")
            return response.data
        }
    })

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = { ...formData, value: Number(formData.value), probability: Number(formData.probability), contact_id: Number(formData.contact_id) }
            if (editingDeal) {
                return await api.put(`/crm/deals/${editingDeal.id}`, payload)
            } else {
                return await api.post('/crm/deals', payload)
            }
        },
        onSuccess: () => {
            toast.success(`Deal ${editingDeal ? 'updated' : 'created'} successfully!`)
            queryClient.invalidateQueries({ queryKey: ['deals'] })
            setIsDialogOpen(false)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => await api.delete(`/crm/deals/${id}`),
        onSuccess: () => {
            toast.success('Deal deleted successfully!')
            queryClient.invalidateQueries({ queryKey: ['deals'] })
        }
    })

    const updateStageMutation = useMutation({
        mutationFn: async ({ id, stage }: { id: number, stage: string }) => {
            return await api.put(`/crm/deals/${id}`, { stage })
        },
        onMutate: async ({ id, stage }) => {
            // Optimistic Update
            await queryClient.cancelQueries({ queryKey: ['deals'] })
            const previousDeals = queryClient.getQueryData<{ data: Deal[] }>(['deals'])
            if (previousDeals) {
                queryClient.setQueryData<{ data: Deal[] }>(['deals'], {
                    ...previousDeals,
                    data: previousDeals.data.map(d => d.id === id ? { ...d, stage: stage as any } : d)
                })
            }
            return { previousDeals }
        },
        onError: (_err, _newTodo, context) => {
            queryClient.setQueryData(['deals'], context?.previousDeals)
            toast.error("Failed to move deal")
        },
        onSuccess: () => {
            // Background refetch to ensure sync
            queryClient.invalidateQueries({ queryKey: ['deals'] })
        }
    })

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const dealId = parseInt(active.id as string);
        const newStageId = over.id as string;
        const dealData = active.data.current as Deal;

        if (dealData && dealData.stage !== newStageId) {
            updateStageMutation.mutate({ id: dealId, stage: newStageId })
        }
    }

    const openDialog = (deal?: Deal) => {
        if (deal) {
            setEditingDeal(deal)
            setFormData({
                name: deal.name,
                value: deal.value,
                stage: deal.stage,
                probability: deal.probability,
                contact_id: deal.contact_id.toString()
            })
        } else {
            setEditingDeal(null)
            setFormData({ name: '', value: 0, stage: 'new', probability: 10, contact_id: contacts?.data[0]?.id?.toString() || '' })
        }
        setIsDialogOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this deal?")) {
            deleteMutation.mutate(id)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Deals & Pipeline</h1>
                    <p className="text-muted-foreground">Track your sales opportunities and revenue forecast. Drag and drop to move stages.</p>
                </div>
                <Button size="sm" className="gap-2" onClick={() => openDialog()}>
                    <Briefcase className="w-4 h-4" /> New Deal
                </Button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    {STAGES.map((stage) => {
                        const stageDeals = deals?.data.filter(d => d.stage === stage.id) || []
                        return (
                            <DroppableColumn key={stage.id} id={stage.id} stage={stage} count={stageDeals.length}>
                                {stageDeals.map((deal) => (
                                    <DraggableCard
                                        key={deal.id}
                                        id={deal.id}
                                        deal={deal}
                                        getStageIcon={getStageIcon}
                                        onEdit={openDialog}
                                        onDelete={handleDelete}
                                    />
                                ))}
                                {isLoading && stage.id === 'new' && (
                                    <div className="text-center py-10 text-xs text-muted-foreground animate-pulse">Loading deals...</div>
                                )}
                            </DroppableColumn>
                        )
                    })}
                </DndContext>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingDeal ? 'Edit Deal' : 'New Deal'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Deal Name <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="value">Value (₱)</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="probability">Probability (%)</Label>
                                <Input
                                    id="probability"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.probability}
                                    onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_id">Primary Contact <span className="text-destructive">*</span></Label>
                            <select
                                id="contact_id"
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.contact_id}
                                onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
                            >
                                <option value="" disabled className="bg-background text-foreground text-muted-foreground">Select a contact...</option>
                                {contacts?.data?.map(c => (
                                    <option key={c.id} value={c.id} className="bg-background text-foreground">{c.first_name} {c.last_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Pipeline Stage</Label>
                            <div className="flex flex-wrap gap-2">
                                {STAGES.map(s => (
                                    <Button
                                        key={s.id}
                                        type="button"
                                        variant={formData.stage === s.id ? "default" : "outline"}
                                        size="sm"
                                        className="capitalize"
                                        onClick={() => setFormData({ ...formData, stage: s.id })}
                                    >
                                        {s.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending || !formData.name || !formData.contact_id}
                        >
                            {saveMutation.isPending ? 'Saving...' : 'Save Deal'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
