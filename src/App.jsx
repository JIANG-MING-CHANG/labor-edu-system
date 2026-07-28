// ... existing code ...
function StudentView({ db, appId, user, userName, isDark, onLogout }) {
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

  // 新增 Refs：確保計時器歸零觸發自動交卷時，能抓取到最新的作答狀態
  const myAnswerRef = useRef(myAnswer);
  const myTextRef = useRef(myText);
  const hasSubmittedRef = useRef(hasSubmitted);
  
  useEffect(() => { myAnswerRef.current = myAnswer; }, [myAnswer]);
  useEffect(() => { myTextRef.current = myText; }, [myText]);
  useEffect(() => { hasSubmittedRef.current = hasSubmitted; }, [hasSubmitted]);

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
               setTimeout(()=>setConfetti(false), 4000); 
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
    // 重大變更：將 user.uid 替換成 userName，這樣學員斷線重連只要名字一樣就能恢復資料
    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants', userName);
    const unsub = onSnapshot(pRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.kicked) {
          alert("您已被教師移出教室！");
          onLogout();
          return;
        }
        setIsIndividuallyLocked(!!data.locked);

        // 如果已有該題紀錄，自動恢復作答狀態 (處理中途離線重連)
        const savedAns = data[`q_${session.currentQuestion}_choice`];
        const savedText = data[`q_${session.currentQuestion}_text`];
        if (savedAns && !hasSubmittedRef.current) {
          if (savedAns !== '未作答') setMyAnswer(savedAns);
          if (savedText && savedText !== '時間到系統自動交卷') setMyText(savedText);
          setHasSubmitted(true);
        }

        if (data.rewardTrigger && data.rewardTrigger > lastReward) {
          setLastReward(data.rewardTrigger);
          sfx.success(); 
          setConfetti(true);
          setTimeout(() => setConfetti(false), 4000);
        }
      } else {
        // 第一次進入，建立基本資料
        setDoc(pRef, { name: userName, updatedAt: Date.now() }, { merge: true });
      }
    });
    return () => unsub();
  }, [user, db, appId, session, lastReward, onLogout, userName]);

  useEffect(() => {
    if (session?.status === 'active' && session?.endTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        if (remaining > 0 && remaining <= 10) {
          sfx.tick(); 
        }

        // 時間到且尚未送出，自動送出答案
        if (remaining === 0 && !hasSubmittedRef.current) {
           confirmSubmission(true);
           clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const selectOption = (choice) => {
    if (session?.status !== 'active' || hasSubmitted || isIndividuallyLocked) return;
    setMyAnswer(choice);
  };

  const confirmSubmission = async (isAuto = false) => {
    if (session?.status !== 'active' || hasSubmitted || isIndividuallyLocked || !user) return;
    if (!isAuto && !myAnswerRef.current) return; // 手動送出需檢查是否有答案，自動送出則略過

    setHasSubmitted(true);
    
    try {
      // 寫入對應姓名的 Document
      const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants', userName);
      await setDoc(pRef, {
        name: userName,
        [`q_${session.currentQuestion}_choice`]: myAnswerRef.current || '未作答',
        [`q_${session.currentQuestion}_text`]: myTextRef.current || (isAuto ? '時間到系統自動交卷' : ''),
        updatedAt: Date.now()
      }, { merge: true });
    } catch(e) {
      console.error("Save error:", e);
      alert("儲存失敗，請檢查網路連線。");
    }
  };

  const toggleSound = () => setSoundOn(sfx.toggle());
// ... existing code ...
      <div className="fixed top-4 right-16 z-50 print:hidden">
         <button onClick={onLogout} className="p-2 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/40 transition-all font-bold flex items-center shadow-lg backdrop-blur-sm border border-red-500/20">
            <LogOut size={18} className="mr-2"/> 離開
         </button>
      </div>

      {session.teacherMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-2xl shadow-[0_10px_30px_rgba(59,130,246,0.5)] border border-white/20 animate-[shake_0.5s_ease-in-out]">
          <div className="flex items-center font-bold text-lg">
            <MessageSquare className="mr-3 animate-pulse" size={24} />
            👨‍🏫 講師廣播
          </div>
          <p className="mt-1 ml-9">{session.teacherMessage}</p>
        </div>
      )}

      {confetti && (
// ... existing code ...
          <div className="flex justify-end">
            <button 
              disabled={isLocked || !myAnswer}
              onClick={() => confirmSubmission(false)}
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
// ... existing code ...
function StudentResultView({ db, appId, user, userName, onLogout }) {
  const [scores, setScores] = useState([]);
  
  useEffect(() => {
    const fetchScores = async () => {
      // 雷達圖讀取也改為使用 userName
      const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants', userName);
      const unsub = onSnapshot(pRef, (docSnap) => {
        if (docSnap.exists()) {
// ... existing code ...
function TeacherDashboard({ db, appId, user, isDark, onLogout }) {
  const [session, setSession] = useState({ status: 'closed', currentQuestion: 0 });
  const [participants, setParticipants] = useState([]);
  const [timeLimit, setTimeLimit] = useState(5); 
  const [expectedCount, setExpectedCount] = useState(0); // 新增預期學員數
  const [teacherMessage, setTeacherMessage] = useState(""); // 新增廣播訊息
  const [dbError, setDbError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
// ... existing code ...
  const rewardStudent = async (uid) => {
    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main', 'participants', uid);
    await setDoc(pRef, { rewardTrigger: Date.now() }, { merge: true });
  };

  const sendTeacherMessage = () => {
    updateSession({ teacherMessage });
    alert("廣播訊息已發送至所有學員畫面！");
  };

  const currentQ = SCENARIOS[session.currentQuestion] || SCENARIOS[0];
  const chartData = [
    { name: 'A', value: 0 }, { name: 'B', value: 0 }, { name: 'C', value: 0 }, { name: 'D', value: 0 }
  ];
  let answerCount = 0;
// ... existing code ...
          {dbError && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 rounded-xl text-sm font-bold shadow-lg animate-pulse">
              {dbError}
            </div>
          )}

          <div className="cyber-panel p-4 rounded-xl flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">連線學員</span>
            <span className="bg-blue-500 text-white px-4 py-1 rounded-full font-black shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse">
              {participants.filter(p=>!p.kicked).length} {session.expectedCount ? `/ ${session.expectedCount}` : ''}
            </span>
          </div>

          <div className="cyber-panel p-4 rounded-xl space-y-4">
            <div>
              <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center"><Users size={16} className="mr-2"/>設定學員總數 (人)</label>
              <input 
                type="number" 
                min="0"
                value={expectedCount}
                onChange={(e) => {
                  setExpectedCount(Number(e.target.value));
                  updateSession({ expectedCount: Number(e.target.value) });
                }}
                className="w-full bg-white dark:bg-[#0B1120] border border-blue-300 dark:border-blue-900/50 rounded-lg p-3 text-slate-900 dark:text-white font-mono text-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center"><Clock size={16} className="mr-2"/>作答時間設定 (分鐘)</label>
              <input 
                type="number" 
                min="1" 
                max="60"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                disabled={session.status !== 'closed' && session.status !== 'finished'}
                className="w-full bg-white dark:bg-[#0B1120] border border-blue-300 dark:border-blue-900/50 rounded-lg p-3 text-slate-900 dark:text-white font-mono text-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 transition-all"
              />
            </div>
          </div>

          <div className="cyber-panel p-4 rounded-xl">
            <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center"><MessageSquare size={16} className="mr-2"/>全體廣播訊息</label>
            <textarea
              value={teacherMessage}
              onChange={(e) => setTeacherMessage(e.target.value)}
              rows="2"
              placeholder="輸入要推播給學員的提醒或引導..."
              className="w-full bg-white dark:bg-[#0B1120] border border-blue-300 dark:border-blue-900/50 rounded-lg p-3 text-slate-900 dark:text-white font-sans text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all mb-2 resize-none"
            />
            <button onClick={sendTeacherMessage} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors">
              發送廣播
            </button>
            <button onClick={() => { setTeacherMessage(''); updateSession({ teacherMessage: '' }); }} className="w-full mt-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-lg transition-colors text-sm">
              清除廣播
            </button>
          </div>

          <div className="text-xs font-bold tracking-widest text-blue-600 dark:text-blue-400 mt-8 mb-3 uppercase cyber-border pb-2 flex items-center">
            Mission Jump (關卡快捷控制) {session.status !== 'closed' ? `- 目前: 第 ${session.currentQuestion + 1} 關` : ''}
          </div>
// ... existing code ...
            </>
          )}
        </div>
        
        <div className="mt-auto space-y-3 pt-8">
           <button onClick={endAndClearSession} className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-medium flex items-center justify-center transition-colors">
             <XCircle size={18} className="mr-2"/> 結束並清空資料
           </button>
           <button onClick={onLogout} className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400 font-medium flex items-center justify-center transition-colors">
             <LogOut size={18} className="mr-2"/> 安全退出中控台
           </button>
        </div>
      </div>

      {/* Main Dashboard Area */}
// ... existing code ...
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Live Chart */}
                 <div className="lg:col-span-2 cyber-panel rounded-3xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6 cyber-border pb-4">
                      <h3 className="font-bold text-xl flex items-center text-blue-700 dark:text-blue-300"><PieChart className="mr-2 text-blue-500"/> 即時數據雷達</h3>
                      <span className="text-sm px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-200 rounded-full font-mono">
                        SYNC: {answerCount} / {participants.length} {session.expectedCount ? `(預計 ${session.expectedCount} 人)` : ''}
                      </span>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
// ... existing code ...
