import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const scholarlyHosts = new Set([
  'pubmed.ncbi.nlm.nih.gov', 'pmc.ncbi.nlm.nih.gov', 'www.science.org',
  'science.org', 'alz-journals.onlinelibrary.wiley.com', 'pubs.acs.org', 'doi.org',
]);

const referenceTitles = new Map([
  ['https://pubmed.ncbi.nlm.nih.gov/37775319/', 'Association Between Bowel Movement Pattern and Cognitive Function: Prospective Cohort Study and a Metagenomic Analysis of the Gut Microbiome'],
  ['https://alz-journals.onlinelibrary.wiley.com/doi/10.1002/alz.072046', 'Association between regular laxative use and incident dementia in UK Biobank participants'],
  ['https://pubmed.ncbi.nlm.nih.gov/2338272/', 'Effect of coffee on distal colon function'],
  ['https://pubmed.ncbi.nlm.nih.gov/35971232/', 'Prune Juice Containing Sorbitol, Pectin, and Polyphenol Ameliorates Subjective Complaints and Hard Feces While Normalizing Stool in Chronic Constipation: A Randomized Placebo-Controlled Trial'],
  ['https://pubmed.ncbi.nlm.nih.gov/41889721/', 'Effects of low-dose medium-chain triglycerides on bowel habit outcomes in Japanese adults prone to constipation: a randomized, double-blind, LCT-controlled crossover trial'],
  ['https://pubmed.ncbi.nlm.nih.gov/474479/', 'The effect of raw carrot on serum lipids and colon function'],
  ['https://pubmed.ncbi.nlm.nih.gov/39757154/', 'Daily sodium intake and constipation in US adult males: an uncommon negative association revealed by national health and nutrition examination survey data from the United States (2005-2010)'],
  ['https://pubs.acs.org/doi/10.1021/acs.jproteome.1c00435', 'Fecal Metabolomics and Network Pharmacology Reveal the Correlations between Constipation and Depression'],
  ['https://pubmed.ncbi.nlm.nih.gov/37905980/', 'Systematic review and meta-analysis: Foods, drinks and diets and their effect on chronic constipation in adults'],
  ['https://pubmed.ncbi.nlm.nih.gov/39531948/', 'Effectiveness of abdominal massage on chronic constipation in adults: A systematic review and meta-analysis'],
  ['https://www.science.org/doi/10.1126/sciadv.aau3333', 'Porphyromonas gingivalis in Alzheimer’s disease brains: Evidence for disease causation and treatment with small-molecule inhibitors'],
  ['https://pubmed.ncbi.nlm.nih.gov/30931751/', 'A Systematic Review Examining the Oral Health Status of Persons with Dementia'],
  ['https://pubmed.ncbi.nlm.nih.gov/29386812/', 'The effect of sodium bicarbonate oral rinse on salivary pH and oral microflora: A prospective cohort study'],
  ['https://pubmed.ncbi.nlm.nih.gov/2736577/', 'Effect of eating cheese on Ca and P concentrations of whole mouth saliva and plaque'],
  ['https://pubmed.ncbi.nlm.nih.gov/41630631/', 'Urinary tract infection-related delirium in Alzheimer’s disease and related dementias'],
  ['https://pmc.ncbi.nlm.nih.gov/articles/PMC2140087/', 'Detection of Intracellular Bacterial Communities in Human Urinary Tract Infection'],
  ['https://pubmed.ncbi.nlm.nih.gov/32497610/', 'D-mannose vs other agents for recurrent urinary tract infection prevention in adult women'],
  ['https://pubmed.ncbi.nlm.nih.gov/41004704/', 'Efficacy of D-mannose as prophylaxis of recurrent urinary tract infection'],
  ['https://pubmed.ncbi.nlm.nih.gov/25861985/', 'Human Urinary Composition Controls Antibacterial Activity of Siderocalin'],
  ['https://pmc.ncbi.nlm.nih.gov/articles/PMC11277208/', 'Effects of pH on the Pathogenicity of Escherichia coli and Klebsiella pneumoniae on the Kidney: In Vitro and In Vivo Studies'],
  ['https://pubmed.ncbi.nlm.nih.gov/28975365/', 'Effects of urine alkalinization with sodium bicarbonate orally on lower urinary tract symptoms in female patients: a pilot study'],
  ['https://pubmed.ncbi.nlm.nih.gov/24333321/', 'Water-loss dehydration and aging'],
  ['https://pubmed.ncbi.nlm.nih.gov/30285042/', 'Effect of Increased Daily Water Intake in Premenopausal Women With Recurrent Urinary Tract Infections: A Randomized Clinical Trial'],
  ['https://pubmed.ncbi.nlm.nih.gov/17699358/', 'Comparative value of orange juice versus lemonade in reducing stone-forming risk'],
  ['https://doi.org/10.1590/s1677-55382011000100003', 'Constipation and LUTS: how do they affect each other?'],
  ['https://pubmed.ncbi.nlm.nih.gov/35783147/', 'Inflammation From Peripheral Organs to the Brain'],
  ['https://doi.org/10.1038/nature01321', 'The inflammatory reflex'],
  ['https://pubmed.ncbi.nlm.nih.gov/12754353/', 'Systemic infection, interleukin 1beta, and cognitive decline in Alzheimer’s disease'],
  ['https://pubmed.ncbi.nlm.nih.gov/34080771/', 'Acute systemic inflammation exacerbates neuroinflammation in Alzheimer’s disease'],
  ['https://doi.org/10.3389/fnagi.2019.00122', 'Infection-Induced Systemic Inflammation Is a Potential Driver of Alzheimer’s Disease Progression'],
  ['https://pubmed.ncbi.nlm.nih.gov/19414723/', 'Delirium accelerates cognitive decline in Alzheimer disease'],
  ['https://pubmed.ncbi.nlm.nih.gov/20209079/', 'The Alzheimer’s disease-associated amyloid beta-protein is an antimicrobial peptide'],
  ['https://doi.org/10.1016/j.cell.2010.01.022', 'Nonresolving inflammation'],
  ['https://pubmed.ncbi.nlm.nih.gov/32709961/', 'Brain energy rescue: an emerging therapeutic concept for neurodegenerative disorders of ageing'],
  ['https://doi.org/10.3389/fimmu.2020.00493', 'Metabolic reprogramming of microglia in the regulation of the innate inflammatory response'],
  ['https://doi.org/10.1016/j.freeradbiomed.2016.04.200', 'Energy metabolism and inflammation in brain aging and Alzheimer’s disease'],
  ['https://doi.org/10.1093/brain/awab094', 'Systemic infection exacerbates cerebrovascular dysfunction in Alzheimer’s disease'],
  ['https://pmc.ncbi.nlm.nih.gov/articles/PMC5488663/', 'Biphasic response as a mechanism against mutant takeover in tissue homeostasis circuits'],
]);

