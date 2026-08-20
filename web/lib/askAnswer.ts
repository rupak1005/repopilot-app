/**
 * Normalize Ask LLM answers for the markdown renderer.
 * Strip inline citation dumps (chips render those) and tame ***bold*** noise.
 */
export function sanitizeAskAnswer(answer: string): string {
  let text = answer.replace(/\r\n/g, '\n');

  // Model sometimes embeds [file=path, lines=[a,b]] — citations belong in the chips row.
  text = text.replace(/\s*\[file=[^\]]+,\s*lines=\[[^\]]+\]\]/gi, '');
  text = text.replace(/\s*\[file=[^\]]+\]/gi, '');

  // ***Section*** → **Section** (triple-star is common model noise)
  text = text.replace(/\*{3}([^*]+?)\*{3}/g, '**$1**');

  // Collapse leftover spaces before punctuation from stripped citations
  text = text.replace(/[ \t]+\n/g, '\n').replace(/ +([.,;:)\]])/g, '$1');
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}
