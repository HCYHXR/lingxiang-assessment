# 灵相测评公网发布说明

目标是得到两个正式链接：

- 发给候选人：`https://你的域名/candidate`
- HR 查看报告：`https://你的域名/hr?key=你的HR_KEY`

`127.0.0.1` 只能在你自己的电脑打开，不能发给候选人。要让候选人在家作答，需要把本项目部署到公网 Node 服务。

## 推荐：Render 一键部署

项目里已经放好了 `render.yaml`，Render 会自动识别 Node 服务、启动命令和答卷保存位置。

1. 注册或登录 Render：`https://render.com`
2. 新建 `Web Service`
3. 连接一个 GitHub 仓库，仓库内容就是整个 `D:\ai-woker` 项目
4. Render 识别到 `render.yaml` 后，确认创建服务
5. 设置环境变量：
   - `HR_KEY`：建议填 `m2-hr-2026`，也可以换成你自己的密钥
6. 部署完成后，Render 会给你一个域名，例如：
   - `https://m2-talent-assessment.onrender.com`

部署完成后直接使用：

- 候选人链接：`https://m2-talent-assessment.onrender.com/candidate`
- HR 链接：`https://m2-talent-assessment.onrender.com/hr?key=m2-hr-2026`

## 重要设置

`render.yaml` 已经配置：

- `npm install`
- `npm start`
- `DATA_FILE=/var/data/talent-submissions.json`
- 1GB 持久化磁盘，用来保存候选人提交记录

这样服务重启后，候选人的提交记录不会因为重启丢失。

## 本地预览

```bash
npm start
```

本地地址：

- 候选人：`http://127.0.0.1:8787/candidate`
- HR：`http://127.0.0.1:8787/hr?key=m2-hr-2026`

## 链接发送话术

可以直接发给候选人：

> 你好，这是本次灵相测评链接：  
> `https://你的域名/candidate`  
> 请填写姓名后完成测评，提交后系统会自动生成结果。

HR 自己保留：

> HR 报告后台：  
> `https://你的域名/hr?key=你的HR_KEY`