const articles = [
  {
    slug: 'healthy-gut-healthy-brain',
    source: 'articles/constipation-prevention-for-dementia.md',
    title: 'Constipation Prevention for Dementia',
    description: 'Dementia-friendly strategies for bowel regularity.',
    published: '2026-06-02',
    updated: '2026-08-09',
  },
  {
    slug: 'gum_disease_alzheimers_link',
    source: 'articles/oral-health-for-dementia.md',
    title: 'Oral Health for Dementia - Beyond Brushing',
    description: 'Maintaining a tolerable oral health routine for dementia.',
    published: '2026-01-01',
    updated: '2026-08-09',
  },
  {
    slug: 'immune-drain',
    source: 'articles/immune-drain.md',
    title: 'Immune Drain',
    description: 'How recurring infections and chronic local inflammation can burden an already stressed system.',
    published: '2026-08-09',
    updated: '2026-08-09',
  },
  {
    slug: 'uti-prevention-for-dementia',
    source: 'articles/uti-prevention-for-dementia.md',
    title: 'UTI Prevention for Dementia',
    description: 'Practical strategies to reduce urinary tract infection risk in dementia care.',
    published: '2026-08-09',
    updated: '2026-08-09',
  },
];

const unlistedPages = [
  {
    slug: 'restoring-neuro-metabolism-in-dementia',
    source: 'drafts/restoring-neuro-metabolism-in-dementia.md',
    title: 'Restoring Neuro-Metabolism in Dementia',
    description: 'An article in development.',
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
      const citationKey = href.split('#')[0];
      let reference = citations.find((item) => item.href === href);
      if (!reference) {
        reference = { href, label: referenceTitles.get(citationKey) || decode(label) };
        citations.push(reference);
      }
      return `<sup class="citation"><a href="${href}" aria-label="Citation ${citations.indexOf(reference) + 1}">${citations.indexOf(reference) + 1}</a></sup>`;
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

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) {
      const nextLine = lines.slice(index + 1).find((candidate) => candidate.trim());
      if (listType && nextLine && /^([-*]|\d+\.)\s+/.test(nextLine.trim())) continue;
      flushParagraph(); closeList(); continue;
    }
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
  return `<footer class="site-footer"><div><strong>Helen Mulder OT</strong></div><div class="small">Helen Mulder is an Occupational Therapist applying Neuro-Metabolic Rehabilitation to address cognitive decline.</div><div class="small">Contact: <a href="mailto:helenjmulder@gmail.com">helenjmulder@gmail.com</a></div><div class="small"><a href="/">Home</a> &#183; <a href="/recipes/index.html">Recipe Library</a> &#183; <a href="/immune-drain/published_article.html">Immune Drain</a></div></footer>`;
}

