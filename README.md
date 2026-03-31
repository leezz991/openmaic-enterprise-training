# 简而言之AI交互学习平台

基于 [THU-MAIC/OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) 的轻量二次开发版本，目标是把原始的“AI 课程生成工具”扩展成一个可用于企业内部培训的一期平台。

这个公开仓库重点展示两部分内容：

- 企业培训门户壳层
- 在尽量少改 OpenMAIC 内核前提下完成的用户、课程、学习、发布相关改造

## 项目定位

本项目保留了 OpenMAIC 原有的核心能力：

- AI 课程生成链路
- 课堂播放引擎
- AI 老师讲课
- 问答与互动
- 多智能体课堂体验

在此基础上新增了企业培训平台一期所需能力：

- 独立登录页
- 课程门户页
- 学员专用学习页
- 管理员课程发布页
- 用户与权限管理
- 服务端课程目录索引
- 课程固化与持久化

## 主要页面

### 企业培训门户

- `/login`
- `/courses`
- `/learn/[id]`
- `/admin/courses`
- `/admin/users`

### 创作者工作台

- `/creator`
- `/classroom/[id]`

创作者继续使用 OpenMAIC 原有课程生成能力；学员只进入培训门户和学习页，不暴露生成入口。

## 已完成的核心改造

### 1. 认证与权限

- 服务端用户体系，不再只依赖固定硬编码账号
- 角色支持 `admin / creator / learner`
- 支持并发会话
- 未登录访问 `/courses`、`/learn/[id]` 会重定向到 `/login`

### 2. 课程目录与发布

- 课程正文继续保存在 `data/classrooms/{id}.json`
- 新增课程目录索引 `data/course-catalog/index.json`
- 只有发布状态课程才会显示在 `/courses`
- 支持发布、下架和元数据维护

### 3. 学员学习页

- 不是简单 PPT 展示页
- 保留 AI 老师讲课、问答、互动交流能力
- 学员返回路径固定到 `/courses`
- 不暴露创作者入口、生成入口、调试入口

### 4. 课程固化流程

创作者在工作台完成课程生成后，可以直接：

- 固化课堂正文
- 上传媒体资源到服务端
- 跳转到发布页
- 补充标题、简介、封面、标签并发布

### 5. 品牌与门户改造

平台前台品牌已调整为：

**简而言之AI交互学习平台**

## 关键文件

### 门户与后台页面

- [app/login/page.tsx](./app/login/page.tsx)
- [app/courses/page.tsx](./app/courses/page.tsx)
- [app/learn/[id]/page.tsx](./app/learn/%5Bid%5D/page.tsx)
- [app/admin/courses/page.tsx](./app/admin/courses/page.tsx)
- [app/admin/users/page.tsx](./app/admin/users/page.tsx)
- [app/creator/page.tsx](./app/creator/page.tsx)

### 企业壳层组件

- [components/enterprise/login-form.tsx](./components/enterprise/login-form.tsx)
- [components/enterprise/logout-button.tsx](./components/enterprise/logout-button.tsx)
- [components/enterprise/admin-course-manager.tsx](./components/enterprise/admin-course-manager.tsx)
- [components/enterprise/admin-user-manager.tsx](./components/enterprise/admin-user-manager.tsx)
- [components/enterprise/learner-classroom-shell.tsx](./components/enterprise/learner-classroom-shell.tsx)

### 服务端核心改造

- [lib/server/auth.ts](./lib/server/auth.ts)
- [lib/server/user-store.ts](./lib/server/user-store.ts)
- [lib/server/course-catalog.ts](./lib/server/course-catalog.ts)
- [lib/server/classroom-storage.ts](./lib/server/classroom-storage.ts)
- [proxy.ts](./proxy.ts)

### 课堂壳层与固化能力

- [components/stage.tsx](./components/stage.tsx)
- [components/header.tsx](./components/header.tsx)
- [components/stage/scene-sidebar.tsx](./components/stage/scene-sidebar.tsx)
- [lib/client/persist-classroom.ts](./lib/client/persist-classroom.ts)
- [app/api/classroom/assets/route.ts](./app/api/classroom/assets/route.ts)

## 运行方式

### 本地开发

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

默认访问：

- `http://localhost:3000/login`

### Docker

```bash
cp .env.example .env.local
docker compose up -d --build
```

默认访问：

- `http://localhost:38080/login`

## 公开仓库说明

这个公开仓库已经做过基础脱敏处理：

- `.env.local` 未提交
- `data/` 未提交
- 本地测试 payload 未提交
- 默认演示密码已替换为占位值

但如果你要把它继续用于正式部署，仍应自行配置：

- 会话密钥
- 模型 API Key
- TTS / ASR / 图像 / 视频服务密钥
- 管理员、创作者、学员账号密码

## 二次开发说明

更完整的改造背景、实施方案、接口说明、文件清单、运行方式和后续建议，见：

- [SECONDARY_DEVELOPMENT_GUIDE.zh-CN.md](./SECONDARY_DEVELOPMENT_GUIDE.zh-CN.md)

## 致谢

- 原项目：[THU-MAIC/OpenMAIC](https://github.com/THU-MAIC/OpenMAIC)
- 本仓库为面向企业培训门户场景的二次开发示例
