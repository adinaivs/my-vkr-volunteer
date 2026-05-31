import { SidebarProvider } from '@/app/contexts/SidebarContext';

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarProvider>{children}</SidebarProvider>;
}
