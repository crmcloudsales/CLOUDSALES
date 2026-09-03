from pathlib import Path
import re
html=Path('web/commercial.html')
js=Path('web/commercial-crm-bmp-v3.js').read_text()
s=html.read_text()
s=re.sub(r'<script id="cs-commercial-crm-bmp-v3">[\s\S]*?</script>','',s)
block='<script id="cs-commercial-crm-bmp-v3">'+js+'</script>'
s=s.replace('</body>',block+'</body>',1)
html.write_text(s)
print('wired commercial CRM BMP runtime')
