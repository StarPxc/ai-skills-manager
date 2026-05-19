const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

const SETTINGS_PATH = path.join(os.homedir(), '.ai-skills-manager.json');

let customSkillsDir = null;
let apiKey = '';

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      customSkillsDir = data.skillsDir || null;
      apiKey = data.apiKey || '';
    }
  } catch {
    customSkillsDir = null;
    apiKey = '';
  }
}

function saveSettings() {
  try {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    console.log('[skillsManager] saving settings:', { skillsDir: customSkillsDir, apiKey });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ skillsDir: customSkillsDir, apiKey }, null, 2));
  } catch (err) {
    console.error('[skillsManager] saveSettings failed:', err.message);
  }
}

loadSettings();

function getDefaultSkillsDirectory() {
  return path.join(os.homedir(), '.claude', 'skills');
}

function getDisabledSkillsDirectory() {
  const base = getSkillsDirectory();
  return path.join(path.dirname(base), 'skills_disabled');
}

function getSkillsDirectory() {
  if (customSkillsDir && fs.existsSync(customSkillsDir)) {
    return customSkillsDir;
  }
  return getDefaultSkillsDirectory();
}

function setSkillsDirectory(newPath) {
  customSkillsDir = newPath;
  saveSettings();
}

function ensureSkillsDirectory() {
  const dir = getSkillsDirectory();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Parse YAML frontmatter from SKILL.md
function parseFrontmatter(mdContent) {
  const lines = mdContent.split('\n');
  if (lines[0] && lines[0].trim() === '---') {
    const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (endIdx > 0) {
      const frontmatterLines = lines.slice(1, endIdx);
      const fm = {};
      let currentKey = null;
      let currentObj = null;
      let currentArray = null;

      for (const line of frontmatterLines) {
        // Empty line
        if (line.trim() === '') continue;

        const indent = line.match(/^(\s*)/)[0].length;

        if (indent === 0) {
          currentObj = null;
          currentArray = null;
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            currentKey = line.substring(0, colonIdx).trim();
            const value = line.substring(colonIdx + 1).trim();

            if (value === '') {
              // Next lines might be nested object or array
              currentObj = {};
              currentArray = null;
              fm[currentKey] = currentObj;
            } else if (value.startsWith('- ')) {
              currentArray = [value.substring(2).trim()];
              fm[currentKey] = currentArray;
              currentObj = null;
            } else {
              fm[currentKey] = stripQuotes(value);
              currentObj = null;
              currentArray = null;
            }
          }
        } else if (indent > 0 && currentObj !== null) {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const subKey = line.substring(0, colonIdx).trim();
            const subValue = line.substring(colonIdx + 1).trim();
            currentObj[subKey] = stripQuotes(subValue);
          }
        } else if (indent > 0 && currentArray !== null) {
          const trimmed = line.trim();
          if (trimmed.startsWith('- ')) {
            currentArray.push(trimmed.substring(2).trim());
          }
        }
      }

      const bodyContent = lines.slice(endIdx + 1).join('\n').trim();

      return { frontmatter: fm, content: bodyContent };
    }
  }

  return { frontmatter: {}, content: mdContent.trim() };
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function buildFrontmatter(skillData) {
  const lines = ['---'];
  lines.push(`name: ${skillData.name}`);

  if (skillData.description) {
    const desc = skillData.description.replace(/\n/g, ' ');
    lines.push(`description: ${desc}`);
  }

  if (skillData.author) {
    lines.push('');
    lines.push('metadata:');
    if (skillData.author) lines.push(`  skillhub.creator: "${skillData.author}"`);
    if (skillData.version) lines.push(`  skillhub.version: "${skillData.version}"`);
  }

  lines.push('---');
  return lines.join('\n');
}

function findSkillMd(skillFolderPath) {
  const upperPath = path.join(skillFolderPath, 'SKILL.md');
  if (fs.existsSync(upperPath)) return upperPath;
  const lowerPath = path.join(skillFolderPath, 'skill.md');
  if (fs.existsSync(lowerPath)) return lowerPath;
  return null;
}

