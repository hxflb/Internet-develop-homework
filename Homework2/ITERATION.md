# 迭代说明（第 3 课 Apply / Verify）

本迭代按 [第 3 课：认证授权与知识库入库](https://devops.hello1023.com/%E8%AF%BE%E4%BB%B6/%E7%AC%AC3%E8%AF%BE-%E8%AF%BE%E4%BB%B6-%E8%AE%A4%E8%AF%81%E6%8E%88%E6%9D%83%E4%B8%8E%E7%9F%A5%E8%AF%86%E5%BA%93%E5%85%A5%E5%BA%93/index.html) 把第 2 课 change 做成可发布形态。

## 设计决策（不是课件表格原文）

- 发布形态选 Compose 三服务，而不是本机直接跑解释器：第三方只暴露一个 web 端口就能复现登录、隔离、上传入库。
- 会话放服务端 Cookie + MySQL `sessions` 表，而不是 JWT：本课验收依赖「会话里能判定角色和班级、登出立即失效」，无状态 JWT 会让这些条款变含糊。
- 跨班按 ID 访问对学生返回 404 而不是 403：避免用状态码区分「存在但无权限」，降低枚举他班资源的信息。
- 上传目录只挂在 api，Nginx 不 `alias` 静态暴露：文件必须经过会话与班级校验后才能下载。
- 教师可切换班级查看/上传：课堂产品需求写进 `design.md` D4/D5，不是 Harness 自发加功能。

明确不做（第 3 课）：流式长对话当时未做；第 4 课已增加可追溯检索。仍不做交叉编码器、K8s、映射 Qdrant 端口。

---

# 第 4 课

按 [可追溯知识库检索](https://devops.hello1023.com/%E8%AF%BE%E4%BB%B6/%E7%AC%AC4%E8%AF%BE-%E8%AF%BE%E4%BB%B6-%E5%8F%AF%E8%BF%BD%E6%BA%AF%E7%9F%A5%E8%AF%86%E5%BA%93%E6%A3%80%E7%B4%A2/) 增加 change `add-traceable-vector-retrieval`：切片在 MySQL，向量在 Qdrant，三种检索，无依据不生成。


## 按规约实现

实现对照 `openspec/changes/add-auth-rbac-class-knowledge/` 四件套。Apply 期间只改 change 目录与代码，不提前回写 `openspec/specs/`。

## 提交清单

- [x] Compose：`web` / `api` / `db`，仅 web 公布宿主端口
- [x] `GET /health` 无需登录
- [x] 预置双班账号与可区分标题材料
- [x] 学生上传 403；学生跨班 404
- [x] 教师 txt/md 上传同事务入库
- [x] README 三行价值/场景/不做 + 启动步骤

## 明确不做

见 `proposal.md` Non-goals。前端隐藏按钮不构成访问控制。
