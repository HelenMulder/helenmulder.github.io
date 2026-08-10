import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const scholarlyHosts = new Set([
  'pubmed.ncbi.nlm.nih.gov', 'pmc.ncbi.nlm.nih.gov', 'www.science.org',
  'science.org', 'alz-journals.onlinelibrary.wiley.com', 'pubs.acs.org', 'doi.org',
]);

const articles = [
  {
    slug: 'healthy-gut-healthy-brain',
    source: 'healthy-gut-healthy-brain/healthy-gut-healthy-brain.md',
    title: 'Constipation Prevention for Dementia',
    description: 'Dementia-friendly strategies for bowel regularity.',
    published: '2026-06-02',
    updated: '2026-08-09',
  },
  {
    slug: 'gum_disease_alzheimers_link',
    source: 'gum_disease_alzheimers_link/healthy-mouth-healthy-brain.md',
    title: 'Oral Health for Dementia - Beyond Brushing',
    description: 'Maintaining a tolerable oral health routine for dementia',
    published: '2026-01-01',
    updated: '2026-08-09',
  },
  {
    slug: 'immune-drain',
    source: 'drafts/immune-drain.md',
    title: 'Immune Drain: How chronic infections can burden an already stressed system, and what to do about it',
    description: 'How recurring infections and chronic local inflammation can burden an already stressed system.',
    published: '2026-08-09',
    updated: '2026-08-09',
  },
  {
    slug: 'uti-prevention-for-dementia',
    source: 'drafts/healthy-bladder-healthy-brain.md',
    title: 'UTI Prevention for Dementia',
    description: 'Practical strategies to reduce urinary tract infection risk in dementia care.',
    published: '2026-08-09',
    updated: '2026-08-09',
  },
];

function decode(text) {
  return text.replaceAll('\u00e2\u20ac\u0153', '\u201c').replaceAll('\u00e2\u20ac\u009d', '\u201d')
    .replaceAll('\u00e2\u20ac\u2122', '\u2019').replaceAll('\u00e2\u20ac\u201d', '\u2014')
    .replaceAll('\u00e2\u2020\u0090', '\u2190').replaceAll('\u00e2\u2020\u2019', '\u2192')
    .replaceAll('\u00c2\u00bd', '\u00bd').replaceAll('\u00c2\u00b7', '\u00b7');
}

function escapeHtml(text) {
  return decode(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function withoutFrontmatter(markdown) {
  return markdown.replace(/^\s*---[\s\S]*?---\s*/, '');
}

function inline(text, citations) {
  const links = [];
  let safe = escapeHtml(text).replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)/g, (_, label, href) => {
    const host = href.startsWith('http') ? new URL(href).hostname : '';
    if (scholarlyHosts.has(host)) {
      let reference = citations.find((item) => item.href === href);
      if (!reference) {
        reference = { href, label: decode(label) };
        citations.push(reference);
      }
      return `${label}<sup class="citation"><a href="${href}" aria-label="Citation ${citations.indexOf(reference) + 1}">${citations.indexOf(reference) + 1}</a></sup>`;
    }
    const token = `@@LINK${links.length}@@`;
    links.push(`<a href="${href}">${label}</a>`);
    return token;
  });
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return safe.replace(/@@LINK(\d+)@@/g, (_, number) => links[Number(number)]);
}

function renderMarkdown(markdown, citations, demoteFirstHeading = false, omitFirstHeading = false) {
  const lines = withoutFrontmatter(markdown).trim().split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let listType = null;
  let firstHeading = true;
  const flushParagraph = () => { if (paragraph.length) output.push(`<p>${inline(paragraph.join(' '), citations)}</p>`); paragraph = []; };
  const closeList = () => { if (listType) output.push(`</${listType}>`); listType = null; };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); closeList(); continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph(); closeList();
      if (omitFirstHeading && firstHeading) { firstHeading = false; continue; }
      let level = heading[1].length;
      if (demoteFirstHeading && firstHeading) level = Math.min(3, level + 1);
      firstHeading = false;
      output.push(`<h${level}>${inline(heading[2], citations)}</h${level}>`);
      continue;
    }
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      const type = unordered ? 'ul' : 'ol';
      if (listType && listType !== type) closeList();
      if (!listType) { output.push(`<${type}>`); listType = type; }
      output.push(`<li>${inline((unordered || ordered)[1], citations)}</li>`);
      continue;
    }
    if (listType && /^\s{2,}\S/.test(rawLine) && output.at(-1)?.startsWith('<li>')) {
      output[output.length - 1] = output.at(-1).replace(/<\/li>$/, `<br>${inline(line, citations)}</li>`);
      continue;
    }
    closeList();
    paragraph.push(line);
  }
  flushParagraph(); closeList();
  return output.join('\n');
}

