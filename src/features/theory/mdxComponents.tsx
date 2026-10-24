import { Crosshair } from 'lucide-react';
import { Link } from 'react-router';
import { findDrill } from '@/content/loader';
import { Diagram } from './DiagramSvg';
import { SystemCalc } from './SystemCalculator';
import { Term } from './TermPopover';

function OpenInPractice({ drill }: { drill: string }) {
  const d = findDrill(drill);
  return (
    <Link
      to={`/phong-tap?drill=${drill}`}
      className="not-prose my-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 font-semibold text-accent no-underline hover:border-accent"
    >
      <Crosshair size={18} aria-hidden="true" />
      Mở trong phòng tập{d?.title ? `: ${d.title}` : ''}
    </Link>
  );
}

export const mdxComponents = { Diagram, SystemCalc, Term, OpenInPractice };
