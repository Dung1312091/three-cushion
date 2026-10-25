import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppShell } from '@/components/AppShell';
import { PageLoading } from '@/components/PageLoading';
import { SoundManager } from '@/components/SoundManager';
import { Home } from '@/pages/Home';
import { TheoryList } from '@/pages/TheoryList';
import { ArticlePage } from '@/pages/Article';
import { SystemsPage } from '@/pages/Systems';
import { SystemDetail } from '@/pages/SystemDetail';
import { GlossaryPage } from '@/pages/Glossary';
import { NotFound } from '@/pages/NotFound';

// three.js only loads on the practice routes (§15 budget for theory pages).
const Practice = lazy(() => import('@/pages/Practice'));
const Calibration = lazy(() => import('@/pages/Calibration'));
const Tables = lazy(() => import('@/pages/Tables'));
const DevBench = lazy(() => import('@/pages/DevBench'));

const wrap = (el: React.ReactNode) => <Suspense fallback={<PageLoading />}>{el}</Suspense>;

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/ly-thuyet', element: <TheoryList /> },
      { path: '/ly-thuyet/:category/:slug', element: <ArticlePage /> },
      { path: '/bo-so', element: <SystemsPage /> },
      { path: '/bo-so/:id', element: <SystemDetail /> },
      { path: '/thuat-ngu', element: <GlossaryPage /> },
      { path: '/ban', element: wrap(<Tables />) },
      { path: '/phong-tap/hieu-chuan', element: wrap(<Calibration />) },
      { path: '/dev/bench', element: wrap(<DevBench />) },
      { path: '*', element: <NotFound /> },
    ],
  },
  { path: '/phong-tap', element: wrap(<Practice />) },
]);

export function App() {
  return (
    <>
      <SoundManager />
      <RouterProvider router={router} />
    </>
  );
}
