export function PageLoading({ label = 'Đang tải…', dark = false }: { label?: string; dark?: boolean }) {
  return (
    <div className={dark ? 'room flex min-h-dvh items-center justify-center bg-bg' : 'flex min-h-[50vh] items-center justify-center'} role="status">
      <div className="flex items-center gap-3 text-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}
