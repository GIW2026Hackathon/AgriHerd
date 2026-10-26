/* ==========================================================================
   Architecture & Schema — in-app reader for /architecture.md & /schema.sql
   ========================================================================== */
import { useEffect, useState } from 'react';
import { FileText, Database, Download, ShieldCheck, Layers, Rocket } from 'lucide-react';
import { Card, PageHeader, Button } from '../components/ui';

function renderMarkdown(md: string): string {
  const esc = md.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const lines = esc.split('\n');
  const out: string[] = [];
  let inCode = false, inTable = false;
  for (const raw of lines) {
    const line = raw;
    if (line.trim().startsWith('```')) { inCode = !inCode; if (inCode) out.push('<pre class="bg-pine-950 text-pine-100 rounded-xl p-4 overflow-x-auto text-[10.5px] leading-relaxed my-3 font-mono">'); else out.push('</pre>'); continue; }
    if (inCode) { out.push(line); continue; }
    if (/^\|/.test(line.trim())) {
      if (!inTable) { out.push('<div class="overflow-x-auto my-3"><table class="w-full text-[11px] border border-pine-900/15 rounded-xl overflow-hidden">'); inTable = true; }
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const isSep = cells.every((c) => /^:?-{3,}:?$/.test(c));
      if (isSep) continue;
      const tagRow = out[out.length - 1]?.endsWith('</table>') ? 'td' : 'td';
      out.push('<tr class="border-b border-pine-900/10 even:bg-pine-50/50">' + cells.map((c) => `<td class="px-3 py-1.5 align-top">${inline(c)}</td>`).join('') + '</tr>');
      void tagRow;
      continue;
    } else if (inTable) { out.push('</table></div>'); inTable = false; }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) { const level = h[1].length; const cls = level === 1 ? 'font-display text-2xl font-semibold text-pine-950 mt-2 mb-3' : level === 2 ? 'font-display text-lg font-semibold text-pine-900 mt-6 mb-2 pb-1 border-b border-pine-200' : 'font-sans text-[13px] font-bold text-pine-900 mt-4 mb-1.5'; out.push(`<h${level} class="${cls}">${inline(h[2])}</h${level}>`); continue; }
    if (/^---+$/.test(line.trim())) { out.push('<hr class="my-4 border-pine-200" />'); continue; }
    if (/^>\s?/.test(line.trim())) { out.push(`<blockquote class="border-l-4 border-maize-400 bg-maize-400/10 pl-3 py-1.5 text-[11.5px] text-pine-900 my-3">${inline(line.replace(/^>\s?/, ''))}</blockquote>`); continue; }
    if (/^[-*]\s+/.test(line.trim())) { out.push(`<li class="ml-5 list-disc text-[12px] text-pine-900 leading-relaxed">${inline(line.trim().replace(/^[-*]\s+/, ''))}</li>`); continue; }
    if (/^\d+\.\s+/.test(line.trim())) { out.push(`<li class="ml-5 list-decimal text-[12px] text-pine-900 leading-relaxed">${inline(line.trim().replace(/^\d+\.\s+/, ''))}</li>`); continue; }
    if (line.trim() === '') { out.push('<div class="h-2"></div>'); continue; }
    out.push(`<p class="text-[12px] text-pine-900 leading-relaxed">${inline(line)}</p>`);
  }
  if (inTable) out.push('</table></div>');
  return out.join('\n');
}

const inline = (s: string) => s
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/`([^`]+)`/g, '<code class="font-mono text-[10.5px] bg-pine-100 text-pine-900 rounded px-1 py-0.5">$1</code>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="text-pine-700 underline font-semibold" href="$2">$1</a>');

export default function Docs() {
  const [tab, setTab] = useState<'architecture' | 'schema'>('architecture');
  const [content, setContent] = useState('');
  useEffect(() => {
    fetch(tab === 'architecture' ? '/architecture.md' : '/schema.sql').then((r) => r.text()).then(setContent);
  }, [tab]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Architecture & Data Model"
        sub="The Phase-1 deliverable that governs this build — open for review alongside the live system. Mission-critical documents, always accessible offline."
        actions={
          <div className="flex gap-2">
            <a href="/architecture.md" download><Button variant="outline" size="sm"><Download size={13} /> architecture.md</Button></a>
            <a href="/schema.sql" download><Button variant="outline" size="sm"><Download size={13} /> schema.sql</Button></a>
          </div>
        }
      />

      {/* Phase tracker */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-1.5 mb-4">
        {['1 · Architecture', '2 · Auth & RBAC', '3 · Registries', '4 · Triage & Vets', '5 · Claims & Audit', '6 · Surveillance', '7 · Reporting', '8 · Acceptance'].map((p, i) => (
          <div key={p} className="rounded-xl border border-emerald-300 bg-emerald-50 px-2 py-2 text-center">
            <div className="text-[9px] font-mono font-bold text-emerald-800 leading-tight">{p}</div>
            <div className="font-mono text-[8px] text-emerald-600 mt-0.5">✓ DELIVERED</div>
          </div>
        ))}
      </div>

      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-pine-900/10 pb-4">
          <button onClick={() => setTab('architecture')} className={`inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-bold border ${tab === 'architecture' ? 'bg-pine-950 text-maize-300 border-pine-950' : 'bg-white text-pine-900 border-pine-200'}`}><FileText size={14} /> architecture.md</button>
          <button onClick={() => setTab('schema')} className={`inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-bold border ${tab === 'schema' ? 'bg-pine-950 text-maize-300 border-pine-950' : 'bg-white text-pine-900 border-pine-200'}`}><Database size={14} /> schema.sql — PostgreSQL 15 / Supabase</button>
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[9px] text-pine-600"><ShieldCheck size={11} /> RLS deny-by-default · triggers-audited</span>
        </div>
        {tab === 'architecture' ? (
          <article dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        ) : (
          <pre className="bg-pine-950 text-pine-100 rounded-xl p-4 overflow-x-auto text-[10px] leading-relaxed font-mono max-h-[70vh] overflow-y-auto">{content}</pre>
        )}
      </Card>

      <div className="grid sm:grid-cols-3 gap-3 mt-4">
        {[
          { icon: <Layers size={16} />, t: 'Stack', s: 'Next.js App Router · React · TS · Tailwind · shadcn/ui patterns · Supabase (PG 15 + Auth) · Vercel AI SDK seam' },
          { icon: <ShieldCheck size={16} />, t: 'Security model', s: 'RLS deny-by-default, auth_role()/is_admin()/is_sponsor_member() helpers, SECURITY DEFINER audit trigger, zero PII in surveillance tier' },
          { icon: <Rocket size={16} />, t: 'Honesty contract', s: 'No fake integrations. M-Pesa payouts, live LLM triage, KVB API & govt DB links are explicitly out of scope — schema-ready seams only' },
        ].map((x) => (
          <Card key={x.t} className="p-4"><div className="flex items-center gap-2 text-pine-800"><span className="p-1.5 rounded-lg bg-pine-100">{x.icon}</span><b className="text-[12px]">{x.t}</b></div><p className="mt-1.5 text-[10.5px] text-pine-800/90 leading-snug">{x.s}</p></Card>
        ))}
      </div>
    </div>
  );
}
