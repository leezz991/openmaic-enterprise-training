# OpenMAIC 二次开发说明

## 1. 项目背景

本次工作基于 OpenMAIC 现有仓库进行轻量二次开发，目标是在不重写课程生成链路、LangGraph 编排、播放引擎和多智能体底层逻辑的前提下，将其改造成企业内部培训平台一期版本。

本次改造遵循以下原则：

- 尽量少改 OpenMAIC 内核
- 优先新增企业门户壳层
- 保留管理员原有课程生成能力
- 学员侧与创作者侧分离
- 课程数据以服务端持久化为准

## 2. 本次改造目标

已完成的核心目标如下：

- 新增企业登录页
- 新增课程列表页
- 新增学员专用学习页
- 新增管理员课程发布页
- 新增用户与权限管理页
- 新增服务端课程目录索引
- 新增课程固化并跳转发布流程
- 恢复学员页中的 AI 老师讲课、问答和互动能力
- 支持服务端持久化与 Docker 持久卷

## 3. 页面结构

### 3.1 管理员 / 创作者侧

- `/creator`
- `/classroom/[id]`

用途：

- 继续使用 OpenMAIC 原生课程生成能力
- 编辑和查看课堂
- 固化课程
- 跳转发布

### 3.2 学员侧

- `/login`
- `/courses`
- `/learn/[id]`

用途：

- 登录培训门户
- 查看已发布课程
- 进入学员专用学习页

## 4. 关键能力说明

### 4.1 认证与权限

新增服务端用户体系，支持：

- `admin`
- `creator`
- `learner`

主要能力：

- 登录 / 登出
- 路由权限拦截
- 接口权限拦截
- 并发会话
- 用户管理
- 角色权限控制

相关文件：

- `lib/auth/session.ts`
- `lib/server/auth.ts`
- `lib/server/user-store.ts`
- `proxy.ts`

### 4.2 课程正文与课程目录

课程正文继续复用 OpenMAIC 原结构：

- `data/classrooms/{id}.json`

新增课程目录索引：

- `data/course-catalog/index.json`

目录字段包含：

- `id`
- `title`
- `summary`
- `cover`
- `tags`
- `status`
- `visibility`
- `author`
- `createdAt`
- `updatedAt`

### 4.3 学员学习页

学员页不是简单 PPT 预览，而是基于原始 `Stage` 播放壳层恢复了：

- AI 老师讲课
- 问答
- ChatArea 互动
- 多智能体课堂体验

同时隐藏了以下创作者入口：

- 返回生成首页
- 设置入口
- 导出入口
- 固化发布入口

### 4.4 固化与发布流程

新增“生成完成后固化并去发布”的流程：

1. 固化本地 `stage + scenes`
2. 上传课程媒体资源
3. 写入服务端课程正文
4. 写入 `generatedAgents`
5. 自动跳转到发布页

## 5. 新增页面与接口

### 页面

- `/login`
- `/courses`
- `/learn/[id]`
- `/admin/courses`
- `/admin/users`
- `/creator`

### 接口

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/courses`
- `GET /api/courses/[id]`
- `POST /api/courses/publish`
- `PATCH /api/courses/[id]`
- `POST /api/classroom/assets`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/[id]`
- `DELETE /api/users/[id]`

## 6. 主要改动文件

### 企业门户页面

- `app/login/page.tsx`
- `app/courses/page.tsx`
- `app/learn/[id]/page.tsx`
- `app/admin/courses/page.tsx`
- `app/admin/users/page.tsx`
- `app/creator/page.tsx`

### 企业组件

- `components/enterprise/login-form.tsx`
- `components/enterprise/logout-button.tsx`
- `components/enterprise/admin-course-manager.tsx`
- `components/enterprise/admin-user-manager.tsx`
- `components/enterprise/learner-classroom-shell.tsx`

### 服务端模块

- `lib/server/auth.ts`
- `lib/server/user-store.ts`
- `lib/server/course-catalog.ts`
- `lib/server/classroom-storage.ts`
- `lib/client/persist-classroom.ts`

### 壳层适配

- `components/stage.tsx`
- `components/header.tsx`
- `components/stage/scene-sidebar.tsx`
- `proxy.ts`

## 7. 本地运行

```powershell
cd D:\codex\OpenMAIC
Copy-Item .env.example .env.local
corepack pnpm install
corepack pnpm dev
```

访问：

- `http://localhost:3000/login`

## 8. Docker 运行

```powershell
cd D:\codex\OpenMAIC
docker compose up -d --build
docker compose logs -f
```

访问：

- `http://localhost:38080/login`

## 9. 当前验收结果

本次改造已完成以下验证：

- `pnpm exec tsc --noEmit`
- `pnpm build`
- `docker compose up -d --build`
- 未登录访问课程页会跳转到 `/login`
- 登录后可查看课程列表
- 已发布课程从服务端读取
- 学员页可进入 `/learn/[id]`
- 学员页保留 AI 讲课和互动能力

## 10. 已知限制

### 10.1 旧课程的 agent 恢复

旧课程如果在本次改造前已经固化，则服务端可能没有 `generatedAgents`。这类课程建议重新固化一次，以完整恢复自动生成角色配置。

### 10.2 第三方 TTS 权限

部分第三方 TTS 服务可能存在资源授权限制。当前已做容错处理，即使 TTS 失败也不会阻塞课程生成。

## 11. 后续建议

建议下一阶段优先扩展：

- 企业统一身份认证
- SQLite 替代 JSON 课程目录
- 学习进度记录
- 课程完成状态
- 更完整的后台筛选与检索

## 12. 结论

本次二次开发已经将 OpenMAIC 从“课程生成工具”扩展为“企业培训门户 + 学员学习入口 + 管理员发布流程”的一期版本，并在尽量少改内核的前提下保留了 AI 讲课、问答与互动能力。
