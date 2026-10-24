import { Link } from 'react-router';

export function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="num text-6xl font-bold text-muted">404</p>
      <h1 className="mt-2 text-2xl font-bold">Không tìm thấy trang này</h1>
      <p className="mt-2 text-muted">Đường dẫn có thể đã đổi. Về trang lý thuyết để tìm lại bài bạn cần.</p>
      <Link to="/ly-thuyet" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-cloth px-4 font-semibold text-white">
        Mở lý thuyết
      </Link>
    </div>
  );
}
