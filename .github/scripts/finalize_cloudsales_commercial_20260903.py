from pathlib import Path
import re
import json

ROOT = Path(__file__).resolve().parents[2]
SELF = Path(__file__).resolve()

# CloudSales canonical source of truth — 2026-09-03
PINK = '#F955B6'
PURPLE = '#2D0A4A'
WHITE = '#F3F4F8'
CANVAS = '#08070D'
VIOLET = '#C13BE4'
PANEL = '#121019'
PANEL2 = '#17141F'
LINE = '#37323F'
MUTED = '#AAA7B2'

TEXT_SUFFIXES = {'.html','.htm','.css','.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.md','.txt','.yml','.yaml','.py','.sql'}
SKIP_DIRS = {'.git','node_modules','.next','dist','build','coverage'}

# Permanently remove the obsolete 14-day trial from all CloudSales text sources.
TRIAL_PATTERNS = [
    (r'14\s*d[ií]as', '7 días'),
    (r'14\s*days', '7 days'),
    (r'14[-\s]day', '7-day'),
    (r'14\s*jours', '7 jours'),
    (r'14\s*giorni', '7 giorni'),
    (r'14\s*Tage', '7 Tage'),
    (r'14\s+kostenlosen\s+Tagen', '7 kostenlosen Tagen'),
    (r'14\s*дней', '7 дней'),
    (r'14-днев', '7-днев'),
    (r'14\s*ימים', '7 ימים'),
    (r'14\s*天', '7 天'),
    (r'14日間', '7日間'),
    (r'14\s*يوماً', '7 أيام'),
    (r'14\s*يومًا', '7 أيام'),
    (r'14\s*أيام', '7 أيام'),
]

# Legacy CloudSales palette tokens that are no longer allowed in production web/release code.
COLOR_REPLACEMENTS = {
    '#ff2b9b': PINK, '#FF2B9B': PINK,
    '#f52ab6': PINK, '#F52AB6': PINK,
    '#f02aa8': PINK, '#F02AA8': PINK,
    '#ff49a9': PINK, '#FF49A9': PINK,
    '#ff64b7': PINK, '#FF64B7': PINK,
    '#ff79bf': PINK, '#FF79BF': PINK,
    '#ff7bc5': PINK, '#FF7BC5': PINK,
    '#ff8dcc': PINK, '#FF8DCC': PINK,
    '#ff91ca': PINK, '#FF91CA': PINK,
    '#ff9dcc': PINK, '#FF9DCC': PINK,
    '#8c5cff': VIOLET, '#8C5CFF': VIOLET,
    '#c028e8': VIOLET, '#C028E8': VIOLET,
    '#b72cff': VIOLET, '#B72CFF': VIOLET,
    '#a67cff': VIOLET, '#A67CFF': VIOLET,
    '#07070d': CANVAS, '#07070D': CANVAS,
    '#07070b': CANVAS, '#07070B': CANVAS,
    '#08070e': CANVAS, '#08070E': CANVAS,
    '#351437': PURPLE, '#3b1239': PURPLE, '#3B1239': PURPLE,
    '#2e1437': PURPLE, '#2E1437': PURPLE, '#2a102b': PURPLE, '#2A102B': PURPLE,
    '#f8f7fb': WHITE, '#F8F7FB': WHITE, '#f8f7fa': WHITE, '#F8F7FA': WHITE,
    '#f7f7fb': WHITE, '#F7F7FB': WHITE, '#f1ecf8': WHITE, '#F1ECF8': WHITE,
}

