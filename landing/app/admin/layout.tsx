import AdminSidebar from './components/AdminSidebar';
import { ToastProvider } from './components/Toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <div className="flex min-h-screen bg-gray-50">
                <AdminSidebar />
                <main className="flex-1 ml-[240px] transition-all duration-300">
                    {children}
                </main>
            </div>
        </ToastProvider>
    );
}