function seriesNavigation(currentSlug) {
  const master = { title: 'Immune Drain', slug: 'immune-drain' };
  const guides = [
    { title: 'Constipation Prevention for Dementia', slug: 'healthy-gut-healthy-brain' },
    { title: 'Oral Health for Dementia', slug: 'gum_disease_alzheimers_link' },
    { title: 'UTI Prevention for Dementia', slug: 'uti-prevention-for-dementia' },
  ];
  const link = (route, className = '') => `<a class="${className}" href="/${route.slug}/published_article.html"${route.slug === currentSlug ? ' aria-current="page"' : ''}>${escapeHtml(route.title)}</a>`;
  return `<section class="series-nav" aria-label="Immune Drain Series"><div class="series-kicker">Part of the series</div><h2>Immune Drain</h2><div class="series-track"><div class="series-master">${link(master, 'series-master-link')}</div><div class="series-guides"><div class="series-nav-label">Care guides</div><ul>${guides.map((guide) => `<li>${link(guide, 'series-guide-link')}</li>`).join('')}</ul></div></div></section>`;
}

function shell(title, description, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} | Helen Mulder OT</title><meta name="description" content="${escapeHtml(description)}"><link rel="stylesheet" href="/assets/site.css"></head><body>${body}</body></html>`;
}

async function buildHome() {
  const master = articles.find((article) => article.slug === 'immune-drain');
  const guides = articles.filter((article) => article.slug !== 'immune-drain');
  const feature = `<article class="home-series-master"><h2><a href="/${master.slug}/published_article.html">${escapeHtml(master.title)}</a></h2><p>${escapeHtml(master.description)}</p><div class="meta">Published ${master.published} &#183; Updated ${master.updated}</div></article>`;
  const cards = guides.map((article) => `<article class="home-series-guide"><h3><a href="/${article.slug}/published_article.html">${escapeHtml(article.title)}</a></h3><p>${escapeHtml(article.description)}</p><div class="meta">Published ${article.published} &#183; Updated ${article.updated}</div></article>`).join('');
  const body = `<header class="hero"><h1>Helen Mulder OT</h1><p class="tagline">Neuro-Metabolic Rehabilitation for Cognitive Decline</p></header><section class="home-series" aria-label="Immune Drain series"><div class="series-kicker">Series</div><div class="series-track">${feature}<div class="series-guides"><div class="series-nav-label">Care guides</div>${cards}</div></div></section><section class="series-panel library-panel"><h2 class="series-title"><a href="/recipes/index.html">Recipe Library</a></h2></section>${subscription()}${footer()}`;
  await writeFile(join(root, 'index.html'), shell('Helen Mulder OT', 'Neuro-Metabolic Rehabilitation for Cognitive Decline', body));
}

