/**
 * ccfg edit <id> — 编辑 Profile
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { findProfile, updateProfile, maskApiKey } from '../config.js';

export function registerEditCommand(program: Command): void {
  program
    .command('edit <id>')
    .description('编辑指定 Profile')
    .action(async (id: string) => {
      try {
        const profile = await findProfile(id);
        if (!profile) {
          console.error(chalk.red(`✗ Profile "${id}" 不存在`));
          process.exit(1);
        }

        console.log(chalk.bold(`✏️  编辑 Profile: ${profile.name}\n`));
        console.log(chalk.dim('  留空保持原值，输入新值则覆盖\n'));

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
            message: `名称 [${profile.name}]：`,
          },
          {
            type: 'input',
            name: 'baseUrl',
            message: `Base URL [${profile.env.ANTHROPIC_BASE_URL}]：`,
          },
          {
            type: 'input',
            name: 'apiKey',
            message: `API Key [${maskApiKey(profile.env.ANTHROPIC_AUTH_TOKEN)}]：`,
          },
          {
            type: 'input',
            name: 'model',
            message: `模型 [${profile.env.ANTHROPIC_MODEL}]：`,
          },
          {
            type: 'input',
            name: 'smallModel',
            message: `小快模型 [${profile.optionalEnv?.ANTHROPIC_SMALL_FAST_MODEL || '未设置'}]：`,
          },
          {
            type: 'input',
            name: 'notes',
            message: `备注 [${profile.notes || '无'}]：`,
          },
        ]);

        // 合并更新
        const updated = { ...profile };
        if (answers.name.trim()) updated.name = answers.name.trim();
        if (answers.baseUrl.trim()) updated.env.ANTHROPIC_BASE_URL = answers.baseUrl.trim();
        if (answers.apiKey.trim()) updated.env.ANTHROPIC_AUTH_TOKEN = answers.apiKey.trim();
        if (answers.model.trim()) updated.env.ANTHROPIC_MODEL = answers.model.trim();
        if (answers.smallModel.trim()) {
          if (!updated.optionalEnv) updated.optionalEnv = {};
          updated.optionalEnv.ANTHROPIC_SMALL_FAST_MODEL = answers.smallModel.trim();
        }
        if (answers.notes.trim()) updated.notes = answers.notes.trim();

        await updateProfile(updated);

        console.log('');
        console.log(chalk.green(`✓ Profile "${updated.name}" 已更新`));
      } catch (err) {
        if ((err as Error).name === 'ExitPromptError') return;
        console.error(chalk.red(`✗ 编辑失败: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
