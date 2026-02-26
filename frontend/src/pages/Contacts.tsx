import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Search,
    UserPlus,
    MoreHorizontal,
    Mail,
    Phone,
    Users,
    Download
} from "lucide-react"

interface Contact {
    id: number
    first_name: string
    last_name: string
    email: string
    phone: string
    type: 'lead' | 'prospect' | 'customer' | 'vendor'
    tags: string[]
}

export default function Contacts() {
    const [searchTerm, setSearchTerm] = useState("")
    const [filterType, setFilterType] = useState<string>("all")

    const { data, isLoading } = useQuery<{ data: Contact[] }>({
        queryKey: ['contacts', filterType],
        queryFn: async () => {
            const url = filterType === "all" ? "/crm/contacts" : `/crm/contacts?type=${filterType}`
            const response = await api.get(url)
            return response.data
        }
    })

    const filteredContacts = data?.data.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'lead': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            case 'prospect': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
            case 'customer': return 'bg-green-500/10 text-green-500 border-green-500/20'
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
                    <p className="text-muted-foreground">Manage your leads, prospects, and customers.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" /> Export
                    </Button>
                    <Button size="sm" className="gap-2">
                        <UserPlus className="w-4 h-4" /> Add Contact
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 backdrop-blur p-4 rounded-xl border-white/10 ring-1 ring-white/10">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search contacts..."
                        className="pl-10 bg-background/50 border-white/10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {['all', 'lead', 'prospect', 'customer'].map((type) => (
                        <Button
                            key={type}
                            variant={filterType === type ? "secondary" : "ghost"}
                            size="sm"
                            className="capitalize"
                            onClick={() => setFilterType(type)}
                        >
                            {type}
                        </Button>
                    ))}
                </div>
            </div>

            <Card className="border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Communication</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading contacts...</td>
                                    </tr>
                                ))
                            ) : filteredContacts?.map((contact) => (
                                <tr key={contact.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                {contact.first_name[0]}{contact.last_name[0]}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm text-foreground">{contact.first_name} {contact.last_name}</span>
                                                <div className="flex gap-1 mt-1">
                                                    {contact.tags?.slice(0, 2).map(tag => (
                                                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">#{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter border",
                                            getTypeColor(contact.type)
                                        )}>
                                            {contact.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-3 text-muted-foreground">
                                            <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors" title={contact.email}>
                                                <Mail className="w-4 h-4" />
                                            </a>
                                            <a href={`tel:${contact.phone}`} className="hover:text-primary transition-colors" title={contact.phone}>
                                                <Phone className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!isLoading && (!filteredContacts || filteredContacts.length === 0) && (
                        <div className="text-center py-20 bg-card/20 border-t border-white/5">
                            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                            <h3 className="text-lg font-medium">No contacts found</h3>
                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Try adjusting your search or filters to find what you are looking for.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}
