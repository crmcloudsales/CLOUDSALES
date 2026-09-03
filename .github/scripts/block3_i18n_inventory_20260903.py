from html.parser import HTMLParser
from pathlib import Path
import html as htmllib
import re

ROOT=Path(__file__).resolve().parents[2]
src=(ROOT/'web'/'commercial.html').read_text(encoding='utf-8')
class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.skip=0; self.items=[]
    def handle_starttag(self,tag,attrs):
        if tag in {'script','style','noscript','svg'}: self.skip+=1
    def handle_endtag(self,tag):
        if tag in {'script','style','noscript','svg'} and self.skip: self.skip-=1
    def handle_data(self,data):
        if self.skip:return
        s=re.sub(r'\s+',' ',htmllib.unescape(data)).strip()
        if s and not re.fullmatch(r'[×✕☰◉✦⌁◆↗▣✓•·]+',s): self.items.append(s)
p=P();p.feed(src)
seen=[]
for x in p.items:
    if x not in seen: seen.append(x)
out='\n'.join(f'{i+1:03d}\t{x}' for i,x in enumerate(seen))+'\n'
path=ROOT/'docs'/'site-i18n-static-inventory-20260903.txt'
path.parent.mkdir(parents=True,exist_ok=True);path.write_text(out,encoding='utf-8')
print(f'I18N_INVENTORY_OK {len(seen)}')
