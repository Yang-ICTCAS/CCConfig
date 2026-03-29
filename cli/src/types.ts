/**
 * CCConfig 类型定义
 */

/** Profile 环境变量（必填） */
export interface ProfileEnv {
  ANTHROPIC_AUTH_TOKEN: string;
  ANTHROPIC_BASE_URL: string;
  ANTHROPIC_MODEL: string;
}

/** Profile 可选环境变量 */
export interface ProfileOptionalEnv {
  ANTHROPIC_SMALL_FAST_MODEL?: string;
  [key: string]: string | undefined;
}

/** 单个 Profile 配置 */
export interface Profile {
  id: string;
  name: string;
  provider: string;
  env: ProfileEnv;
  optionalEnv?: ProfileOptionalEnv;
  permissions?: string[];
  notes?: string;
  createdAt: string;
}

/** 预置提供商模板 */
export interface Preset {
  baseUrl: string;
}

/** 完整配置文件结构 */
export interface CCFGConfig {
  activeProfile: string;
  profiles: Profile[];
  presets: Record<string, Preset>;
}

/** Claude Code settings.json 结构（部分） */
export interface ClaudeSettings {
  env?: Record<string, string>;
  permissions?: {
    allow?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** 预置提供商名称 */
export type PresetName = 'anthropic' | 'dashscope' | 'ark' | 'custom';

/** 默认预置提供商 */
export const DEFAULT_PRESETS: Record<PresetName, Preset> = {
  anthropic: { baseUrl: 'https://api.anthropic.com' },
  dashscope: { baseUrl: 'https://coding.dashscope.aliyuncs.com/apps/anthropic' },
  ark: { baseUrl: 'https://ark.cn-beijing.volces.com/api/coding' },
  custom: { baseUrl: '' },
};
