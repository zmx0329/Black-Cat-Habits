# Black Cat Habits

**毒蛇黑猫督导 · 习惯养成系统**

Black Cat Habits 是一款带有 **“毒舌监督人格”** 的习惯养成应用。

它不是一个温柔提醒你打卡的工具，而是一只 **毒舌、冷静、持续观察你的黑猫**。
在这里，你的习惯不是被简单记录，而是被持续审视。

当你坚持时，它会认可你。
当你偷懒时，它也会毫不客气地指出来。

这种 **人格化监督机制**，让习惯管理从“记录行为”变成一种更有情绪反馈的体验。

---

# 产品理念

Black Cat Habits 是一个：

**带人格监督的习惯管理系统**

核心设计围绕三个原则：

### ⚡快速记录

用户每天只需要 **一次点击** 就能完成打卡。

避免复杂流程，让记录变成自然行为。

---

### 🐈情绪反馈

应用中的 **毒蛇黑猫** 会对用户行为进行点评：

* 坚持时给予认可
* 偷懒时进行吐槽
* 长期表现进行总结

这些文案由 AI 动态生成，让反馈更加个性化。

---

### 📊行为可视化

系统通过统计图表帮助用户理解自己的习惯轨迹：

* 每日记录
* 月度日历统计
* 长期热力图

---

# 功能页面

## 登录 / 注册（`/login`）

支持邮箱 + 密码登录。

用户注册时需要填写昵称。

登录成功后自动进入首页。

<img width="350"  alt="image" src="https://github.com/user-attachments/assets/4fe65c50-fcc5-4a2c-9db4-a6f8d3f67226" />

---

## 首页（`/`）

展示用户所有习惯卡片。

卡片信息包括：

* 今日完成进度
* 本周活跃天数
* 标签与描述

用户可以：

* 点击卡片完成打卡
* 打开弹层记录备注
* 拖拽调整习惯顺序

首页顶部会显示 **毒蛇黑猫点评**。

<img width="350" alt="image" src="https://github.com/user-attachments/assets/72c68c61-50ea-4020-8c64-4aee1596b85b" />

---

## 添加习惯（`/add`）

用户可以创建新的习惯：

* 习惯类型（好习惯 / 坏习惯）
* 标题与描述
* 每日目标次数
* 提醒时间

<img width="350" alt="image" src="https://github.com/user-attachments/assets/3d64e62b-17ac-421c-b250-748422a8f570" />


---

## 编辑习惯（`/edit/:id`）

修改习惯信息：

* 标题
* 描述
* 目标
* 提醒时间

<img width="350" alt="image" src="https://github.com/user-attachments/assets/1b654e79-29e3-459d-92eb-7764f6ba569b" />


---

## 习惯详情（`/details/:id`）

展示习惯的长期表现：

* 基础信息
* 累计统计
* 近 6 个月热力图
* 历史记录

页面会显示整体点评。

<img width="350" alt="image" src="https://github.com/user-attachments/assets/89020178-d23a-4f70-b7ac-5ceeab7fe278" />


---

## 统计页面（`/statistics`）

使用日历视图展示打卡记录。

用户可以：

* 查看每日习惯情况
* 点击日期查看详细记录
* 每日总结点评

<img width="625" alt="image" src="https://github.com/user-attachments/assets/ebfe5f70-9daf-4292-8394-c1ecc32ae55a" />


---


# 技术架构

应用采用 **前端 SPA + BaaS 后端服务** 架构。

### 前端

* React 18
* TypeScript
* Vite
* React Router v6

### 后端

* Supabase
  提供：

* 用户认证

* 数据存储

### AI 文案

* DeepSeek API

用于生成 **毒蛇黑猫点评**。


---

# 项目结构

```
pages/        页面组件
components/   通用组件
context/      全局状态
services/     外部服务
supabase/     数据库配置
constants.ts  常量配置
index.tsx     应用入口
index.html    HTML 模板
index.css     全局样式
dist/         构建产物
docs/         设计与说明文档
```
---

# 环境变量

在项目根目录创建 `.env.local`：

```
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

VITE_DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY
VITE_DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
```

---

# 运行

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

构建：

```bash
npm run build
```

预览：

```bash
npm run preview
```

建议 Node.js 版本：

```
Node >= 18
```

---
