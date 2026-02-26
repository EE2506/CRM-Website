import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

export default function Deals() {
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Deals & Pipeline</h1>
                    <p className="text-muted-foreground">Track your sales opportunities and revenue forecast.</p>
                </div>
                <Button size="sm" className="gap-2">
                    <Briefcase className="w-4 h-4" /> New Deal
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
                {STAGES.map((stage) => {
                    const stageDeals = deals?.data.filter(d => d.stage === stage.id) || []

                    return (
                        <div key={stage.id} className="min-w-[200px] flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        {stage.label}
                                    </span>
                                </div>
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-bold">
                                    {stageDeals.length}
                                    Wallets</span>
                            </div>

                            <div className="flex flex-col gap-3 min-h-[500px] p-2 rounded-xl bg-card/20 backdrop-blur-sm border border-white/5 ring-1 ring-white/10">
                                {stageDeals.map((deal) => (
                                    <Card key={deal.id} className="p-3 bg-card/50 hover:bg-card transition-all cursor-pointer group border-none shadow-md ring-1 ring-white/5 hover:ring-primary/20">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-xs font-semibold truncate pr-4">{deal.name}</h4>
                                            {getStageIcon(deal.stage)}
                                        </div>
                                        <div className="text-sm font-bold text-primary mb-3">
                                            ₱{deal.value.toLocaleString()}
                                        </div>
                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <TrendingUp className="w-3 h-3" />
                                                {deal.probability}%
                                            </div>
                                            <Button variant="ghost" size="icon" className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                                {isLoading && stage.id === 'new' && (
                                    <div className="text-center py-10 text-xs text-muted-foreground animate-pulse">Loading deals...</div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
