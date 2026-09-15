import RequireAuth from "@/components/RequireAuth";
import BottomNav from "@/components/BottomNav";
import FAB from "@/components/FAB";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="flex min-h-svh flex-col">
        <div
          className="flex-1 px-4 pt-[calc(1.25rem+var(--safe-top))]"
          style={{ paddingBottom: "calc(6.5rem + var(--safe-bottom))" }}
        >
          {children}
        </div>
        <FAB />
        <BottomNav />
      </div>
    </RequireAuth>
  );
}
