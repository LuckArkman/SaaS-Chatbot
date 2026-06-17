import React from "react";
import Typography from "@material-ui/core/Typography";
import { useTheme } from "@material-ui/core/styles";

/**
 * Converte URLs em links clicáveis e mantém quebras de linha.
 * Suporta http(s), www. e mailto.
 */
export default function LinkifyText({ text = "", variant = "body1", color = "textSecondary", style }) {
  const theme = useTheme();
  const PRIMARY = theme?.palette?.primary?.main || "#1976d2";
  const urlRegex = /((https?:\/\/|www\.)[^\s)]+|mailto:[^\s)]+)/gi;

  const parts = [];
  let last = 0, m;
  while ((m = urlRegex.exec(text)) !== null) {
    const [raw] = m;
    const start = m.index;
    if (start > last) parts.push(text.slice(last, start));
    const href = raw.startsWith("www.") ? `https://${raw}` : raw;
    parts.push(
      <a
        key={`${start}-${href}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        style={{ color: PRIMARY, textDecoration: "underline", wordBreak: "break-word" }}
      >
        {raw}
      </a>
    );
    last = start + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));

  // preserva \n (comportamento parecido ao que você já usa com pre-line)
  const withBreaks = [];
  parts.forEach((p, idx) => {
    const chunks = typeof p === "string" ? p.split("\n") : [p];
    chunks.forEach((c, i) => {
      withBreaks.push(c);
      if (i < chunks.length - 1) withBreaks.push(<br key={`br-${idx}-${i}`} />);
    });
  });

  return (
    <Typography variant={variant} color={color} style={{ whiteSpace: "pre-line", ...style }}>
      {withBreaks}
    </Typography>
  );
}
