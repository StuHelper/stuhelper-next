import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import GithubSlugger from 'github-slugger';
import picomatch from 'picomatch';
import { parse as parseYaml } from 'yaml';

const markdown = new MarkdownIt();
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

function parsedFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const body = frontmatter ? source.slice(frontmatter[0].length) : source;
  const tokens = markdown.parse(body, {});
  const slugger = new GithubSlugger();
  const anchors = new Set();
  const links = [];
  const prose = [];
  tokens.forEach((token, index) => {
    if (token.type === 'heading_open') {
      const text = (tokens[index + 1]?.children ?? [])
        .filter((child) => ['text', 'code_inline', 'image'].includes(child.type))
        .map((child) => child.content).join('');
      anchors.add(slugger.slug(text));
    }
    for (const child of token.children ?? []) {
      if (child.type === 'link_open') links.push(child.attrGet('href'));
      if (child.type === 'image') links.push(child.attrGet('src'));
      if (child.type === 'text') prose.push(child.content);
    }
  });
  return { frontmatter, anchors, links, prose };
}

export function checkDocs(directory) {
  const root = fs.realpathSync(directory);
  const errors = [];
  const cache = new Map();
  const read = (file) => {
    if (!cache.has(file)) cache.set(file, parsedFile(file));
    return cache.get(file);
  };
  const files = filesIn(root);
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
          const allowedTypes = parts.length === 2 ? ['index'] : [parts[1], parts.at(-2)];
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
    for (const href of parsed.links) {
      if (!href || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) continue;
      try {
        const hash = href.indexOf('#');
        const fragment = hash < 0 ? '' : decodeURIComponent(href.slice(hash + 1));
        const pathname = decodeURIComponent((hash < 0 ? href : href.slice(0, hash)).split('?')[0]);
        const target = pathname ? path.resolve(path.dirname(file), pathname) : file;
        if (!inside(root, target) || !fs.existsSync(target) || !inside(root, fs.realpathSync(target))) {
          report(`missing or external local target: ${href}`);
        } else if (fragment && /\.(?:md|markdown)$/i.test(target) && fs.statSync(target).isFile() && !read(target).anchors.has(fragment)) {
          report(`missing heading anchor: ${href}`);
        }
      } catch {
        report(`invalid local link: ${href}`);
      }
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
