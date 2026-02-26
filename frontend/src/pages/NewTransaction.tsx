import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import api from "@/services/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
    ArrowLeft,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Wallet,
    Banknote,
    CheckCircle2,
    Search,
} from "lucide-react"

interface Product {
    id: number
    name: string
    sku: string
    price: number
    stock_quantity: number
    category: string
}

interface CartItem {
    product: Product
    quantity: number
}

const PAYMENT_METHODS = [
    { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-green-500 bg-green-500/10 border-green-500/20' },
    { id: 'gcash', label: 'GCash', icon: Wallet, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { id: 'card', label: 'Card', icon: CreditCard, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
    { id: 'maya', label: 'Maya', icon: Wallet, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
]

export default function NewTransaction() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [cart, setCart] = useState<CartItem[]>([])
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [searchQuery, setSearchQuery] = useState('')
    const [saleComplete, setSaleComplete] = useState<any>(null)

    const { data: products, isLoading } = useQuery<{ data: Product[] }>({
        queryKey: ['pos-products'],
        queryFn: async () => {
            const response = await api.get("/pos/products")
            return response.data
        }
    })

    const saleMutation = useMutation({
        mutationFn: async () => {
            return await api.post('/pos/sale', {
                items: cart.map(item => ({
                    product_id: item.product.id,
                    quantity: item.quantity
                })),
                payment_method: paymentMethod
            })
        },
        onSuccess: (response) => {
            setSaleComplete(response.data.data)
            setCart([])
            queryClient.invalidateQueries({ queryKey: ['pos-products'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-advanced-data'] })
            toast.success('Sale completed!')
        },
        onError: () => {
            toast.error('Failed to process sale')
        }
    })

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id)
            if (existing) {
                if (existing.quantity >= product.stock_quantity) {
                    toast.error(`Only ${product.stock_quantity} in stock`)
                    return prev
                }
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, { product, quantity: 1 }]
        })
    }

    const updateQuantity = (productId: number, delta: number) => {
        setCart(prev =>
            prev.map(item => {
                if (item.product.id === productId) {
                    const newQty = item.quantity + delta
                    if (newQty <= 0) return item
                    if (newQty > item.product.stock_quantity) {
                        toast.error(`Only ${item.product.stock_quantity} in stock`)
                        return item
                    }
                    return { ...item, quantity: newQty }
                }
                return item
            })
        )
    }

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product.id !== productId))
    }

    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    const tax = subtotal * 0.12
    const total = subtotal + tax

    const filteredProducts = products?.data.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    // Sale Complete View
    if (saleComplete) {
        return (
            <div className="flex items-center justify-center min-h-[70vh] animate-in fade-in zoom-in duration-500">
                <Card className="w-full max-w-md p-8 border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Sale Complete!</h2>
                    <p className="text-muted-foreground mb-6">Transaction processed successfully.</p>
                    <div className="space-y-2 text-left bg-white/5 rounded-xl p-4 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Amount</span>
                            <span className="font-bold">₱{saleComplete.total_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax (12% VAT)</span>
                            <span>₱{saleComplete.tax_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Payment Method</span>
                            <span className="capitalize">{saleComplete.payment_method}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Items</span>
                            <span>{saleComplete.items_count} item(s)</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
                            Back to Dashboard
                        </Button>
                        <Button className="flex-1 bg-gradient-to-r from-primary to-violet-600" onClick={() => setSaleComplete(null)}>
                            New Sale
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/')}>
                    <ArrowLeft className="w-4 h-4" /> Dashboard
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">New Transaction</h1>
                    <p className="text-xs text-muted-foreground">Select products to add to the cart</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product Grid */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products by name or SKU..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                        {isLoading && <div className="col-span-full text-center py-20 text-muted-foreground animate-pulse">Loading products...</div>}
                        {filteredProducts.map(product => {
                            const inCart = cart.find(item => item.product.id === product.id)
                            return (
                                <Card
                                    key={product.id}
                                    className={`p-4 border-none shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ring-1 ${inCart ? 'ring-primary/50 bg-primary/5' : 'ring-white/5 bg-card/50 hover:bg-card'}`}
                                    onClick={() => addToCart(product)}
                                >
                                    <div className="text-[10px] text-muted-foreground font-mono">{product.sku}</div>
                                    <h4 className="text-sm font-semibold mt-1 line-clamp-2">{product.name}</h4>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-sm font-bold text-primary">₱{product.price.toLocaleString()}</span>
                                        <span className="text-[10px] text-muted-foreground">{product.stock_quantity} in stock</span>
                                    </div>
                                    {inCart && (
                                        <div className="mt-2 text-[10px] text-primary font-bold bg-primary/10 rounded-full px-2 py-0.5 text-center">
                                            {inCart.quantity} in cart
                                        </div>
                                    )}
                                </Card>
                            )
                        })}
                        {!isLoading && filteredProducts.length === 0 && (
                            <div className="col-span-full text-center py-20 text-muted-foreground">No products found.</div>
                        )}
                    </div>
                </div>

                {/* Cart Sidebar */}
                <div className="space-y-4">
                    <Card className="border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10">
                        <div className="p-4 border-b border-white/5">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-primary" />
                                Cart ({cart.length} items)
                            </h3>
                        </div>
                        <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                            {cart.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-8">
                                    Cart is empty. Click products to add them.
                                </p>
                            )}
                            {cart.map(item => (
                                <div key={item.product.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold truncate">{item.product.name}</p>
                                        <p className="text-[10px] text-muted-foreground">₱{item.product.price.toLocaleString()} × {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="w-6 h-6 p-0" onClick={() => updateQuantity(item.product.id, -1)}>
                                            <Minus className="w-3 h-3" />
                                        </Button>
                                        <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="w-6 h-6 p-0" onClick={() => updateQuantity(item.product.id, 1)}>
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="w-6 h-6 p-0 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.product.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <span className="text-xs font-bold w-16 text-right">
                                        ₱{(item.product.price * item.quantity).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-white/5 space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Subtotal</span>
                                <span>₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>VAT (12%)</span>
                                <span>₱{tax.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/5">
                                <span>Total</span>
                                <span className="text-primary">₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Payment Method */}
                    <Card className="border-none shadow-2xl bg-card/30 backdrop-blur-xl ring-1 ring-white/10 p-4 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Payment Method</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {PAYMENT_METHODS.map(pm => (
                                <button
                                    key={pm.id}
                                    onClick={() => setPaymentMethod(pm.id)}
                                    className={`flex items-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${paymentMethod === pm.id
                                            ? `${pm.color} ring-1 ring-current`
                                            : 'border-white/10 text-muted-foreground hover:border-white/20'
                                        }`}
                                >
                                    <pm.icon className="w-4 h-4" />
                                    {pm.label}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Complete Sale Button */}
                    <Button
                        className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 gap-2"
                        disabled={cart.length === 0 || saleMutation.isPending}
                        onClick={() => saleMutation.mutate()}
                    >
                        {saleMutation.isPending ? 'Processing...' : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Complete Sale — ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