async function buildArticle(article) {
  const main = await readFile(join(root, article.source), 'utf8');
  const citations = [];
  const mainHtml = renderMarkdown(main, citations, article.slug === 'gum_disease_alzheimers_link', article.slug === 'immune-drain');
  const references = citations.length ? `<section class="references"><h2>References</h2><ol>${citations.map((cite, index) => `<li id="reference-${index + 1}"><a href="${cite.href}">${escapeHtml(cite.label)}</a></li>`).join('')}</ol></section>` : '';
  const body = `<header class="site-header"><div class="title-row"><h1>Helen Mulder OT</h1><a href="/">Back to Home</a></div><p>Neuro-Metabolic Rehabilitation for Cognitive Decline</p><div class="micro-meta">Published ${article.published} &#183; Updated ${article.updated}</div></header><main><h1>${escapeHtml(article.title)}</h1>${mainHtml}${seriesNavigation(article.slug)}${references}</main>${subscription()}${footer()}`;
  await writeFile(join(root, article.slug, 'published_article.html'), shell(article.title, article.description, body));
}

async function buildUnlistedPage(page) {
  const main = await readFile(join(root, page.source), 'utf8');
  const citations = [];
  const mainHtml = renderMarkdown(main, citations);
  const references = citations.length ? `<section class="references"><h2>References</h2><ol>${citations.map((cite, index) => `<li id="reference-${index + 1}"><a href="${cite.href}">${escapeHtml(cite.label)}</a></li>`).join('')}</ol></section>` : '';
  const body = `<header class="site-header"><div class="title-row"><h1>Helen Mulder OT</h1><a href="/">Back to Home</a></div><p>Neuro-Metabolic Rehabilitation for Cognitive Decline</p></header><main><h1>${escapeHtml(page.title)}</h1>${mainHtml}${references}</main>${subscription()}${footer()}`;
  await mkdir(join(root, page.slug), { recursive: true });
  await writeFile(join(root, page.slug, 'published_article.html'), shell(page.title, page.description, body));
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
      updated = updated.replaceAll('<a href="/series/immune-drain/index.html">Immune Drain</a>', '<a href="/immune-drain/published_article.html">Immune Drain</a>');
      updated = updated.replaceAll(' · <a href="/series/signal-safety/index.html">Signal Safety</a>', '');
      if (!updated.includes('name="viewport"')) updated = updated.replace(/<head>/i, '<head><meta name="viewport" content="width=device-width, initial-scale=1">');
      updated = updated.replace(/<meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">/i, '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
      if (updated !== original) await writeFile(path, updated);
    }
  }
}

async function main() {
  for (const article of articles) await buildArticle(article);
  for (const page of unlistedPages) await buildUnlistedPage(page);
  await buildHome();
  await redirectIndex('healthy-gut-healthy-brain', '/healthy-gut-healthy-brain/published_article.html');
  await redirectIndex('gum_disease_alzheimers_link', '/gum_disease_alzheimers_link/published_article.html');
  await redirect('constipation-prevention-dementia', '/healthy-gut-healthy-brain/published_article.html');
  await redirect('oral_hygiene_dementia', '/gum_disease_alzheimers_link/published_article.html');
  await redirectIndex('series/signal-safety', '/');
  await updateExistingHtml();
  console.log('Built site.');
}

await main();