# Spanish is the canonical visible-source language. The i18n layer translates it.
FINAL_TRANSLATIONS = {
'en': {
 'IA trabajando por ti · Mejores leads · Tu CRM en la palma de tu mano':'AI working for you · Better leads · Your CRM in the palm of your hand',
 'La IA trabaja por ti.':'AI works for you.','Tú mantienes el control.':'You stay in control.',
 'CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.':'CloudSales operates on top of your CRM: Cloudy coordinates work and priorities, AgentCloud engages prospects, and the quality layer helps reduce junk leads and prioritize real opportunities. You review, decide, and control the operation from your phone.',
 'No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.':'Not another CRM. Not another app you have to manage. It is the AI operating layer working on top of your business.',
 'Prospectos de mayor calidad':'More Qualified Leads','Reduce junk leads y prioriza oportunidades con mayor intención.':'Reduce junk leads and prioritize higher-intent opportunities.','Más citas':'More Appointments','Seguimiento y automatización enfocados en convertir intención en citas.':'Follow-up and automation focused on turning intent into appointments.','Más ventas':'More Sales','Pipeline, conversaciones y próximos pasos en la palma de tu mano.':'Pipeline, conversations and next steps in the palm of your hand.',
 'Cloudy activo':'Cloudy online','Inicio':'Home','Alta intención':'High intent','Por aprobar':'Pending approval','Tendencia de calidad':'Lead quality trend','7 días':'7 days',
 'Mejores prospectos':'Better Leads','Control del CRM':'CRM Control','Citas':'Appointments','Automatización':'Automation','Calidad de prospectos':'Lead Quality','Dominios':'Domains',
 'Mejores prospectos. Control total de tu CRM.':'Better Leads. Full CRM Control.','Basic $47/mes':'Basic $47/mo','Pro $97/mes · Recomendado':'Pro $97/mo · Recommended','Premium $147/mes · Incluye 2 usuarios':'Premium $147/mo · Includes 2 users',
 'Control total de tu CRM':'Full control of your CRM','Prospectos, pipeline y citas':'Leads, pipeline and appointments','Asistente de IA Cloudy':'Cloudy AI Assistant','Monitoreo de calidad de prospectos':'Lead quality monitoring','Todo Basic':'Everything in Basic','Junk Lead Firewall + calidad de prospectos con IA':'Junk Lead Firewall + AI lead quality','Calificación y seguimiento automatizado':'Automated qualification and follow-up','Automatización avanzada + señales de datos':'Advanced automation + data signals','Todo Pro':'Everything in Pro','Incluye 2 usuarios':'Includes 2 users','Agentes avanzados de IA y automatización':'Advanced AI agents & automation','Más conexiones + control de equipo':'More connections + team control','Prioridad de automatización':'Priority automation',
 'Programa de Afiliados':'Affiliate Program','Términos y Condiciones':'Terms & Conditions','Política de Privacidad':'Privacy Policy','CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR':'CONNECT YOUR CRM AND WATCH CLOUDY WORK'
},
'fr': {
 'IA trabajando por ti · Mejores leads · Tu CRM en la palma de tu mano':'L’IA travaille pour vous · De meilleurs prospects · Votre CRM dans la paume de votre main','La IA trabaja por ti.':'L’IA travaille pour vous.','Tú mantienes el control.':'Vous gardez le contrôle.','CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.':'CloudSales fonctionne au-dessus de votre CRM : Cloudy coordonne les tâches et les priorités, AgentCloud échange avec les prospects et la couche de qualité aide à réduire les faux leads et à prioriser les vraies opportunités. Vous contrôlez l’opération depuis votre téléphone.','No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.':'Ce n’est pas un autre CRM ni une autre application à administrer. C’est la couche d’IA qui travaille sur votre activité.','Prospectos de mayor calidad':'Prospects de meilleure qualité','Reduce junk leads y prioriza oportunidades con mayor intención.':'Réduisez les faux leads et priorisez les opportunités à forte intention.','Más citas':'Plus de rendez-vous','Seguimiento y automatización enfocados en convertir intención en citas.':'Suivi et automatisation conçus pour transformer l’intention en rendez-vous.','Más ventas':'Plus de ventes','Pipeline, conversaciones y próximos pasos en la palma de tu mano.':'Pipeline, conversations et prochaines actions dans la paume de votre main.','Cloudy activo':'Cloudy actif','Inicio':'Accueil','Alta intención':'Forte intention','Por aprobar':'À approuver','Tendencia de calidad':'Tendance de qualité','7 días':'7 jours','Mejores prospectos':'Meilleurs prospects','Control del CRM':'Contrôle du CRM','Citas':'Rendez-vous','Automatización':'Automatisation','Calidad de prospectos':'Qualité des prospects','Dominios':'Domaines','Mejores prospectos. Control total de tu CRM.':'Meilleurs prospects. Contrôle total de votre CRM.','Incluye 2 usuarios':'Inclut 2 utilisateurs','Programa de Afiliados':'Programme d’affiliation','Términos y Condiciones':'Conditions générales','Política de Privacidad':'Politique de confidentialité','CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR':'CONNECTEZ VOTRE CRM ET REGARDEZ CLOUDY TRAVAILLER'
},
'it': {
 'IA trabajando por ti · Mejores leads · Tu CRM en la palma de tu mano':'L’IA lavora per te · Lead migliori · Il tuo CRM nel palmo della mano','La IA trabaja por ti.':'L’IA lavora per te.','Tú mantienes el control.':'Tu mantieni il controllo.','CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.':'CloudSales opera sopra il tuo CRM: Cloudy coordina attività e priorità, AgentCloud interagisce con i prospect e il livello di qualità aiuta a ridurre i lead spazzatura e a dare priorità alle opportunità reali. Tu controlli tutto dal telefono.','No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.':'Non è un altro CRM né un’altra app da gestire. È il livello di IA che lavora sulla tua operatività.','Prospectos de mayor calidad':'Lead di qualità superiore','Reduce junk leads y prioriza oportunidades con mayor intención.':'Riduci i lead spazzatura e dai priorità alle opportunità con maggiore intenzione.','Más citas':'Più appuntamenti','Seguimiento y automatización enfocados en convertir intención en citas.':'Follow-up e automazione pensati per trasformare l’intenzione in appuntamenti.','Más ventas':'Più vendite','Pipeline, conversaciones y próximos pasos en la palma de tu mano.':'Pipeline, conversazioni e prossime azioni nel palmo della mano.','Cloudy activo':'Cloudy attivo','Inicio':'Home','Alta intención':'Alta intenzione','Por aprobar':'Da approvare','Tendencia de calidad':'Andamento qualità','7 días':'7 giorni','Mejores prospectos':'Lead migliori','Control del CRM':'Controllo CRM','Citas':'Appuntamenti','Automatización':'Automazione','Calidad de prospectos':'Qualità lead','Dominios':'Domini','Mejores prospectos. Control total de tu CRM.':'Lead migliori. Controllo completo del tuo CRM.','Incluye 2 usuarios':'Include 2 utenti','Programa de Afiliados':'Programma affiliati','Términos y Condiciones':'Termini e condizioni','Política de Privacidad':'Informativa sulla privacy','CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR':'COLLEGA IL TUO CRM E GUARDA CLOUDY LAVORARE'
},
'pt-BR': {
 'IA trabajando por ti · Mejores leads · Tu CRM en la palma de tu mano':'IA trabalhando por você · Leads melhores · Seu CRM na palma da mão','La IA trabaja por ti.':'A IA trabalha por você.','Tú mantienes el control.':'Você mantém o controle.','CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.':'O CloudSales opera sobre o seu CRM: Cloudy coordena tarefas e prioridades, AgentCloud atende prospects e a camada de qualidade ajuda a reduzir leads ruins e priorizar oportunidades reais. Você controla a operação pelo celular.','No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.':'Não é outro CRM nem outro app para administrar. É a camada de IA trabalhando sobre a sua operação.','Prospectos de mayor calidad':'Leads de melhor qualidade','Reduce junk leads y prioriza oportunidades con mayor intención.':'Reduza leads ruins e priorize oportunidades com maior intenção.','Más citas':'Mais reuniões','Seguimiento y automatización enfocados en convertir intención en citas.':'Follow-up e automação focados em transformar intenção em reuniões.','Más ventas':'Mais vendas','Pipeline, conversaciones y próximos pasos en la palma de tu mano.':'Pipeline, conversas e próximos passos na palma da mão.','Cloudy activo':'Cloudy ativo','Inicio':'Início','Alta intención':'Alta intenção','Por aprobar':'Aguardando aprovação','Tendencia de calidad':'Tendência de qualidade','7 días':'7 dias','Mejores prospectos':'Leads melhores','Control del CRM':'Controle do CRM','Citas':'Reuniões','Automatización':'Automação','Calidad de prospectos':'Qualidade dos leads','Dominios':'Domínios','Mejores prospectos. Control total de tu CRM.':'Leads melhores. Controle total do seu CRM.','Incluye 2 usuarios':'Inclui 2 usuários','Programa de Afiliados':'Programa de Afiliados','Términos y Condiciones':'Termos e Condições','Política de Privacidad':'Política de Privacidade','CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR':'CONECTE SEU CRM E VEJA CLOUDY TRABALHAR'
},
'de': {
 'IA trabajando por ti · Mejores leads · Tu CRM en la palma de tu mano':'KI arbeitet für Sie · Bessere Leads · Ihr CRM in Ihrer Hand','La IA trabaja por ti.':'KI arbeitet für Sie.','Tú mantienes el control.':'Sie behalten die Kontrolle.','CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.':'CloudSales arbeitet auf Ihrem CRM: Cloudy koordiniert Aufgaben und Prioritäten, AgentCloud betreut Interessenten und die Qualitätsebene hilft, Junk-Leads zu reduzieren und echte Chancen zu priorisieren. Sie steuern den Betrieb vom Smartphone aus.','No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.':'Kein weiteres CRM und keine weitere App, die Sie verwalten müssen. Es die KI-Ebene, die auf Ihrem Betrieb arbeitet.','Prospectos de mayor calidad':'Hochwertigere Leads','Reduce junk leads y prioriza oportunidades con mayor intención.':'Reduzieren Sie Junk-Leads und priorisieren Sie Chancen mit hoher Kaufabsicht.','Más citas':'Mehr Termine','Seguimiento y automatización enfocados en convertir intención en citas.':'Follow-up und Automatisierung, die Interesse in Termine verwandeln.','Más ventas':'Mehr Verkäufe','Pipeline, conversaciones y próximos pasos en la palma de tu mano.':'Pipeline, Gespräche und nächste Schritte direkt in Ihrer Hand.','Cloudy activo':'Cloudy aktiv','Inicio':'Start','Alta intención':'Hohe Absicht','Por aprobar':'Zur Freigabe','Tendencia de calidad':'Qualitätstrend','7 días':'7 Tage','Mejores prospectos':'Bessere Leads','Control del CRM':'CRM-Kontrolle','Citas':'Termine','Automatización':'Automatisierung','Calidad de prospectos':'Lead-Qualität','Dominios':'Domains','Mejores prospectos. Control total de tu CRM.':'Bessere Leads. Volle Kontrolle über Ihr CRM.','Incluye 2 usuarios':'Enthält 2 Benutzer','Programa de Afiliados':'Partnerprogramm','Términos y Condiciones':'Allgemeine Geschäftsbedingungen','Política de Privacidad':'Datenschutzrichtlinie','CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR':'VERBINDEN SIE IHR CRM UND SEHEN SIE CLOUDY BEI DER ARBEIT ZU'
},
'ar-AE': {
 'IA trabajando por ti · Mejores leads · Tu CRM en la palma de tu mano':'الذكاء الاصطناعي يعمل من أجلك · عملاء محتملون أفضل · نظام CRM في راحة يدك','La IA trabaja por ti.':'الذكاء الاصطناعي يعمل من أجلك.','Tú mantienes el control.':'أنت تحتفظ بالتحكم.','CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.':'يعمل CloudSales فوق نظام CRM الخاص بك: ينسق Cloudy المهام والأولويات، ويتعامل AgentCloud مع العملاء المحتملين، وتساعد طبقة الجودة على تقليل العملاء غير الصالحين وإعطاء الأولوية للفرص الحقيقية. ويمكنك التحكم في العملية من هاتفك.','No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.':'ليس نظام CRM آخر ولا تطبيقًا آخر تحتاج إلى إدارته. إنها طبقة الذكاء الاصطناعي التي تعمل فوق عملياتك.','Prospectos de mayor calidad':'عملاء محتملون بجودة أعلى','Reduce junk leads y prioriza oportunidades con mayor intención.':'قلل العملاء غير الصالحين وأعط الأولوية للفرص الأعلى نية.','Más citas':'مواعيد أكثر','Seguimiento y automatización enfocados en convertir intención en citas.':'متابعة وأتمتة لتحويل النية إلى مواعيد.','Más ventas':'مبيعات أكثر','Pipeline, conversaciones y próximos pasos en la palma de tu mano.':'مسار المبيعات والمحادثات والخطوات التالية في راحة يدك.','Cloudy activo':'Cloudy نشط','Inicio':'الرئيسية','Alta intención':'نية مرتفعة','Por aprobar':'بانتظار الموافقة','Tendencia de calidad':'اتجاه الجودة','7 días':'7 أيام','Mejores prospectos':'عملاء محتملون أفضل','Control del CRM':'التحكم في CRM','Citas':'المواعيد','Automatización':'الأتمتة','Calidad de prospectos':'جودة العملاء المحتملين','Dominios':'النطاقات','Mejores prospectos. Control total de tu CRM.':'عملاء محتملون أفضل. تحكم كامل في CRM.','Incluye 2 usuarios':'يشمل مستخدمين اثنين','Programa de Afiliados':'برنامج الشركاء','Términos y Condiciones':'الشروط والأحكام','Política de Privacidad':'سياسة الخصوصية','CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR':'اربط CRM وشاهد CLOUDY يعمل'
},
'ru': {
 'IA trabajando por ti · Mejores leads · Tu CRM en la palma de tu mano':'ИИ работает за вас · Более качественные лиды · CRM у вас на ладони','La IA trabaja por ti.':'ИИ работает за вас.','Tú mantienes el control.':'Вы сохраняете контроль.','CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.':'CloudSales работает поверх вашей CRM: Cloudy координирует задачи и приоритеты, AgentCloud общается с потенциальными клиентами, а слой качества помогает сокращать мусорные лиды и приоритизировать реальные возможности. Вы управляете операциями с телефона.','No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.':'Это не еще одна CRM и не еще одно приложение, которым нужно управлять. Это слой ИИ, работающий поверх ваших операций.','Prospectos de mayor calidad':'Более качественные лиды','Reduce junk leads y prioriza oportunidades con mayor intención.':'Сокращайте мусорные лиды и приоритизируйте возможности с высоким намерением.','Más citas':'Больше встреч','Seguimiento y automatización enfocados en convertir intención en citas.':'Сопровождение и автоматизация для превращения намерения во встречи.','Más ventas':'Больше продаж','Pipeline, conversaciones y próximos pasos en la palma de tu mano.':'Воронка, разговоры и следующие шаги у вас на ладони.','Cloudy activo':'Cloudy активен','Inicio':'Главная','Alta intención':'Высокий интерес','Por aprobar':'Ожидает одобрения','Tendencia de calidad':'Динамика качества','7 días':'7 дней','Mejores prospectos':'Лучшие лиды','Control del CRM':'Контроль CRM','Citas':'Встречи','Automatización':'Автоматизация','Calidad de prospectos':'Качество лидов','Dominios':'Домены','Mejores prospectos. Control total de tu CRM.':'Лучшие лиды. Полный контроль CRM.','Incluye 2 usuarios':'Включает 2 пользователей','Programa de Afiliados':'Партнерская программа','Términos y Condiciones':'Условия использования','Política de Privacidad':'Политика конфиденциальности','CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR':'ПОДКЛЮЧИТЕ CRM И ПОСМОТРИТЕ, КАК РАБОТАЕТ CLOUDY'
},
'he': {
 'IA trabajando por ti · Mejores leads · Tu CRM en la palma de tu mano':'ה-AI עובד בשבילך · לידים איכותיים יותר · ה-CRM בכף היד שלך','La IA trabaja por ti.':'ה-AI עובד בשבילך.','Tú mantienes el control.':'השליטה נשארת בידיים שלך.','CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.':'CloudSales פועל מעל ה-CRM שלך: Cloudy מתאם משימות וסדרי עדיפויות, AgentCloud מטפל בלידים ושכבת האיכות עוזרת לצמצם לידים לא רלוונטיים ולתעדף הזדמנויות אמיתיות. השליטה נשארת אצלך מהטלפון.','No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.':'זה לא עוד CRM ולא עוד אפליקציה שצריך לנהל. זו שכבת ה-AI שעובדת מעל הפעילות שלך.','Prospectos de mayor calidad':'לידים איכותיים יותר','Reduce junk leads y prioriza oportunidades con mayor intención.':'צמצם לידים לא רלוונטיים ותעדף הזדמנויות עם כוונה גבוהה.','Más citas':'יותר פגישות','Seguimiento y automatización enfocados en convertir intención en citas.':'מעקב ואוטומציה שממירים כוונה לפגישות.','Más ventas':'יותר מכירות','Pipeline, conversaciones y próximos pasos en la palma de tu mano.':'פייפליין, שיחות והצעדים הבאים בכף היד שלך.','Cloudy activo':'Cloudy פעיל','Inicio':'ראשי','Alta intención':'כוונה גבוהה','Por aprobar':'ממתין לאישור','Tendencia de calidad':'מגמת איכות','7 días':'7 ימים','Mejores prospectos':'לידים טובים יותר','Control del CRM':'שליטה ב-CRM','Citas':'פגישות','Automatización':'אוטומציה','Calidad de prospectos':'איכות לידים','Dominios':'דומיינים','Mejores prospectos. Control total de tu CRM.':'לידים טובים יותר. שליטה מלאה ב-CRM.','Incluye 2 usuarios':'כולל 2 משתמשים','Programa de Afiliados':'תוכנית שותפים','Términos y Condiciones':'תנאים והגבלות','Política de Privacidad':'מדיניות פרטיות','CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR':'חבר את ה-CRM וצפה ב-CLOUDY עובד'
},
'zh-CN': {
 'IA trabajando por ti · Mejores leads · Tu CRM en la palma de tu mano':'AI 为你工作 · 更优质的销售线索 · CRM 尽在掌中','La IA trabaja por ti.':'AI 为你工作。','Tú mantienes el control.':'控制权始终在你手中。','CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.':'CloudSales 运行在你的 CRM 之上：Cloudy 协调任务与优先级，AgentCloud 与潜在客户互动，质量层帮助减少无效线索并优先处理真实机会。你可以从手机上审核、决策并掌控运营。','No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.':'它不是另一个 CRM，也不是另一款需要你管理的应用，而是运行在业务之上的 AI 操作层。','Prospectos de mayor calidad':'更高质量的销售线索','Reduce junk leads y prioriza oportunidades con mayor intención.':'减少无效线索，并优先处理意向更高的机会。','Más citas':'更多预约','Seguimiento y automatización enfocados en convertir intención en citas.':'通过跟进和自动化将意向转化为预约。','Más ventas':'更多销售','Pipeline, conversaciones y próximos pasos en la palma de tu mano.':'销售管道、对话和下一步尽在掌中。','Cloudy activo':'Cloudy 在线','Inicio':'首页','Alta intención':'高意向','Por aprobar':'待审批','Tendencia de calidad':'质量趋势','7 días':'7 天','Mejores prospectos':'更优质的线索','Control del CRM':'CRM 控制','Citas':'预约','Automatización':'自动化','Calidad de prospectos':'线索质量','Dominios':'域名','Mejores prospectos. Control total de tu CRM.':'更优质的线索。全面掌控 CRM。','Incluye 2 usuarios':'包含 2 位用户','Programa de Afiliados':'联盟计划','Términos y Condiciones':'条款与条件','Política de Privacidad':'隐私政策','CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR':'连接你的 CRM，看看 CLOUDY 如何工作'
},
'ja': {
 'IA trabajando por ti · Mejores leads · Tu CRM en la palma de tu mano':'AIがあなたのために働く · より質の高いリード · CRMを手のひらで管理','La IA trabaja por ti.':'AIがあなたのために働きます。','Tú mantienes el control.':'主導権はあなたにあります。','CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.':'CloudSalesはCRMの上で動作します。Cloudyがタスクと優先順位を調整し、AgentCloudが見込み客に対応し、品質レイヤーが無効なリードを減らして本当の商談を優先します。スマートフォンから確認・判断・管理できます。','No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.':'もう一つのCRMでも、管理すべきアプリでもありません。業務の上で働くAIオペレーションレイヤーです。','Prospectos de mayor calidad':'より質の高いリード','Reduce junk leads y prioriza oportunidades con mayor intención.':'無効なリードを減らし、意向の高い商談を優先します。','Más citas':'より多くの商談','Seguimiento y automatización enfocados en convertir intención en citas.':'フォローアップと自動化で関心を商談につなげます。','Más ventas':'より多くの売上','Pipeline, conversaciones y próximos pasos en la palma de tu mano.':'パイプライン、会話、次のアクションを手のひらで管理。','Cloudy activo':'Cloudy稼働中','Inicio':'ホーム','Alta intención':'高い意向','Por aprobar':'承認待ち','Tendencia de calidad':'品質トレンド','7 días':'7日間','Mejores prospectos':'より良いリード','Control del CRM':'CRM管理','Citas':'商談','Automatización':'自動化','Calidad de prospectos':'リード品質','Dominios':'ドメイン','Mejores prospectos. Control total de tu CRM.':'より良いリード。CRMを完全に管理。','Incluye 2 usuarios':'2ユーザーを含む','Programa de Afiliados':'アフィリエイトプログラム','Términos y Condiciones':'利用規約','Política de Privacidad':'プライバシーポリシー','CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR':'CRMを接続してCLOUDYの働きを確認'
}
}

