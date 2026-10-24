import { Brand } from "@/components/layout/brand";
import { Spinner } from "@/components/ui/spinner";

export function LoadingScreen({ label = "Đang tải không gian làm việc…" }: { label?: string }) {
  return (
    <main className="loading-screen">
      <Brand />
      <Spinner className="h-6 w-6 text-violet-600" />
      <p>{label}</p>
    </main>
  );
}
