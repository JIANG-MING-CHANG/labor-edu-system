// ... existing code ...
function TeacherDashboard({ db, appId, user, isDark, onLogout }) {
  const [session, setSession] = useState({ status: 'closed', currentQuestion: 0 });
  const [participants, setParticipants] = useState([]);
  const [timeLimit, setTimeLimit] = useState(5); 
  const [dbError, setDbError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main');
    const unsub = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        setSession(snapshot.data());
      } else {
        setSession({ status: 'closed', currentQuestion: 0 });
      }
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

  // 【加入防呆與畫面錯誤顯示機制】
  const updateSession = async (data) => {
    setIsUpdating(true);
    setDbError("");
    try {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', 'main');
      await setDoc(ref, data, { merge: true });
    } catch (error) {
      console.error("更新失敗:", error);
      setDbError(error.message);
      try {
        alert("⚠️ 系統更新失敗！\n請確認您的 Firebase Firestore 權限 (Rules) 是否已修改為:\nallow read, write: if true;");
      } catch (e) {} // 預防 alert 在預覽環境被阻擋
    } finally {
      setIsUpdating(false);
    }
  };

  // 加上 Number() 防呆，避免輸入框被清空時產生錯誤
  const startSession = () => updateSession({ status: 'active', currentQuestion: 0, endTime: Date.now() + (Number(timeLimit) || 5) * 60 * 1000 });
  
  const nextQuestion = () => {
    const nextIdx = session.currentQuestion + 1;
    if (nextIdx >= SCENARIOS.length) {
      updateSession({ status: 'finished' });
    } else {
      updateSession({ status: 'active', currentQuestion: nextIdx, endTime: Date.now() + (Number(timeLimit) || 5) * 60 * 1000 });
    }
  };

  const jumpToQuestion = (idx) => {
    if (session.status !== 'closed' && session.status !== 'finished' && idx === session.currentQuestion) return;
    
    const msg = session.status === 'closed' 
      ? `系統目前為未開放狀態。\n確定要開放系統，並直接從第 ${idx + 1} 關開始嗎？` 
      : `確定要直接跳至第 ${idx + 1} 關嗎？\n作答時間將依據設定重新計算。`;
      
    if (window.confirm(msg)) {
      updateSession({ status: 'active', currentQuestion: idx, endTime: Date.now() + (Number(timeLimit) || 5) * 60 * 1000 });
    }
  };

  const stopTimer = () => updateSession({ status: 'discussion' }); 
  const revealAnswer = () => updateSession({ status: 'revealed' });

  const endAndClearSession = async () => {
// ... existing code ...
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans selection:bg-purple-500/30 transition-colors">
      <style>{`
        .cyber-panel {
          background: ${isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.7)'};
          backdrop-filter: blur(16px);
          border: 1px solid ${isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.4)'};
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }
        .cyber-border { position: relative; }
        .cyber-border::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.5), transparent);
        }
      `}</style>
      
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 bg-white/90 dark:bg-[#0B1120]/90 border-r border-blue-200 dark:border-blue-900/30 p-6 flex flex-col h-screen overflow-y-auto backdrop-blur-xl relative z-10 shadow-[5px_0_30px_rgba(0,0,0,0.05)] dark:shadow-[5px_0_30px_rgba(0,0,0,0.5)]">
        <h2 className="text-3xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 cyber-border pb-4 mt-8 md:mt-0">
          LaborSphere
          <span className="block text-sm font-medium tracking-widest opacity-60 text-blue-600 dark:text-blue-300 mt-1 uppercase">Control Center</span>
        </h2>

        <div className="space-y-5 flex-grow">
          {/* 錯誤警告區塊 */}
          {dbError && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded-xl text-sm font-bold shadow-sm animate-pulse">
              ⚠️ 資料庫寫入被拒絕！<br/>請至 Firebase 將 Firestore Rules 改為 allow read, write: if true;
            </div>
          )}

          <div className="cyber-panel p-4 rounded-xl flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">連線學員</span>
            <span className="bg-blue-500 text-white px-4 py-1 rounded-full font-black shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse">{participants.filter(p=>!p.kicked).length}</span>
          </div>

          <div className="cyber-panel p-4 rounded-xl">
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

          <div className="text-xs font-bold tracking-widest text-blue-600 dark:text-blue-400 mt-8 mb-3 uppercase cyber-border pb-2 flex items-center">
            Mission Jump (關卡快捷控制) {session.status !== 'closed' ? `- 目前: 第 ${session.currentQuestion + 1} 關` : ''}
          </div>
          
          {/* Mission Grid */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            {SCENARIOS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => jumpToQuestion(idx)}
                disabled={isUpdating}
                className={`py-2 rounded-lg font-mono text-sm font-bold transition-all border ${
                  session.currentQuestion === idx && session.status !== 'closed'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.8)]' 
                    : 'bg-white dark:bg-[#0B1120] text-slate-600 dark:text-slate-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-300 hover:border-blue-400 dark:hover:border-blue-500/50'
                } disabled:opacity-50`}
                title={`直接進入第 ${idx + 1} 關`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {session.status === 'closed' ? (
             <button onClick={startSession} disabled={isUpdating} className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 font-black text-white text-lg flex items-center justify-center transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-105 disabled:opacity-50 disabled:hover:scale-100">
               <Play className="mr-2" size={24}/> {isUpdating ? '系統連線中...' : '開放登入並開始 (第1關)'}
             </button>
          ) : (
            <>
              {session.status === 'active' && (
                <button onClick={stopTimer} disabled={isUpdating} className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 font-bold text-white text-lg flex items-center justify-center transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100">
                  <Square className="mr-2" size={20}/> {isUpdating ? '處理中...' : '強制停止作答 (進入討論)'}
                </button>
              )}
              
              {session.status === 'discussion' && (
                <button onClick={revealAnswer} disabled={isUpdating} className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 font-bold text-white text-lg flex items-center justify-center transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100">
                  <CheckCircle2 className="mr-2" size={20}/> {isUpdating ? '處理中...' : '公佈解答與解析'}
                </button>
              )}

              {session.status === 'revealed' && (
                <button onClick={nextQuestion} disabled={isUpdating} className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 font-bold text-white text-lg flex items-center justify-center transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100">
                  <Play className="mr-2" size={20}/> {session.currentQuestion === SCENARIOS.length - 1 ? '結束測驗' : '進入下一題'}
                </button>
              )}
            </>
          )}
        </div>
        
        <div className="mt-auto space-y-3 pt-8">
// ... existing code ...
```eof

**特別提醒：** 如果您複製程式碼後，畫面上出現 `⚠️ 資料庫寫入被拒絕！` 的紅色警示框，請務必至您的 Firebase 後台 -> 左側選單的 `Firestore Database` -> 點擊上方的 `Rules (規則)` 分頁，將裡面的內容改為這段並「發布 (Publish)」：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
