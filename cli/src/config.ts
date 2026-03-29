/**
 * CCConfig 核心配置管理模块
 *
 * 负责：
 * - 读写 ~/.ccfg/profiles.json
 * - 读写 ~/.claude/settings.json
 * - Profile 切换逻辑（只动 env 字段，其他保留）
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { CCFGConfig, ClaudeSettings, Profile, ProfileEnv } from './types.js';
import { DEFAULT_PRESETS } from './types.js';

/** 配置目录及文件路径 */
const CCFG_DIR = join(homedir(), '.ccfg');
const PROFILES_PATH = join(CCFG_DIR, 'profiles.json');
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json');

// ─── profiles.json 操作 ─────────────────────────────────────

/** 确保 ~/.ccfg 目录存在 */
async function ensureCCFGDir(): Promise<void> {
  if (!existsSync(CCFG_DIR)) {
    await mkdir(CCFG_DIR, { recursive: true });
  }
}

/** 读取 profiles.json，不存在则返回默认空配置 */
export async function loadProfiles(): Promise<CCFGConfig> {
  await ensureCCFGDir();

  if (!existsSync(PROFILES_PATH)) {
    const defaultConfig: CCFGConfig = {
      activeProfile: '',
      profiles: [],
      presets: DEFAULT_PRESETS,
    };
    await saveProfiles(defaultConfig);
    return defaultConfig;
  }

  const raw = await readFile(PROFILES_PATH, 'utf-8');
  return JSON.parse(raw) as CCFGConfig;
}

/** 写入 profiles.json */
export async function saveProfiles(config: CCFGConfig): Promise<void> {
  await ensureCCFGDir();
  await writeFile(PROFILES_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

// ─── settings.json 操作 ─────────────────────────────────────

/** 读取 Claude settings.json */
export async function loadSettings(): Promise<ClaudeSettings> {
  if (!existsSync(SETTINGS_PATH)) {
    return {};
  }
  const raw = await readFile(SETTINGS_PATH, 'utf-8');
  return JSON.parse(raw) as ClaudeSettings;
}

/** 写入 Claude settings.json（保留所有非 env 字段） */
export async function saveSettings(settings: ClaudeSettings): Promise<void> {
  if (!existsSync(CLAUDE_DIR)) {
    await mkdir(CLAUDE_DIR, { recursive: true });
  }
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

// ─── Profile CRUD ───────────────────────────────────────────

/** 获取当前激活的 Profile，返回 null 表示使用默认 Anthropic 官方配置 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const config = await loadProfiles();
  if (!config.activeProfile) return null;
  return config.profiles.find((p) => p.id === config.activeProfile) ?? null;
}

/** 判断当前是否为默认配置（无 activeProfile = Anthropic 官方） */
export async function isDefaultProfile(): Promise<boolean> {
  const config = await loadProfiles();
  return !config.activeProfile;
}

/** 根据 id 查找 Profile */
export async function findProfile(id: string): Promise<Profile | undefined> {
  const config = await loadProfiles();
  return config.profiles.find((p) => p.id === id);
}

/** 添加 Profile */
export async function addProfile(profile: Profile): Promise<void> {
  const config = await loadProfiles();
  const existing = config.profiles.findIndex((p) => p.id === profile.id);
  if (existing !== -1) {
    throw new Error(`Profile "${profile.id}" 已存在`);
  }
  config.profiles.push(profile);
  await saveProfiles(config);
}

/** 更新 Profile */
export async function updateProfile(profile: Profile): Promise<void> {
  const config = await loadProfiles();
  const idx = config.profiles.findIndex((p) => p.id === profile.id);
  if (idx === -1) {
    throw new Error(`Profile "${profile.id}" 不存在`);
  }
  config.profiles[idx] = profile;

  // 如果更新的是当前激活 Profile，需要同步 settings.json
  if (config.activeProfile === profile.id) {
    await applyProfile(profile);
  }

  await saveProfiles(config);
}

/** 删除 Profile */
export async function removeProfile(id: string): Promise<void> {
  const config = await loadProfiles();
  const idx = config.profiles.findIndex((p) => p.id === id);
  if (idx === -1) {
    throw new Error(`Profile "${id}" 不存在`);
  }
  config.profiles.splice(idx, 1);

  // 如果删除的是当前激活 Profile，清空 activeProfile
  if (config.activeProfile === id) {
    config.activeProfile = '';
  }

  await saveProfiles(config);
}

// ─── 切换逻辑 ───────────────────────────────────────────────

/**
 * 将 Profile 的 env 应用到 settings.json
 *
 * 只修改 env（和可选 permissions），其他字段原样保留。
 */
async function applyProfile(profile: Profile): Promise<void> {
  const settings = await loadSettings();

  // 构建 env 对象：必填 + 非空可选
  const env: Record<string, string> = { ...profile.env };
  if (profile.optionalEnv) {
    for (const [key, value] of Object.entries(profile.optionalEnv)) {
      if (value) {
        env[key] = value;
      }
    }
  }

  settings.env = env;

  // 条件合并 permissions
  if (profile.permissions && profile.permissions.length > 0) {
    if (!settings.permissions) {
      settings.permissions = {};
    }
    const existing = settings.permissions.allow ?? [];
    const merged = [...new Set([...existing, ...profile.permissions])];
    settings.permissions.allow = merged;
  }

  await saveSettings(settings);
}

/** 切换到指定 Profile */
export async function switchProfile(id: string): Promise<Profile> {
  const config = await loadProfiles();
  const profile = config.profiles.find((p) => p.id === id);
  if (!profile) {
    throw new Error(`Profile "${id}" 不存在`);
  }

  await applyProfile(profile);

  config.activeProfile = id;
  await saveProfiles(config);

  return profile;
}

/**
 * 重置为默认配置（Anthropic 官方）
 *
 * 从 settings.json 中删除 env 字段，Claude Code 将使用官方 API。
 */
export async function resetToDefault(): Promise<void> {
  const settings = await loadSettings();
  delete settings.env;
  await saveSettings(settings);

  const config = await loadProfiles();
  config.activeProfile = '';
  await saveProfiles(config);
}

// ─── 工具方法 ───────────────────────────────────────────────

/** 生成 Profile ID（从 provider + name） */
export function generateProfileId(provider: string, name: string): string {
  return `${provider}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 掩码显示 API Key，只显示前 6 和后 4 位 */
export function maskApiKey(key: string): string {
  if (key.length <= 12) return '****';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

/** 获取路径常量（供其他模块使用） */
export const paths = {
  ccfgDir: CCFG_DIR,
  profilesPath: PROFILES_PATH,
  claudeDir: CLAUDE_DIR,
  settingsPath: SETTINGS_PATH,
} as const;
