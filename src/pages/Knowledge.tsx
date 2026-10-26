/* ==========================================================================
   Knowledge Base — farmer education library (offline-readable excerpts)
   ========================================================================== */
import { useState } from 'react';
import { BookOpen, Clock, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import { knowledgeArticles, type KnowledgeArticle } from '../lib/types';
import { Card, PageHeader, Avatar } from '../components/ui';
import { cn } from '../lib/cn';

const CATEGORIES = ['All', 'Disease Prevention', 'Tick Control', 'Nutrition', 'Breeding', 'Records & Finance'] as const;

export default function Knowledge() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<KnowledgeArticle | null>(null);

  const q = query.trim().toLowerCase();
  const list = knowledgeArticles.filter((a) =>
    (category === 'All' || a.category === category) &&
    (!q || [a.title, a.excerpt, a.category].join(' ').toLowerCase().includes(q))
  );

  if (open) {
    return (
      <div className="max-w-3xl">
        <button onClick={() => setOpen(null)} className="flex items-center gap-1.5 text-[11px] font-bold text-pine-700 hover:text-pine-950 mb-4"><ArrowLeft size={13} /> Back to library</button>
        <Card className="p-6 sm:p-8">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-maize-600">{open.category} · {open.read_minutes} min read</span>
          <h1 className="mt-2 font-display font-semibold text-2xl sm:text-3xl text-pine-950 leading-tight">{open.title}</h1>
          <p className="mt-2 text-[13px] text-pine-800 italic border-l-2 border-maize-400 pl-3">{open.excerpt}</p>
          <div className="mt-5 space-y-4">
            {open.body.map((para, i) => <p key={i} className="text-[13px] text-pine-900 leading-relaxed">{para}</p>)}
          </div>
          <div className="mt-6 pt-4 border-t border-pine-900/10 flex items-center justify-between">
            <div className="flex items-center gap-2"><Avatar initials="KD" tone="pine" size="xs" /><div className="font-mono text-[9px] text-pine-600">KTDA Livestock Extension<br />GLHIS Knowledge Unit</div></div>
            <a href="tel:0800723000" className="font-mono text-[10px] font-bold text-pine-800 underline">Hotline 0800 723 000</a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="GLHIS Knowledge Base"
        sub="Extension-officer field guides for Gusii smallholders. Cached on first sync — readable fully offline."
      />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pine-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search guides…" className="w-full h-10 pl-9 pr-3 rounded-xl border border-pine-200 bg-white text-[12.5px] outline-none focus:ring-2 focus:ring-pine-500/40" /></div>
        <div className="flex gap-1.5 flex-wrap">{CATEGORIES.map((c) => <button key={c} onClick={() => setCategory(c)} className={cn('h-9 px-3 rounded-xl border text-[11px] font-semibold', category === c ? 'bg-pine-800 text-maize-300 border-pine-800' : 'bg-white text-pine-900 border-pine-200 hover:border-pine-400')}>{c}</button>)}</div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((a) => (
          <button key={a.id} onClick={() => setOpen(a)} className="text-left group">
            <Card className="p-5 h-full flex flex-col hover:shadow-xl hover:-translate-y-0.5 transition-all group-hover:border-pine-400">
              <div className="flex items-center justify-between"><span className="font-mono text-[8px] uppercase tracking-[0.22em] text-maize-600 font-bold">{a.category}</span><span className="flex items-center gap-1 font-mono text-[9px] text-pine-500"><Clock size={9} />{a.read_minutes} min</span></div>
              <h2 className="mt-2 font-display font-semibold text-[15px] text-pine-950 leading-snug flex-1">{a.title}</h2>
              <p className="mt-1.5 text-[11px] text-pine-800 leading-snug line-clamp-2">{a.excerpt}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-bold text-pine-800 group-hover:gap-2 transition-all">Read guide <ChevronRight size={12} /></span>
            </Card>
          </button>
        ))}
        {list.length === 0 && <Card className="p-8 text-center text-[12px] text-pine-600 col-span-full">No guides match. Try clearing the search.</Card>}
      </div>
      <div className="mt-4 flex items-center gap-2 font-mono text-[8.5px] text-pine-500"><BookOpen size={11} /> Written by KALRO & GLHIS extension unit · peer-reviewed by the County Livestock Directorate · Kisii/Nyamira agro-ecological zone</div>
    </div>
  );
}
