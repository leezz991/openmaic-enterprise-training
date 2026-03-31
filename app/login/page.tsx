import { ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/enterprise/login-form';

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.16),_transparent_32%),linear-gradient(135deg,_#e2e8f0_0%,_#f8fafc_48%,_#e0f2fe_100%)] px-6 py-10">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex min-h-[680px] flex-col justify-between rounded-[36px] border border-white/50 bg-slate-950 px-8 py-8 text-white shadow-[0_40px_120px_rgba(15,23,42,0.18)] lg:px-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
              <ShieldCheck className="h-4 w-4" />
              简而言之AI交互学习平台
            </div>

            <h1 className="mt-10 max-w-xl text-5xl font-semibold leading-tight tracking-tight">
              创作者、学员与管理员统一登录入口
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
              平台现已接入服务端用户体系，支持角色权限控制与并发会话。课程访问、发布管理和创作工作台入口都会按实际权限开放，不再依赖固定写死账号。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white">用户管理</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                管理员可创建用户、调整角色，并控制权限覆盖项。
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white">并发会话</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                每次登录都会生成独立服务端会话，支持多用户同时在线使用。
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white">角色权限</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                学员、创作者和管理员只会看到各自权限允许访问的功能区。
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[32px] border border-slate-200/70 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                简而言之AI交互学习平台
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">登录</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                请使用系统账号登录。下方保留了本地开发种子账号，后续可在用户管理后台中调整。
              </p>
            </div>

            <LoginForm next={params.next} />

            <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
              本地开发种子账号：
              <div className="mt-2 space-y-1 font-mono text-xs text-slate-700">
                <div>admin / openmaic123</div>
                <div>creator / creator123</div>
                <div>learner / learn123</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
