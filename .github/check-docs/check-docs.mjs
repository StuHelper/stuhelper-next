import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import GithubSlugger from 'github-slugger';
import picomatch from 'picomatch';
import { parse as parseYaml } from 'yaml';

const markdown = new MarkdownIt();
const categories = new Set(['design', 'spec', 'development', 'guide', 'adr']);
const statuses = new Set(['Draft', 'InReview', 'Accepted', 'Rejected', 'Deprecated', 'Superseded', 'Archived']);
const placeholder = /YYYY-MM-DD|\{\{[^{}\n]+\}\}|<待填写>|\bTODO\s*[:：]/u;
const posix = (value) => value.split(path.sep).join('/');

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function filesIn(root) {
  const config = parseYaml(fs.readFileSync(path.join(root, '.markdownlint-cli2.yaml'), 'utf8'));
  for (const key of ['globs', 'ignores']) {
    if (!Array.isArray(config[key]) || config[key].some((item) => typeof item !== 'string' || !item)) {
      throw new Error(`${key} must contain path patterns`);
    }
  }
  const includes = picomatch(config.globs.filter((item) => !item.startsWith('!')), { dot: true });
  const excludes = picomatch([...config.ignores, ...config.globs.filter((item) => item.startsWith('!')).map((item) => item.slice(1))], { dot: true });
  const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    const relative = posix(path.relative(root, target));
    if (entry.isSymbolicLink() || excludes(relative) || excludes(relative + '/')) return [];
    if (entry.isDirectory()) return walk(target);
    return entry.isFile() && includes(relative) ? [target] : [];
  });
  return walk(root).sort();
}

// Match Python-Markdown toc.slugify_unicode and its unique-ID suffixes.
export function siteSlug(text, anchors) {
  let value = text.replace(/[^\p{L}\p{N}_\s-]/gu, '').trim().toLowerCase().replace(/[-\s]+/gu, '-');
  while (!value || anchors.has(value)) {
    const suffix = value.match(/^(.*)_([0-9]+)$/u);
    value = suffix ? `${suffix[1]}_${Number(suffix[2]) + 1}` : `${value}_1`;
  }
  return value;
}

