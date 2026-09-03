from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "web" / "commercial.html"
RUNTIME = ROOT / "web" / "commercial-sales-story-v1.js"
s = P.read_text(encoding="utf-8")

css = """
.outcomeStrip{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:22px;max-width:760px}.outcome{border:1px solid #343443;background:linear-gradient(180deg,#15151f,#0d0d14);border-radius:18px;padding:15px 16px;box-shadow:0 16px 40px #0004}.outcome b{display:block;font-size:17px;letter-spacing:-.025em}.outcome span{display:block;margin-top:5px;color:#858597;font-size:11px;line-height:1.35}.mockchart{height:78px;margin-top:10px;border:1px solid #2b2b38;border-radius:13px;background:linear-gradient(180deg,#151520,#101018);padding:10px;display:flex;align-items:flex-end;gap:6px}.mockchart i{display:block;flex:1;border-radius:5px 5px 2px 2px;background:linear-gradient(180deg,#ff64b7,#8c5cff);min-height:10px;opacity:.92}.mockcaption{display:flex;justify-content:space-between;gap:10px;margin-top:7px;color:#858597;font-size:9px}.pricingProof{display:flex;gap:8px;flex-wrap:wrap;margin-top:17px}.pricingProof span{border:1px solid #343443;background:#111119;border-radius:999px;padding:8px 11px;font-size:11px;color:#c8c7d1}@media(max-width:650px){.outcomeStrip{grid-template-columns:1fr}.outcome{padding:13px 14px}}
""".strip()
if ".outcomeStrip{" not in s:
    s = s.replace("</style>", css + "</style>", 1)

old_eyebrow = '<div class="eyebrow">Better Leads · AI Sales Operations · Mobile CRM Control</div>'
new_eyebrow = '<div class="eyebrow">Better Leads · More Appointments · Full CRM Control</div>'
s = s.replace(old_eyebrow, new_eyebrow)

old_micro = '<div class="micro">Menos junk. Más prospectos reales. Más citas. Controla tu operación desde el celular.</div>'
new_micro = old_micro + '<div class="outcomeStrip"><div class="outcome"><b>More Qualified Leads</b><span>Reduce junk y prioriza oportunidades con mayor intención.</span></div><div class="outcome"><b>More Appointments</b><span>Seguimiento y automatización enfocados en convertir intención en citas.</span></div><div class="outcome"><b>More Sales</b><span>Pipeline, conversaciones y próximos pasos en la palma de tu mano.</span></div></div>'
if 'class="outcomeStrip"' not in s:
    s = s.replace(old_micro, new_micro, 1)

old_kpis = '<div class="kpis"><div class="kpi"><b>18</b><span>Leads</span></div><div class="kpi"><b>7</b><span>Alta intención</span></div><div class="kpi"><b>2</b><span>Por aprobar</span></div></div>'
new_kpis = old_kpis + '<div class="mockchart" aria-label="Vista previa de tendencia de calidad"><i style="height:28%"></i><i style="height:38%"></i><i style="height:34%"></i><i style="height:52%"></i><i style="height:61%"></i><i style="height:73%"></i><i style="height:88%"></i></div><div class="mockcaption"><span>Lead quality trend</span><span>7 days</span></div>'
if 'class="mockchart"' not in s:
    s = s.replace(old_kpis, new_kpis, 1)

pricing_lead = 'Tres planes simples. Empieza controlando tu operación desde el celular y aumenta protección, automatización, agentes y capacidad de equipo conforme crece tu negocio. Servicios de terceros —mensajería, llamadas, IA u otros consumos— pueden generar cargos de uso según tu plan.</p>'
pricing_new = pricing_lead + '<div class="pricingProof"><span>Basic $47/mo</span><span>Pro $97/mo · Recommended</span><span>Premium $147/mo · 2 users included</span><span>Extra Premium seat $47/mo</span></div>'
if 'class="pricingProof"' not in s:
    s = s.replace(pricing_lead, pricing_new, 1)

# Canonical trial is seven days everywhere. Remove stale legacy copy.
s = re.sub(r'14\s+d[ií]as\s+gratis\s+para\s+comenzar', '7 días gratis para comenzar', s, flags=re.I)
s = re.sub(r'14\s+days\s+free\s+to\s+start', '7 days free to start', s, flags=re.I)

# Inline the conversion narrative into commercial.html. The production Cloudflare
# commercial worker serves one self-contained HTML document, so external runtime
# dependencies are deliberately avoided here.
runtime = RUNTIME.read_text(encoding="utf-8").replace('</script>', '<\\/script>')
inline_tag = '<script id="cs-commercial-sales-story-v1">' + runtime + '</script>'
s = re.sub(r'<script\s+src="/commercial-sales-story-v1\.js[^>]*></script>', '', s, flags=re.I)
s = re.sub(r'<script\s+id="cs-commercial-sales-story-v1">[\s\S]*?</script>', '', s, flags=re.I)
s = s.replace('</body>', inline_tag + '</body>', 1)

# Keep the canonical 7-day trial explicit for search engines and no-JS visitors.
if 'data-cs-trial-seo="1"' not in s:
    seo = '<div data-cs-trial-seo="1" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">CloudSales includes a 7-day free trial. Cloudy coordinates CRM, lead-quality protection, marketing, follow-up, appointments and business operations through authorized connections.</div>'
    s = s.replace('</body>', seo + '</body>', 1)

P.write_text(s, encoding="utf-8")
print("CloudSales commercial UX + inline Cloudy sales-story patch applied")