TECHNICAL_EXACT = {
 'CloudSales','Cloudy','AgentCloud','CRM','API','SEO','PWA','OAuth','WhatsApp','Meta','Google','TikTok','LinkedIn','YouTube','Stripe','HighLevel','Salesforce','HubSpot','Zoho CRM','Pipedrive','monday CRM','Freshsales','Close','Copper','Twenty','Basic','Pro','Premium','CloudCo','Junk Lead Firewall','WAF','Conversion API','Web Events','CRM Events','Data Signals','Attribution','Audiences','USD','Academy'
}


def txt(path: Path):
    try:
        return path.read_text(encoding='utf-8')
    except Exception:
        return None


def write(path: Path, content: str):
    path.write_text(content, encoding='utf-8')


def replace_trial_phrases(s: str) -> str:
    for pat, repl in TRIAL_PATTERNS:
        s = re.sub(pat, repl, s, flags=re.I)
    return s


def canonical_colors(s: str) -> str:
    for old,new in COLOR_REPLACEMENTS.items():
        s=s.replace(old,new)
    return s


def all_text_files():
    for p in ROOT.rglob('*'):
        if not p.is_file() or p == SELF:
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if p.suffix.lower() in TEXT_SUFFIXES:
            yield p


# 1) Universal CloudSales cleanup: obsolete 14-day trial is forbidden everywhere.
for p in all_text_files():
    s=txt(p)
    if s is None: continue
    n=replace_trial_phrases(s)
    # Canonicalize visual tokens in actual product/release sources, not prose history.
    rel=p.relative_to(ROOT).as_posix()
    if rel.startswith('web/') or rel.startswith('supabase/functions/'):
        n=canonical_colors(n)
    if n!=s: write(p,n)

