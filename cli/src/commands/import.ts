/**
 * ccfg import — 从现有 settings.json 导入 Profile
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadSettings, addProfile, generateProfileId, switchProfile } from '../config.js';
import type { Profile, PresetName } from '../types.js';
import { DEFAULT_PRESETS } from '../types.js';

/** 根据 Base URL 自动推断提供商 */
function detectProvider(baseUrl: string): PresetName {
  for (const [name, preset] of Object.entries(DEFAULT_PRESETS)) {
    if (preset.baseUrl && baseUrl.startsWith(preset.baseUrl)) {
      return name as PresetName;
    }
  }
  return 'custom';
}

export function registerImportCommand(program: Command): void {
  program
    .command('import')
    .description('从现有 ~/.claude/settings.json 导入 Profile')
    .action(async () => {
      try {
        const settings = await loadSettings();

        if (!settings.env) {
          console.log(chalk.yellow('⚠ settings.json 中没有 env 配置'));
          console.log(chalk.dim('使用 ccfg add 手动添加 Profile'));
          return;
        }

        const { ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL, ANTHROPIC_MODEL, ...rest } =
          settings.env;

        if (!ANTHROPIC_AUTH_TOKEN || !ANTHROPIC_BASE_URL || !ANTHROPIC_MODEL) {
          console.log(chalk.yellow('⚠ settings.json 中缺少必要的环境变量'));
          console.log(
            chalk.dim(
              '需要: ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL, ANTHROPIC_MODEL'
            )
          );
          return;
        }

        const detectedProvider = detectProvider(ANTHROPIC_BASE_URL);

        console.log(chalk.bold('📥 从 settings.json 导入\n'));
        console.log(`  ${chalk.dim('Base URL:')} ${ANTHROPIC_BASE_URL}`);
        console.log(`  ${chalk.dim('模型:')} ${chalk.cyan(ANTHROPIC_MODEL)}`);
        console.log(`  ${chalk.dim('推断提供商:')} ${detectedProvider}`);
        console.log('');

        const answers = await inquirer.prompt<{
          name: string;
          provider: PresetName;
          notes: string;
        }>([
          {
            type: 'input',
            name: 'name',
            message: 'Profile 名称：',
            default: `${detectedProvider}-${ANTHROPIC_MODEL}`,
            validate: (val: string) => (val.trim() ? true : '名称不能为空'),
          },
          {
            type: 'list',
            name: 'provider',
            message: '确认提供商：',
            choices: [
              { name: 'Anthropic (官方)', value: 'anthropic' },
              { name: 'DashScope (阿里云百炼)', value: 'dashscope' },
              { name: 'Ark (火山引擎)', value: 'ark' },
              { name: '自定义', value: 'custom' },
            ],
            default: detectedProvider,
          },
          {
            type: 'input',
            name: 'notes',
            message: '备注（可选）：',
            default: '从 settings.json 导入',
          },
        ]);

        const id = generateProfileId(answers.provider, answers.name);

        const profile: Profile = {
          id,
          name: answers.name.trim(),
          provider: answers.provider,
          env: {
            ANTHROPIC_AUTH_TOKEN,
            ANTHROPIC_BASE_URL,
            ANTHROPIC_MODEL,
          },
          optionalEnv: Object.keys(rest).length > 0 ? rest : undefined,
          notes: answers.notes.trim() || undefined,
          createdAt: new Date().toISOString(),
        };

        await addProfile(profile);

        // 标记为当前激活
        await switchProfile(id);

        console.log('');
        console.log(chalk.green(`✓ 已导入并激活 "${profile.name}"`));
        console.log(`  ${chalk.dim('ID:')} ${profile.id}`);
      } catch (err) {
        if ((err as Error).name === 'ExitPromptError') return;
        console.error(chalk.red(`✗ 导入失败: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