function subscription() {
  return `<section class="subscribe-strip" aria-label="Subscribe"><div class="subscribe-title">Get new articles by email</div><div class="subscribe-row"><input id="hm-sub-email" type="email" placeholder="your@email.com" aria-label="Email address"><button onclick="hmSubscribe()">Subscribe</button></div><p id="hm-sub-status" class="small" aria-live="polite"></p><p class="small">New articles delivered to your inbox. Unsubscribe anytime.</p></section><script>async function hmSubscribe(){const i=document.getElementById('hm-sub-email'),s=document.getElementById('hm-sub-status'),e=i.value.trim();if(!/^\\S+@\\S+\\.\\S+$/.test(e)){s.textContent='Please enter a valid email.';return}const p=JSON.stringify({action:'subscribe',email:e,source:location.pathname,ts:new Date().toISOString()});let u='';try{u=(await (await fetch('/subscribe-config.json',{cache:'no-store'})).json()).endpoint||''}catch(_){}if(u){try{const r=await fetch(u,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:p});if(!r.ok)throw Error();s.textContent='Thanks — you are subscribed.';i.value='';return}catch(_){try{await fetch(u,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:p});s.textContent='Thanks — you are subscribed.';i.value='';return}catch(_){}}}location.href='mailto:helenjmulder@gmail.com?subject='+encodeURIComponent('Subscribe - HelenMulder.com')+'&body='+encodeURIComponent('Please add me to new article alerts.\\nMy email: '+e)}</script>`;
}

function footer() {
  return `<footer class="site-footer"><div><strong>Helen Mulder OT</strong></div><div class="small">Helen Mulder is an Occupational Therapist applying Neuro-Metabolic Rehabilitation to address cognitive decline.</div><div class="small">Contact: <a href="mailto:helenjmulder@gmail.com">helenjmulder@gmail.com</a></div><div class="small"><a href="/">Home</a> &#183; <a href="/recipes/index.html">Recipe Library</a> &#183; <a href="/series/immune-drain/index.html">Immune Drain</a> &#183; <a href="/series/signal-safety/index.html">Signal Safety</a></div></footer>`;
}

function seriesNavigation(currentSlug) {
  const routes = [
    { title: 'Immune Drain', slug: 'immune-drain' },
    { title: 'Constipation Prevention for Dementia', slug: 'healthy-gut-healthy-brain' },
    { title: 'Oral Health for Dementia', slug: 'gum_disease_alzheimers_link' },
    { title: 'UTI Prevention for Dementia', slug: 'uti-prevention-for-dementia' },
  ];
  const links = routes.map((route) => route.slug === currentSlug
    ? `<li><span aria-current="page">${escapeHtml(route.title)}</span></li>`
    : route.slug
      ? `<li><a href="/${route.slug}/published_article.html">${escapeHtml(route.title)}</a></li>`
      : `<li><span>${escapeHtml(route.title)} <em>${route.status}</em></span></li>`).join('');
  return `<section class="series-nav" aria-label="Immune Drain Series"><div class="series-kicker">Series</div><h2>Part of the Immune Drain Series</h2><ul>${links}</ul></section>`;
}

function shell(title, description, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} | Helen Mulder OT</title><meta name="description" content="${escapeHtml(description)}"><link rel="stylesheet" href="/assets/site.css"></head><body>${body}</body></html>`;
}

async function buildHome() {
  const cards = articles.map((article) => `<article class="article-item"><h3><a href="/${article.slug}/published_article.html">${escapeHtml(article.title)}</a></h3><p>${escapeHtml(article.description)}</p><div class="meta">Published ${article.published} &#183; Updated ${article.updated}</div></article>`).join('');
  const body = `<header class="hero"><h1>Helen Mulder OT</h1><p class="tagline">Neuro-Metabolic Rehabilitation for Cognitive Decline</p></header><section class="series-panel"><div class="series-kicker">Series</div><h2 class="series-title"><a href="/series/immune-drain/index.html">Immune Drain Series</a></h2>${cards}</section><section class="series-panel"><div class="series-kicker">Series</div><h2 class="series-title"><a href="/series/signal-safety/index.html">Signal Safety Series</a></h2><p class="meta">Coming soon.</p></section><section class="series-panel"><div class="series-kicker">Library</div><h2 class="series-title"><a href="/recipes/index.html">Recipe Library</a></h2></section>${subscription()}${footer()}`;
  await writeFile(join(root, 'index.html'), shell('Helen Mulder OT', 'Neuro-Metabolic Rehabilitation for Cognitive Decline', body));
}