# 2) Canonical commercial HTML: Spanish base source, one visual truth, robust dark-browser behavior.
p=ROOT/'web/commercial.html'
h=txt(p) or ''
h=canonical_colors(replace_trial_phrases(h))
# browser dark-mode guard; the site is intentionally dark, so browsers must not auto-darken it again
if '<meta name="color-scheme" content="dark">' not in h:
    h=h.replace('<meta name="theme-color" content="#08070D">','<meta name="theme-color" content="#08070D"><meta name="color-scheme" content="dark">',1)
# canonical root variables
h=re.sub(r':root\{[^}]*--max:1200px\}',':root{--bg:#08070D;--bg2:#121019;--panel:#121019;--panel2:#17141F;--line:#37323F;--text:#F3F4F8;--muted:#AAA7B2;--pink:#F955B6;--violet:#C13BE4;--blue:#274ED3;--green:#5de6a2;--max:1200px}',h,count=1)
h=h.replace('html{scroll-behavior:smooth}','html{scroll-behavior:smooth;color-scheme:dark!important;forced-color-adjust:none!important;-webkit-text-size-adjust:100%}')
# canonical hero + outcome source copy (Spanish base, translated at runtime)
old=re.compile(r'<div class="eyebrow">Better Leads · More Appointments · Full CRM Control</div><h1>Mejores leads\.<br><span class="grad">Tu CRM en la palma de tu mano\.</span></h1><p>CloudSales ayuda a reducir junk leads, prioriza oportunidades reales y simplifica tu operación comercial\. Leads, conversaciones, citas, pipeline, automatización y Cloudy desde una sola aplicación\.</p>',re.S)
new='<div class="eyebrow">IA trabajando por ti · Mejores leads · Tu CRM en la palma de tu mano</div><h1>La IA trabaja por ti.<br><span class="grad">Tú mantienes el control.</span></h1><p>CloudSales opera sobre tu CRM: Cloudy coordina tareas y prioridades, AgentCloud atiende prospectos y la capa de calidad ayuda a reducir junk leads y priorizar oportunidades reales. Tú revisas, decides y controlas tu operación desde el celular.</p>'
h=old.sub(new,h,count=1)
h=re.sub(r'<div class="micro"><b>7 días gratis</b> · [^<]*</div>','<div class="micro"><b>7 días gratis</b> · No es otro CRM. No es otra app que tienes que administrar. Es la capa de IA que trabaja sobre tu operación.</div>',h,count=1)
h=h.replace('<div class="outcome"><b>More Qualified Leads</b><span>Reduce junk y prioriza oportunidades con mayor intención.</span></div>','<div class="outcome"><b>Prospectos de mayor calidad</b><span>Reduce junk leads y prioriza oportunidades con mayor intención.</span></div>')
h=h.replace('<div class="outcome"><b>More Appointments</b><span>Seguimiento y automatización enfocados en convertir intención en citas.</span></div>','<div class="outcome"><b>Más citas</b><span>Seguimiento y automatización enfocados en convertir intención en citas.</span></div>')
h=h.replace('<div class="outcome"><b>More Sales</b><span>Pipeline, conversaciones y próximos pasos en la palma de tu mano.</span></div>','<div class="outcome"><b>Más ventas</b><span>Pipeline, conversaciones y próximos pasos en la palma de tu mano.</span></div>')
# remove avoidable mixed language in base mock/navigation/chips
for a,b in {
 '>Lead Quality<':'>Calidad de prospectos<','>Domains<':'>Dominios<','>Cloudy online<':'>Cloudy activo<','>Home<':'>Inicio<','>High intent<':'>Alta intención<','>Pending approval<':'>Por aprobar<','>Lead quality trend<':'>Tendencia de calidad<','>7 days<':'>7 días<','>Better Leads<':'>Mejores prospectos<','>CRM Control<':'>Control del CRM<','>Appointments<':'>Citas<','>Automation<':'>Automatización<','>Lead Quality<':'>Calidad de prospectos<'
}.items(): h=h.replace(a,b)
# pricing truth from subscription_plans source of truth
h=h.replace('<h2>Better Leads. Full CRM Control.</h2>','<h2>Mejores prospectos. Control total de tu CRM.</h2>')
h=re.sub(r'<div class="pricingProof">[\s\S]*?</div><div id="trialPricingBanner"','<div class="pricingProof"><span>Basic $47/mes</span><span>Pro $97/mes · Recomendado</span><span>Premium $147/mes · Incluye 2 usuarios</span></div><div id="trialPricingBanner"',h,count=1)
h=h.replace('<li>Full control of your CRM</li>','<li>Control total de tu CRM</li>').replace('<li>Leads, pipeline y citas</li>','<li>Prospectos, pipeline y citas</li>').replace('<li>Cloudy AI Assistant</li>','<li>Asistente de IA Cloudy</li>').replace('<li>Lead Quality monitoring</li>','<li>Monitoreo de calidad de prospectos</li>')
h=h.replace('<li>Junk Lead Firewall + AI Lead Quality</li>','<li>Junk Lead Firewall + calidad de prospectos con IA</li>').replace('<li>Advanced AI Agents & Automation</li>','<li>Agentes avanzados de IA y automatización</li>').replace('<li>Automatización avanzada + Data Signals</li>','<li>Automatización avanzada + señales de datos</li>')
h=h.replace('<li>suscripción individual por persona</li>','<li>Incluye 2 usuarios</li>').replace('<li>Asientos adicionales: $47 USD / mes</li>','')
h=h.replace('<div style="margin-top:10px">CloudSales · Better Leads · Full CRM Control · un producto de CloudCo.</div>','<div style="margin-top:10px">CloudSales · IA trabajando por ti · Mejores prospectos · Control total desde tu celular · un producto de CloudCo.</div>')
h=h.replace('>Affiliate Program</a>','>Programa de Afiliados</a>').replace('>Terms & Conditions</a>','>Términos y Condiciones</a>').replace('>Privacy Policy</a>','>Política de Privacidad</a>')
# visual hardening appended directly to source, not just runtime overlay
FINAL_STYLE='''<style id="cs-final-brand-20260903">
html,body{color-scheme:dark!important;forced-color-adjust:none!important;background:#08070D!important;color:#F3F4F8!important}
body{background-image:radial-gradient(900px 520px at 50% -180px,rgba(45,10,74,.92) 0,rgba(45,10,74,.52) 30%,transparent 72%)!important}
.brand img{height:39px!important;width:auto!important;max-width:205px!important;object-fit:contain!important}
.hero h1{color:#F3F4F8!important}.hero h1 .grad,.hero h1 span.grad,.grad{color:#F955B6!important;background-image:linear-gradient(90deg,#F3F4F8 0%,#F7D7EC 35%,#F955B6 100%)!important;background-color:#F955B6!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;opacity:1!important;filter:none!important}
.btn.primary{background:linear-gradient(135deg,#F955B6 0%,#E548C9 58%,#C13BE4 100%)!important;color:#fff!important;border:0!important;box-shadow:0 14px 38px rgba(249,85,182,.34)!important}.btn:not(.primary){background:#121019!important;border-color:#37323F!important;color:#F3F4F8!important}
.eyebrow{color:#F3F4F8!important;background:#100D15!important;border-color:#44364A!important}.hero p,.lead,.micro,.card p,.faq p{color:#AAA7B2!important}.card,.crm,.faq details,.included,.mission,.outcome{background:linear-gradient(180deg,#15121B,#0E0C13)!important;border-color:#37323F!important}
.cs-crm-band{background:linear-gradient(90deg,#0A0810,#160F1D,#0A0810)!important;border-color:#44364A!important}.cs-crm-item{background:#141019!important;border-color:#44364A!important;color:#F3F4F8!important}.cs-crm-call strong{background:none!important;color:#F955B6!important;-webkit-text-fill-color:#F955B6!important;text-shadow:0 0 22px rgba(249,85,182,.28)!important}
@media(max-width:620px){.brand img{height:35px!important;max-width:174px!important}.hero h1{font-size:50px!important}}
@media(forced-colors:active){.hero h1 .grad,.hero h1 span.grad,.grad{background:none!important;color:#F955B6!important;-webkit-text-fill-color:#F955B6!important}}
</style>'''
h=re.sub(r'<style id="cs-final-brand-20260903">[\s\S]*?</style>','',h)
h=h.replace('</head>',FINAL_STYLE+'</head>',1)
write(p,h)