function readSkillInfo(skillFolderPath) {
  const skillMdPath = findSkillMd(skillFolderPath);
  const dirName = path.basename(skillFolderPath);

  if (!skillMdPath) {
    return {
      name: dirName,
      displayName: dirName,
      description: '',
      version: '',
      author: '',
      content: '',
      path: skillFolderPath,
    };
  }

  const mdContent = fs.readFileSync(skillMdPath, 'utf-8');
  const { frontmatter, content } = parseFrontmatter(mdContent);

  const zhPath = path.join(skillFolderPath, 'SKILL.zh-CN.md');
  const hasTranslation = fs.existsSync(zhPath);

  return {
    name: dirName,
    displayName: frontmatter.name || dirName,
    description: frontmatter.description || '',
    version: (frontmatter.metadata && frontmatter.metadata['skillhub.version']) || '',
    author: (frontmatter.metadata && frontmatter.metadata['skillhub.creator']) || '',
    content: content,
    path: skillFolderPath,
    hasTranslation,
  };
}

function scanSkillDir(dir, defaultEnabled) {
  const skills = [];

  if (!fs.existsSync(dir)) return skills;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const skillPath = path.join(dir, entry.name);
    const skillMdPath = findSkillMd(skillPath);
    if (!skillMdPath) continue;

    const skillData = readSkillInfo(skillPath);
    skillData.path = skillPath;
    skillData.enabled = defaultEnabled;

    const stat = fs.statSync(skillPath);
    skillData.installedAt = stat.birthtime.toISOString();

    skills.push(skillData);
  }

  return skills;
}

async function loadSkills() {
  const skills = [];
  const activeDir = getSkillsDirectory();
  const disabledDir = getDisabledSkillsDirectory();

  try {
    skills.push(...scanSkillDir(activeDir, true));
    skills.push(...scanSkillDir(disabledDir, false));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  return skills;
}

async function saveSkill(skillData) {
  const dir = ensureSkillsDirectory();
  const skillDir = path.join(dir, skillData.name);

  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }

  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const lowerMdPath = path.join(skillDir, 'skill.md');

  // Read existing content from either case
  let existingBody = '';
  const existingPath = findSkillMd(skillDir);
  if (existingPath && !skillData.content) {
    const existingMd = fs.readFileSync(existingPath, 'utf-8');
    const parsed = parseFrontmatter(existingMd);
    existingBody = parsed.content;
  }

  const frontmatter = buildFrontmatter(skillData);
  const body = skillData.content || existingBody || `${skillData.description || ''}\n`;
  const fullContent = `${frontmatter}\n\n${body.replace(/^\n+/, '')}`;

  fs.writeFileSync(skillMdPath, fullContent + '\n');

  // Remove lowercase version if it exists as a separate file
  if (fs.existsSync(lowerMdPath) && lowerMdPath !== skillMdPath) {
    fs.unlinkSync(lowerMdPath);
  }
}

function generateDefaultSkillMd(skillData) {
  const frontmatter = buildFrontmatter(skillData);
  const body = skillData.content || `${skillData.description || ''}\n`;
  return `${frontmatter}\n\n${body}`;
}

async function deleteSkill(skillName) {
  const activePath = path.join(getSkillsDirectory(), skillName);
  const disabledPath = path.join(getDisabledSkillsDirectory(), skillName);

  if (fs.existsSync(activePath)) {
    fs.rmSync(activePath, { recursive: true, force: true });
    return;
  }

  if (fs.existsSync(disabledPath)) {
    fs.rmSync(disabledPath, { recursive: true, force: true });
    return;
  }

  throw new Error(`技能 "${skillName}" 不存在`);
}

async function toggleSkill(skillName, enabled) {
  const activeDir = getSkillsDirectory();
  const disabledDir = getDisabledSkillsDirectory();
  const activePath = path.join(activeDir, skillName);
  const disabledPath = path.join(disabledDir, skillName);

  if (enabled) {
    if (!fs.existsSync(disabledPath)) {
      throw new Error(`已禁用的技能 "${skillName}" 不存在`);
    }
    if (!fs.existsSync(activeDir)) {
      fs.mkdirSync(activeDir, { recursive: true });
    }
    fs.renameSync(disabledPath, activePath);
  } else {
    if (!fs.existsSync(activePath)) {
      throw new Error(`技能 "${skillName}" 不存在`);
    }
    if (!fs.existsSync(disabledDir)) {
      fs.mkdirSync(disabledDir, { recursive: true });
    }
    fs.renameSync(activePath, disabledPath);
  }
}

