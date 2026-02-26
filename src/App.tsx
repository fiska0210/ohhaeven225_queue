import React, { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { 
  Users, 
  UserPlus, 
  Bell, 
  XCircle, 
  Trash2, 
  ChevronRight,
  UserCheck,
  LayoutDashboard,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QueueItem {
  id: number;
  name: string;
  phone: string;
  status: 'waiting' | 'called' | 'cancelled';
  created_at: string;
}

export default function App() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myId, setMyId] = useState<number | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();
      setQueue(data);
    } catch (err) {
      console.error("Failed to fetch queue", err);
    }
  }, []);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("queue_updated", () => {
      fetchQueue();
    });

    fetchQueue();

    return () => {
      newSocket.disconnect();
    };
  }, [fetchQueue]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      const res = await fetch("/api/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const newItem = await res.json();
      setMyId(newItem.id);
      setName("");
      setPhone("");
    } catch (err) {
      console.error("Join failed", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminToken(data.token);
        setIsLoggedIn(true);
        setAdminUsername("");
        setAdminPassword("");
      } else {
        alert(data.error || "登入失敗");
      }
    } catch (err) {
      alert("登入發生錯誤");
    }
  };

  const handleCall = async (id: number) => {
    await fetch("/api/queue/call", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-admin-token": adminToken || ""
      },
      body: JSON.stringify({ id }),
    });
  };

  const handleCancel = async (id: number) => {
    await fetch("/api/queue/cancel", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-admin-token": adminToken || ""
      },
      body: JSON.stringify({ id }),
    });
  };

  const handleClear = async () => {
    if (confirm("確定要清除所有排隊資料嗎？")) {
      await fetch("/api/queue/clear", { 
        method: "POST",
        headers: { "x-admin-token": adminToken || "" }
      });
    }
  };

  const waitingList = queue.filter(item => item.status === 'waiting');
  const calledList = queue.filter(item => item.status === 'called');
  
  const myPosition = myId ? waitingList.findIndex(item => item.id === myId) + 1 : null;

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-black/5 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
            <Users size={24} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">現場候補系統</h1>
        </div>
        <button 
          onClick={() => setIsAdmin(!isAdmin)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/5 hover:bg-black/5 transition-colors text-sm font-medium"
        >
          {isAdmin ? <LayoutDashboard size={18} /> : <Settings size={18} />}
          {isAdmin ? "切換至顧客端" : "切換至管理端"}
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {isAdmin ? (
          !isLoggedIn ? (
            /* Login View */
            <div className="max-w-md mx-auto mt-12 bg-white rounded-2xl p-8 shadow-sm border border-black/5">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4">
                  <Settings size={32} />
                </div>
                <h2 className="text-2xl font-bold">管理員登入</h2>
                <p className="text-black/50 text-sm">請輸入憑證以進入控制台</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-black/40 mb-1.5 ml-1">帳號</label>
                  <input 
                    type="text" 
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#f9f9f9] border border-black/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-black/40 mb-1.5 ml-1">密碼</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#f9f9f9] border border-black/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all active:scale-[0.98]"
                >
                  登入
                </button>
              </form>
            </div>
          ) : (
            /* Admin View */
            <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold">管理控制台</h2>
                <p className="text-black/50 text-sm">管理目前的排隊名單與叫號狀態</p>
              </div>
              <button 
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <Trash2 size={18} />
                清除所有資料
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Waiting List */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users size={18} className="text-emerald-500" />
                    等待中 ({waitingList.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {waitingList.map((item, index) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-4 rounded-xl bg-[#f9f9f9] border border-black/5 flex justify-between items-center group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">#{item.id}</span>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          {item.phone && <p className="text-xs text-black/40 mt-1">{item.phone}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleCall(item.id)}
                            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                            title="叫號"
                          >
                            <Bell size={18} />
                          </button>
                          <button 
                            onClick={() => handleCancel(item.id)}
                            className="p-2 bg-white border border-black/10 text-black/40 rounded-lg hover:text-red-500 hover:border-red-200 transition-colors"
                            title="取消"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {waitingList.length === 0 && (
                    <p className="text-center py-8 text-black/30 text-sm italic">目前沒有人排隊</p>
                  )}
                </div>
              </section>

              {/* Called List */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <UserCheck size={18} className="text-blue-500" />
                  已叫號 ({calledList.length})
                </h3>
                <div className="space-y-3">
                  {calledList.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">#{item.id}</span>
                        <span className="ml-2 font-medium">{item.name}</span>
                      </div>
                      <button 
                        onClick={() => handleCancel(item.id)}
                        className="text-black/30 hover:text-red-500 transition-colors"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  ))}
                  {calledList.length === 0 && (
                    <p className="text-center py-8 text-black/30 text-sm italic">尚無叫號紀錄</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        )
      ) : (
          /* Customer View */
          <div className="space-y-8">
            {/* Status Card */}
            <div className="bg-emerald-500 rounded-3xl p-8 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider mb-2">目前排隊進度</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-6xl font-bold tracking-tighter">{waitingList.length}</span>
                  <span className="text-xl text-emerald-100">組客人在等待中</span>
                </div>
                
                {myPosition !== null && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20"
                  >
                    <p className="text-emerald-100 text-sm mb-1">您的位置</p>
                    <div className="flex justify-between items-end">
                      <span className="text-3xl font-bold">第 {myPosition} 位</span>
                      <span className="text-sm bg-white text-emerald-600 px-3 py-1 rounded-full font-bold">等待中</span>
                    </div>
                  </motion.div>
                )}
              </div>
              {/* Decorative circles */}
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -left-10 -top-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Join Form */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <UserPlus size={20} className="text-emerald-500" />
                  加入候補
                </h3>
                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-black/40 mb-1.5 ml-1">姓名</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="如何稱呼您？"
                      className="w-full px-4 py-3 rounded-xl bg-[#f9f9f9] border border-black/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-black/40 mb-1.5 ml-1">電話 (選填)</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="叫號時通知您"
                      className="w-full px-4 py-3 rounded-xl bg-[#f9f9f9] border border-black/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 shadow-md shadow-emerald-500/10 transition-all active:scale-[0.98]"
                  >
                    領取號碼牌
                  </button>
                </form>
              </section>

              {/* Recent Activity */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Bell size={20} className="text-blue-500" />
                  最新叫號
                </h3>
                <div className="space-y-4">
                  {calledList.slice(-3).reverse().map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-blue-50/50 border border-blue-100 animate-pulse">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {item.id}
                      </div>
                      <div>
                        <p className="font-bold text-blue-900">{item.name} 先生/小姐</p>
                        <p className="text-xs text-blue-600 font-medium">請至櫃檯報到</p>
                      </div>
                      <ChevronRight className="ml-auto text-blue-300" size={20} />
                    </div>
                  ))}
                  {calledList.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-black/5 rounded-2xl">
                      <p className="text-black/20 text-sm">目前尚無叫號</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto p-6 text-center text-black/30 text-xs">
        <p>© 2026 Haewon Birthday Event 피스카상사</p>
      </footer>
    </div>
  );
}
