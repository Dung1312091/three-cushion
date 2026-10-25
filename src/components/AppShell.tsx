import { BookA, BookOpen, Crosshair, Hash, RectangleHorizontal, Search } from 'lucide-react';
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import { t } from '@/i18n/vi';
import { cn } from '@/lib/cn';
import { MusicToggle } from './MusicToggle';
import { Wordmark } from './Wordmark';

const NAV = [
  { to: '/phong-tap', label: t.nav.practice, icon: Crosshair },
  { to: '/ly-thuyet', label: t.nav.theory, icon: BookOpen },
  { to: '/bo-so', label: t.nav.systems, icon: Hash },
  { to: '/thuat-ngu', label: t.nav.glossary, icon: BookA },
  { to: '/ban', label: t.nav.tables, icon: RectangleHorizontal },
];

export function AppShell() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Bỏ qua tới nội dung
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="-ml-1 rounded-md px-1 py-2" aria-label="Ba Băng — trang chủ">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Chính">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-[0.9375rem] font-medium text-muted transition-colors hover:text-fg',
                    isActive && 'bg-surface-2 text-fg',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <MusicToggle />
            <Link
              to="/ly-thuyet?focus=1"
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg md:hidden"
              aria-label="Tìm kiếm"
            >
              <Search size={20} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="pb-24 md:pb-12">
        <Outlet />
        <footer className="mx-auto mt-16 max-w-6xl border-t border-line px-4 pt-6 text-sm text-muted">
          <p>
            <span className="font-semibold text-fg">{t.app.name}</span> do {t.app.author.name}, {t.app.author.role}, xây dựng và biên soạn nội dung.
          </p>
          <p className="mt-1">
            Liên hệ:{' '}
            <a href={`mailto:${t.app.author.email}`} className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline">
              {t.app.author.email}
            </a>
          </p>
        </footer>
      </main>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden"
        aria-label="Điều hướng chính"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted',
                    isActive && 'text-accent',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <n.icon size={22} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                    <span>{n.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <ScrollRestoration />
    </div>
  );
}
