import AdminAuthChecker from '@/components/admin/admin-auth-checker'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminAuthChecker>
      {children}
    </AdminAuthChecker>
  )
} 