# 3) Main i18n: inject final translations and forbid wrong-language fallbacks.
ip=ROOT/'web/cloudsales-i18n-v1.js'
i=txt(ip) or ''
i=replace_trial_phrases(i)
START='/* CS_FINAL_TRANSLATIONS_20260903_START */'
END='/* CS_FINAL_TRANSLATIONS_20260903_END */'
block=START+'\nconst CS_FINAL_TRANSLATIONS='+json.dumps(FINAL_TRANSLATIONS,ensure_ascii=False,separators=(',',':'))+';\nfor(const [lc,map] of Object.entries(CS_FINAL_TRANSLATIONS)){T[lc]=Object.assign(T[lc]||{},map)}\n'+END+'\n'
if START in i and END in i:
    i=re.sub(re.escape(START)+r'[\s\S]*?'+re.escape(END)+r'\n?',block,i,count=1)
else:
    i=i.replace('const EN_FULL=',block+'const EN_FULL=',1)
# no English fallback on French/Italian/etc.; missing copy is hidden rather than mixed
old="const tr=dict[base]||EN_FULL[base];if(tr)n.nodeValue=n.__csOriginal.replace(base,tr)"
new="const tr=locale==='en'?(dict[base]||EN_FULL[base]):dict[base];if(tr){n.nodeValue=n.__csOriginal.replace(base,tr);n.parentElement?.removeAttribute('data-cs-untranslated')}else{const tech=/^(?:CloudSales|Cloudy|AgentCloud|CRM|API|SEO|PWA|OAuth|WhatsApp|Meta|Google|TikTok|LinkedIn|YouTube|Stripe|HighLevel|Salesforce|HubSpot|Zoho CRM|Pipedrive|monday CRM|Freshsales|Close|Copper|Twenty|Basic|Pro|Premium|CloudCo|Junk Lead Firewall|WAF|Conversion API|Web Events|CRM Events|Data Signals|Attribution|Audiences|USD|Academy)$/i.test(base);if(!tech&&/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(base)&&base.split(/\\s+/).length>1)n.parentElement?.setAttribute('data-cs-untranslated',locale)}"
i=i.replace(old,new)
i=i.replace("s.textContent=`.csLang{position:relative}","s.textContent=`[data-cs-untranslated]{display:none!important}.csLang{position:relative}")
i=i.replace("document.title=locale==='es'?'CloudSales — Better Leads. Full CRM Control.':'CloudSales — Better Leads. Full CRM Control.'","document.title=locale==='es'?'CloudSales — IA trabajando por ti, mejores prospectos y control desde tu celular':'CloudSales — AI working for you, better leads and mobile control'")
write(ip,i)

