import { Sidebar } from "@/components/sidebar";
import { ErrorToastListener } from "@/components/ui/error-toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
      <ErrorToastListener />
    </div>
  );
}
