import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  BellRing,
  Crown,
  Database,
  Gauge,
  Gift,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Zap
} from 'lucide-react';
import { auth, db, firebaseConfig, firebaseEnvReady, googleProvider } from './firebase/firebase';
import { Logo } from './components/Logo';
import { defaultConfig } from './lib/defaults';
import { asNumber, dateKeyToday, formatDate, normalizeEmail } from './lib/format';
import type { AppConfig, AppUser, DailyStat, ScanLog, ToastMessage, UserRole } from './types';
import './index.css';

function requireDb() {
  if (!db) throw new Error('Firebase is not configured. Create owner-dashboard/.env.local first.');
  return db;
}

function requireAuth() {
  if (!auth) throw new Error('Firebase is not configured. Create owner-dashboard/.env.local first.');
  return auth;
}

async function addOwnerByEmail(email: string) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) throw new Error('Enter an email first.');
  const firestore = requireDb();
  const snap = await getDocs(query(collection(firestore, 'users'), where('email', '==', cleanEmail)));
  if (snap.empty) {
    throw new Error('No user found with that email. Ask the user to sign in to the mobile app first.');
  }
  await updateDoc(doc(firestore, 'users', snap.docs[0].id), {
    role: 'owner',
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

async function updateUser(uid: string, patch: Partial<AppUser>) {
  await updateDoc(doc(requireDb(), 'users', uid), {
    ...patch,
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

async function addTokens(uid: string, amount: number) {
  await updateDoc(doc(requireDb(), 'users', uid), {
    rewarded_tokens: increment(amount),
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

async function resetTokens(uid: string, welcomeTokens: number) {
  await updateDoc(doc(requireDb(), 'users', uid), {
    free_tokens: Math.max(0, Math.round(welcomeTokens)),
    rewarded_tokens: 0,
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

async function saveAppConfig(config: AppConfig) {
  await setDoc(doc(requireDb(), 'app_config', 'main'), {
    interstitial_ad_unit_id: config.interstitial_ad_unit_id.trim(),
    rewarded_ad_unit_id: config.rewarded_ad_unit_id.trim(),
    welcome_free_tokens: Math.max(0, Math.round(config.welcome_free_tokens)),
    random_interstitial_probability: Number(config.random_interstitial_probability),
    scan_save_interstitial_probability: Number(config.scan_save_interstitial_probability),
    fullscreen_ads_enabled: Boolean(config.fullscreen_ads_enabled),
    kill_switch: Boolean(config.kill_switch),
    openrouter_model: config.openrouter_model.trim() || defaultConfig.openrouter_model,
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function App() {
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [ownerAllowed, setOwnerAllowed] = React.useState<boolean | null>(null);
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [config, setConfig] = React.useState<AppConfig>(defaultConfig);
  const [dailyStats, setDailyStats] = React.useState<DailyStat[]>([]);
  const [scanLogs, setScanLogs] = React.useState<ScanLog[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<'all' | 'owner' | 'premium' | 'free' | 'adblock'>('all');
  const [ownerEmail, setOwnerEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState<ToastMessage | null>(null);

  const notify = React.useCallback((message: ToastMessage) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  React.useEffect(() => {
    if (!firebaseEnvReady || !auth) return undefined;
    return onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setOwnerAllowed(null);
      if (!user) {
        setOwnerAllowed(null);
        setUsers([]);
        return;
      }
      try {
        const snap = await getDoc(doc(requireDb(), 'users', user.uid));
        setOwnerAllowed(snap.exists() && snap.data().role === 'owner');
      } catch (error) {
        console.error(error);
        setOwnerAllowed(false);
      }
    });
  }, []);

  React.useEffect(() => {
    if (!authUser || ownerAllowed !== true) return undefined;
    const firestore = requireDb();

    const unsubUsers = onSnapshot(query(collection(firestore, 'users'), orderBy('email')), (snap) => {
      setUsers(snap.docs.map((item) => ({ uid: item.id, ...(item.data() as Omit<AppUser, 'uid'>) })));
    }, (error) => notify({ type: 'error', text: `Users listener failed: ${error.message}` }));

    const unsubConfig = onSnapshot(doc(firestore, 'app_config', 'main'), (snap) => {
      setConfig({ ...defaultConfig, ...((snap.data() ?? {}) as Partial<AppConfig>) });
    }, (error) => notify({ type: 'error', text: `Config listener failed: ${error.message}` }));

    const unsubStats = onSnapshot(collection(firestore, 'daily_stats'), (snap) => {
      const rows = snap.docs.map((item) => ({
        id: item.id,
        total_scans: asNumber(item.data().total_scans),
        adblock_users_detected: asNumber(item.data().adblock_users_detected)
      })).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 14).reverse();
      setDailyStats(rows);
    }, (error) => notify({ type: 'error', text: `Stats listener failed: ${error.message}` }));

    const unsubLogs = onSnapshot(query(collection(firestore, 'scan_logs'), orderBy('created_at', 'desc'), limit(30)), (snap) => {
      setScanLogs(snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ScanLog, 'id'>) })));
    }, (error) => notify({ type: 'error', text: `Scan logs listener failed: ${error.message}` }));

    return () => {
      unsubUsers();
      unsubConfig();
      unsubStats();
      unsubLogs();
    };
  }, [authUser, ownerAllowed, notify]);

  const runAction = async (task: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await task();
      notify({ type: 'success', text: success });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      notify({ type: 'error', text: message });
    } finally {
      setBusy(false);
    }
  };

  if (!firebaseEnvReady) return <SetupRequired />;
  if (!authUser) return <Login onLogin={() => signInWithPopup(requireAuth(), googleProvider)} />;
  if (ownerAllowed === false) return <AccessDenied onSignOut={() => signOut(requireAuth())} user={authUser} />;
  if (ownerAllowed === null) return <LoadingState />;

  const totalScans = users.reduce((sum, user) => sum + asNumber(user.total_scans), 0);
  const premiumCount = users.filter((user) => Boolean(user.is_premium) || user.role === 'owner').length;
  const tokenPool = users.reduce((sum, user) => sum + asNumber(user.free_tokens) + asNumber(user.rewarded_tokens), 0);
  const todayStat = dailyStats.find((stat) => stat.id === dateKeyToday());
  const adblockCount = users.filter((user) => user.adblock_detected).length;
  const filteredUsers = users.filter((user) => {
    const haystack = `${user.displayName ?? ''} ${user.email ?? ''} ${user.uid}`.toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    const matchesFilter = roleFilter === 'all'
      || (roleFilter === 'owner' && user.role === 'owner')
      || (roleFilter === 'premium' && (user.is_premium || user.role === 'owner'))
      || (roleFilter === 'free' && !user.is_premium && user.role !== 'owner')
      || (roleFilter === 'adblock' && Boolean(user.adblock_detected));
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#050806] text-slate-100">
      <TopBar user={authUser} onSignOut={() => signOut(requireAuth())} />
      {toast && <Toast message={toast} />}

      <main className="mx-auto max-w-7xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8">
        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={<Users />} label="Total users" value={users.length.toLocaleString()} hint="Firestore users" />
          <MetricCard icon={<Crown />} label="Premium / owner" value={premiumCount.toLocaleString()} hint="Unlimited scans" />
          <MetricCard icon={<Zap />} label="Token pool" value={tokenPool.toLocaleString()} hint="Free + rewarded" />
          <MetricCard icon={<Activity />} label="Scans today" value={(todayStat?.total_scans ?? 0).toLocaleString()} hint={`${totalScans.toLocaleString()} all-time user scans`} />
          <MetricCard icon={<AlertTriangle />} label="AdBlock flags" value={adblockCount.toLocaleString()} hint="Users marked by app" danger={adblockCount > 0} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <UsersPanel
            users={filteredUsers}
            allUsersCount={users.length}
            searchTerm={searchTerm}
            roleFilter={roleFilter}
            ownerEmail={ownerEmail}
            currentUid={authUser.uid}
            busy={busy}
            onSearch={setSearchTerm}
            onFilter={setRoleFilter}
            onOwnerEmail={setOwnerEmail}
            onAddOwner={() => runAction(() => addOwnerByEmail(ownerEmail), 'Owner role granted.')}
            onSetRole={(uid, role) => runAction(() => updateUser(uid, { role }), `Role changed to ${role}.`)}
            onPremium={(uid, value) => runAction(() => updateUser(uid, {
              is_premium: value,
              premium_source: value ? 'owner_dashboard' : '',
              premium_product_id: value ? 'manual_owner_toggle' : ''
            }), value ? 'Premium enabled.' : 'Premium removed.')}
            onAddTokens={(uid, amount) => runAction(() => addTokens(uid, amount), `${amount} rewarded token(s) added.`)}
            onResetTokens={(uid) => runAction(() => resetTokens(uid, config.welcome_free_tokens), 'Tokens reset.')}
          />

          <ConfigPanel
            config={config}
            busy={busy}
            onConfigChange={setConfig}
            onResetTestAds={() => setConfig({ ...config, ...defaultConfig })}
            onSave={() => runAction(() => saveAppConfig(config), 'Remote app config saved.')}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <DailyStatsPanel stats={dailyStats} />
          <ScanLogsPanel logs={scanLogs} users={users} />
        </section>
      </main>
    </div>
  );
}

function TopBar({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050806]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size={40} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300 sm:text-xs sm:tracking-[0.28em]">NexaFit</p>
            <h1 className="truncate text-xl font-black leading-tight sm:text-2xl">Owner Dashboard</h1>
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
          <div className="min-w-0 text-left sm:text-right">
            <p className="truncate text-sm font-semibold">{user.displayName ?? 'Owner'}</p>
            <p className="max-w-[13rem] truncate text-xs text-slate-400 sm:max-w-xs">{user.email}</p>
          </div>
          <button onClick={onSignOut} className="btn-secondary shrink-0 px-3 sm:px-4"><LogOut size={16} /><span className="hidden min-[380px]:inline">Sign out</span></button>
        </div>
      </div>
    </header>
  );
}

function MetricCard({ icon, label, value, hint, danger = false }: { icon: React.ReactNode; label: string; value: string; hint: string; danger?: boolean }) {
  return (
    <div className={`glass-card p-5 ${danger ? 'border-red-400/30' : ''}`}>
      <div className={`mb-4 inline-flex rounded-2xl p-3 ${danger ? 'bg-red-400/10 text-red-300' : 'bg-emerald-400/10 text-emerald-300'}`}>{icon}</div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function UsersPanel(props: {
  users: AppUser[];
  allUsersCount: number;
  searchTerm: string;
  roleFilter: 'all' | 'owner' | 'premium' | 'free' | 'adblock';
  ownerEmail: string;
  currentUid: string;
  busy: boolean;
  onSearch: (value: string) => void;
  onFilter: (value: 'all' | 'owner' | 'premium' | 'free' | 'adblock') => void;
  onOwnerEmail: (value: string) => void;
  onAddOwner: () => void;
  onSetRole: (uid: string, role: UserRole) => void;
  onPremium: (uid: string, value: boolean) => void;
  onAddTokens: (uid: string, amount: number) => void;
  onResetTokens: (uid: string) => void;
}) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h2 className="section-title"><Users size={20} /> User Management</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">Manage role, premium access, and scan tokens directly from Firestore.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[28rem]">
            <input className="input min-w-0" value={props.ownerEmail} onChange={(e) => props.onOwnerEmail(e.target.value)} placeholder="user@email.com" />
            <button disabled={props.busy} onClick={props.onAddOwner} className="btn-primary justify-center"><ShieldCheck size={16} /> Add Owner</button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_14rem]">
          <label className="relative block min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input className="input w-full pl-10" value={props.searchTerm} onChange={(e) => props.onSearch(e.target.value)} placeholder="Search by name, email, or UID" />
          </label>
          <select className="input w-full" value={props.roleFilter} onChange={(e) => props.onFilter(e.target.value as typeof props.roleFilter)}>
            <option value="all">All users</option>
            <option value="owner">Owner only</option>
            <option value="premium">Premium / owner</option>
            <option value="free">Free users</option>
            <option value="adblock">AdBlock flags</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {props.users.map((user) => {
          const tokenTotal = asNumber(user.free_tokens) + asNumber(user.rewarded_tokens);
          const isCurrentOwner = user.uid === props.currentUid;
          return (
            <article key={user.uid} className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                {user.photoUrl ? <img src={user.photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-2xl object-cover" /> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/10 font-black text-emerald-300">{(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}</div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{user.displayName || 'No name'}</p>
                  <p className="truncate text-xs text-slate-400">{user.email}</p>
                  <p className="mt-1 truncate text-[11px] text-slate-600">{user.uid}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-xs text-slate-500">Role</p>
                  <div className="mt-1"><RoleBadge role={(user.role ?? 'user') as string} /></div>
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-xs text-slate-500">Premium</p>
                  <div className="mt-1">{user.is_premium || user.role === 'owner' ? <Badge label="Unlimited" tone="emerald" /> : <Badge label="Free" tone="slate" />}</div>
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-xs text-slate-500">Tokens</p>
                  <p className="mt-1 text-xl font-black text-white">{user.role === 'owner' || user.is_premium ? '∞' : tokenTotal}</p>
                  <p className="text-[11px] text-slate-500">free {asNumber(user.free_tokens)} · reward {asNumber(user.rewarded_tokens)}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-xs text-slate-500">Scans</p>
                  <p className="mt-1 text-xl font-black text-white">{asNumber(user.total_scans).toLocaleString()}</p>
                </div>
              </div>

              {user.adblock_detected && <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200">AdBlock detected</p>}
              <p className="mt-3 text-xs text-slate-500">Last login: {formatDate(user.last_login_at ?? user.lastLoginAt)}</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button disabled={props.busy} onClick={() => props.onPremium(user.uid, !user.is_premium)} className="btn-mini justify-center">{user.is_premium ? 'Remove Premium' : 'Give Premium'}</button>
                <button disabled={props.busy} onClick={() => props.onAddTokens(user.uid, 1)} className="btn-mini justify-center"><Gift size={14} /> +1 Token</button>
                <button disabled={props.busy} onClick={() => props.onAddTokens(user.uid, 5)} className="btn-mini justify-center"><Gift size={14} /> +5 Tokens</button>
                <button disabled={props.busy} onClick={() => props.onResetTokens(user.uid)} className="btn-mini justify-center"><RefreshCw size={14} /> Reset</button>
                <select disabled={props.busy || isCurrentOwner} value={(user.role ?? 'user') as string} onChange={(e) => props.onSetRole(user.uid, e.target.value as UserRole)} className="input-mini col-span-2 w-full">
                  <option value="user">user</option>
                  <option value="member">member</option>
                  <option value="owner">owner</option>
                </select>
              </div>
            </article>
          );
        })}
        {props.users.length === 0 && <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-10 text-center text-sm text-slate-400">No users matched your filter. Total users: {props.allUsersCount}.</div>}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[1040px] w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Premium</th>
              <th className="px-5 py-3">Tokens</th>
              <th className="px-5 py-3">Scans</th>
              <th className="px-5 py-3">Last login</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.users.map((user) => {
              const tokenTotal = asNumber(user.free_tokens) + asNumber(user.rewarded_tokens);
              const isCurrentOwner = user.uid === props.currentUid;
              return (
                <tr key={user.uid} className="border-t border-white/10 align-top hover:bg-white/[0.025]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {user.photoUrl ? <img src={user.photoUrl} alt="" className="h-10 w-10 rounded-2xl object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/10 font-black text-emerald-300">{(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}</div>}
                      <div className="min-w-0">
                        <p className="max-w-[15rem] truncate font-bold">{user.displayName || 'No name'}</p>
                        <p className="max-w-[15rem] truncate text-xs text-slate-400">{user.email}</p>
                        {user.adblock_detected && <p className="mt-1 text-xs font-semibold text-red-300">AdBlock detected</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><RoleBadge role={(user.role ?? 'user') as string} /></td>
                  <td className="px-5 py-4">{user.is_premium || user.role === 'owner' ? <Badge label="Unlimited" tone="emerald" /> : <Badge label="Free" tone="slate" />}</td>
                  <td className="px-5 py-4"><p className="text-lg font-black">{user.role === 'owner' || user.is_premium ? '∞' : tokenTotal}</p><p className="text-xs text-slate-500">free {asNumber(user.free_tokens)} · reward {asNumber(user.rewarded_tokens)}</p></td>
                  <td className="px-5 py-4 font-semibold">{asNumber(user.total_scans).toLocaleString()}</td>
                  <td className="px-5 py-4 text-xs text-slate-400">{formatDate(user.last_login_at ?? user.lastLoginAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button disabled={props.busy} onClick={() => props.onPremium(user.uid, !user.is_premium)} className="btn-mini">{user.is_premium ? 'Remove Premium' : 'Give Premium'}</button>
                      <button disabled={props.busy} onClick={() => props.onAddTokens(user.uid, 1)} className="btn-mini"><Gift size={14} /> +1</button>
                      <button disabled={props.busy} onClick={() => props.onAddTokens(user.uid, 5)} className="btn-mini"><Gift size={14} /> +5</button>
                      <button disabled={props.busy} onClick={() => props.onResetTokens(user.uid)} className="btn-mini"><RefreshCw size={14} /> Reset</button>
                      <select disabled={props.busy || isCurrentOwner} value={(user.role ?? 'user') as string} onChange={(e) => props.onSetRole(user.uid, e.target.value as UserRole)} className="input-mini">
                        <option value="user">user</option>
                        <option value="member">member</option>
                        <option value="owner">owner</option>
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
            {props.users.length === 0 && <tr><td className="px-5 py-10 text-center text-slate-400" colSpan={7}>No users matched your filter. Total users: {props.allUsersCount}.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConfigPanel({ config, busy, onConfigChange, onResetTestAds, onSave }: {
  config: AppConfig;
  busy: boolean;
  onConfigChange: (config: AppConfig) => void;
  onResetTestAds: () => void;
  onSave: () => void;
}) {
  const update = (patch: Partial<AppConfig>) => onConfigChange({ ...config, ...patch });
  return (
    <section className="glass-card p-4 sm:p-5">
      <h2 className="section-title"><Settings size={20} /> Remote Control</h2>
      <p className="mt-1 text-sm text-slate-400">Controls document <code>app_config/main</code>. The Android app listens to these values directly.</p>

      <div className="mt-5 space-y-4">
        <Field label="Interstitial full-screen ad unit" value={config.interstitial_ad_unit_id} onChange={(value) => update({ interstitial_ad_unit_id: value })} />
        <Field label="Rewarded full-screen ad unit" value={config.rewarded_ad_unit_id} onChange={(value) => update({ rewarded_ad_unit_id: value })} />
        <Field label="OpenRouter model" value={config.openrouter_model} onChange={(value) => update({ openrouter_model: value })} />
        <Field type="number" label="Welcome free tokens" value={String(config.welcome_free_tokens)} onChange={(value) => update({ welcome_free_tokens: asNumber(value, 2) })} />
        <Slider label="After-save interstitial probability" value={config.scan_save_interstitial_probability} onChange={(value) => update({ scan_save_interstitial_probability: value })} />
        <Slider label="Random interstitial probability" value={config.random_interstitial_probability} onChange={(value) => update({ random_interstitial_probability: value })} />
        <Toggle label="Full-screen ads enabled" description="Turns interstitial and rewarded ad features on/off." checked={config.fullscreen_ads_enabled} onChange={(checked) => update({ fullscreen_ads_enabled: checked })} />
        <Toggle label="Emergency kill switch" description="Use only if the Android app should block remote-driven flows." checked={config.kill_switch} danger onChange={(checked) => update({ kill_switch: checked })} />
        <div className="grid gap-2 sm:grid-cols-2">
          <button disabled={busy} onClick={onResetTestAds} className="btn-secondary justify-center"><RefreshCw size={16} /> Reset test ad IDs</button>
          <button disabled={busy} onClick={onSave} className="btn-primary justify-center"><Database size={16} /> Save config</button>
        </div>
      </div>
    </section>
  );
}

function DailyStatsPanel({ stats }: { stats: DailyStat[] }) {
  const max = Math.max(1, ...stats.map((stat) => stat.total_scans));
  return (
    <section className="glass-card p-4 sm:p-5">
      <h2 className="section-title"><BarChart3 size={20} /> Daily Scan Activity</h2>
      <p className="mt-1 text-sm text-slate-400">Last available daily_stats documents.</p>
      <div className="mt-6 flex min-h-52 items-end gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {stats.map((stat) => (
          <div key={stat.id} className="flex min-w-12 flex-1 flex-col items-center gap-2 sm:min-w-14">
            <div className="text-xs font-bold text-slate-300">{stat.total_scans}</div>
            <div className="w-full rounded-t-2xl bg-gradient-to-t from-emerald-400 to-emerald-200 shadow-[0_0_24px_rgba(0,230,153,0.28)]" style={{ height: `${Math.max(8, (stat.total_scans / max) * 150)}px` }} />
            <div className="text-[10px] text-slate-500">{stat.id.slice(4, 6)}/{stat.id.slice(6, 8)}</div>
          </div>
        ))}
        {stats.length === 0 && <div className="grid w-full place-items-center py-16 text-slate-400">No daily stats yet.</div>}
      </div>
    </section>
  );
}

function ScanLogsPanel({ logs, users }: { logs: ScanLog[]; users: AppUser[] }) {
  const userMap = new Map(users.map((user) => [user.uid, user]));
  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <h2 className="section-title"><Gauge size={20} /> Recent Scan Logs</h2>
        <p className="mt-1 text-sm text-slate-400">Latest client OpenRouter scan records.</p>
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {logs.map((log) => {
          const user = log.uid ? userMap.get(log.uid) : undefined;
          return (
            <article key={log.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{user?.displayName || user?.email || log.uid || 'Unknown'}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{log.uid}</p>
                </div>
                <Badge label={log.status || 'unknown'} tone={log.status === 'success' ? 'emerald' : 'amber'} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-xs text-slate-500">Provider</p>
                  <p className="mt-1 truncate font-semibold text-slate-200">{log.provider || '-'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="mt-1 text-xs font-semibold text-slate-300">{formatDate(log.created_at ?? log.createdAt)}</p>
                </div>
              </div>
            </article>
          );
        })}
        {logs.length === 0 && <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-10 text-center text-sm text-slate-400">No scan logs yet.</div>}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400">
            <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Time</th></tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const user = log.uid ? userMap.get(log.uid) : undefined;
              return (
                <tr key={log.id} className="border-t border-white/10">
                  <td className="px-5 py-4"><p className="max-w-[16rem] truncate font-semibold">{user?.displayName || user?.email || log.uid || 'Unknown'}</p><p className="max-w-[16rem] truncate text-xs text-slate-500">{log.uid}</p></td>
                  <td className="px-5 py-4"><Badge label={log.status || 'unknown'} tone={log.status === 'success' ? 'emerald' : 'amber'} /></td>
                  <td className="px-5 py-4 text-slate-300">{log.provider || '-'}</td>
                  <td className="px-5 py-4 text-slate-400">{formatDate(log.created_at ?? log.createdAt)}</td>
                </tr>
              );
            })}
            {logs.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">No scan logs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-sm font-semibold text-slate-300">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="input mt-2 w-full" /></label>;
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const percent = Math.round(value * 100);
  return (
    <label className="block text-sm font-semibold text-slate-300">
      <span className="flex items-center justify-between"><span>{label}</span><span className="text-emerald-300">{percent}%</span></span>
      <input type="range" min="0" max="100" value={percent} onChange={(event) => onChange(Number(event.target.value) / 100)} className="mt-3 w-full accent-emerald-400" />
    </label>
  );
}

function Toggle({ label, description, checked, danger = false, onChange }: { label: string; description: string; checked: boolean; danger?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <span><span className="block font-semibold text-slate-200">{label}</span><span className="text-xs text-slate-500">{description}</span></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className={`h-5 w-5 rounded ${danger ? 'accent-red-400' : 'accent-emerald-400'}`} />
    </label>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'owner') return <Badge label="Owner" tone="emerald" />;
  if (role === 'member') return <Badge label="Member" tone="cyan" />;
  return <Badge label="User" tone="slate" />;
}

function Badge({ label, tone }: { label: string; tone: 'emerald' | 'slate' | 'amber' | 'cyan' }) {
  const tones = {
    emerald: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
    slate: 'border-slate-300/20 bg-slate-400/10 text-slate-300',
    amber: 'border-amber-300/30 bg-amber-400/10 text-amber-200',
    cyan: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-200'
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{label}</span>;
}

function Toast({ message }: { message: ToastMessage }) {
  const tone = message.type === 'success' ? 'border-emerald-300/30 bg-emerald-400/15 text-emerald-100' : message.type === 'error' ? 'border-red-300/30 bg-red-400/15 text-red-100' : 'border-sky-300/30 bg-sky-400/15 text-sky-100';
  return <div className={`fixed left-3 right-3 top-24 z-50 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl sm:left-auto sm:right-4 sm:max-w-sm ${tone}`}>{message.text}</div>;
}

function Login({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Logo size={78} />
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.32em] text-emerald-300">Owner Portal</p>
        <h1 className="mt-2 text-3xl font-black">NexaFit Dashboard</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">Control users, premium access, scan tokens, and full-screen ads from Firestore Spark/free mode.</p>
        <button onClick={onLogin} className="btn-primary mt-7 w-full justify-center py-3"><Sparkles size={18} /> Continue with Google</button>
        <p className="mt-4 text-xs text-slate-500">Your account must have <code>role = owner</code> in <code>users/&#123;uid&#125;</code>.</p>
      </div>
    </div>
  );
}

function AccessDenied({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  return (
    <div className="auth-shell">
      <div className="auth-card border-red-400/20">
        <BellRing className="mx-auto text-red-300" size={56} />
        <h1 className="mt-5 text-2xl font-black">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Signed in as <b>{user.email}</b>, but this account is not marked as owner.</p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-left text-xs text-slate-300">
          Set this in Firestore:<br />
          <code>users/{user.uid}.role = "owner"</code>
        </div>
        <button onClick={onSignOut} className="btn-secondary mt-6 justify-center">Sign out</button>
      </div>
    </div>
  );
}

function SetupRequired() {
  return (
    <div className="auth-shell">
      <div className="auth-card max-w-2xl text-left">
        <Logo size={64} />
        <h1 className="mt-5 text-2xl font-black">Firebase web config required</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Create <code>owner-dashboard/.env.local</code> from <code>.env.example</code> and add your Firebase Web App config.</p>
        <pre className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-slate-300">{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=nexafit-7ccd4.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nexafit-7ccd4
VITE_FIREBASE_STORAGE_BUCKET=nexafit-7ccd4.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}</pre>
        <p className="mt-4 text-xs text-slate-500">Current projectId value: {String(firebaseConfig.projectId || 'missing')}</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return <div className="auth-shell"><div className="auth-card"><Logo size={64} /><p className="mt-5 text-slate-300">Checking owner access...</p></div></div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