# 4) Dynamic ES/EN modules must never fall back to English on other locales.
for rel in ['web/commercial-sales-story-v1.js','web/commercial-crm-bmp-v3.js']:
    fp=ROOT/rel
    s=txt(fp)
    if not s: continue
    s=canonical_colors(replace_trial_phrases(s))
    if rel.endswith('commercial-sales-story-v1.js'):
        s=s.replace("function lang(){return (document.documentElement.lang||'en').toLowerCase().startsWith('es')?'es':'en'}","function lang(){const l=(document.documentElement.lang||'').toLowerCase();if(l.startsWith('es'))return'es';if(l.startsWith('en'))return'en';return''}")
        s=s.replace("function c(){return COPY[lang()]}","function c(){const l=lang();return l?COPY[l]:null}")
        s=s.replace("function render(){css();enhanceHero();updateMeta();", "function render(){const current=c();if(!current){document.querySelectorAll('[id^=\"cs-story-\"],.csFinal,.csStoryPricingNote').forEach(n=>n.remove());return}css();enhanceHero();updateMeta();")
    else:
        s=s.replace("const isEs=()=>((document.documentElement.lang||'en').toLowerCase().startsWith('es'));\nconst tr=()=>isEs()?COPY.es:COPY.en;","const locale=()=>{const l=(document.documentElement.lang||'').toLowerCase();if(l.startsWith('es'))return'es';if(l.startsWith('en'))return'en';return''};\nconst tr=()=>{const l=locale();return l?COPY[l]:null};")
        # prevent rendering this ES/EN-only explanatory module on other locales
        s=s.replace("function run(){css();", "function run(){if(!tr()){document.querySelectorAll('#business-management-platform,.csCrmMore,.csFooterCrmBtn').forEach(n=>n.remove());return}css();")
    write(fp,s)

