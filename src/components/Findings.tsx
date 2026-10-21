import type { Finding } from "../lib/ad-check";

/** 医療広告のチェック(目安)の結果 */
export function Findings({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return <p className="check ok">医療広告のチェック(目安): 気になる表現は見つかりませんでした。</p>;
  }
  return (
    <div className="check warn" role="status">
      <b>医療広告のチェック(目安): 気をつけたい表現が{findings.length}つあります。</b>
      <ul>
        {findings.map((f) => (
          <li key={f.word}>
            <mark>{f.word}</mark>
            <br />
            {f.hint}
          </li>
        ))}
      </ul>
    </div>
  );
}
