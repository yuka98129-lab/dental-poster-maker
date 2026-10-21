"use client";

type Props = { value: string; onChange: (v: string) => void; as?: "h3" | "p" | "span"; className?: string; label: string };

/**
 * 押すと、その場で文字を直せる。直し終わって、ほかをさわったとき(blur)に、onChange で新しい文字を渡す。
 * key に文字を使うのは、直したあとに、画面の部品を作り直して、ブラウザが勝手に足した改行の部品を消すため。
 */
export function Editable({ value, onChange, as: Tag = "span", className, label }: Props) {
  return (
    <Tag
      key={value}
      className={`ed${className ? ` ${className}` : ""}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={label}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const next = e.currentTarget.innerText.replace(/\n+$/, "");
        if (next !== value) onChange(next);
      }}
    >
      {value}
    </Tag>
  );
}
