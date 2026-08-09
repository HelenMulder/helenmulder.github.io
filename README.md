# Helen Mulder website

## Editing an article

Edit the Markdown file in the article's folder, then run:

```powershell
node build.mjs
```

The generated HTML is committed to this repository for GitHub Pages. Do not edit `published_article.html` directly; it is rebuilt from Markdown.

When a source is a citation, make it a normal Markdown link. The build converts links to scholarly sources into compact linked superscript reference numbers and adds the numbered source list automatically.

## Publishing

After checking the generated changes, commit and push the repository's `main` branch. GitHub Pages publishes the update automatically.