function parsedFile(file, siteDocument) {
  const source = fs.readFileSync(file, 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const body = frontmatter ? source.slice(frontmatter[0].length) : source;
  const tokens = markdown.parse(body, {});
  const slugger = new GithubSlugger();
  const anchors = new Set();
  const githubAnchors = new Set();
  const links = [];
  const prose = [];
  tokens.forEach((token, index) => {
    if (token.type === 'heading_open') {
      const text = (tokens[index + 1]?.children ?? [])
        .filter((child) => ['text', 'code_inline', 'image'].includes(child.type))
        .map((child) => child.content).join('');
      const githubAnchor = slugger.slug(text);
      githubAnchors.add(githubAnchor);
      anchors.add(siteDocument ? siteSlug(text, anchors) : githubAnchor);
    }
    for (const child of token.children ?? []) {
      if (child.type === 'link_open') links.push(child.attrGet('href'));
      if (child.type === 'image') links.push(child.attrGet('src'));
      if (child.type === 'text') prose.push(child.content);
    }
  });
  return { frontmatter, anchors, githubAnchors, links, prose };
}

export function checkDocs(directory) {
  const root = fs.realpathSync(directory);
  const errors = [];
  const cache = new Map();
  const read = (file) => {
    if (!cache.has(file)) cache.set(file, parsedFile(file, posix(path.relative(root, file)).startsWith('docs/')));
    return cache.get(file);
  };
  const files = filesIn(root);
  const glossary = path.join(root, 'docs/spec/terminology.md');
  const aliases = fs.existsSync(glossary) ? fs.readFileSync(glossary, 'utf8').split('\n').filter(line => line.startsWith('|')).flatMap(line => {
    const cells = line.split('|').map(cell => cell.trim());
    return cells.length === 7 && !['替代表述', '---', '—'].includes(cells[5]) ? cells[5].split('、').map(alias => [alias, cells[1]]) : [];
  }) : [['有效学生资格', '有效校园资格'], ['学生认证通过', '具备有效校园资格']];
  const siteFile = path.join(root, 'mkdocs.yml');
  const siteConfig = fs.existsSync(siteFile) ? fs.readFileSync(siteFile, 'utf8') : '';
  const repository = siteConfig.match(/^repo_url:\s*(https:\/\/github\.com\/[^\s]+)\s*$/m)?.[1];

  for (const file of files) {
    const relative = posix(path.relative(root, file));
    const report = (message) => errors.push(`${relative}: ${message}`);
    const parsed = read(file);
    const template = path.basename(file) === 'TEMPLATE.md';
    if (relative.startsWith('docs/')) {
      if (!parsed.frontmatter) {
        report('missing frontmatter');
      } else {
        try {
          const data = parseYaml(parsed.frontmatter[1]);
          const parts = relative.split('/');
          const allowedTypes = parts.length === 2 ? ['index'] : categories.has(parts[1]) ? [parts[1]] : [];
          if (!data || typeof data.type !== 'string' || !allowedTypes.includes(data.type)) report('type does not match document location');
          if (!statuses.has(data?.status)) report('invalid document status');
          const date = data?.updated;
          const valid = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
            && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
          if (!valid && !(template && date === 'YYYY-MM-DD')) report('invalid updated date');
        } catch {
          report('invalid YAML metadata');
        }
      }
      if (!template && parsed.prose.some((text) => placeholder.test(text))) report('unfilled prose placeholder');
    }
    if (file !== glossary) for (const [alias, canonical] of aliases) {
      if (parsed.prose.some(text => text.includes(alias))) report(`use standard term "${canonical}" instead of "${alias}"`);
    }
    for (let href of parsed.links) {
      let github = false;
      if (repository && href?.startsWith(`${repository}/blob/develop/`)) {
        const url = new URL(href);
        const relativeTarget = url.pathname.split('/blob/develop/')[1];
        href = posix(path.relative(path.dirname(file), path.join(root, relativeTarget))) + url.search + url.hash;
        github = true;
      }
      if (!href || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) continue;
      try {
        const hash = href.indexOf('#');
        const fragment = hash < 0 ? '' : decodeURIComponent(href.slice(hash + 1));
        const pathname = decodeURIComponent((hash < 0 ? href : href.slice(0, hash)).split('?')[0]);
        const target = pathname ? path.resolve(path.dirname(file), pathname) : file;
        if (!inside(root, target) || !fs.existsSync(target) || !inside(root, fs.realpathSync(target))) {
          report(`missing or external local target: ${href}`);
        } else if (fragment && /\.(?:md|markdown)$/i.test(target) && fs.statSync(target).isFile() && !(github ? read(target).githubAnchors : read(target).anchors).has(fragment)) {
          report(`missing heading anchor: ${href}`);
        }
      } catch {
        report(`invalid local link: ${href}`);
      }
    }
  }
  for (const category of categories) {
    const index = path.join(root, 'docs', category, 'README.md');
    if (!fs.existsSync(index)) continue;
    const listed = new Set(read(index).links.map(link => path.resolve(path.dirname(index), link.split('#')[0])));
    for (const file of files.filter(file => path.dirname(file) === path.dirname(index) && !['README.md', 'TEMPLATE.md'].includes(path.basename(file)))) {
      if (!listed.has(file)) errors.push(`${posix(path.relative(root, index))}: missing topic ${path.basename(file)}`);
    }
  }
  if (/^nav:/m.test(siteConfig)) {
    const navigation = new Set([...siteConfig.matchAll(/^\s*-\s+[^:\n]+:\s+([\w./-]+\.md)\s*$/gm)].map(match => match[1]));
    for (const file of files.filter(file => posix(path.relative(root, file)).startsWith('docs/'))) {
      const target = posix(path.relative(path.join(root, 'docs'), file));
      if (!navigation.has(target)) errors.push(`mkdocs.yml: missing navigation ${target}`);
    }
  }
  return { count: files.length, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = checkDocs(process.cwd());
    if (result.errors.length) {
      console.error(result.errors.join('\n'));
      process.exitCode = 1;
    } else {
      console.log(`PASS: documentation metadata and local links (${result.count} Markdown files)`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
