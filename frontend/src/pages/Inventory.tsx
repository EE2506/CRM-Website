import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, MoreHorizontal, Package } from "lucide-react"

interface Product {
    id: number
    sku: string
    name: string
    category: string
    price: number
    created_at: string
}

export default function Inventory() {
    const [searchTerm, setSearchTerm] = useState("")

    const { data, isLoading } = useQuery<{ data: Product[] }>({
        queryKey: ['inventory'],
        queryFn: async () => {
            const response = await api.get("/inventory")
            return response.data
        }
    })

    const filteredProducts = data?.data.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                    <p className="text-muted-foreground">Manage your product catalog and pricing.</p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> Add Product
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 backdrop-blur p-4 rounded-xl border-white/10 ring-1 ring-white/10">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products by name or SKU..."
                        className="pl-10 bg-background/50 border-white/10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                                <th className="px-6 py-4">Product Info</th>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-right">Price</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading inventory...</td>
                                    </tr>
                                ))
                            ) : filteredProducts?.map((product) => (
                                <tr key={product.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm text-foreground">{product.name}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs text-muted-foreground">{product.sku}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter border bg-secondary/50 border-secondary">
                                            {product.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-sm">
                                            ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                        </span>
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
                    {!isLoading && (!filteredProducts || filteredProducts.length === 0) && (
                        <div className="text-center py-20 bg-card/20 border-t border-white/5">
                            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                            <h3 className="text-lg font-medium">No products found</h3>
                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Try adjusting your search or add a new product to your inventory.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