async function buildImmuneDrainSeries() {
  const cards = articles.map((article) => `<article class="article-item"><h3><a href="/${article.slug}/published_article.html">${escapeHtml(article.title)}</a></h3><p>${escapeHtml(article.description)}</p><div class="meta">Published ${article.published} &#183; Updated ${article.updated}</div></article>`).join('');
  const body = `<header class="site-header"><div class="title-row"><h1>Helen Mulder OT</h1><a href="/">Back to Home</a></div><p>Neuro-Metabolic Rehabilitation for Cognitive Decline</p></header><main><div class="series-kicker">Series</div><h1>Immune Drain Series</h1>${cards}</main>${subscription()}${footer()}`;
  await writeFile(join(root, 'series', 'immune-drain', 'index.html'), shell('Immune Drain Series', 'Practical articles on reducing chronic burdens in dementia care.', body));
}

async function buildArticle(article) {
  const main = await readFile(join(root, article.source), 'utf8');
  const citations = [];
  const mainHtml = renderMarkdown(main, citations, article.slug === 'gum_disease_alzheimers_link', article.slug === 'immune-drain');
  const references = citations.length ? `<section class="references"><h2>References</h2><ol>${citations.map((cite, index) => `<li id="reference-${index + 1}"><a href="${cite.href}">${escapeHtml(cite.label)}</a></li>`).join('')}</ol></section>` : '';
  const body = `<header class="site-header"><div class="title-row"><h1>Helen Mulder OT</h1><a href="/">Back to Home</a></div><p>Neuro-Metabolic Rehabilitation for Cognitive Decline &#183; <a href="/series/immune-drain/index.html">Immune Drain Series</a></p><div class="micro-meta">Published ${article.published} &#183; Updated ${article.updated}</div></header><main><h1>${escapeHtml(article.title)}</h1>${mainHtml}${seriesNavigation(article.slug)}${references}</main>${subscription()}${footer()}`;
  await writeFile(join(root, article.slug, 'published_article.html'), shell(article.title, article.description, body));
}

async function redirect(folder, destination) {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${destination}"><link rel="canonical" href="${destination}"><title>Redirecting…</title></head><body><p><a href="${destination}">Continue to article</a></p></body></html>`;
  await writeFile(join(root, folder, 'index.html'), page);
  await writeFile(join(root, folder, 'published_article.html'), page);
}

async function redirectIndex(folder, destination) {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${destination}"><link rel="canonical" href="${destination}"><title>Redirecting…</title></head><body><p><a href="${destination}">Continue to article</a></p></body></html>`;
  await writeFile(join(root, folder, 'index.html'), page);
}

async function updateExistingHtml(directory = root) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'assets') await updateExistingHtml(path);
    if (entry.isFile() && entry.name.endsWith('.html') && !articles.some((article) => path === join(root, article.slug, 'published_article.html'))) {
      const original = await readFile(path, 'utf8');
      let updated = decode(original).replace(/<style>[\s\S]*?<\/style>/i, '<link rel="stylesheet" href="/assets/site.css">');
      if (!updated.includes('name="viewport"')) updated = updated.replace(/<head>/i, '<head><meta name="viewport" content="width=device-width, initial-scale=1">');
      updated = updated.replace(/<meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">/i, '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
      if (updated !== original) await writeFile(path, updated);
    }
  }
}

async function main() {
  for (const article of articles) await buildArticle(article);
  await buildHome();
  await buildImmuneDrainSeries();
  await redirectIndex('healthy-gut-healthy-brain', '/healthy-gut-healthy-brain/published_article.html');
  await redirectIndex('gum_disease_alzheimers_link', '/gum_disease_alzheimers_link/published_article.html');
  await redirect('constipation-prevention-dementia', '/healthy-gut-healthy-brain/published_article.html');
  await redirect('oral_hygiene_dementia', '/gum_disease_alzheimers_link/published_article.html');
  await updateExistingHtml();
  console.log('Built site.');
}

await main();
