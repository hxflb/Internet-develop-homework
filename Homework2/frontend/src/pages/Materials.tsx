import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, Klass, Material, Me } from "../api";
import FileDrop from "../FileDrop";
import ConfirmDelete from "../ConfirmDelete";

export default function Materials({ me }: { me: Me }) {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [classId, setClassId] = useState(me.class_id);
  const [items, setItems] = useState<Material[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const dlg = useRef<HTMLDialogElement>(null);
  const [dropKey, setDropKey] = useState(0);
  const [pending, setPending] = useState<Material | null>(null);
  const className = classes.find((c) => c.id === classId)?.name || `班级 ${classId}`;

  async function load(cid = classId, query = q) {
    const data = await api.materials(me.role === "teacher" ? cid : undefined, query);
    setItems(data.items);
  }

  useEffect(() => {
    api.classes().then((d) => setClasses(d.items)).catch(() => {});
    load();
  }, []);

  async function changeClass(id: number) {
    setClassId(id);
    const data = await api.materials(id, q);
    setItems(data.items);
  }

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("class_id", String(classId));
    try {
      await api.upload(fd);
      dlg.current?.close();
      setMsg("已上传并写入知识库");
      e.currentTarget.reset();
      setDropKey((k) => k + 1);
      await load(classId, q);
    } catch (err) {
      setMsg("上传失败：" + (err as Error).message);
    }
  }

  async function del() {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    await api.remove(id);
    await load(classId, q);
  }

  return (
    <section className="card panel">
      {msg && <p className="alert"><i className="fa-solid fa-circle-check" /> {msg}</p>}
      <h1><i className="fa-solid fa-folder-open" /> {className}材料</h1>
      {me.role === "teacher" ? (
        <>
          <p className="lead">下拉切换查看班级；上传会入库到当前正在查看的班级。</p>
          <form className="class-switch" onSubmit={(e) => e.preventDefault()}>
            <label>当前查看
              <span className="field">
                <i className="fa-solid fa-users" />
                <select value={classId} onChange={(e) => changeClass(Number(e.target.value))}>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </span>
            </label>
          </form>
        </>
      ) : (
        <p className="lead"><i className="fa-solid fa-eye" /> 只读本班材料，班级由服务端会话决定。</p>
      )}

      <div className="toolbar-row">
        <span className="field search">
          <i className="fa-solid fa-magnifying-glass" />
          <input placeholder="搜索标题" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => load(classId, q)} onKeyDown={(e) => e.key === "Enter" && load(classId, q)} />
        </span>
        {me.role === "teacher" && (
          <button className="btn btn-accent" type="button" onClick={() => dlg.current?.showModal()}>
            <i className="fa-solid fa-cloud-arrow-up" /> 上传入库
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="empty"><i className="fa-solid fa-inbox" /> 该班暂无材料。</p>
      ) : (
        <ul className="list">
          {items.map((m) => (
            <li key={m.id} className="item">
              <div className="item-main">
                <Link to={`/m/${m.id}`}><i className="fa-regular fa-file-lines" /> {m.title}</Link>
                <span className="meta">
                  <span className="meta-item"><i className="fa-solid fa-user-pen" />{m.uploader}</span>
                  <span className="meta-item"><i className="fa-regular fa-clock" />{m.created_at}</span>
                </span>
              </div>
              {me.role === "teacher" && (
                <p className="actions">
                  <Link className="btn btn-ghost" to={`/m/${m.id}/edit`}><i className="fa-solid fa-pen-to-square" /> 修改</Link>
                  <button className="btn btn-danger" type="button" onClick={() => setPending(m)}><i className="fa-solid fa-trash" /> 删除</button>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <dialog className="upload-dialog" ref={dlg}>
        <form className="dialog-inner" onSubmit={upload}>
          <h2><i className="fa-solid fa-cloud-arrow-up" /> 上传到 {className}</h2>
          <label>标题
            <span className="field"><i className="fa-solid fa-pen" /><input name="title" placeholder="可选，默认用文件名" /></span>
          </label>
          <label>文件
            <FileDrop key={dropKey} name="file" required />
          </label>
          <p className="dialog-actions">
            <button className="btn btn-ghost" type="button" onClick={() => { dlg.current?.close(); setDropKey((k) => k + 1); }}>取消</button>
            <button className="btn btn-accent" type="submit"><i className="fa-solid fa-upload" /> 确认上传</button>
          </p>
        </form>
      </dialog>
      <ConfirmDelete
        open={pending !== null}
        title={pending?.title || ""}
        onCancel={() => setPending(null)}
        onConfirm={del}
      />
    </section>
  );
}
