from pathlib import Path
import json
import re

HTML = Path('web/clients/acanto/landing-v2.html')
STATE = Path('ops/acanto-site-state.json')
html = HTML.read_text(encoding='utf-8')

# Idempotency: if already patched, only refresh state and exit.
if 'acanto-condominiums-cloudsales-v7-gallery-video' not in html:
    # Production marker.
    html = re.sub(
        r'data-site-marker="[^"]+"',
        'data-site-marker="acanto-condominiums-cloudsales-v7-gallery-video"',
        html,
        count=1,
    )

    # Add compact gallery/video styles without disturbing the existing visual system.
    video_css = r'''
.videoGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:24px}.videoCard{background:#fff;border:1px solid rgba(66,46,35,.12);border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(45,31,24,.07)}.videoPoster{position:relative;aspect-ratio:16/10;overflow:hidden;background:#241b17}.videoPoster img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .45s ease}.videoCard:hover .videoPoster img{transform:scale(1.025)}.videoShade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(0,0,0,.58));display:flex;align-items:flex-end;padding:18px}.videoPlay{width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.94);display:grid;place-items:center;font-size:18px;color:#2c211b;box-shadow:0 4px 18px rgba(0,0,0,.18)}.videoCopy{padding:18px}.videoCopy h3{margin:0 0 8px}.videoCopy p{margin:0;color:var(--muted)}.videoMeta{display:inline-flex;margin-top:12px;padding:7px 10px;border-radius:999px;background:var(--sand);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}.galleryGrid.curated{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.galleryGrid.curated .gItem{min-height:260px}.galleryGrid.curated .gItem:nth-child(1),.galleryGrid.curated .gItem:nth-child(5){grid-column:span 2}.galleryGrid.curated .gItem img{height:100%;min-height:260px;object-fit:cover}@media(max-width:900px){.videoGrid{grid-template-columns:1fr}.galleryGrid.curated{grid-template-columns:1fr 1fr}.galleryGrid.curated .gItem:nth-child(1),.galleryGrid.curated .gItem:nth-child(5){grid-column:span 1}}@media(max-width:620px){.galleryGrid.curated{grid-template-columns:1fr}.galleryGrid.curated .gItem img{min-height:230px}}
'''
    html = html.replace('</style>', video_css + '</style>', 1)

    # Navigation: no direct price-list/inventory destination. Add videos as a first-class chapter.
    old_nav = '<a href="#gallery"><span data-en>Gallery</span><span data-es>Galería</span></a><a href="#inventory"><span data-en>Inventory</span><span data-es>Inventario</span></a>'
    new_nav = '<a href="#gallery"><span data-en>Gallery</span><span data-es>Galería</span></a><a href="#videos"><span data-en>Videos</span><span data-es>Videos</span></a><a href="#contact"><span data-en>Availability</span><span data-es>Disponibilidad</span></a>'
    if old_nav not in html:
        raise SystemExit('expected navigation fragment not found')
    html = html.replace(old_nav, new_nav, 1)

    # All previous inventory CTAs now lead to the secure availability form.
    html = html.replace('href="#inventory"', 'href="#contact"')
    html = html.replace('See current inventory', 'Check current availability')
    html = html.replace('Ver inventario actual', 'Consultar disponibilidad')
    html = html.replace('View 1BR inventory', 'Ask about 1BR')
    html = html.replace('View 2BR inventory', 'Ask about 2BR')
    html = html.replace('View 3BR inventory', 'Ask about 3BR')

    # Do not describe the site as a published price list. Contextual "From" pricing remains in product cards.
    html = html.replace('The supplied current price list includes', 'The supplied current inventory includes')
    html = html.replace('La lista vigente proporcionada incluye', 'El inventario vigente proporcionado incluye')
    html = html.replace('The supplied price list also states', 'The supplied inventory also states')
    html = html.replace('La lista proporcionada también indica', 'El inventario proporcionado también indica')
    html = html.replace('The supplied price list states', 'The supplied inventory states')
    html = html.replace('The supplied current price list states', 'The supplied current inventory states')
    html = html.replace('The supplied current Acanto price list states', 'The supplied current Acanto inventory states')

    # Replace the previous gallery with a focused, image-led gallery using project-supplied Acanto assets.
    gallery = '''<section class="section" id="gallery"><div class="wrap"><div class="sectionHead"><div class="eyebrow">Real Acanto photography</div><h2><span data-en>Explore the real property.</span><span data-es>Explora la propiedad real.</span></h2><p data-en>Actual Acanto interiors, furnished residences, tropical courtyard, pool and property views. Select any image to enlarge it.</p><p data-es>Interiores reales de Acanto, residencias amuebladas, patio tropical, piscina y vistas de la propiedad. Selecciona cualquier imagen para ampliarla.</p></div><div class="galleryGrid curated" id="galleryGrid">
<figure class="gItem" data-cat="one"><img loading="lazy" src="https://lh3.googleusercontent.com/d/1n87P3m3T-0opSwWM1DL55ztwpFk_rYdm=w1600" alt="Acanto furnished residence interior"><span class="gCap">Residence Interior</span></figure>
<figure class="gItem" data-cat="one"><img loading="lazy" src="https://lh3.googleusercontent.com/d/1ztRieRAiMYtJw0ZyV5Um0fZUROskFaco=w1400" alt="Acanto living area"><span class="gCap">Living Area</span></figure>
<figure class="gItem" data-cat="one"><img loading="lazy" src="https://lh3.googleusercontent.com/d/1YZ4ezy2SWcoIFtsOALSEwROc-fWfZyS_=w1400" alt="Acanto furnished condominium"><span class="gCap">Furnished Residence</span></figure>
<figure class="gItem" data-cat="one"><img loading="lazy" src="https://lh3.googleusercontent.com/d/10pkdCiURpp_sCa15bI9so7vSoSZHLcye=w1400" alt="Acanto condominium interior"><span class="gCap">Condominium Interior</span></figure>
<figure class="gItem" data-cat="one"><img loading="lazy" src="https://lh3.googleusercontent.com/d/1rXtOwxZmhdogKZdQwp8X1MY2RGSocM7c=w1600" alt="Acanto bedroom and residence detail"><span class="gCap">Residence Detail</span></figure>
<figure class="gItem" data-cat="one"><img loading="lazy" src="https://lh3.googleusercontent.com/d/1p1tMB_fpteOoqu8Eu7ARhe0hgcyPrsm1=w1400" alt="Acanto interior and balcony"><span class="gCap">Indoor / Outdoor Living</span></figure>
<figure class="gItem" data-cat="courtyard"><img loading="lazy" src="https://lh3.googleusercontent.com/d/1sf-SuEbhuXMM3KpcHBJjn9a3QBTHv0Yb=w1500" alt="Acanto tropical courtyard and pool"><span class="gCap">Courtyard &amp; Pool</span></figure>
<figure class="gItem" data-cat="courtyard"><img loading="lazy" src="https://lh3.googleusercontent.com/d/10PZFgEf_1jHCohtP1GIh_8n7Tc-tKKrC=w1500" alt="Acanto swimming pool"><span class="gCap">Swimming Pool</span></figure>
<figure class="gItem" data-cat="aerial"><img loading="lazy" src="https://lh3.googleusercontent.com/d/1G_zTFT0eu5yvfR4dU-aWgf-D0_FRqo1v=w1600" alt="Acanto property aerial view"><span class="gCap">Acanto Property</span></figure>
</div></div></section>'''
    gallery_pattern = r'<section class="section" id="gallery">.*?</section>\s*(?=<section[^>]*id="inventory")'
    html, gallery_count = re.subn(gallery_pattern, gallery + '\n', html, count=1, flags=re.S)
    if gallery_count != 1:
        raise SystemExit(f'gallery replacement count={gallery_count}')

    # Remove the direct 11-row price-list / inventory section completely.
    inventory_pattern = r'<section[^>]*id="inventory"[^>]*>.*?</section>\s*(?=<section[^>]*id="ownership")'
    html, inventory_count = re.subn(inventory_pattern, '', html, count=1, flags=re.S)
    if inventory_count != 1:
        raise SystemExit(f'inventory removal count={inventory_count}')

    # Video chapter. Campaign films are in final edit, so do not fabricate video URLs.
    videos = '''<section class="section sand" id="videos"><div class="wrap"><div class="sectionHead"><div class="eyebrow">Acanto films</div><h2><span data-en>See Acanto in motion.</span><span data-es>Descubre Acanto en movimiento.</span></h2><p data-en>The new Acanto cinematic property films are in final edit. This section is ready for the campaign masters as soon as they are approved.</p><p data-es>Los nuevos videos cinematográficos de Acanto están en edición final. Esta sección está lista para los masters de campaña en cuanto sean aprobados.</p></div><div class="videoGrid"><article class="videoCard"><div class="videoPoster"><img loading="lazy" src="https://lh3.googleusercontent.com/d/1jDphsspDlMJxBqi5QOY_Q9i8NIFZi_G9=w1200" alt="Acanto exterior and arrival film poster"><div class="videoShade"><span class="videoPlay" aria-hidden="true">▶</span></div></div><div class="videoCopy"><h3><span data-en>Arrival at Acanto</span><span data-es>Llegada a Acanto</span></h3><p data-en>Exterior, entrance and first impression.</p><p data-es>Exterior, entrada y primera impresión.</p><span class="videoMeta"><span data-en>Final edit in progress</span><span data-es>Edición final en proceso</span></span></div></article><article class="videoCard"><div class="videoPoster"><img loading="lazy" src="https://lh3.googleusercontent.com/d/1sf-SuEbhuXMM3KpcHBJjn9a3QBTHv0Yb=w1200" alt="Acanto courtyard and pool film poster"><div class="videoShade"><span class="videoPlay" aria-hidden="true">▶</span></div></div><div class="videoCopy"><h3><span data-en>The Acanto Oasis</span><span data-es>El oasis de Acanto</span></h3><p data-en>Courtyard, pool and boutique atmosphere.</p><p data-es>Patio, piscina y ambiente boutique.</p><span class="videoMeta"><span data-en>Final edit in progress</span><span data-es>Edición final en proceso</span></span></div></article><article class="videoCard"><div class="videoPoster"><img loading="lazy" src="https://lh3.googleusercontent.com/d/1n87P3m3T-0opSwWM1DL55ztwpFk_rYdm=w1200" alt="Acanto residence film poster"><div class="videoShade"><span class="videoPlay" aria-hidden="true">▶</span></div></div><div class="videoCopy"><h3><span data-en>Inside the Residence</span><span data-es>Dentro de la residencia</span></h3><p data-en>Real furnished interiors and the product buyers actually own.</p><p data-es>Interiores reales amueblados y el producto que realmente adquiere el comprador.</p><span class="videoMeta"><span data-en>Final edit in progress</span><span data-es>Edición final en proceso</span></span></div></article></div></div></section>'''
    ownership = re.search(r'<section[^>]*id="ownership"', html)
    if not ownership:
        raise SystemExit('ownership section not found')
    html = html[:ownership.start()] + videos + '\n' + html[ownership.start():]

    # A dropdown containing every unit and price is effectively another price list; keep unit choice, remove prices.
    html = re.sub(r'(Villa\s+\d+\s+—\s+[123]BR)\s+—\s+US\$[\d,]+', r'\1', html)

    # Ensure the lightbox includes curated gallery images (class already matches .gItem img).
    HTML.write_text(html, encoding='utf-8')

