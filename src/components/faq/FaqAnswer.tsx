import { Fragment, memo, useMemo } from "react";

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

function isBulletLine(line: string) {
  const t = line.trimStart();
  return t === "-" || t.startsWith("- ");
}

function bulletText(line: string) {
  const t = line.trimStart();
  if (t === "-") return "";
  if (t.startsWith("- ")) return t.slice(2).trim();
  return t;
}

function parseAnswer(text: string): Block[] {
  const normalized = String(text ?? "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  const blocks: Block[] = [];
  let para: string[] = [];
  let bullets: string[] = [];

  const flushPara = () => {
    const joined = para.join("\n").trim();
    if (joined) blocks.push({ type: "p", text: joined });
    para = [];
  };

  const flushBullets = () => {
    const items = bullets.map((x) => x.trim()).filter(Boolean);
    if (items.length) blocks.push({ type: "ul", items });
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw ?? "";
    const trimmed = line.trim();

    // empty line = paragraph break
    if (!trimmed) {
      flushBullets();
      flushPara();
      continue;
    }

    if (isBulletLine(line)) {
      flushPara();
      bullets.push(bulletText(line));
      continue;
    }

    flushBullets();
    para.push(line);
  }

  flushBullets();
  flushPara();

  return blocks;
}

export const FaqAnswer = memo(function FaqAnswer({ text }: { text: string }) {
  const blocks = useMemo(() => parseAnswer(text), [text]);

  if (!text?.trim()) return null;

  return (
    <div className="space-y-3">
      {blocks.map((b, idx) => (
        <Fragment key={idx}>
          {b.type === "p" ? (
            <p className="text-muted-foreground whitespace-pre-line">{b.text}</p>
          ) : (
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              {b.items.map((item, i) => (
                <li key={i} className="whitespace-pre-line">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </Fragment>
      ))}
    </div>
  );
});
