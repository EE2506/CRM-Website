import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import api from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2 } from 'lucide-react'

const registerSchema = z.object({
    company_name: z.string().optional(),
    invite_code: z.string().optional(),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    first_name: z.string().min(2, 'First name is too short'),
    last_name: z.string().min(2, 'Last name is too short'),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function Register() {
    const [error, setError] = useState<string | null>(null)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isJoining, setIsJoining] = useState(false)
    const [statusMessage, setStatusMessage] = useState("")
    const navigate = useNavigate()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    })

    const onSubmit = async (data: RegisterForm) => {
        setIsLoading(true)
        setError(null)

        if (isJoining && (!data.invite_code || data.invite_code.length < 5)) {
            setError("A valid invite code is required to join a company.")
            setIsLoading(false)
            return
        }
        if (!isJoining && (!data.company_name || data.company_name.length < 2)) {
            setError("Company name is required to create a new company.")
            setIsLoading(false)
            return
        }

        const payload = {
            email: data.email,
            password: data.password,
            first_name: data.first_name,
            last_name: data.last_name,
            ...(isJoining ? { invite_code: data.invite_code } : { company_name: data.company_name })
        }

        try {
            const res = await api.post('/auth/register', payload)
            setStatusMessage(res.data.message || "Registration successful.")
            setIsSuccess(true)
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to register. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-md border-none shadow-2xl bg-card/50 backdrop-blur-xl text-center">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="w-16 h-16 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Registration Complete</CardTitle>
                        <CardDescription>
                            {statusMessage}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={() => navigate('/login')}>
                            Back to Sign In
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-lg border-none shadow-2xl bg-card/50 backdrop-blur-xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
                    <CardDescription>
                        Enter your details to register your company and account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="flex items-center gap-2 p-1 bg-secondary rounded-lg mb-6">
                            <Button
                                type="button"
                                variant={!isJoining ? "default" : "ghost"}
                                className="w-1/2 h-9 text-sm font-medium"
                                onClick={() => setIsJoining(false)}
                            >
                                Create Company
                            </Button>
                            <Button
                                type="button"
                                variant={isJoining ? "default" : "ghost"}
                                className="w-1/2 h-9 text-sm font-medium"
                                onClick={() => setIsJoining(true)}
                            >
                                Join via Code
                            </Button>
                        </div>

                        {!isJoining ? (
                            <div className="space-y-2">
                                <Label htmlFor="company_name">Company Name</Label>
                                <Input
                                    id="company_name"
                                    placeholder="Acme Corp"
                                    {...register('company_name')}
                                    className={errors.company_name ? 'border-destructive' : ''}
                                />
                                {errors.company_name && (
                                    <p className="text-xs text-destructive">{errors.company_name.message}</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="invite_code">Invite Code</Label>
                                <Input
                                    id="invite_code"
                                    placeholder="Enter 6-character code"
                                    className="uppercase font-mono tracking-widest text-lg"
                                    {...register('invite_code')}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input
                                    id="first_name"
                                    placeholder="John"
                                    {...register('first_name')}
                                    className={errors.first_name ? 'border-destructive' : ''}
                                />
                                {errors.first_name && (
                                    <p className="text-xs text-destructive">{errors.first_name.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                    id="last_name"
                                    placeholder="Doe"
                                    {...register('last_name')}
                                    className={errors.last_name ? 'border-destructive' : ''}
                                />
                                {errors.last_name && (
                                    <p className="text-xs text-destructive">{errors.last_name.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Work Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@company.com"
                                {...register('email')}
                                className={errors.email ? 'border-destructive' : ''}
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                {...register('password')}
                                className={errors.password ? 'border-destructive' : ''}
                            />
                            {errors.password && (
                                <p className="text-xs text-destructive">{errors.password.message}</p>
                            )}
                        </div>

                        <Button className="w-full mt-6" type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Account
                        </Button>
                    </form>
                </CardContent>
                <CardFooter>
                    <div className="text-sm text-center w-full text-muted-foreground">
                        Already have an account?{' '}
                        <Button variant="link" className="p-0" onClick={() => navigate('/login')}>
                            Sign In
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
