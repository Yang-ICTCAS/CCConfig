/**
 * ccfg add — 交互式添加 Profile
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { addProfile, generateProfileId, loadProfiles } from '../config.js';
import { DEFAULT_PRESETS } from '../types.js';
import type { Profile, PresetName } from '../types.js';

export function registerAddCommand(program: Command): void {
  program
    .command('add')
    .description('交互式添加新 Profile')
    .action(async () => {
      try {
        const config = await loadProfiles();

        // 选择提供商
        const { provider } = await inquirer.prompt<{ provider: PresetName }>([
          {
            type: 'list',
            name: 'provider',
            message: '选择 API 提供商：',
            choices: [
              { name: 'Anthropic (官方)', value: 'anthropic' },
              { name: 'DashScope (阿里云百炼)', value: 'dashscope' },
              { name: 'Ark (火山引擎)', value: 'ark' },
              { name: '自定义', value: 'custom' },
            ],
          },
        ]);

        // 获取基础配置
        const preset = DEFAULT_PRESETS[provider];

        const answers = await inquirer.prompt<{
          name: string;
          baseUrl: string;
          apiKey: string;
          model: string;
          smallModel: string;
          notes: string;
        }>([
          {
            type: 'input',
            name: 'name',
            message: 'Profile 名称：',
            validate: (val: string) => (val.trim() ? true : '名称不能为空'),
          },
          {
            type: 'input',
            name: 'baseUrl',
            message: 'API Base URL：',
            default: preset.baseUrl,
            when: () => provider === 'custom' || !preset.baseUrl,
            validate: (val: string) => {
              try {
                new URL(val);
                return true;
              } catch {
                return '请输入有效的 URL';
              }
            },
          },
          {
            type: 'password',
            name: 'apiKey',
            message: 'API Key：',
            mask: '*',
            validate: (val: string) => (val.trim() ? true : 'API Key 不能为空'),
          },
          {
            type: 'input',
            name: 'model',
            message: '模型名称：',
            validate: (val: string) => (val.trim() ? true : '模型名称不能为空'),
          },
          {
            type: 'input',
            name: 'smallModel',
            message: '小快模型（可选，留空跳过）：',
          },
          {
            type: 'input',
            name: 'notes',
            message: '备注（可选）：',
          },
        ]);

        const baseUrl = answers.baseUrl || preset.baseUrl;
        const id = generateProfileId(provider, answers.name);

        // 检查 ID 冲突
        if (config.profiles.some((p) => p.id === id)) {
          console.error(chalk.red(`✗ Profile ID "${id}" 已存在，请使用不同的名称`));
          process.exit(1);
        }

        const profile: Profile = {
          id,
          name: answers.name.trim(),
          provider,
          env: {
            ANTHROPIC_AUTH_TOKEN: answers.apiKey.trim(),
            ANTHROPIC_BASE_URL: baseUrl,
            ANTHROPIC_MODEL: answers.model.trim(),
          },
          optionalEnv: answers.smallModel.trim()
            ? { ANTHROPIC_SMALL_FAST_MODEL: answers.smallModel.trim() }
            : undefined,
          notes: answers.notes.trim() || undefined,
          createdAt: new Date().toISOString(),
        };

        await addProfile(profile);

        console.log('');
        console.log(chalk.green(`✓ Profile "${profile.name}" 已创建`));
        console.log(`  ${chalk.dim('ID:')} ${profile.id}`);
        console.log('');

        // 如果是第一个 Profile，询问是否立即激活
        if (config.profiles.length === 0) {
          const { activate } = await inquirer.prompt<{ activate: boolean }>([
            {
              type: 'confirm',
              name: 'activate',
              message: '这是第一个 Profile，是否立即激活？',
              default: true,
            },
          ]);

          if (activate) {
            const { switchProfile } = await import('../config.js');
            await switchProfile(id);
            console.log(chalk.green(`✓ 已激活 "${profile.name}"`));
            console.log(chalk.yellow('⚠ 请重启 Claude Code 以使配置生效'));
          }
        }
      } catch (err) {
        if ((err as Error).name === 'ExitPromptError') {
          // 用户取消
          return;
        }
        console.error(chalk.red(`✗ 添加失败: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
