const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** GitHub-safe HTML: both views stay beside the step; click either for full resolution. */
export function renderStoryImages(slug: string, stem: string, description: string): string {
  const path = (project: string) => `../../screenshots/${slug}/${stem}-${project}-darwin.png`;
  const image = (project: string, width: number) => `<a href="${escape(path(project))}"><img src="${escape(path(project))}" alt="${escape(`${description} — ${project}`)}" width="${width}"></a>`;
  return `<table>\n<tr><th>Desktop · 1440 × 1000</th><th>Phone · 393 × 852</th></tr>\n<tr>\n<td valign="top">${image('desktop', 720)}</td>\n<td valign="top">${image('phone', 240)}</td>\n</tr>\n</table>\n\n<details>\n<summary>Tabletop · 3840 × 2160 — expand screenshot</summary>\n\n${image('tabletop-4k', 960)}\n\n</details>`;
}