# 5) Commercial brand runtime: canonical palette + browser hardening + no contradictory seat copy.
bp=ROOT/'web/commercial-brand-runtime-v2.js'
b=txt(bp) or ''
b=canonical_colors(replace_trial_phrases(b))
b=b.replace('Premium $147/mo · individual subscription per person','Premium $147/mo · Includes 2 users').replace('Premium $147/mes · suscripción individual por persona','Premium $147/mes · Incluye 2 usuarios')
b=b.replace('Extra Premium seat $47/mo','').replace('Asiento Premium adicional $47/mes','')
# Make canonical guard support all locales through the main i18n layer; it should not overwrite/hide translated root content.
b=b.replace("function unsupported(){document.documentElement.dataset.csLanguageIntegrity='strict-no-fallback';document.documentElement.dataset.csBrandCanonical=VERSION;document.querySelectorAll('#cs-story-hook,#cs-story-setup,#cs-story-cloudy,#cs-story-growth,#cs-story-agents,#cs-story-app,#cs-story-final,#business-management-platform,.csStoryPricingNote,.csCrmMore,.cs-crm-call').forEach(e=>{e.hidden=true;e.setAttribute('data-cs-withheld-untranslated','1')})}","function unsupported(){document.documentElement.dataset.csLanguageIntegrity='strict-no-fallback';document.documentElement.dataset.csBrandCanonical=VERSION}")
write(bp,b)

