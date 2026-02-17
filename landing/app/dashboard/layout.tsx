import AdminSidebar from '../admin/components/AdminSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <AdminSidebar />
            <main className="flex-1 ml-[240px] transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
