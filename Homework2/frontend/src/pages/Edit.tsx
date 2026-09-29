import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, Klass, Me } from "../api";
import FileDrop from "../FileDrop";

export default function Edit({ me }: { me: Me }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [classId, setClassId] = useState(me.class_id);
  const [classes, setClasses] = useState<Klass[]>([]);

  useEffect(() => {
    if (me.role !== "teacher") {
      nav("/");
      return;
    }
    api.classes().then((d) => setClasses(d.items));
    api.one(Number(id)).then((m) => {
      setTitle(m.title);
      setBody(m.body_text || "");
      setClassId(m.class_id);
    }).catch(() => nav("/"));
  }, [id]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("title", title);
    fd.set("body", body);
    fd.set("class_id", String(classId));
    await api.update(Number(id), fd);
    nav(`/m/${id}`);
  }

  return (
    <>
      <p className="crumb"><Link className="btn btn-ghost" to={`/m/${id}`}><i className="fa-solid fa-arrow-left" /> 返回资料</Link></p>
      <section className="card">
        <h1><i className="fa-solid fa-pen-to-square" /> 修改资料</h1>
        <form className="upload-plain" onSubmit={save}>
          <label>所属班级
            <span className="field">
              <i className="fa-solid fa-chalkboard" />
              <select value={classId} onChange={(e) => setClassId(Number(e.target.value))}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </span>
          </label>
          <label>标题
            <span className="field"><i className="fa-solid fa-pen" /><input value={title} onChange={(e) => setTitle(e.target.value)} required /></span>
          </label>
          <label>知识库正文
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={12} />
          </label>
          <label>替换文件（可选）
            <FileDrop name="file" />
          </label>
          <p className="lead">重建索引会按新策略切分并替换旧切片。</p>
          <p className="actions">
            <button className="btn btn-primary" type="submit"><i className="fa-solid fa-floppy-disk" /> 保存修改</button>
            {(["auto", "custom", "hierarchy"] as const).map((st) => (
              <button key={st} className="btn btn-ghost" type="button" onClick={() => api.reindex(Number(id), st).then(() => alert("已按 " + st + " 重建"))}>
                重建 {st}
              </button>
            ))}
          </p>
        </form>
      </section>
    </>
  );
}
