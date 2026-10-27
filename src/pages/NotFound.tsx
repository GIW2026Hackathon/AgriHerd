import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { LogoMark } from './Landing';

export default function NotFound() {
  return (
    <div className="terrain-bg flex min-h-screen flex-col items-center justify-center px-6 text-center font-sans text-cream-100">
      <LogoMark />
      <Compass className="mt-6 h-10 w-10 text-gold-400" strokeWidth={1.5} />
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-gold-400">404 · Outside Coverage Area</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-cream-50">This pasture doesn't exist.</h1>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-cream-100/70">The route you followed isn't in the registry. Every Gusii ward is mapped — this one just isn't.</p>
      <Link to="/" className="group mt-7 flex h-12 items-center gap-2 rounded-2xl bg-gold-400 px-6 font-bold text-pine-950 hover:bg-gold-300"><ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />Back to the platform</Link>
    </div>
  );
}
