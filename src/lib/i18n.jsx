import { createContext, useContext, useState, useCallback } from 'react'

export const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'it', label: 'Italiano',   flag: '🇮🇹' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'pt', label: 'Português',  flag: '🇵🇹' },
  { code: 'zh', label: '中文',       flag: '🇨🇳' },
  { code: 'th', label: 'ไทย',        flag: '🇹🇭' },
]

const TRANSLATIONS = {

  /* ── common ─────────────────────────────────────────────────────── */
  'common.save':         { en:'Save',          it:'Salva',            fr:'Enregistrer',       de:'Speichern',               pt:'Salvar',              zh:'保存',     th:'บันทึก' },
  'common.cancel':       { en:'Cancel',        it:'Annulla',          fr:'Annuler',           de:'Abbrechen',               pt:'Cancelar',            zh:'取消',     th:'ยกเลิก' },
  'common.back':         { en:'Back',          it:'Indietro',         fr:'Retour',            de:'Zurück',                  pt:'Voltar',              zh:'返回',     th:'กลับ' },
  'common.confirm':      { en:'Confirm',       it:'Conferma',         fr:'Confirmer',         de:'Bestätigen',              pt:'Confirmar',           zh:'确认',     th:'ยืนยัน' },
  'common.delete':       { en:'Delete',        it:'Elimina',          fr:'Supprimer',         de:'Löschen',                 pt:'Excluir',             zh:'删除',     th:'ลบ' },
  'common.edit':         { en:'Edit',          it:'Modifica',         fr:'Modifier',          de:'Bearbeiten',              pt:'Editar',              zh:'编辑',     th:'แก้ไข' },
  'common.add':          { en:'Add',           it:'Aggiungi',         fr:'Ajouter',           de:'Hinzufügen',              pt:'Adicionar',           zh:'添加',     th:'เพิ่ม' },
  'common.close':        { en:'Close',         it:'Chiudi',           fr:'Fermer',            de:'Schließen',               pt:'Fechar',              zh:'关闭',     th:'ปิด' },
  'common.loading':      { en:'Loading…',      it:'Caricamento…',     fr:'Chargement…',       de:'Laden…',                  pt:'Carregando…',         zh:'加载中…',  th:'กำลังโหลด…' },
  'common.retry':        { en:'Retry',         it:'Riprova',          fr:'Réessayer',         de:'Erneut versuchen',        pt:'Tentar novamente',    zh:'重试',     th:'ลองอีกครั้ง' },
  'common.total':        { en:'Total',         it:'Totale',           fr:'Total',             de:'Gesamt',                  pt:'Total',               zh:'总计',     th:'รวม' },
  'common.name':         { en:'Name',          it:'Nome',             fr:'Nom',               de:'Name',                    pt:'Nome',                zh:'名称',     th:'ชื่อ' },
  'common.price':        { en:'Price',         it:'Prezzo',           fr:'Prix',              de:'Preis',                   pt:'Preço',               zh:'价格',     th:'ราคา' },
  'common.description':  { en:'Description',   it:'Descrizione',      fr:'Description',       de:'Beschreibung',            pt:'Descrição',           zh:'描述',     th:'คำอธิบาย' },
  'common.photo':        { en:'Photo',         it:'Foto',             fr:'Photo',             de:'Foto',                    pt:'Foto',                zh:'照片',     th:'รูปภาพ' },
  'common.search':       { en:'Search',        it:'Cerca',            fr:'Rechercher',        de:'Suchen',                  pt:'Buscar',              zh:'搜索',     th:'ค้นหา' },
  'common.yes':          { en:'Yes',           it:'Sì',               fr:'Oui',               de:'Ja',                      pt:'Sim',                 zh:'是',       th:'ใช่' },
  'common.no':           { en:'No',            it:'No',               fr:'Non',               de:'Nein',                    pt:'Não',                 zh:'否',       th:'ไม่' },

  /* ── landing ─────────────────────────────────────────────────────── */
  'landing.tagline':     { en:'Order at the table via QR',                                    it:'Ordina al tavolo via QR',                          fr:'Commandez à table via QR',                           de:'Am Tisch via QR bestellen',                     pt:'Peça à mesa via QR',                           zh:'扫码点餐',                     th:'สั่งอาหารที่โต๊ะผ่าน QR' },
  'landing.heroTitle':   { en:'Your menu becomes an order in three taps.',                    it:'Il tuo menu diventa un ordine in tre tap.',         fr:'Votre menu devient une commande en trois clics.',    de:'Ihr Menü wird in drei Klicks zur Bestellung.',  pt:'Seu cardápio vira um pedido em três toques.',   zh:'您的菜单三步变成订单。',       th:'เมนูของคุณกลายเป็นออร์เดอร์ใน 3 คลิก' },
  'landing.heroSub':     { en:'Customers order from their own phone by scanning a QR. You receive everything on a tablet, in real time, with your brand. No per-order fees.', it:'I clienti ordinano dal proprio telefono scansionando un QR. Ricevi tutto su tablet, in tempo reale, con il tuo brand. Nessuna commissione per ordine.', fr:'Les clients commandent depuis leur téléphone en scannant un QR. Vous recevez tout sur une tablette, en temps réel, avec votre marque. Aucune commission par commande.', de:'Kunden bestellen per QR-Scan vom eigenen Smartphone. Sie erhalten alles auf einem Tablet, in Echtzeit, mit Ihrem Branding. Keine Gebühr pro Bestellung.', pt:'Clientes pedem pelo próprio celular escaneando um QR. Você recebe tudo no tablet, em tempo real, com sua marca. Sem taxas por pedido.', zh:'顾客扫描二维码即可用自己的手机点餐。您可在平板上实时收到所有订单，展示您的品牌。无需支付每单费用。', th:'ลูกค้าสั่งอาหารจากโทรศัพท์ของตนเองโดยการสแกน QR คุณได้รับทุกออร์เดอร์บนแท็บเล็ตแบบเรียลไทม์พร้อมแบรนด์ของคุณ ไม่มีค่าธรรมเนียมต่อออร์เดอร์' },
  'landing.startNow':    { en:'Start now',       it:'Inizia ora',       fr:'Commencer',         de:'Jetzt starten',           pt:'Começar agora',       zh:'立即开始',   th:'เริ่มเลย' },
  'landing.howItWorks':  { en:'How it works',    it:'Come funziona',    fr:'Comment ça marche', de:'Wie es funktioniert',     pt:'Como funciona',       zh:'如何使用',   th:'วิธีใช้งาน' },
  'landing.signIn':      { en:'Sign in',         it:'Accedi',           fr:'Se connecter',      de:'Anmelden',                pt:'Entrar',              zh:'登录',       th:'เข้าสู่ระบบ' },
  'landing.createMenu':  { en:'Create your menu',it:'Crea il tuo menu', fr:'Créez votre menu',  de:'Menü erstellen',          pt:'Crie seu cardápio',   zh:'创建菜单',   th:'สร้างเมนูของคุณ' },

  /* ── auth ─────────────────────────────────────────────────────────── */
  'auth.signIn':          { en:'Sign in',                              it:'Accedi',                                      fr:'Se connecter',                                    de:'Anmelden',                                       pt:'Entrar',                                      zh:'登录',           th:'เข้าสู่ระบบ' },
  'auth.signUp':          { en:'Create account',                       it:'Crea account',                                fr:'Créer un compte',                                 de:'Konto erstellen',                                pt:'Criar conta',                                  zh:'注册',           th:'สร้างบัญชี' },
  'auth.email':           { en:'Email',                                it:'Email',                                       fr:'E-mail',                                          de:'E-Mail',                                         pt:'E-mail',                                       zh:'邮箱',           th:'อีเมล' },
  'auth.password':        { en:'Password',                             it:'Password',                                    fr:'Mot de passe',                                    de:'Passwort',                                       pt:'Senha',                                        zh:'密码',           th:'รหัสผ่าน' },
  'auth.signInSubtitle':  { en:'Access your venue panel.',             it:'Accedi al pannello del tuo locale.',          fr:'Accédez au tableau de bord de votre établissement.',de:'Zugang zu Ihrem Venue-Panel.',                   pt:'Acesse o painel do seu estabelecimento.',       zh:'访问您的场所管理面板。', th:'เข้าสู่แผงควบคุมสถานประกอบการของคุณ' },
  'auth.signUpSubtitle':  { en:'Register your venue on WisiOrder.',    it:'Registra il tuo locale su WisiOrder.',        fr:'Inscrivez votre établissement sur WisiOrder.',    de:'Registrieren Sie Ihr Lokal bei WisiOrder.',      pt:'Cadastre seu estabelecimento no WisiOrder.',    zh:'在WisiOrder注册您的场所。', th:'ลงทะเบียนสถานประกอบการของคุณบน WisiOrder' },
  'auth.noAccount':       { en:"Don't have an account? Sign up",       it:'Non hai un account? Registrati',              fr:"Pas encore de compte ? Inscrivez-vous",      de:'Kein Konto? Registrieren',                       pt:'Não tem conta? Cadastre-se',                    zh:'还没有账号？注册', th:'ยังไม่มีบัญชี? สมัครสมาชิก' },
  'auth.haveAccount':     { en:'Already have an account? Sign in',     it:'Hai già un account? Accedi',                 fr:'Vous avez déjà un compte ? Connectez-vous', de:'Bereits ein Konto? Anmelden',                    pt:'Já tem conta? Entrar',                          zh:'已有账号？登录',   th:'มีบัญชีแล้ว? เข้าสู่ระบบ' },
  'auth.min6':            { en:'At least 6 characters.',               it:'Almeno 6 caratteri.',                         fr:'Au moins 6 caractères.',                          de:'Mindestens 6 Zeichen.',                          pt:'Pelo menos 6 caracteres.',                      zh:'至少6个字符。',     th:'อย่างน้อย 6 ตัวอักษร' },
  'auth.wrongCredentials':{ en:'Wrong email or password.',             it:'Email o password errati.',                    fr:'Email ou mot de passe incorrect.',                de:'Falsche E-Mail oder falsches Passwort.',         pt:'Email ou senha incorretos.',                    zh:'邮箱或密码错误。',  th:'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
  'auth.emailInUse':      { en:'Email already registered. Sign in.',   it:'Email già registrata. Accedi.',               fr:'Email déjà enregistrée. Connectez-vous.',         de:'E-Mail bereits registriert. Bitte anmelden.',    pt:'Email já cadastrado. Faça login.',              zh:'邮箱已注册，请登录。', th:'อีเมลนี้ถูกลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ' },

  /* ── nav ──────────────────────────────────────────────────────────── */
  'nav.orders':   { en:'Orders',   it:'Ordini',       fr:'Commandes',   de:'Bestellungen', pt:'Pedidos',      zh:'订单', th:'ออร์เดอร์' },
  'nav.menu':     { en:'Menu',     it:'Menu',         fr:'Menu',        de:'Menü',         pt:'Cardápio',     zh:'菜单', th:'เมนู' },
  'nav.settings': { en:'Settings', it:'Impostazioni', fr:'Paramètres',  de:'Einstellungen',pt:'Configurações',zh:'设置', th:'การตั้งค่า' },
  'nav.signOut':  { en:'Sign out', it:'Esci',         fr:'Se déconnecter',de:'Abmelden',   pt:'Sair',         zh:'退出', th:'ออกจากระบบ' },

  /* ── onboarding ───────────────────────────────────────────────────── */
  'onboarding.createVenue':   { en:'Create your venue',                                it:'Crea il tuo locale',                          fr:'Créez votre établissement',                         de:'Lokal erstellen',                                   pt:'Crie seu estabelecimento',                      zh:'创建您的场所',         th:'สร้างสถานประกอบการของคุณ' },
  'onboarding.lastStep':      { en:'One last step before building your menu.',         it:'Un ultimo passo prima di creare il tuo menu.', fr:'Une dernière étape avant de créer votre menu.',     de:'Noch ein Schritt vor dem Erstellen Ihres Menüs.',   pt:'Mais um passo antes de criar seu cardápio.',     zh:'创建菜单前的最后一步。', th:'อีกหนึ่งขั้นตอนก่อนสร้างเมนูของคุณ' },
  'onboarding.venueName':     { en:'Venue name',          it:'Nome del locale',         fr:"Nom de l'établissement",  de:'Name des Lokals',           pt:'Nome do estabelecimento',  zh:'场所名称',       th:'ชื่อสถานประกอบการ' },
  'onboarding.menuAddress':   { en:'Menu address',        it:'Indirizzo menu',          fr:'Adresse du menu',         de:'Menüadresse',               pt:'Endereço do menu',         zh:'菜单地址',       th:'ที่อยู่เมนู' },
  'onboarding.addressHint':   { en:'Customers will open: ',it:'I clienti apriranno: ', fr:'Les clients ouvriront : ',de:'Kunden öffnen: ',            pt:'Clientes acessarão: ',     zh:'顾客将访问：',   th:'ลูกค้าจะเปิด: ' },
  'onboarding.createContinue':{ en:'Create and continue', it:'Crea e continua',         fr:'Créer et continuer',      de:'Erstellen und weiter',       pt:'Criar e continuar',        zh:'创建并继续',     th:'สร้างและดำเนินการต่อ' },
  'onboarding.addressInUse':  { en:'This address is already taken, choose another.',   it:'Questo indirizzo è già in uso, scegline un altro.', fr:'Cette adresse est déjà utilisée, choisissez-en une autre.', de:'Diese Adresse ist bereits vergeben, wählen Sie eine andere.', pt:'Este endereço já está em uso, escolha outro.', zh:'此地址已被使用，请选择其他地址。', th:'ที่อยู่นี้ถูกใช้แล้ว กรุณาเลือกที่อยู่อื่น' },

  /* ── dashboard ────────────────────────────────────────────────────── */
  'dashboard.ordersInProgress': { en:'Orders in progress',   it:'Ordini in corso',         fr:'Commandes en cours',              de:'Bestellungen in Bearbeitung',  pt:'Pedidos em andamento',    zh:'进行中的订单',      th:'ออร์เดอร์ที่กำลังดำเนินการ' },
  'dashboard.noActiveOrders':   { en:'No active orders.',    it:'Nessun ordine attivo.',   fr:'Aucune commande active.',         de:'Keine aktiven Bestellungen.',  pt:'Nenhum pedido ativo.',    zh:'没有活跃的订单。',   th:'ไม่มีออร์เดอร์ที่ใช้งาน' },
  'dashboard.activeOrdersInfo': { en:'real-time updates',    it:'aggiornamento in tempo reale', fr:'mises à jour en temps réel', de:'Echtzeit-Updates',            pt:'atualizações em tempo real', zh:'实时更新',          th:'อัปเดตแบบเรียลไทม์' },
  'dashboard.emptyBoard':       { en:'When a customer sends an order it will appear here, with a sound alert.', it:'Quando un cliente invia un ordine comparirà qui, con un avviso sonoro.', fr:"Quand un client envoie une commande, elle apparaîtra ici avec une alerte sonore.", de:'Wenn ein Kunde eine Bestellung sendet, erscheint sie hier mit einem Ton.', pt:'Quando um cliente enviar um pedido, ele aparecerá aqui com um alerta sonoro.', zh:'当客户下单时，订单将在此处出现并发出声音提示。', th:'เมื่อลูกค้าส่งออร์เดอร์ จะปรากฏที่นี่พร้อมเสียงแจ้งเตือน' },
  'dashboard.soundOn':          { en:'Sound on',             it:'Suono attivo',            fr:'Son activé',                      de:'Ton an',                       pt:'Som ativado',             zh:'声音已开启',        th:'เปิดเสียงแล้ว' },
  'dashboard.soundOff':         { en:'Enable sound',         it:'Attiva suono',            fr:'Activer le son',                  de:'Ton aktivieren',               pt:'Ativar som',              zh:'开启声音',          th:'เปิดเสียง' },
  'dashboard.toConfirm':        { en:'To confirm',           it:'Da confermare',           fr:'À confirmer',                     de:'Zu bestätigen',                pt:'A confirmar',             zh:'待确认',            th:'รอยืนยัน' },
  'dashboard.toPay':            { en:'To pay',               it:'Da pagare',               fr:'À payer',                         de:'Zu bezahlen',                  pt:'A pagar',                 zh:'待结账',            th:'รอชำระเงิน' },
  'dashboard.closeBill':        { en:'Close bill',           it:'Chiudi conto',            fr:"Clôturer l'addition",             de:'Rechnung schließen',           pt:'Fechar conta',            zh:'结账',              th:'ปิดบิล' },
  'dashboard.accept':           { en:'Accept',               it:'Accetta',                 fr:'Accepter',                        de:'Annehmen',                     pt:'Aceitar',                 zh:'接受',              th:'ยอมรับ' },
  'dashboard.reject':           { en:'Reject',               it:'Rifiuta',                 fr:'Refuser',                         de:'Ablehnen',                     pt:'Recusar',                 zh:'拒绝',              th:'ปฏิเสธ' },
  'dashboard.pickupAtCounter':  { en:'Pickup at counter — verify the name', it:'Ritiro al banco — verifica il nome', fr:'Retrait au comptoir — vérifiez le nom', de:'Abholung an der Theke — Namen prüfen', pt:'Retirada no balcão — verifique o nome', zh:'在柜台取货——请核实姓名', th:'รับที่เคาน์เตอร์ — กรุณาตรวจสอบชื่อ' },
  'dashboard.table':            { en:'Table',   it:'Tavolo',  fr:'Table',   de:'Tisch',    pt:'Mesa',     zh:'桌号',  th:'โต๊ะ' },
  'dashboard.allToPreparing':   { en:'▸ All preparing',      it:'▸ Tutti in preparazione', fr:'▸ Tous en préparation',           de:'▸ Alle in Zubereitung',        pt:'▸ Todos em preparo',      zh:'▸ 全部备餐中',      th:'▸ ทั้งหมดกำลังเตรียม' },
  'dashboard.allToReady':       { en:'▸ All ready',          it:'▸ Tutti pronti',          fr:'▸ Tous prêts',                    de:'▸ Alle fertig',                pt:'▸ Todos prontos',         zh:'▸ 全部就绪',        th:'▸ ทั้งหมดพร้อมแล้ว' },
  'dashboard.rejectConfirm':    { en:'Reject order',         it:"Rifiuta l'ordine",        fr:'Refuser la commande',             de:'Bestellung ablehnen',          pt:'Recusar pedido',          zh:'拒绝订单',          th:'ปฏิเสธออร์เดอร์' },

  /* ── status ───────────────────────────────────────────────────────── */
  'status.pending':         { en:'Waiting',      it:'In attesa',       fr:'En attente',    de:'Wartend',         pt:'Aguardando',   zh:'等待中',   th:'รอดำเนินการ' },
  'status.preparing':       { en:'Preparing',    it:'In preparazione', fr:'En préparation',de:'In Zubereitung',  pt:'Em preparo',   zh:'备餐中',   th:'กำลังเตรียม' },
  'status.ready':           { en:'Ready',        it:'Pronto',          fr:'Prêt',          de:'Fertig',          pt:'Pronto',       zh:'已就绪',   th:'พร้อมแล้ว' },
  'status.toConfirmStatus': { en:'To confirm',   it:'Da confermare',   fr:'À confirmer',   de:'Zu bestätigen',   pt:'A confirmar',  zh:'待确认',   th:'รอยืนยัน' },

  /* ── menuSetup ────────────────────────────────────────────────────── */
  'menuSetup.yourMenu':             { en:'Your menu',            it:'Il tuo menu',             fr:'Votre menu',             de:'Ihr Menü',              pt:'Seu cardápio',           zh:'您的菜单',          th:'เมนูของคุณ' },
  'menuSetup.menuIntro':            { en:'Create categories, add dishes with photo and price. Mark out-of-stock items.', it:'Crea categorie, aggiungi piatti con foto e prezzo. Segna le voci esaurite.', fr:'Créez des catégories, ajoutez des plats avec photo et prix. Marquez les articles épuisés.', de:'Erstellen Sie Kategorien, fügen Sie Gerichte mit Foto und Preis hinzu. Markieren Sie ausverkaufte Artikel.', pt:'Crie categorias, adicione pratos com foto e preço. Marque itens esgotados.', zh:'创建分类，添加带照片和价格的菜品。标记缺货商品。', th:'สร้างหมวดหมู่ เพิ่มเมนูพร้อมรูปและราคา ทำเครื่องหมายรายการที่หมด' },
  'menuSetup.newCategory':          { en:'New category (e.g. Starters)', it:'Nuova categoria (es. Antipasti)', fr:'Nouvelle catégorie (ex. Entrées)', de:'Neue Kategorie (z.B. Vorspeisen)', pt:'Nova categoria (ex. Entradas)', zh:'新分类（例如：前菜）', th:'หมวดหมู่ใหม่ (เช่น เมนูเรียกน้ำย่อย)' },
  'menuSetup.addDish':              { en:'+ Add dish',            it:'+ Aggiungi piatto',       fr:'+ Ajouter un plat',      de:'+ Gericht hinzufügen',  pt:'+ Adicionar prato',      zh:'+ 添加菜品',         th:'+ เพิ่มเมนู' },
  'menuSetup.noCategories':         { en:'Start by creating a category, then add dishes.', it:'Inizia creando una categoria, poi aggiungi i piatti.', fr:'Commencez par créer une catégorie, puis ajoutez des plats.', de:'Erstellen Sie zuerst eine Kategorie, dann fügen Sie Gerichte hinzu.', pt:'Comece criando uma categoria e depois adicione pratos.', zh:'先创建分类，再添加菜品。', th:'เริ่มต้นด้วยการสร้างหมวดหมู่ จากนั้นเพิ่มเมนู' },
  'menuSetup.soldOut':              { en:'Sold out',              it:'Esaurito',                fr:'Épuisé',                 de:'Ausverkauft',           pt:'Esgotado',               zh:'已售完',            th:'หมดแล้ว' },
  'menuSetup.newDish':              { en:'New dish',              it:'Nuovo piatto',            fr:'Nouveau plat',           de:'Neues Gericht',         pt:'Novo prato',             zh:'新菜品',            th:'เมนูใหม่' },
  'menuSetup.editDish':             { en:'Edit dish',             it:'Modifica piatto',         fr:'Modifier le plat',       de:'Gericht bearbeiten',    pt:'Editar prato',           zh:'编辑菜品',          th:'แก้ไขเมนู' },
  'menuSetup.dishName':             { en:'Dish name',             it:'Nome del piatto',         fr:'Nom du plat',            de:'Name des Gerichts',     pt:'Nome do prato',          zh:'菜品名称',          th:'ชื่อเมนู' },
  'menuSetup.saveDish':             { en:'Save dish',             it:'Salva piatto',            fr:'Enregistrer le plat',    de:'Gericht speichern',     pt:'Salvar prato',           zh:'保存菜品',          th:'บันทึกเมนู' },
  'menuSetup.deleteDishConfirm':    { en:'Delete',                it:'Elimina',                 fr:'Supprimer',              de:'Löschen',               pt:'Excluir',                zh:'删除',              th:'ลบ' },
  'menuSetup.deleteCategoryConfirm':{ en:'Delete the category',   it:'Elimina la categoria',    fr:'Supprimer la catégorie', de:'Kategorie löschen',     pt:'Excluir categoria',      zh:'删除分类',          th:'ลบหมวดหมู่' },
  'menuSetup.uploadPhoto':          { en:'Upload photo',          it:'Carica foto',             fr:'Télécharger une photo',  de:'Foto hochladen',        pt:'Enviar foto',            zh:'上传照片',          th:'อัปโหลดรูปภาพ' },
  'menuSetup.changePhoto':          { en:'Change photo',          it:'Cambia foto',             fr:'Changer la photo',       de:'Foto ändern',           pt:'Alterar foto',           zh:'更换照片',          th:'เปลี่ยนรูปภาพ' },
  'menuSetup.enterName':            { en:'Enter the dish name.',  it:'Inserisci il nome del piatto.', fr:'Entrez le nom du plat.', de:'Geben Sie den Namen des Gerichts ein.', pt:'Digite o nome do prato.', zh:'请输入菜品名称。', th:'กรุณาใส่ชื่อเมนู' },
  'menuSetup.enterPrice':           { en:'Enter a valid price.',  it:'Inserisci un prezzo valido.', fr:'Entrez un prix valide.', de:'Geben Sie einen gültigen Preis ein.', pt:'Digite um preço válido.', zh:'请输入有效价格。', th:'กรุณาใส่ราคาที่ถูกต้อง' },

  /* ── settings ─────────────────────────────────────────────────────── */
  'settings.settings':                  { en:'Settings',              it:'Impostazioni',          fr:'Paramètres',             de:'Einstellungen',           pt:'Configurações',          zh:'设置',         th:'การตั้งค่า' },
  'settings.settingsIntro':             { en:'Customize what the customer sees and generate the QR for your tables.', it:'Personalizza ciò che vede il cliente e genera il QR da mettere sui tavoli.', fr:'Personnalisez ce que le client voit et générez le QR pour vos tables.', de:'Passen Sie an, was der Kunde sieht, und erstellen Sie den QR für Ihre Tische.', pt:'Personalize o que o cliente vê e gere o QR para suas mesas.', zh:'自定义客户看到的内容并生成桌面二维码。', th:'ปรับแต่งสิ่งที่ลูกค้าเห็นและสร้าง QR สำหรับโต๊ะของคุณ' },
  'settings.yourBrand':                 { en:'Your brand',            it:'Il tuo brand',          fr:'Votre marque',           de:'Ihr Branding',            pt:'Sua marca',              zh:'您的品牌',      th:'แบรนด์ของคุณ' },
  'settings.primaryColor':              { en:'Primary color',         it:'Colore principale',     fr:'Couleur principale',     de:'Hauptfarbe',              pt:'Cor principal',          zh:'主色调',        th:'สีหลัก' },
  'settings.colorHint':                 { en:'Used on buttons and accents of the customer menu.', it:'Usato su pulsanti e accenti del menu cliente.', fr:'Utilisé sur les boutons et les accents du menu client.', de:'Wird für Schaltflächen und Akzente des Kundenmenüs verwendet.', pt:'Usado em botões e destaques do menu do cliente.', zh:'用于客户菜单的按钮和强调色。', th:'ใช้บนปุ่มและสีเน้นของเมนูลูกค้า' },
  'settings.logo':                      { en:'Logo',                  it:'Logo',                  fr:'Logo',                   de:'Logo',                    pt:'Logo',                   zh:'徽标',          th:'โลโก้' },
  'settings.uploadLogo':                { en:'Upload logo',           it:'Carica logo',           fr:'Télécharger le logo',    de:'Logo hochladen',          pt:'Enviar logo',            zh:'上传徽标',      th:'อัปโหลดโลโก้' },
  'settings.saveChanges':               { en:'Save changes',          it:'Salva modifiche',       fr:'Enregistrer les modifications', de:'Änderungen speichern', pt:'Salvar alterações',    zh:'保存更改',      th:'บันทึกการเปลี่ยนแปลง' },
  'settings.saved':                     { en:'Saved',                 it:'Salvato',               fr:'Enregistré',             de:'Gespeichert',             pt:'Salvo',                  zh:'已保存',        th:'บันทึกแล้ว' },
  'settings.venueQr':                   { en:'Venue QR',              it:'QR del locale',         fr:"QR de l'établissement",  de:'Lokal-QR',                pt:'QR do estabelecimento',  zh:'场所二维码',    th:'QR สถานประกอบการ' },
  'settings.downloadPng':               { en:'Download PNG',          it:'Scarica PNG',           fr:'Télécharger PNG',        de:'PNG herunterladen',       pt:'Baixar PNG',             zh:'下载PNG',       th:'ดาวน์โหลด PNG' },
  'settings.copy':                      { en:'Copy',                  it:'Copia',                 fr:'Copier',                 de:'Kopieren',                pt:'Copiar',                 zh:'复制',          th:'คัดลอก' },
  'settings.qrHint':                    { en:'Print the QR and put it on tables. Scanning it opens your menu directly.', it:'Stampa il QR e mettilo sui tavoli. Chi lo scansiona apre direttamente il tuo menu.', fr:'Imprimez le QR et placez-le sur les tables. Le scanner ouvre directement votre menu.', de:'Drucken Sie den QR und legen Sie ihn auf die Tische. Das Scannen öffnet direkt Ihr Menü.', pt:'Imprima o QR e coloque nas mesas. Escanear abre seu cardápio diretamente.', zh:'打印QR码放在桌上，扫描即可直接打开您的菜单。', th:'พิมพ์ QR และวางบนโต๊ะ การสแกนจะเปิดเมนูของคุณโดยตรง' },
  'settings.requireConfirmation':       { en:'Require order confirmation', it:'Richiedi conferma degli ordini', fr:'Exiger la confirmation des commandes', de:'Bestellbestätigung erforderlich', pt:'Exigir confirmação de pedido', zh:'需要订单确认', th:'ต้องการการยืนยันออร์เดอร์' },
  'settings.requireConfirmationHint':   { en:'Orders enter the kitchen only after you accept them. Protects against fake orders.', it:'Gli ordini entrano in cucina solo dopo che li accetti. Protegge dagli ordini falsi.', fr:"Les commandes n'entrent en cuisine qu'après votre acceptation. Protège des fausses commandes.", de:'Bestellungen gehen erst nach Ihrer Bestätigung in die Küche. Schützt vor gefälschten Bestellungen.', pt:'Os pedidos entram na cozinha somente após você aceitá-los. Protege contra pedidos falsos.', zh:'订单只有在您确认后才进入厨房。防止虚假订单。', th:'ออร์เดอร์เข้าครัวหลังจากที่คุณยอมรับเท่านั้น ป้องกันออร์เดอร์ปลอม' },
  'settings.currency':                  { en:'Currency',              it:'Valuta',                fr:'Devise',                 de:'Währung',                 pt:'Moeda',                  zh:'货币',          th:'สกุลเงิน' },
  'settings.currencyHint':              { en:'Shown on all menu prices.',it:'Mostrata su tutti i prezzi del menu.', fr:'Affichée sur tous les prix du menu.', de:'Wird bei allen Menüpreisen angezeigt.', pt:'Exibida em todos os preços do cardápio.', zh:'显示在所有菜单价格上。', th:'แสดงบนราคาเมนูทั้งหมด' },
  'settings.panelLanguage':             { en:'Panel language',         it:'Lingua del pannello',   fr:'Langue du panel',        de:'Sprache des Panels',      pt:'Idioma do painel',       zh:'面板语言',      th:'ภาษาของแผง' },

  /* ── customer ─────────────────────────────────────────────────────── */
  'customer.orderFromTable':   { en:'Order from the table',    it:'Ordina dal tavolo',           fr:'Commander à table',               de:'Am Tisch bestellen',               pt:'Pedir à mesa',                zh:'桌位点餐',       th:'สั่งอาหารจากโต๊ะ' },
  'customer.addingToOrder':    { en:'Adding to your order',    it:'Aggiungendo al tuo ordine',   fr:'Ajout à votre commande',          de:'Zur Bestellung hinzufügen',        pt:'Adicionando ao seu pedido',   zh:'添加到您的订单', th:'กำลังเพิ่มในออร์เดอร์ของคุณ' },
  'customer.cancel':           { en:'Cancel',                  it:'Annulla',                     fr:'Annuler',                         de:'Abbrechen',                        pt:'Cancelar',                    zh:'取消',           th:'ยกเลิก' },
  'customer.menuNotReady':     { en:'The menu is not available yet. Come back later.', it:'Il menu non è ancora disponibile. Riprova più tardi.', fr:"Le menu n'est pas encore disponible. Revenez plus tard.", de:'Das Menü ist noch nicht verfügbar. Kommen Sie später zurück.', pt:'O cardápio ainda não está disponível. Volte mais tarde.', zh:'菜单暂未开放，请稍后再来。', th:'เมนูยังไม่พร้อม กรุณากลับมาใหม่ภายหลัง' },
  'customer.other':            { en:'Other',     it:'Altro',      fr:'Autre',      de:'Sonstiges',  pt:'Outros',    zh:'其他',    th:'อื่นๆ' },
  'customer.items':            { en:'items',     it:'piatti',     fr:'plats',      de:'Gerichte',   pt:'itens',     zh:'件',      th:'รายการ' },
  'customer.item':             { en:'item',      it:'piatto',     fr:'plat',       de:'Gericht',    pt:'item',      zh:'件',      th:'รายการ' },
  'customer.viewOrder':        { en:'View order',               it:'Vedi ordine',                 fr:'Voir la commande',                de:'Bestellung anzeigen',              pt:'Ver pedido',                  zh:'查看订单',       th:'ดูออร์เดอร์' },
  'customer.add':              { en:'Add',       it:'Aggiungi',   fr:'Ajouter',    de:'Hinzufügen', pt:'Adicionar', zh:'添加',    th:'เพิ่ม' },
  'customer.noteOptional':     { en:'Note (optional)',          it:'Nota (opzionale)',            fr:'Note (optionnel)',                de:'Notiz (optional)',                 pt:'Observação (opcional)',       zh:'备注（可选）',   th:'หมายเหตุ (ไม่บังคับ)' },
  'customer.noteplaceholder':  { en:'E.g. no peanuts',         it:'Es. senza arachidi',          fr:'Ex. sans cacahuètes',            de:'Z.B. ohne Erdnüsse',               pt:'Ex. sem amendoim',            zh:'例：不要花生',   th:'เช่น ไม่ใส่ถั่ว' },
  'customer.yourOrder':        { en:'Your order',              it:'Il tuo ordine',               fr:'Votre commande',                 de:'Ihre Bestellung',                  pt:'Seu pedido',                  zh:'您的订单',       th:'ออร์เดอร์ของคุณ' },
  'customer.proceed':          { en:'Proceed',                 it:'Procedi',                     fr:'Procéder',                       de:'Weiter',                           pt:'Prosseguir',                  zh:'继续',           th:'ดำเนินการต่อ' },
  'customer.addToOrder':       { en:'Add to order',            it:"Aggiungi all'ordine",         fr:'Ajouter à la commande',          de:'Zur Bestellung hinzufügen',        pt:'Adicionar ao pedido',         zh:'加入订单',       th:'เพิ่มในออร์เดอร์' },
  'customer.almostThere':      { en:'Almost there',            it:'Quasi fatto',                 fr:'Presque fini',                   de:'Fast geschafft',                   pt:'Quase lá',                    zh:'即将完成',       th:'เกือบเสร็จแล้ว' },
  'customer.yourName':         { en:'Your name',               it:'Il tuo nome',                 fr:'Votre nom',                      de:'Ihr Name',                         pt:'Seu nome',                    zh:'您的姓名',       th:'ชื่อของคุณ' },
  'customer.tableNumber':      { en:'Table number',            it:'Numero tavolo',               fr:'Numéro de table',                de:'Tischnummer',                      pt:'Número da mesa',              zh:'桌号',           th:'หมายเลขโต๊ะ' },
  'customer.sendOrder':        { en:'Send order',              it:'Invia ordine',                fr:'Envoyer la commande',            de:'Bestellung senden',                pt:'Enviar pedido',               zh:'发送订单',       th:'ส่งออร์เดอร์' },
  'customer.confirmAdd':       { en:'Confirm addition',        it:'Conferma aggiunta',           fr:"Confirmer l'ajout",              de:'Hinzufügen bestätigen',            pt:'Confirmar adição',            zh:'确认添加',       th:'ยืนยันการเพิ่ม' },
  'customer.backToOrder':      { en:'Back to order',           it:"Torna all'ordine",            fr:'Retour à la commande',           de:'Zurück zur Bestellung',            pt:'Voltar ao pedido',            zh:'返回订单',       th:'กลับไปที่ออร์เดอร์' },
  'customer.venueNotFound':    { en:'Venue not found',         it:'Locale non trovato',          fr:'Établissement introuvable',      de:'Lokal nicht gefunden',             pt:'Estabelecimento não encontrado', zh:'找不到场所',  th:'ไม่พบสถานประกอบการ' },
  'customer.venueNotFoundSub': { en:'The QR may no longer be valid. Ask the venue staff.', it:'Il QR potrebbe non essere più valido. Chiedi al personale.', fr:"Le QR n'est peut-être plus valide. Demandez au personnel.", de:'Der QR-Code ist möglicherweise nicht mehr gültig. Fragen Sie das Personal.', pt:'O QR pode não ser mais válido. Pergunte ao pessoal.', zh:'二维码可能已失效，请询问工作人员。', th:'QR อาจไม่ถูกต้องแล้ว กรุณาสอบถามเจ้าหน้าที่' },
  'customer.poweredBy':        { en:'Powered by WisiOrder', it:'Powered by WisiOrder', fr:'Powered by WisiOrder', de:'Powered by WisiOrder', pt:'Powered by WisiOrder', zh:'Powered by WisiOrder', th:'Powered by WisiOrder' },
  'customer.enterYourName':    { en:'Enter your name.',         it:'Inserisci il tuo nome.',      fr:'Entrez votre nom.',              de:'Geben Sie Ihren Namen ein.',       pt:'Digite seu nome.',            zh:'请输入您的姓名。', th:'กรุณาใส่ชื่อของคุณ' },
  'customer.sendFailed':       { en:'Sending failed. Try again.', it:'Invio fallito. Riprova.',  fr:'Échec de l\'envoi. Réessayez.',  de:'Senden fehlgeschlagen. Erneut versuchen.', pt:'Falha no envio. Tente novamente.', zh:'发送失败，请重试。', th:'การส่งล้มเหลว กรุณาลองอีกครั้ง' },

  /* ── orderStatus ──────────────────────────────────────────────────── */
  'orderStatus.orderNumber':      { en:'Order',            it:'Ordine',              fr:'Commande',          de:'Bestellung',          pt:'Pedido',                zh:'订单',           th:'ออร์เดอร์' },
  'orderStatus.orderReceived':    { en:'Order received',   it:'Ordine ricevuto',     fr:'Commande reçue',    de:'Bestellung erhalten', pt:'Pedido recebido',       zh:'已收到订单',     th:'ได้รับออร์เดอร์แล้ว' },
  'orderStatus.orderReceivedSub': { en:'We received it, we will start preparing shortly.', it:'Lo abbiamo ricevuto, iniziamo a prepararlo a breve.', fr:'Nous l\'avons reçu, nous allons commencer à préparer bientôt.', de:'Wir haben es erhalten und beginnen in Kürze mit der Zubereitung.', pt:'Recebemos, começaremos a preparar em breve.', zh:'我们已收到，即将开始准备。', th:'เราได้รับแล้ว จะเริ่มเตรียมในไม่ช้า' },
  'orderStatus.inPreparation':    { en:'Preparing…',       it:'In preparazione…',    fr:'En préparation…',   de:'In Zubereitung…',     pt:'Em preparo…',           zh:'备餐中…',        th:'กำลังเตรียม…' },
  'orderStatus.inPreparationSub': { en:'Keep this page open, we will let you know when it is ready.', it:'Tieni aperta questa pagina, ti avvisiamo quando è pronto.', fr:'Gardez cette page ouverte, nous vous préviendrons quand c\'est prêt.', de:'Lassen Sie diese Seite offen, wir benachrichtigen Sie, wenn es fertig ist.', pt:'Mantenha esta página aberta, avisaremos quando estiver pronto.', zh:'请保持页面打开，准备好后我们会通知您。', th:'เปิดหน้านี้ไว้ เราจะแจ้งให้ทราบเมื่อพร้อม' },
  'orderStatus.somethingReady':   { en:'Some dishes are ready!', it:'Alcuni piatti sono pronti!', fr:'Certains plats sont prêts !', de:'Einige Gerichte sind fertig!', pt:'Alguns pratos estão prontos!', zh:'部分菜品已就绪！', th:'บางเมนูพร้อมแล้ว!' },
  'orderStatus.somethingReadySub':{ en:'Check below which courses are ready.', it:'Controlla qui sotto quali portate sono pronte.', fr:'Vérifiez ci-dessous quels plats sont prêts.', de:'Prüfen Sie unten, welche Gerichte fertig sind.', pt:'Verifique abaixo quais pratos estão prontos.', zh:'请查看下方哪些菜品已就绪。', th:'ตรวจสอบด้านล่างว่าเมนูใดพร้อมแล้ว' },
  'orderStatus.allReady':         { en:'All ready! 🎉',    it:'Tutto pronto! 🎉',    fr:'Tout est prêt ! 🎉', de:'Alles fertig! 🎉', pt:'Tudo pronto! 🎉',     zh:'全部就绪！🎉',   th:'ทุกอย่างพร้อมแล้ว! 🎉' },
  'orderStatus.allReadySub':      { en:'You can collect your order.', it:'Puoi ritirare il tuo ordine.', fr:'Vous pouvez récupérer votre commande.', de:'Sie können Ihre Bestellung abholen.', pt:'Você pode retirar seu pedido.', zh:'您可以取餐了。', th:'คุณสามารถรับออร์เดอร์ได้แล้ว' },
  'orderStatus.completed':        { en:'Enjoy your meal!', it:'Buon appetito!',       fr:'Bon appétit !', de:'Guten Appetit!',     pt:'Bom apetite!',          zh:'祝您用餐愉快！', th:'ขอให้อร่อย!' },
  'orderStatus.completedSub':     { en:'Your order has been completed.', it:'Il tuo ordine è stato completato.', fr:'Votre commande a été complétée.', de:'Ihre Bestellung wurde abgeschlossen.', pt:'Seu pedido foi concluído.', zh:'您的订单已完成。', th:'ออร์เดอร์ของคุณเสร็จสมบูรณ์แล้ว' },
  'orderStatus.toConfirmTitle':   { en:'To confirm',       it:'Da confermare',       fr:'À confirmer',       de:'Zu bestätigen',       pt:'A confirmar',           zh:'待确认',         th:'รอยืนยัน' },
  'orderStatus.toConfirmTable':   { en:'The staff will confirm your order at the table.', it:'Lo staff confermerà il tuo ordine al tavolo.', fr:'Le personnel confirmera votre commande à table.', de:'Das Personal wird Ihre Bestellung am Tisch bestätigen.', pt:'A equipe confirmará seu pedido na mesa.', zh:'工作人员将在您的桌位确认订单。', th:'เจ้าหน้าที่จะยืนยันออร์เดอร์ของคุณที่โต๊ะ' },
  'orderStatus.toConfirmCounter': { en:'Go to the counter and give your name ({name}) to confirm.', it:'Vai al banco e indica il tuo nome ({name}) per confermare.', fr:'Rendez-vous au comptoir et donnez votre nom ({name}) pour confirmer.', de:'Gehen Sie zur Theke und geben Sie Ihren Namen ({name}) an, um zu bestätigen.', pt:'Vá ao balcão e informe seu nome ({name}) para confirmar.', zh:'请前往柜台并报上您的姓名（{name}）进行确认。', th:'ไปที่เคาน์เตอร์และแจ้งชื่อของคุณ ({name}) เพื่อยืนยัน' },
  'orderStatus.rejectedTitle':    { en:'Order not accepted', it:'Ordine non accettato', fr:'Commande non acceptée', de:'Bestellung nicht akzeptiert', pt:'Pedido não aceito', zh:'订单未被接受', th:'ออร์เดอร์ไม่ได้รับการยอมรับ' },
  'orderStatus.rejectedSub':      { en:'Please contact the venue staff.', it:'Rivolgiti al personale del locale.', fr:"Veuillez contacter le personnel de l'établissement.", de:'Bitte wenden Sie sich an das Lokal-Personal.', pt:'Por favor, entre em contato com a equipe do estabelecimento.', zh:'请联系场所工作人员。', th:'กรุณาติดต่อเจ้าหน้าที่ของสถานประกอบการ' },
  'orderStatus.courseStatus':     { en:'Course status',    it:'Stato portate',       fr:'État des plats',    de:'Gangstatus',          pt:'Status dos pratos',     zh:'菜品状态',       th:'สถานะเมนู' },
  'orderStatus.addToMyOrder':     { en:'Add to my order',  it:'Aggiungi al mio ordine', fr:'Ajouter à ma commande', de:'Meiner Bestellung hinzufügen', pt:'Adicionar ao meu pedido', zh:'添加到我的订单', th:'เพิ่มในออร์เดอร์ของฉัน' },
  'orderStatus.notFound':         { en:'Order not found.', it:'Ordine non trovato.',   fr:'Commande introuvable.', de:'Bestellung nicht gefunden.', pt:'Pedido não encontrado.',  zh:'找不到订单。', th:'ไม่พบออร์เดอร์' },
}

const I18nContext = createContext(null)

export function I18nProvider({ children, initialLang }) {
  const [lang, setLang] = useState(initialLang || (typeof localStorage !== 'undefined' && localStorage.getItem('wo_lang')) || 'en')
  const changeLang = useCallback((l) => {
    setLang(l)
    try { localStorage.setItem('wo_lang', l) } catch {}
  }, [])
  const t = useCallback((key, vars) => {
    const entry = TRANSLATIONS[key]
    let s = entry ? (entry[lang] ?? entry.en ?? key) : key
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k])
    return s
  }, [lang])
  return <I18nContext.Provider value={{ lang, changeLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) return { lang: 'en', changeLang: () => {}, t: (k) => k }
  return ctx
}
