import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/services/api"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { UserPlus, Shield, Check, Copy } from "lucide-react"

export default function Team() {
    const queryClient = useQueryClient()
    const [copied, setCopied] = useState(false)

    // Fetch Invite Code
    const { data: inviteCodeData } = useQuery({
        queryKey: ["inviteCode"],
        queryFn: async () => {
            const res = await api.get("/admin/company/invite-code")
            return res.data.data.invite_code
        }
    })

    // Fetch Roles
    const { data: roles } = useQuery({
        queryKey: ["roles"],
        queryFn: async () => {
            const res = await api.get("/admin/roles")
            return res.data.data
        }
    })

    // Fetch Users
    const { data: users, isLoading } = useQuery({
        queryKey: ["team"],
        queryFn: async () => {
            const res = await api.get("/admin/users")
            return res.data.data
        }
    })

    // Approve Mutation
    const approveMutation = useMutation({
        mutationFn: async ({ userId, roleId }: { userId: number, roleId: number }) => {
            return api.put(`/admin/users/${userId}/approve`, { role_id: roleId })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["team"] })
        }
    })

    // Change Role Mutation
    const roleMutation = useMutation({
        mutationFn: async ({ userId, roleId }: { userId: number, roleId: number }) => {
            return api.put(`/admin/users/${userId}/role`, { role_id: roleId })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["team"] })
        }
    })

    const copyCode = () => {
        if (inviteCodeData) {
            navigator.clipboard.writeText(inviteCodeData)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const pendingUsers = users?.filter((u: any) => u.status === 'pending_approval') || []
    const activeUsers = users?.filter((u: any) => u.status !== 'pending_approval') || []

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team Settings</h1>
                    <p className="text-muted-foreground mt-2">Manage your company members and roles.</p>
                </div>

                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">Company Invite Code</p>
                            <p className="text-2xl font-mono font-bold tracking-widest">{inviteCodeData || '------'}</p>
                        </div>
                        <Button variant="outline" size="icon" onClick={copyCode}>
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Approvals Section */}
            {pendingUsers.length > 0 && (
                <Card className="border-warning/50 shadow-md">
                    <CardHeader className="bg-warning/10 pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-warning" />
                            Pending Approvals ({pendingUsers.length})
                        </CardTitle>
                        <CardDescription>These users joined via your invite code and need a role assigned.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Assign Role</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingUsers.map((user: any) => (
                                    <PendingUserRow
                                        key={user.id}
                                        user={user}
                                        roles={roles}
                                        onApprove={(roleId: number) => approveMutation.mutate({ userId: user.id, roleId })}
                                        isLoading={approveMutation.isPending}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Active Team Section */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" /> Active Members
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Role</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading team...</TableCell>
                                </TableRow>
                            ) : activeUsers.map((user: any) => {
                                const roleIdStr = roles?.find((r: any) => r.name === user.role)?.id.toString() || ""
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.first_name || '-'} {user.last_name || '-'}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                                {user.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={roleIdStr}
                                                onValueChange={(val: string) => roleMutation.mutate({ userId: user.id, roleId: parseInt(val) })}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles?.map((r: any) => (
                                                        <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

function PendingUserRow({ user, roles, onApprove, isLoading }: any) {
    const [selectedRole, setSelectedRole] = useState<string>("")

    return (
        <TableRow>
            <TableCell className="font-medium">{user.first_name || '-'} {user.last_name || '-'}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                        {roles?.map((r: any) => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell className="text-right">
                <Button
                    size="sm"
                    disabled={!selectedRole || isLoading}
                    onClick={() => onApprove(parseInt(selectedRole))}
                >
                    Approve Access
                </Button>
            </TableCell>
        </TableRow>
    )
}
