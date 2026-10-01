// Mock 메일 발송: 실제 메일 대신 데모 메일함(db.mails)에 쌓는다.
import { uid } from "../util.js";

export function sendMail(db, { to, subject, body, type, link, linkLabel }) {
  const emp = db.employees.find((e) => e.id === to);
  if (!emp) return null;
  const mail = {
    id: uid("m"),
    to,
    toName: emp.name,
    toEmail: emp.email,
    from: "HBM 에이전트",
    subject,
    body,
    type,
    link: link || null,
    linkLabel: linkLabel || null,
    createdAt: new Date().toISOString(),
    read: false,
  };
  db.mails.unshift(mail);
  return mail;
}