# 6) Release source itself must not reintroduce the old palette/English CRM banner.
rp=ROOT/'supabase/functions/cloudflare-site-brand-release/index.ts'
r=txt(rp) or ''
r=canonical_colors(replace_trial_phrases(r))
r=r.replace('VERSION="2026.09.03.3"','VERSION="2026.09.03.5"').replace('VERSION="2026.09.03.4"','VERSION="2026.09.03.5"')
r=r.replace('CONNECT YOUR CRM AND WATCH CLOUDY WORK','CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR')
# solid readable CRM call text; prevents Samsung/forced-dark from blackening gradient text
r=r.replace('.cs-crm-call strong{background:linear-gradient(90deg,#F955B6,#C13BE4,#63a8ff);-webkit-background-clip:text;color:transparent}', '.cs-crm-call strong{background:none;color:#F955B6;-webkit-text-fill-color:#F955B6;text-shadow:0 0 22px #F955B644}')
write(rp,r)

# 7) Remove obsolete public extra-seat language. Premium includes 2 users; extra-seat product is deprecated.
for p in all_text_files():
    s=txt(p)
    if s is None: continue
    n=s
    n=re.sub(r'<span>Extra Premium seat \$47/mo</span>','',n,flags=re.I)
    n=re.sub(r'<span>Asiento Premium adicional \$47/mes</span>','',n,flags=re.I)
    n=n.replace('Premium $147/mo · individual subscription per person','Premium $147/mo · Includes 2 users')
    n=n.replace('Premium $147/mes · suscripción individual por persona','Premium $147/mes · Incluye 2 usuarios')
    n=n.replace('suscripción individual por persona','Incluye 2 usuarios')
    if n!=s: write(p,n)

# 8) Final source guards.
forbidden_trial=[r'14\s*d[ií]as',r'14\s*days',r'14[-\s]day',r'14\s*jours',r'14\s*giorni',r'14\s*Tage',r'14\s*дней',r'14\s*ימים',r'14\s*天',r'14日間',r'14\s*يو']
violations=[]
for p in all_text_files():
    if p == SELF: continue
    s=txt(p) or ''
    for pat in forbidden_trial:
        if re.search(pat,s,flags=re.I): violations.append(f'{p.relative_to(ROOT)}::{pat}')
if violations:
    raise SystemExit('FORBIDDEN_14_DAY_TRIAL_REMAINS\n'+'\n'.join(violations[:100]))

h=txt(ROOT/'web/commercial.html') or ''
assert '<meta name="color-scheme" content="dark">' in h
assert PINK in h and PURPLE in h and WHITE in h
assert 'La IA trabaja por ti.' in h and 'Tú mantienes el control.' in h
assert 'Premium $147/mes · Incluye 2 usuarios' in h
assert 'Asiento Premium adicional $47/mes' not in h
assert 'suscripción individual por persona' not in h
assert '14 días' not in h.lower()
assert 'CONECTA TU CRM Y MIRA A CLOUDY TRABAJAR' in (txt(rp) or '')
print('FINAL_CLOUDSALES_CANONICALIZATION_OK')