async function installFromZip(zipPath) {
  if (!fs.existsSync(zipPath)) {
    throw new Error('文件不存在');
  }

  let zip;
  try {
    zip = new AdmZip(zipPath);
  } catch {
    throw new Error('无法读取 ZIP 文件，文件可能已损坏');
  }

  const entries = zip.getEntries();
  if (entries.length === 0) {
    throw new Error('ZIP 文件为空');
  }

  let rootDir = '';
  const firstEntry = entries[0];
  const firstParts = firstEntry.entryName.split('/').filter(Boolean);
  if (firstParts.length > 0) {
    rootDir = firstParts[0] + '/';
  }

  const sameRoot = entries.every((e) => {
    const parts = e.entryName.split('/').filter(Boolean);
    return parts.length === 0 || parts[0] === firstParts[0];
  });

  if (!sameRoot) {
    rootDir = '';
  }

  const hasSkillMd = entries.some(
    (e) => e.entryName.toLowerCase().endsWith('skill.md')
  );

  if (!hasSkillMd) {
    throw new Error(
      '无效的技能包：未找到 SKILL.md 文件。\n请确保压缩包符合 Claude 技能规范。'
    );
  }

  // Extract skill name from frontmatter or directory
  let skillName = rootDir.replace(/\/$/, '');
  if (!skillName) {
    const skillMdEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('skill.md'));
    if (skillMdEntry) {
      const content = skillMdEntry.getData().toString('utf-8');
      const parsed = parseFrontmatter(content);
      skillName = parsed.frontmatter.name;
    }
  }
  if (!skillName) {
    skillName = path.basename(zipPath, '.zip');
  }

  skillName = skillName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').trim();
  if (!skillName) {
    skillName = 'unnamed-skill';
  }

  const dir = ensureSkillsDirectory();
  const destDir = path.join(dir, skillName);

  if (fs.existsSync(destDir)) {
    const existingEntries = fs.readdirSync(destDir).length;
    if (existingEntries > 0) {
      throw new Error(`技能 "${skillName}" 已存在，请先删除旧版本再安装`);
    }
  }

  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    let relativePath = entry.entryName;
    if (rootDir) {
      relativePath = relativePath.replace(rootDir, '');
    }
    if (!relativePath) continue;

    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const targetPath = path.join(destDir, normalized);

    if (!targetPath.startsWith(destDir)) {
      continue;
    }

    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetPath, entry.getData());
  }

  return skillName;
}

function getApiKey() {
  return apiKey;
}

function setApiKey(key) {
  apiKey = key || '';
  saveSettings();
}

function loadTranslation(skillName) {
  const dir = getSkillsDirectory();
  let skillDir = path.join(dir, skillName);
  if (!fs.existsSync(skillDir)) {
    const disabledDir = getDisabledSkillsDirectory();
    skillDir = path.join(disabledDir, skillName);
  }
  const zhPath = path.join(skillDir, 'SKILL.zh-CN.md');
  if (fs.existsSync(zhPath)) {
    return fs.readFileSync(zhPath, 'utf-8');
  }
  return null;
}

function saveTranslation(skillName, translated) {
  const activeDir = getSkillsDirectory();
  const disabledDir = getDisabledSkillsDirectory();
  const activePath = path.join(activeDir, skillName);
  const disabledPath = path.join(disabledDir, skillName);

  let skillDir;
  if (fs.existsSync(activePath)) {
    skillDir = activePath;
  } else if (fs.existsSync(disabledPath)) {
    skillDir = disabledPath;
  } else {
    throw new Error(`技能 "${skillName}" 目录不存在`);
  }

  const zhPath = path.join(skillDir, 'SKILL.zh-CN.md');
  fs.writeFileSync(zhPath, translated + '\n');
}

module.exports = {
  loadSkills,
  saveSkill,
  deleteSkill,
  toggleSkill,
  installFromZip,
  readSkillInfo,
  getSkillsDirectory,
  setSkillsDirectory,
  getDefaultSkillsDirectory,
  ensureSkillsDirectory,
  parseFrontmatter,
  buildFrontmatter,
  getApiKey,
  setApiKey,
  loadTranslation,
  saveTranslation,
};