# Update operational source-of-truth state.
state = json.loads(STATE.read_text(encoding='utf-8'))
state['site_version'] = 'v7-gallery-video-contextual-pricing'
visual = state.setdefault('visual_content', {})
visual['production_gallery_items'] = 9
visual['gallery_curation'] = 'nine-item curated real-property gallery'
visual['filterable_gallery'] = False
visual['lightbox'] = True
visual['video_section'] = {
    'enabled': True,
    'campaign_film_slots': 3,
    'status': 'final_edit_pending_master_urls',
    'fabricated_video_urls': False,
}
pricing = state.setdefault('pricing_presentation', {})
pricing['direct_price_list_published'] = False
pricing['contextual_from_prices_allowed'] = True
pricing['unit_selector_prices_removed'] = True
pricing['availability_cta'] = 'secure_form'
verification = state.setdefault('verification', {})
verification['production_marker'] = 'acanto-condominiums-cloudsales-v7-gallery-video'
verification['gallery_count_verified'] = 9
verification['price_list_section_removed_source'] = True
verification['video_section_source_ready'] = True
notes = state.setdefault('notes', [])
for note in [
    'The public site no longer publishes the supplied 11-unit price list as a standalone section; contextual starting prices remain permitted in residence merchandising.',
    'The public unit-interest selector no longer reproduces per-villa prices.',
    'A dedicated Acanto video section is present; campaign video URLs are intentionally not fabricated while final edits are pending.'
]:
    if note not in notes:
        notes.append(note)
STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Hard assertions.
final = HTML.read_text(encoding='utf-8')
assert 'id="gallery"' in final
assert 'id="videos"' in final
assert 'id="inventory"' not in final
assert 'href="#inventory"' not in final
assert 'acanto-condominiums-cloudsales-v7-gallery-video' in final
assert final.count('class="gItem"') == 9
assert 'Villa 1 — 1BR — US$199,000' not in final
print('ACANTO gallery/videos/contextual-pricing patch complete')
