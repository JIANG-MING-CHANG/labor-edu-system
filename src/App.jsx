import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { 
  Moon, Sun, Clock, Users, ShieldAlert, Scale, LogIn, Lock, 
  Play, Square, PieChart, FileDown, CheckCircle2, XCircle, Volume2, VolumeX, MessageSquare, LogOut, Unlock, Gift, Upload
} from 'lucide-react';

const SCENARIOS = [
  {
    id: 1,
    category: "工時",
    title: "手搖飲店的隱形加班",
    imgUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=800&auto=format&fit=crop",
    question: "你在連鎖手搖飲店打工，表定晚上10點下班，但店長要求大家必須「打卡後」留下來花30分鐘清點零錢與刷洗地板。請問這是否合法？",
    options: {
      A: "合法，這是員工應盡的交接義務",
      B: "不合法，打卡後的時間也算工作時間，應給付加班費",
      C: "合法，只要店長有請喝免費飲料作為補償",
      D: "視工作規則而定，公司規定可以就不違法"
    },
    correctAnswer: "B",
    plainText: "下班後的打掃、算錢，只要是老闆規定要做的，通通都算工作時間！不能叫員工先打卡再做白工，這必須依法給付加班費。",
    legalText: "【勞動基準法第24條】延長工作時間之工資加給標準。【行政院勞工委員會 81 年 4 月 4 日台 81 勞動 2 字第 09906 號函釋】勞工於工作時間外，應雇主要求參加之晨會或於原工作時間外，應雇主要求所從事之準備、清理環境等，均應屬延長工作時間，雇主應依法給付延時工資。",
    rulingText: "⚖️ 實務判例：【最高行政法院 107 年度判字第 134 號判決】法院明確認定，勞工於規定之工作時間外，若受雇主指揮監督進行交接、準備或善後工作，因勞工已無法自由支配該段時間，實質上即屬工作時間。雇主強制先打卡再工作，經勞檢稽查即構成違反勞基法第24條之事實，裁罰有理。"
  },
  {
    id: 2,
    category: "性平",
    title: "科技廠的生理假爭議",
    imgUrl: "https://images.unsplash.com/photo-1573164574572-cb89e39749b4?q=80&w=800&auto=format&fit=crop",
    question: "你在科技大廠擔任工程師，因生理痛想請生理假，主管卻說：「部門專案趕進度，妳必須提出醫院開立的診斷證明才能請假。」請問主管的要求合法嗎？",
    options: {
      A: "合法，公司有權要求證明以防員工濫用",
      B: "不合法，請生理假不需要提出任何證明",
      C: "合法，但只能要求診所收據，不能要求診斷書",
      D: "不合法，只能請事假或病假代替"
    },
    correctAnswer: "B",
    plainText: "女生每個月請一次生理假，是絕對不需要給醫生證明的！因為生理痛很難用醫學儀器量測，老闆不能藉故要求診斷證明刁難。",
    legalText: "【性別平等工作法第14條】女性受僱者因生理日致工作有困難者，每月得請生理假一日。【性別平等工作法施行細則第13條】受僱者依本法第十四條至第二十條規定為請求或申請時，必要時雇主得要求其提出相關證明文件。「但請求生理假時，不在此限。」",
    rulingText: "⚖️ 實務案例：【臺北市政府勞動局 110 年度性平會裁罰實例】某知名電子廠人資主管要求女性員工請生理假需附「就醫證明」或「驗試紙」，遭臺北市勞動局重罰新台幣10萬元。勞動部亦多次發布新聞稿重申，強制要求診斷書等同實質阻礙女性行使法定權利，直接違反性平法強制規定。"
  },
  {
    id: 3,
    category: "職災",
    title: "上班途中的車禍",
    imgUrl: "https://images.unsplash.com/photo-1558222218-b7b54eede3f3?q=80&w=800&auto=format&fit=crop",
    question: "小明每天騎機車上班，某天在上班必經路線上被闖紅燈的汽車撞傷，導致骨折住院。小明可以向公司申請職災補償嗎？",
    options: {
      A: "不行，因為不是在公司裡面發生的",
      B: "可以，通勤途中的意外屬於「通勤職災」",
      C: "不行，這是肇事汽車駕駛的責任，與公司無關",
      D: "可以，但前提是小明必須證明自己沒有超速"
    },
    correctAnswer: "B",
    plainText: "只要是在平常上班的必經路線上（沒有跑去辦私事），且自己沒有重大違規（如酒駕、無照），發生車禍都算「通勤職災」，公司必須給予醫療與原領工資補償。",
    legalText: "【勞工職業災害保險及保護法】及【勞工保險被保險人因執行職務而致傷病審查準則第4條】被保險人上、下班，於適當時間，從日常居、住處所往返就業場所，或因從事二份以上工作而往返於就業場所間之應經途中發生事故而致之傷害，視為職業傷害。",
    rulingText: "⚖️ 實務判例：【最高法院 101 年度台上字第 544 號判決】最高法院見解指出，勞工上下班必經途中之交通事故，若非出於勞工私人行為且無違反交通規則之重大過失（如闖紅燈、酒駕），因其具備「遂行職務之內在關聯性」，雇主依法須承擔勞基法第59條之無過失職災補償責任。"
  },
  {
    id: 4,
    category: "權利救濟",
    title: "突如其來的調職",
    imgUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=800&auto=format&fit=crop",
    question: "你在台北總公司擔任行銷企劃，老闆突然以「業績不佳」為由，未經你同意就將你調到高雄工廠擔任包裝作業員，且薪水減少。這合法嗎？",
    options: {
      A: "合法，老闆有企業經營權，有權利調動員工",
      B: "不合法，違反了勞動基準法的調動五原則",
      C: "合法，只要公司有發給搬遷補助費就可以",
      D: "不合法，但員工只能向消基會申訴"
    },
    correctAnswer: "B",
    plainText: "老闆不能隨便把你亂調單位！調職必須符合法定的「調動五原則」（例如：不能降薪、體力技術要能勝任、地點過遠要給協助等）。若違反，勞工可拒絕並主張解約拿資遣費。",
    legalText: "【勞動基準法第10-1條】雇主調動勞工工作，不得違反勞動契約之約定，並應符合下列原則：一、基於企業經營上所必須。二、對勞工工資及其他勞動條件，未作不利之變更。三、調動後工作為勞工體能及技術可勝任。四、調動工作地點過遠，雇主應予以必要之協助。五、考量勞工及其家庭之生活利益。",
    rulingText: "⚖️ 實務判例：【最高法院 109 年度台上字第 1121 號判決】雇主將內勤行政人員調至體力勞動之工廠包裝線。法院審理認定，工作性質差異過大，已違反勞工體能技術可勝任原則，且調降底薪違反工資未作不利變更原則。該調職處分無效，勞工可依勞基法第14條第1項第6款終止契約，並請求雇主給付資遣費。"
  },
  {
    id: 5,
    category: "工時",
    title: "颱風天的外送危機",
    imgUrl: "https://images.unsplash.com/photo-1515668236457-83c3b8764839?q=80&w=800&auto=format&fit=crop",
    question: "縣市政府宣布颱風停班停課，但披薩店老闆仍要求員工冒著狂風暴雨騎車外送，否則扣發當月全勤獎金。此舉是否合法？",
    options: {
      A: "合法，颱風假不是法定假日，企業可自行決定營業",
      B: "不合法，停班停課期間雇主絕對不能要求任何人出勤",
      C: "違反職安規定，雇主未評估危險強制出勤，勞工可行使退避權拒絕",
      D: "合法，只要當天給予雙倍薪水即符合規定"
    },
    correctAnswer: "C",
    plainText: "颱風天若出門有生命危險，員工可以行使「退避權」不去上班。老闆不能記曠職或扣全勤。如果老闆硬要你外送，未提供安全防護，將面臨重罰。",
    legalText: "【天然災害發生事業單位勞工出勤管理及工資給付要點】勞工因天然災害致未出勤，雇主不得視為曠工、遲到或強迫勞工以事假處理，且不得扣發全勤獎金。【職業安全衛生法第18條】勞工執行職務發現有立即發生危險之虞時，得在不危及其他工作者安全情形下，自行停止作業及退避至安全場所(退避權)。",
    rulingText: "⚖️ 實務案例：【勞動部職業安全衛生署 裁罰案例】某知名披薩連鎖店於颱風停班課期間，未依《食品外送作業安全衛生指引》評估風雨風險，強令外送員出勤致生事故。職安署以違反《職業安全衛生法》對雇主祭出最高新台幣 30 萬元罰鍰，並明示勞工對危及生命之不當指派擁有絕對之退避權。"
  },
  {
    id: 6,
    category: "性平",
    title: "面試時的尷尬問題",
    imgUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop",
    question: "小美去面試一份行政工作，人資主管詢問：「妳打算什麼時候結婚？短期內有懷孕生小孩的計畫嗎？我們這裡很忙不適合孕婦。」這是否違法？",
    options: {
      A: "合法，公司有權了解員工未來的職涯與時間規劃",
      B: "不合法，這構成了違反性平法的懷孕歧視（性別歧視）",
      C: "合法，只要沒有因為這樣「直接說」不錄取她就不違法",
      D: "不合法，這是侵害個人資料，但不是就業歧視"
    },
    correctAnswer: "B",
    plainText: "求職面試時問何時結婚、生小孩，甚至明示暗示孕婦不要來，這就是嚴重的「就業歧視」！無論男女，面試都不該被問這些與工作能力無關的私人問題。",
    legalText: "【性別平等工作法第11條】雇主對受僱者之招募、甄試、進用、分發、配置、考績或陞遷等，不得因性別或性傾向而有差別待遇。【就業服務法第5條第1項】為保障國民就業機會平等，雇主對求職人或所僱用員工，不得以種族、階級、語言、思想、宗教、黨派、籍貫、出生地、性別、性傾向、年齡、婚姻...為由，予以歧視。",
    rulingText: "⚖️ 實務判例：【臺北高等行政法院 108 年度訴字第 456 號判決】某公司招募面試時要求女性求職者填寫「近期有無懷孕計畫」問卷。勞動局認定構成懷孕歧視開罰 30 萬元。法院判決維持原處分，指明雇主於招募時探詢與工作能力無關之生育計畫，即已構成對特定性別之差別待遇意圖，違法明確。"
  },
  {
    id: 7,
    category: "權利救濟",
    title: "被迫離職的逆襲",
    imgUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800&auto=format&fit=crop",
    question: "公司長期營運不佳，已經積欠兩個月薪水不發。你受不了決定離職，你可以向公司主張什麼權利？",
    options: {
      A: "只能要回被積欠的薪水，因為是你自己提離職的",
      B: "可依勞基法第14條主張「被迫離職」，不僅討回薪水，還可要求資遣費",
      C: "不能要求任何錢，因為未滿預告期離職反而要賠償公司損失",
      D: "可以要求薪水，以及相當於六個月薪水的精神撫慰金"
    },
    correctAnswer: "B",
    plainText: "老闆不給薪水、違反勞工法令時，勞工主動提離職在法律上稱為「被迫離職」。你不但可以馬上走人（無須預告期），討回薪水之外，還可以強制老闆付你「資遣費」並開立非自願離職證明！",
    legalText: "【勞動基準法第14條第1項】有下列情形之一者，勞工得不經預告終止契約：...五、雇主不依勞動契約給付工作報酬者。六、雇主違反勞動契約或勞工法令，致有損害勞工權益之虞者。依同條第4項規定，準用第17條（即雇主應發給資遣費）。",
    rulingText: "⚖️ 實務判例：【最高法院 92 年度台上字第 1779 號判決】雇主未按期發放工資，勞工以此為由發存證信函終止勞動契約（被迫辭職）。最高法院判決雇主不僅須補足積欠工資，且因雇主違法違約在先，勞工主動解約為合法行使權利，雇主依法必須給付資遣費，並應核發非自願離職證明書供勞工申請失業給付。"
  },
  {
    id: 8,
    category: "職災",
    title: "工地的高溫殺手",
    imgUrl: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=800&auto=format&fit=crop",
    question: "炎熱夏天的工地，氣溫高達38度。建商為了趕工，現場未設置任何遮陽陰涼處，也未提供飲水，導致工人阿強中暑(熱衰竭)昏迷送醫。雇主是否有法律責任？",
    options: {
      A: "沒有責任，天氣熱是自然現象屬於不可抗力",
      B: "有責任，雇主違反了職安法預防高溫危害的設施規定",
      C: "有責任，但阿強自己沒帶水也有50%的過失責任",
      D: "沒有責任，因為阿強昏迷前沒有主動向雇主反映身體不適"
    },
    correctAnswer: "B",
    plainText: "在戶外高溫環境工作，老闆依法「必須」提供休息陰涼處和充足的飲水。如果因為老闆沒做防護措施導致員工熱衰竭或中暑，這絕對算職業災害，老闆會面臨刑罰與高額罰款！",
    legalText: "【職業安全衛生設施規則第324-6條】雇主使勞工從事戶外作業，為防範高溫引起之熱疾病，應視天候狀況採取下列危害預防措施：一、降低作業場所之溫度。二、提供陰涼之休息場所。三、提供充足飲用水或適當之飲料。【職業安全衛生法第6條】雇主對防止輻射、高溫、低溫、超音波、噪音...引起之危害，應有符合規定之必要安全衛生設備及措施。",
    rulingText: "⚖️ 實務案例：【勞動部職安署 熱危害專案勞檢裁罰】每年夏季職安署均會針對戶外作業啟動專案檢查。真實案例中，某營造廠未設遮陽與飲水設施，致勞工熱衰竭死亡。職安署除勒令停工並重罰最高30萬元外，雇主更被依涉嫌《刑法》過失致死罪及違反《職安法》移送地檢署偵辦，雇主須負完全過失責任。"
  },
  {
    id: 9,
    category: "工時",
    title: "休假時的LINE群組",
    imgUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop",
    question: "小林週末在家休息，主管卻不斷在LINE群組交辦工作，甚至要求小林立刻用電腦修改企劃案並回傳檔案。請問小林處理公事的這段時間算什麼？",
    options: {
      A: "算員工的自我精進時間，無薪水",
      B: "算責任制的範圍，不能要求額外給付",
      C: "算工作時間，雇主應依法給付加班費",
      D: "算待命時間，只能領取基本底薪的一半"
    },
    correctAnswer: "C",
    plainText: "下班後老闆用通訊軟體交辦工作，只要你確實花時間去處理並交付結果，這就依法認定為「加班」！員工務必截圖對話紀錄和檔案修改時間，向老闆要求給付加班費。",
    legalText: "【勞動基準法第24條】延長工作時間之工資加給標準。【勞工在事業場所外工作時間指導原則】明定：勞工於正常工作時間外，因雇主以通訊軟體、電話等要求交付工作，勞工可自行記錄工作起迄時間，並輔以通訊紀錄、完成文件傳遞戳記，雇主應依法給付延時工資(加班費)。",
    rulingText: "⚖️ 實務判例：【臺灣新北地方法院 107 年度勞訴字第 100 號判決】此為台灣極具指標性之「LINE截圖討加班費」勝訴判例。法院依據勞工提供之LINE對話紀錄與電子郵件時間戳記，認定雇主於下班或假日時間傳送指令並要求即時處理，實質上已使勞工處於指揮監督下提供勞務，判決雇主必須按分鐘精算給付該段時間之加班費。"
  },
  {
    id: 10,
    category: "性平",
    title: "尾牙的鹹豬手",
    imgUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop",
    question: "公司尾牙聚餐時，其他部門的主管喝醉了，趁機摟抱女員工小芳。隔天小芳向公司人資申訴，公司卻說「下班時間且在外面餐廳發生，公司管不著」。公司的說法對嗎？",
    options: {
      A: "對，只有在上班時間且於辦公室內發生的才算職場性騷擾",
      B: "不對，尾牙屬於公司辦理的活動，仍適用性平法的職場性騷擾防治規定",
      C: "對，因為是對方喝醉了屬於無意識行為",
      D: "不對，但公司只需建議小芳報警，不需啟動內部性平調查"
    },
    correctAnswer: "B",
    plainText: "只要是公司舉辦的活動（尾牙、春酒、員工旅遊等），都算是「職場的延伸」。在這些場合發生性騷擾，公司一接獲申訴就必須立刻啟動調查，並採取有效的糾正和補救措施，絕對不能裝死不管！",
    legalText: "【性別平等工作法第12條】受僱者於「執行職務時」，任何人以具有性意味之言詞或行為，對其造成敵意性工作環境。勞動部函釋明定：雇主辦理之尾牙聚餐，屬執行職務之延伸。【同法第13條】雇主於知悉前條性騷擾之情形時，應採取立即有效之糾正及補救措施。",
    rulingText: "⚖️ 實務判例：【最高行政法院 108 年度判字第 200 號判決】法院確認，雇主舉辦之尾牙、春酒、員工旅遊，無論是否為上班時間或在公司外舉辦，皆屬「執行職務之延伸」。若發生性騷擾事件，雇主接獲申訴後若未依法啟動性平調查機制，或未採取立即有效之糾正補救措施，主管機關依法重罰雇主確屬有理。"
  }
];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
  }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  playTone(freq, type, duration, vol=0.1) {
    if (!this.ctx || !this.soundEnabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
  tick() { this.playTone(800, 'sine', 0.1, 0.05); }
  lock() { this.playTone(150, 'square', 0.2, 0.2); setTimeout(()=>this.playTone(100, 'square', 0.2, 0.2), 100); }
  success() {
    this.playTone(523.25, 'sine', 0.1, 0.1); // C5
    setTimeout(()=>this.playTone(659.25, 'sine', 0.1, 0.1), 100); // E5
    setTimeout(()=>this.playTone(783.99, 'sine', 0.3, 0.1), 200); // G5
  }
  fail() {
    this.playTone(300, 'sawtooth', 0.3, 0.1);
    setTimeout(()=>this.playTone(250, 'sawtooth', 0.4, 0.1), 150);
  }
  toggle() { this.soundEnabled = !this.soundEnabled; return this.soundEnabled;}
}
const sfx = new AudioEngine();

export default function LaborEduApp() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'teacher' or 'student'
  const [userName, setUserName] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'labor-edu-default';
  
  const { db, auth } = useMemo(() => {
    try {
      const firebaseConfig = {
  apiKey: "AIzaSyDUWK4fLiiRWF5oWKvtI-yQqj8bjUrKPC8",
  authDomain: "labor-edu.firebaseapp.com",
  projectId: "labor-edu",
  storageBucket: "labor-edu.firebasestorage.app",
  messagingSenderId: "643910144514",
  appId: "1:643910144514:web:09a477718ba419ad0f8d1b",
  measurementId: "G-6CCC25C7T0"
};
      if (!firebaseConfig) throw new Error("Firebase config missing");
      const app = initializeApp(firebaseConfig);
      return { db: getFirestore(app), auth: getAuth(app) };
    } catch (e) {
      console.error("Firebase init error:", e);
      return { db: null, auth: null };
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, [auth]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogout = () => {
    setRole(null);
    setUserName('');
  };

  const appClassName = `min-h-screen w-full transition-colors duration-300 font-sans ${
    isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-900'
  }`;

  if (!db || !auth) {
    return <div className="p-10 text-red-500">系統初始化中，或缺乏後端設定。</div>;
  }

  if (!role) {
    return (
      <div className={appClassName}>
        <div className="absolute top-4 right-4 z-50">
           <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-800/20 transition-all text-current shadow-lg backdrop-blur-sm border border-slate-500/20">
             {isDarkMode ? <Sun size={24}/> : <Moon size={24}/>}
           </button>
        </div>
        <LoginScreen setRole={(r, name) => {
          sfx.init(); 
          setUserName(name);
          setRole(r);
        }} />
      </div>
    );
  }

  return (
    <div className={appClassName}>
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
         <div className={`absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] mix-blend-screen opacity-40 animate-pulse ${isDarkMode ? 'bg-blue-900' : 'bg-blue-300'}`} style={{animationDuration: '8s'}} />
         <div className={`absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[150px] mix-blend-screen opacity-30 animate-pulse ${isDarkMode ? 'bg-purple-900' : 'bg-purple-300'}`} style={{animationDuration: '12s'}} />
      </div>
      
      {role === 'teacher' ? (
        <TeacherDashboard db={db} appId={appId} user={user} toggleTheme={toggleTheme} isDark={isDarkMode} onLogout={handleLogout} />
      ) : (
        <StudentView db={db} appId={appId} user={user} userName={userName} toggleTheme={toggleTheme} isDark={isDarkMode} onLogout={handleLogout} />
      )}
    </div>
  );
}

function LoginScreen({ setRole }) {
  const [name, setName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [isTeacherLogin, setIsTeacherLogin] = useState(false);

  const handleStudentLogin = (e) => {
    e.preventDefault();
    if (name.trim()) setRole('student', name.trim());
  };

  const handleTeacherLogin = (e) => {
    e.preventDefault();
    if (teacherCode === 'osti') setRole('teacher', 'Teacher');
    else alert('教師密碼錯誤'); 
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-600/20 rounded-full blur-[100px]" />

      <div className="z-10 text-center mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
          LaborSphere
        </h1>
        <p className="text-xl font-medium tracking-wide opacity-80">台灣勞權啟蒙互動宇宙</p>
      </div>

      <div className="z-10 w-full max-w-md bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-800 p-8 rounded-3xl shadow-2xl">
        
        <div className="flex justify-center mb-6 space-x-2 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl">
          <button 
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isTeacherLogin ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400' : 'opacity-60'}`}
            onClick={() => setIsTeacherLogin(false)}
          >
            <Users size={16} className="inline mr-2"/>學員登入
          </button>
          <button 
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isTeacherLogin ? 'bg-white dark:bg-slate-700 shadow-md text-purple-600 dark:text-purple-400' : 'opacity-60'}`}
            onClick={() => setIsTeacherLogin(true)}
          >
            <ShieldAlert size={16} className="inline mr-2"/>教師中控
          </button>
        </div>

        {!isTeacherLogin ? (
          <form onSubmit={handleStudentLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">請輸入您的姓名 / 員工編號</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-black/20 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="例如：王大明"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center hover:scale-[1.02]">
              <LogIn size={20} className="mr-2" /> 進入情境
            </button>
          </form>
        ) : (
          <form onSubmit={handleTeacherLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">授權碼</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-black/20 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="請輸入授權碼"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center hover:scale-[1.02]">
              <Lock size={20} className="mr-2" /> 開啟中控台
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function StudentView({ db, appId, user, userName, toggleTheme, isDark, onLogout }) {
  const [session, setSession] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);
  const [myText, setMyText] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [shake, setShake] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [isIndividuallyLocked, setIsIndividuallyLocked] = useState(false);
  const [lastReward, setLastReward] = useState(0);

  useEffect(() => {
    if (!user) return;
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main');
    
    const unsub = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        if (session && session.status !== data.status) {
          if (data.status === 'revealed') {
             const correct = SCENARIOS[data.currentQuestion]?.correctAnswer;
             if (myAnswer === correct) {
               sfx.success();
               setConfetti(true);
               setTimeout(()=>setConfetti(false), 4000); // 延長彩帶時間
             } else {
               sfx.fail();
               setShake(true);
               setTimeout(()=>setShake(false), 800);
             }
          }
          if (data.status === 'discussion') {
            sfx.lock(); 
          }
        }
        
        if (session && session.currentQuestion !== data.currentQuestion) {
          setMyAnswer(null);
          setMyText('');
          setHasSubmitted(false);
          setIsIndividuallyLocked(false);
        }

        setSession(data);
      } else {
        setSession({ status: 'closed' });
      }
    }, (err) => console.error(err));
    return () => unsub();
  }, [user, db, appId, session, myAnswer]);

  useEffect(() => {
    if (!user || !session || session.status === 'closed') return;
    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants', user.uid);
    const unsub = onSnapshot(pRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.kicked) {
          alert("您已被教師移出教室！");
          onLogout();
          return;
        }
        setIsIndividuallyLocked(!!data.locked);

        if (data.rewardTrigger && data.rewardTrigger > lastReward) {
          setLastReward(data.rewardTrigger);
          sfx.success(); 
          setConfetti(true);
          setTimeout(() => setConfetti(false), 4000);
        }
      }
    });
    return () => unsub();
  }, [user, db, appId, session, lastReward, onLogout]);

  useEffect(() => {
    if (session?.status === 'active' && session?.endTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        if (remaining > 0 && remaining <= 10) {
          sfx.tick(); 
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const selectOption = (choice) => {
    if (session?.status !== 'active' || hasSubmitted || isIndividuallyLocked) return;
    setMyAnswer(choice);
  };

  const confirmSubmission = async () => {
    if (session?.status !== 'active' || !myAnswer || hasSubmitted || isIndividuallyLocked) return;
    setHasSubmitted(true);
    
    try {
      const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants', user.uid);
      await setDoc(pRef, {
        name: userName,
        [`q_${session.currentQuestion}_choice`]: myAnswer,
        [`q_${session.currentQuestion}_text`]: myText,
        updatedAt: Date.now()
      }, { merge: true });
    } catch(e) {
      console.error("Save error:", e);
    }
  };

  const toggleSound = () => setSoundOn(sfx.toggle());

  if (!session || session.status === 'closed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center relative">
        <div className="absolute top-4 right-16 z-50">
          <button onClick={onLogout} className="p-2 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/40 transition-all font-bold flex items-center shadow-lg backdrop-blur-sm border border-red-500/20">
             <LogOut size={18} className="mr-2"/> 離開
          </button>
        </div>
        <Lock size={64} className="opacity-20 mb-6" />
        <h2 className="text-3xl font-bold mb-2">等待講師開放系統...</h2>
        <p className="opacity-60">請稍候，課程即將開始</p>
      </div>
    );
  }

  if (session.status === 'finished') {
    return <StudentResultView db={db} appId={appId} user={user} userName={userName} onLogout={onLogout} />;
  }

  const currentQ = SCENARIOS[session.currentQuestion];
  const isLocked = session.status !== 'active' || isIndividuallyLocked || hasSubmitted;
  const showResult = session.status === 'revealed';
  const isCorrect = myAnswer === currentQ.correctAnswer;

  return (
    <div className={`min-h-screen flex flex-col p-4 md:p-8 max-w-4xl mx-auto ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .confetti-piece {
          position: fixed; width: 12px; height: 35px; background: #ffd700; top: -50px; opacity: 0;
          animation: fall linear forwards;
          border-radius: 4px;
        }
        @keyframes fall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 1; }
        }
        .glass-card {
          background: ${isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.85)'};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
      
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(200)].map((_, i) => (
             <div key={i} className="confetti-piece" style={{
               left: `${Math.random() * 100}vw`,
               background: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#ff8800', '#00ffff', '#ffffff', '#a855f7'][Math.floor(Math.random()*9)],
               animationDuration: `${Math.random() * 2.5 + 1.5}s`,
               animationDelay: `${Math.random() * 0.2}s`,
               boxShadow: '0 0 15px rgba(255,255,255,0.7)',
               width: `${Math.random() * 10 + 5}px`,
               height: `${Math.random() * 20 + 10}px`
             }}/>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6 glass-card p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-500/30">
            {userName.charAt(0)}
          </div>
          <div>
            <div className="text-sm opacity-60 font-medium tracking-wider text-blue-400">MISSION {session.currentQuestion + 1}</div>
            <div className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">{currentQ.title}</div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={toggleSound} className="opacity-60 hover:opacity-100 hover:scale-110 transition-transform p-2 bg-slate-500/10 rounded-full">
            {soundOn ? <Volume2/> : <VolumeX/>}
          </button>
          <div className={`flex items-center font-mono text-2xl font-black px-5 py-2 rounded-xl shadow-inner ${
            timeLeft <= 10 && !isLocked && session.status === 'active' ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/50' : 'bg-black/10 dark:bg-white/10'
          }`}>
            <Clock className="mr-2" size={20} />
            {session.status !== 'active' ? '00:00' : `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="glass-card rounded-3xl overflow-hidden mb-6 transform transition-all hover:shadow-2xl">
        <div className="h-56 md:h-72 w-full relative group">
          <img src={currentQ.imgUrl} alt="Scenario" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent flex items-end p-8">
             <span className="bg-blue-600/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-sm font-bold tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.5)]">
               {currentQ.category}
             </span>
          </div>
        </div>
        <div className="p-6 md:p-8">
          <h3 className="text-2xl md:text-3xl font-extrabold leading-relaxed mb-8">
            {currentQ.question}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Object.entries(currentQ.options).map(([key, text]) => {
              const isSelected = myAnswer === key;
              let btnClass = "p-5 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden group ";
              
              if (showResult) {
                if (key === currentQ.correctAnswer) {
                  btnClass += "bg-green-100 border-green-500 text-green-900 dark:bg-green-900/40 dark:border-green-400 dark:text-green-50 shadow-[0_0_20px_rgba(34,197,94,0.3)]";
                } else if (isSelected) {
                  btnClass += "bg-red-100 border-red-500 text-red-900 dark:bg-red-900/40 dark:border-red-400 dark:text-red-50";
                } else {
                  btnClass += "border-slate-200 dark:border-slate-800 opacity-30 grayscale";
                }
              } else {
                if (isSelected) {
                  btnClass += "border-blue-500 bg-blue-50 dark:bg-blue-900/40 shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-[1.02] transform";
                } else {
                  btnClass += "border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 " + (isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/50');
                }
              }

              return (
                <button 
                  key={key} 
                  disabled={isLocked}
                  onClick={() => selectOption(key)}
                  className={btnClass}
                >
                  <div className="flex items-start z-10 relative">
                    <span className={`text-xl font-black mr-4 ${isSelected && !showResult ? 'text-blue-600 dark:text-blue-400' : 'opacity-60'}`}>{key}.</span>
                    <span className="text-lg font-medium">{text}</span>
                  </div>
                  {isSelected && !showResult && <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-50 z-0"></div>}
                  
                  {showResult && key === currentQ.correctAnswer && (
                    <CheckCircle2 className="absolute top-1/2 -translate-y-1/2 right-4 text-green-500 drop-shadow-md" size={32} />
                  )}
                  {showResult && isSelected && key !== currentQ.correctAnswer && (
                    <XCircle className="absolute top-1/2 -translate-y-1/2 right-4 text-red-500 drop-shadow-md" size={32} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {session.status === 'discussion' && (
        <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 border border-yellow-500/50 text-yellow-800 dark:text-yellow-200 p-6 rounded-2xl text-center mb-6 animate-pulse backdrop-blur-md shadow-[0_0_30px_rgba(234,179,8,0.2)]">
          <MessageSquare className="mx-auto mb-3" size={36} />
          <h3 className="text-2xl font-black tracking-widest mb-1">小組思辨時間</h3>
          <p className="font-medium opacity-80">作答已鎖定！講師正在查看全班數據，請準備分享您的觀點。</p>
        </div>
      )}

      {/* Text Input & Submit Button */}
      {!showResult && (
        <div className="glass-card p-6 rounded-3xl mb-10 border border-slate-300 dark:border-slate-700 shadow-xl">
          <label className="block text-sm font-bold mb-3 opacity-80 flex items-center">
            <MessageSquare size={16} className="mr-2 text-blue-500"/> 補充說明 (選填)：為什麼選擇這個答案？
          </label>
          
          <textarea 
            disabled={isLocked}
            className="w-full p-4 rounded-xl bg-black/5 dark:bg-black/40 border border-slate-300/50 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none mb-4 transition-all"
            rows="3"
            placeholder="輸入您的觀點或法理依據..."
            value={myText}
            onChange={(e) => setMyText(e.target.value)}
          />
          
          <div className="flex justify-end">
            <button 
              disabled={isLocked || !myAnswer}
              onClick={confirmSubmission}
              className={`flex items-center justify-center px-8 py-3 rounded-xl font-bold shadow-lg transition-all ${
                isLocked || !myAnswer 
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-70' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-blue-500/50 hover:scale-[1.03]'
              }`}
            >
              <CheckCircle2 size={20} className="mr-2"/> 
              {hasSubmitted ? '答案已確認送出' : '確認作答並送出'}
            </button>
          </div>
        </div>
      )}

      {/* Result Explanations */}
      {showResult && (
        <div className={`p-8 rounded-3xl border-2 mb-10 glass-card relative overflow-hidden ${isCorrect ? 'border-green-400/50 bg-green-50/10' : 'border-red-400/50 bg-red-50/10'}`}>
           <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}></div>
           
           <h3 className={`text-3xl font-black mb-4 flex items-center relative z-10 ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
             {isCorrect ? '🎉 觀念完全正確！' : '💡 喔噢！觀念有落差喔！'}
           </h3>
           <p className="text-xl leading-relaxed mb-6 font-medium relative z-10">{currentQ.plainText}</p>
           
           <div className="grid md:grid-cols-2 gap-4 relative z-10">
             <div className="bg-black/10 dark:bg-black/30 p-5 rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur-sm">
               <div className="font-bold flex items-center mb-3 text-blue-600 dark:text-blue-400"><Scale size={18} className="mr-2"/>法源依據</div>
               <div className="text-sm leading-relaxed opacity-90">{currentQ.legalText}</div>
             </div>
             
             <div className="bg-purple-900/10 dark:bg-purple-900/30 p-5 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
               <div className="font-bold flex items-center mb-3 text-purple-600 dark:text-purple-400"><ShieldAlert size={18} className="mr-2"/>實務判例</div>
               <div className="text-sm leading-relaxed opacity-90">{currentQ.rulingText.replace('⚖️ 實務判例：', '')}</div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}

function StudentResultView({ db, appId, user, userName, onLogout }) {
  const [scores, setScores] = useState([]);
  
  useEffect(() => {
    const fetchScores = async () => {
      const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants', user.uid);
      const unsub = onSnapshot(pRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          let stats = { "工時": {c:0, t:0}, "性平": {c:0, t:0}, "職災": {c:0, t:0}, "權利救濟": {c:0, t:0} };
          
          SCENARIOS.forEach((q, idx) => {
             stats[q.category].t += 1;
             if (data[`q_${idx}_choice`] === q.correctAnswer) {
               stats[q.category].c += 1;
             }
          });

          const formatted = Object.keys(stats).map(key => ({
            subject: key,
            A: stats[key].t > 0 ? Math.round((stats[key].c / stats[key].t) * 100) : 0,
            fullMark: 100
          }));
          setScores(formatted);
        }
      });
      return () => unsub();
    };
    fetchScores();
  }, [user, db, appId]);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
       <div className="absolute top-4 right-16 z-50 print:hidden">
          <button onClick={onLogout} className="p-2 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/40 transition-all font-bold flex items-center shadow-lg backdrop-blur-sm border border-red-500/20">
             <LogOut size={18} className="mr-2"/> 離開並登出
          </button>
       </div>
       <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 text-center print:shadow-none print:border-none">
          <h2 className="text-3xl font-extrabold mb-2">訓練完成！</h2>
          <p className="text-lg opacity-60 mb-8">{userName} 的專屬勞動意識雷達圖</p>
          
          <div className="h-80 w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={scores}>
                <PolarGrid strokeOpacity={0.2} />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar name="得分率" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             {scores.map(s => (
               <div key={s.subject} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <div className="text-sm opacity-60">{s.subject}</div>
                  <div className="text-2xl font-bold text-blue-500">{s.A}%</div>
               </div>
             ))}
          </div>

          <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all flex items-center justify-center mx-auto print:hidden">
            <FileDown className="mr-2" /> 匯出報告 (PDF)
          </button>
       </div>
    </div>
  );
}

function TeacherDashboard({ db, appId, user, toggleTheme, isDark, onLogout }) {
  const [session, setSession] = useState({ status: 'closed', currentQuestion: 0 });
  const [participants, setParticipants] = useState([]);
  const [timeLimit, setTimeLimit] = useState(5); 

  useEffect(() => {
    if (!user) return;
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main');
    const unsub = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) setSession(snapshot.data());
    });
    return () => unsub();
  }, [user, db, appId]);

  useEffect(() => {
    if (!user) return;
    const pColl = collection(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants');
    const unsub = onSnapshot(pColl, (snapshot) => {
      const parts = [];
      snapshot.forEach(d => parts.push({ id: d.id, ...d.data() }));
      setParticipants(parts);
    });
    return () => unsub();
  }, [user, db, appId]);

  const updateSession = async (data) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main');
    await setDoc(ref, data, { merge: true });
  };

  const startSession = () => updateSession({ status: 'active', currentQuestion: 0, endTime: Date.now() + timeLimit * 60 * 1000 });
  
  const nextQuestion = () => {
    const nextIdx = session.currentQuestion + 1;
    if (nextIdx >= SCENARIOS.length) {
      updateSession({ status: 'finished' });
    } else {
      updateSession({ status: 'active', currentQuestion: nextIdx, endTime: Date.now() + timeLimit * 60 * 1000 });
    }
  };

  const jumpToQuestion = (idx) => {
    if (session.status !== 'closed' && idx === session.currentQuestion) return;
    const msg = session.status === 'closed' 
      ? `系統目前為未開放狀態。\n確定要開放系統，並直接從第 ${idx + 1} 關開始嗎？` 
      : `確定要直接跳至第 ${idx + 1} 關嗎？\n作答時間將依據設定重新計算。`;
    if (window.confirm(msg)) {
      updateSession({ status: 'active', currentQuestion: idx, endTime: Date.now() + timeLimit * 60 * 1000 });
    }
  };

  const stopTimer = () => updateSession({ status: 'discussion' }); 
  const revealAnswer = () => updateSession({ status: 'revealed' });

  const endAndClearSession = async () => {
    if(!window.confirm("確定要結束並清除所有學員資料嗎？(不可恢復)")) return;
    const pColl = collection(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants');
    const snaps = await getDocs(pColl);
    const delPromises = snaps.docs.map(d => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants', d.id)));
    await Promise.all(delPromises);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main'), { status: 'closed', currentQuestion: 0 });
  };

  const kickStudent = async (uid, name) => {
    if(window.confirm(`確定要將學員 ${name} 移出教室嗎？`)) {
      const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants', uid);
      await setDoc(pRef, { kicked: true }, { merge: true });
    }
  };

  const toggleLockStudent = async (uid, currentLockStatus) => {
    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants', uid);
    await setDoc(pRef, { locked: !currentLockStatus }, { merge: true });
  };

  const rewardStudent = async (uid) => {
    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants', uid);
    await setDoc(pRef, { rewardTrigger: Date.now() }, { merge: true });
  };

  const exportCSV = () => {
    if (participants.length === 0) return;
    let csv = "學員姓名,";
    SCENARIOS.forEach((q, i) => csv += `Q${i+1}_${q.category},Q${i+1}_申論,`);
    csv += "\n";
    
    participants.filter(p => !p.kicked).forEach(p => {
      csv += `${p.name},`;
      SCENARIOS.forEach((q, i) => {
         const ans = p[`q_${i}_choice`] || '-';
         const text = (p[`q_${i}_text`] || '').replace(/,/g, '，');
         csv += `${ans},${text},`;
      });
      csv += "\n";
    });

    const blob = new Blob(["\ufeff"+csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `勞動教育成效_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const currentQ = SCENARIOS[session.currentQuestion] || SCENARIOS[0];
  const chartData = [
    { name: 'A', value: 0 }, { name: 'B', value: 0 }, { name: 'C', value: 0 }, { name: 'D', value: 0 }
  ];
  let answerCount = 0;
  
  participants.forEach(p => {
    const ans = p[`q_${session.currentQuestion}_choice`];
    if (ans && ['A','B','C','D'].includes(ans)) {
      const idx = ans.charCodeAt(0) - 65;
      chartData[idx].value += 1;
      answerCount++;
    }
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0B1120] text-slate-100 font-sans selection:bg-purple-500/30">
      <style>{`
        .cyber-panel {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(56, 189, 248, 0.1);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(56, 189, 248, 0.05);
        }
        .cyber-border { position: relative; }
        .cyber-border::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.5), transparent);
        }
      `}</style>
      
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 bg-[#0B1120]/90 border-r border-blue-900/30 p-6 flex flex-col h-screen overflow-y-auto backdrop-blur-xl relative z-10 shadow-[5px_0_30px_rgba(0,0,0,0.5)]">
        <h2 className="text-3xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-purple-400 to-pink-500 cyber-border pb-4">
          LaborSphere
          <span className="block text-sm font-medium tracking-widest opacity-60 text-blue-300 mt-1 uppercase">Control Center</span>
        </h2>

        <div className="space-y-5 flex-grow">
          <div className="cyber-panel p-4 rounded-xl flex items-center justify-between">
            <span className="font-bold text-slate-300">連線學員</span>
            <span className="bg-blue-500 text-white px-4 py-1 rounded-full font-black shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse">{participants.filter(p=>!p.kicked).length}</span>
          </div>

          <div className="cyber-panel p-4 rounded-xl">
            <label className="block text-sm font-bold text-blue-400 mb-2 flex items-center"><Clock size={16} className="mr-2"/>作答時間設定 (分鐘)</label>
            <input 
              type="number" 
              min="1" 
              max="60"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              disabled={session.status !== 'closed' && session.status !== 'finished'}
              className="w-full bg-[#0B1120] border border-blue-900/50 rounded-lg p-3 text-white font-mono text-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 transition-all"
            />
          </div>

          <div className="text-xs font-bold tracking-widest text-blue-400 mt-8 mb-3 uppercase cyber-border pb-2 flex items-center">
            Mission Jump (關卡快捷控制) {session.status !== 'closed' ? `- 目前: 第 ${session.currentQuestion + 1} 關` : ''}
          </div>
          
          {/* Mission Grid */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            {SCENARIOS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => jumpToQuestion(idx)}
                className={`py-2 rounded-lg font-mono text-sm font-bold transition-all border ${
                  session.currentQuestion === idx && session.status !== 'closed'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.8)]' 
                    : 'bg-[#0B1120] text-slate-400 border-blue-900/50 hover:bg-blue-900/40 hover:text-blue-300 hover:border-blue-500/50'
                }`}
                title={`直接進入第 ${idx + 1} 關`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {session.status === 'closed' ? (
             <button onClick={startSession} className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 font-black text-lg flex items-center justify-center transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-105">
               <Play className="mr-2" size={24}/> 開放登入並開始 (第1關)
             </button>
          ) : (
            <>
              {session.status === 'active' && (
                <button onClick={stopTimer} className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 font-bold text-lg flex items-center justify-center transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:scale-[1.03]">
                  <Square className="mr-2" size={20}/> 強制停止作答 (進入討論)
                </button>
              )}
              
              {session.status === 'discussion' && (
                <button onClick={revealAnswer} className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 font-bold text-lg flex items-center justify-center transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.03]">
                  <CheckCircle2 className="mr-2" size={20}/> 公佈解答與解析
                </button>
              )}

              {session.status === 'revealed' && (
                <button onClick={nextQuestion} className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 font-bold text-lg flex items-center justify-center transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-[1.03]">
                  <Play className="mr-2" size={20}/> {session.currentQuestion === SCENARIOS.length - 1 ? '結束測驗' : '進入下一題'}
                </button>
              )}
            </>
          )}
        </div>
        
        <div className="mt-auto space-y-3 pt-8">
           <button onClick={exportCSV} className="w-full py-3 rounded-xl cyber-panel hover:bg-slate-800 text-blue-300 font-medium flex items-center justify-center transition-colors">
             <FileDown size={18} className="mr-2"/> 匯出成效報表 (CSV)
           </button>
           <button onClick={endAndClearSession} className="w-full py-3 rounded-xl bg-red-950/40 border border-red-900/50 hover:bg-red-900/60 text-red-400 font-medium flex items-center justify-center transition-colors">
             <XCircle size={18} className="mr-2"/> 結束並清空資料
           </button>
           <button onClick={onLogout} className="w-full py-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800 text-slate-400 font-medium flex items-center justify-center transition-colors">
             <LogOut size={18} className="mr-2"/> 安全退出中控台
           </button>
        </div>
      </div>

      {/* Main Dashboard Area */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto h-screen relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1120] to-black">
         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgzMCwgNTgsIDEzOCwgMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] pointer-events-none opacity-50 z-0"></div>

         {session.status !== 'closed' && session.status !== 'finished' ? (
           <div className="max-w-6xl mx-auto space-y-6 relative z-10">
              
              {/* Top Row: Chart & Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Live Chart */}
                 <div className="lg:col-span-2 cyber-panel rounded-3xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6 cyber-border pb-4">
                      <h3 className="font-bold text-xl flex items-center text-blue-300"><PieChart className="mr-2 text-blue-500"/> 即時數據雷達</h3>
                      <span className="text-sm px-4 py-1.5 bg-blue-900/30 border border-blue-500/30 text-blue-200 rounded-full font-mono">
                        SYNC: {answerCount} / {participants.length}
                      </span>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontWeight: 'bold'}} />
                          <YAxis stroke="#64748b" allowDecimals={false} />
                          <Tooltip contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', color: '#fff', backdropFilter: 'blur(10px)'}} cursor={{fill: 'rgba(56, 189, 248, 0.1)'}} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1000}>
                            {chartData.map((entry, index) => {
                               const isCorrect = entry.name === currentQ.correctAnswer;
                               let color = "#3b82f6"; 
                               if (session.status === 'revealed') {
                                 color = isCorrect ? "#10b981" : "#ef4444"; 
                               }
                               return <Cell key={`cell-${index}`} fill={color} style={{filter: `drop-shadow(0 0 8px ${color})`}}/>;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Phase Indicator */}
                 <div className="cyber-panel rounded-3xl p-6 shadow-2xl flex flex-col justify-center relative overflow-hidden">
                    <div className={`absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[80px] opacity-30 pointer-events-none ${session.status === 'active' ? 'bg-blue-500' : session.status === 'discussion' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                    
                    {session.status === 'active' && (
                      <div className="text-center text-blue-300 relative z-10">
                        <Clock size={56} className="mx-auto mb-4 animate-[spin_4s_linear_infinite] drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                        <h4 className="font-black text-2xl mb-3 tracking-widest text-white">作答接收中</h4>
                        <p className="text-sm opacity-80 text-blue-200">監控數據變化，適當時機可切換至討論模式。</p>
                      </div>
                    )}
                    {session.status === 'discussion' && (
                      <div className="text-center text-yellow-300 relative z-10">
                        <MessageSquare size={56} className="mx-auto mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] animate-pulse" />
                        <h4 className="font-black text-2xl mb-3 tracking-widest text-white">思辨引導期</h4>
                        <p className="text-sm opacity-90 mb-4 text-yellow-100">請邀請選擇少數選項的學員發表觀點。</p>
                        <p className="inline-block bg-yellow-900/40 border border-yellow-500/50 px-4 py-2 rounded-xl text-yellow-200 font-bold shadow-inner">
                          正解預覽：<span className="text-2xl ml-1">{currentQ.correctAnswer}</span>
                        </p>
                      </div>
                    )}
                    {session.status === 'revealed' && (
                      <div className="text-center text-green-300 relative z-10">
                        <CheckCircle2 size={56} className="mx-auto mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                        <h4 className="font-black text-2xl mb-3 tracking-widest text-white">解答已公佈</h4>
                        <p className="text-sm opacity-80 text-green-100">請參照下方「法理面板」進行深度解析。</p>
                      </div>
                    )}
                 </div>
              </div>

              {/* Legal Reference Panel (Always visible in Teacher Dashboard) */}
              <div className="cyber-panel rounded-3xl p-8 border-l-4 border-l-purple-500 shadow-2xl relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-purple-900/20">
                 <h3 className="font-black text-2xl mb-6 flex items-center text-white"><ShieldAlert className="mr-3 text-purple-400" size={28}/> 👩‍⚖️ 深度法理與實務判例解析 (講師專屬)</h3>
                 
                 <div className="grid md:grid-cols-2 gap-6 relative z-10">
                    <div className="bg-black/40 p-6 rounded-2xl border border-blue-500/20 backdrop-blur-md">
                       <div className="font-bold text-lg mb-3 flex items-center text-blue-300">
                          <Scale size={20} className="mr-2"/> 條文依據
                       </div>
                       <p className="text-blue-50/90 leading-relaxed text-sm">{currentQ.legalText}</p>
                    </div>
                    
                    <div className="bg-purple-950/40 p-6 rounded-2xl border border-purple-500/30 backdrop-blur-md shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]">
                       <div className="font-bold text-lg mb-3 flex items-center text-purple-300">
                          <span className="text-xl mr-2">⚖️</span> 實務判例 / 裁罰實例
                       </div>
                       <p className="text-purple-50/90 leading-relaxed text-sm font-medium">
                          {currentQ.rulingText.replace('⚖️ 實務判例：', '')}
                       </p>
                    </div>
                 </div>
              </div>

              {/* Student Feedback Table */}
              <div className="cyber-panel rounded-3xl p-6 shadow-2xl">
                 <h3 className="font-bold text-xl mb-6 flex items-center text-blue-300 cyber-border pb-4"><Users className="mr-2"/> 學員即時遙測與陣列控制</h3>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm text-slate-300">
                     <thead className="bg-[#0B1120] text-blue-300 border-b border-blue-900/50">
                       <tr>
                         <th className="p-4 font-bold tracking-wider">學員識別碼</th>
                         <th className="p-4 font-bold tracking-wider w-24">選擇</th>
                         <th className="p-4 font-bold tracking-wider w-1/3">通訊回饋 (補充觀點)</th>
                         <th className="p-4 font-bold tracking-wider w-28">連線狀態</th>
                         <th className="p-4 font-bold tracking-wider text-right">覆寫控制</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-blue-900/20">
                       {participants.filter(p => !p.kicked).map(p => {
                         const isCorrect = p[`q_${session.currentQuestion}_choice`] === currentQ.correctAnswer;
                         return (
                           <tr key={p.id} className="hover:bg-blue-900/10 transition-colors group">
                             <td className="p-4 font-bold text-slate-100 flex items-center">
                               <div className="w-2 h-2 rounded-full bg-green-500 mr-3 animate-pulse"></div>
                               {p.name}
                             </td>
                             <td className="p-4">
                               {p[`q_${session.currentQuestion}_choice`] ? (
                                 <span className={`px-3 py-1 rounded-md text-sm font-black shadow-inner ${session.status === 'revealed' ? (isCorrect ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30') : 'bg-blue-900/40 border border-blue-500/30 text-blue-200'}`}>
                                   {p[`q_${session.currentQuestion}_choice`]}
                                 </span>
                               ) : (
                                 <span className="text-slate-600 opacity-50">-</span>
                               )}
                             </td>
                             <td className="p-4 break-words max-w-xs text-slate-400">
                               {p[`q_${session.currentQuestion}_text`] || <span className="italic opacity-30">尚未確認送出</span>}
                             </td>
                             <td className="p-4">
                               {p.locked ? (
                                 <span className="text-orange-400 flex items-center text-xs font-bold"><Lock size={14} className="mr-1"/> 覆寫鎖定</span>
                               ) : (
                                 <span className="text-emerald-400 flex items-center text-xs font-bold"><CheckCircle2 size={14} className="mr-1"/> 正常傳輸</span>
                               )}
                             </td>
                             <td className="p-4 text-right space-x-2 opacity-60 group-hover:opacity-100 transition-opacity">
                               {session.status === 'revealed' && isCorrect && (
                                 <button onClick={() => rewardStudent(p.id)} className="p-2 inline-flex items-center rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/50 hover:scale-110 transition-all border border-yellow-500/30" title="發放虛擬獎勵 (觸發特效)">
                                   <Gift size={16} />
                                 </button>
                               )}
                               <button onClick={() => toggleLockStudent(p.id, p.locked)} className={`p-2 inline-flex items-center rounded-lg transition-all border ${p.locked ? 'bg-green-500/20 text-green-400 hover:bg-green-500/50 border-green-500/30 hover:scale-110' : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/50 border-orange-500/30 hover:scale-110'}`} title={p.locked ? "解除作答鎖定" : "強制暫停該員作答"}>
                                 {p.locked ? <Unlock size={16} /> : <Lock size={16} />}
                               </button>
                               <button onClick={() => kickStudent(p.id, p.name)} className="p-2 inline-flex items-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/50 border border-red-500/30 hover:scale-110 transition-all" title="中斷連線 (踢出)">
                                 <LogOut size={16} />
                               </button>
                             </td>
                           </tr>
                         );
                       })}
                       {participants.filter(p => !p.kicked).length === 0 && (
                         <tr>
                           <td colSpan="5" className="p-12 text-center text-slate-500 font-mono tracking-widest">
                             <div className="flex flex-col items-center">
                               <ShieldAlert size={32} className="mb-3 opacity-20"/>
                               等待終端設備連線中...
                             </div>
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
              </div>

           </div>
         ) : (
           <div className="h-full flex flex-col items-center justify-center opacity-40">
             <ShieldAlert size={80} className="mb-6 text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-pulse" />
             <h2 className="text-4xl font-black mb-3 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">SYSTEM STANDBY</h2>
             <p className="font-mono text-lg tracking-widest text-blue-300">請啟動主控程式以建立連線</p>
           </div>
         )}
      </div>
    </div>
  );
}
