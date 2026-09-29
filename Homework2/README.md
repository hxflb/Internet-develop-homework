# CampusClaw

**价值：** 把班级教研材料放进有边界的知识库，教师可上传入库，师生可在本班材料中检索并追溯出处。  
**场景：** 登录后按班隔离；上传 txt/md 入库并切分；关键字 / 向量 / 混合检索；无依据不编造。  
**本学期不做：** 流式长对话、交叉编码器重排、SSO/JWT、把 Qdrant 端口映射到本机。

请求链路：**浏览器 → Nginx → Go → MySQL / Qdrant**。仅 Nginx（`web`）映射到本机端口。

## 预置账号

口令来自 `.env` 的 `SEED_PASSWORD`（库中只存 bcrypt）。示例环境可用 `demo123`：

| 用户名 | 角色 | 班级 |
| --- | --- | --- |
| `teacher_a` | 教师 | A 班 |
| `student_a1` | 学生 | A 班 |
| `student_b1` | 学生 | B 班 |

检索班级只来自会话。学生跨班打开材料详情仍为 **HTTP 404**。跨班检索为 **200 + 空 hits**。

## Docker Compose（标准启动）

```powershell
Copy-Item .env.example .env
# 填写 SESSION_SECRET、DB_PASSWORD、MYSQL_ROOT_PASSWORD、SEED_PASSWORD
docker compose up --build
```

- 登录：http://localhost:8080/login
- 检索：http://localhost:8080/search
- 问答：http://localhost:8080/ask
- `GET /health` 无需登录
- 服务：`web`、`api`、`db`、`qdrant`（**不**映射 6333/3306）

未配置 `EMBEDDING_*` / `CHAT_*` 时，api 使用服务端哈希向量与摘录短答，密钥不会下发浏览器。配置课程网关后同义召回更好。

## 规约

- 第 3 课：`openspec/changes/add-auth-rbac-class-knowledge/`
- 第 4 课：`openspec/changes/add-traceable-vector-retrieval/`
