import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, Citation } from "../api";

type Turn = { question: string; answer: string; citations: Citation[] };

function AnswerText({ text }: { text: string }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\[\d+\]$/.test(part) ? (
          <span key={i} className="cite-mark">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function AskPage() {
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run(e: FormEvent) {
    e.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
    setErr("");
    setBusy(true);
    const messages = turns.flatMap((t) => [
      { role: "user", content: t.question },
      { role: "assistant", content: t.answer },
    ]);
    try {
      const r = await api.ask(question, messages);
      setTurns((prev) => [...prev, { question, answer: r.answer, citations: r.citations || [] }]);
      setDraft("");
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card panel">
      <h1><i className="fa-solid fa-comments" /> 本班问答</h1>
      <p className="lead">先在本班检索再作答。回答只针对问题本身，依据列在下方；没有依据时不会生成内容。</p>
      {turns.length > 0 && (
        <p className="actions" style={{ marginBottom: 12 }}>
          <button className="btn btn-ghost" type="button" onClick={() => { setTurns([]); setErr(""); }}>新对话</button>
        </p>
      )}
      <div className="thread">
        {turns.map((t, i) => (
          <article key={i} className="turn">
            <p className="q-line"><i className="fa-solid fa-user" /> {t.question}</p>
            <div className="body answer-body"><AnswerText text={t.answer} /></div>
            {t.citations.length > 0 && (
              <ul className="list cite-list">
                {t.citations.map((c) => (
                  <li key={c.n} className="item">
                    <div className="item-main">
                      <Link to={`/m/${c.material_id}`} state={{ back: "/ask" }}>
                        <span className="cite-mark">[{c.n}]</span> {c.material_title}
                      </Link>
                      <span className="meta">
                        <span className="meta-item">切片 {c.chunk_index + 1}</span>
                      </span>
                      <p className="lead">{c.excerpt}</p>
                    </div>
                    <p className="actions">
                      <Link className="btn btn-ghost" to={`/m/${c.material_id}`} state={{ back: "/ask" }}>
                        <i className="fa-solid fa-book-open" /> 查看原文
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      {err && <p className="alert">{err}</p>}
      <form className="upload-plain ask-form" onSubmit={run}>
        <label>问题
          <span className="field">
            <i className="fa-solid fa-circle-question" />
            <input value={draft} onChange={(e) => setDraft(e.target.value)} required placeholder="就本班资料提问，可继续追问" />
          </span>
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "检索中…" : "提问"}</button>
      </form>
    </section>
  );
}
