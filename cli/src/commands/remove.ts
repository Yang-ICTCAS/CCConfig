/**
 * ccfg remove <id> — 删除 Profile
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { findProfile, removeProfile, loadProfiles } from '../config.js';

export function registerRemoveCommand(program: Command): void {
  program
    .command('remove <id>')
    .alias('rm')
    .description('删除指定 Profile')
    .option('-y, --yes', '跳过确认')
    .action(async (id: string, options: { yes?: boolean }) => {
      try {
        const profile = await findProfile(id);
        if (!profile) {
          console.error(chalk.red(`✗ Profile "${id}" 不存在`));
          process.exit(1);
        }

        const config = await loadProfiles();
        const isActive = config.activeProfile === id;

        if (!options.yes) {
          const warning = isActive
            ? chalk.yellow(' (⚠ 这是当前激活的 Profile)')
            : '';

          const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
            {
              type: 'confirm',
              name: 'confirm',
              message: `确定删除 "${profile.name}"${warning}？`,
              default: false,
            },
          ]);

          if (!confirm) {
            console.log(chalk.dim('已取消'));
            return;
          }
        }

        await removeProfile(id);

        console.log(chalk.green(`✓ Profile "${profile.name}" 已删除`));

        if (isActive) {
          console.log(chalk.yellow('⚠ 已删除当前激活的 Profile，请使用 ccfg use <id> 切换到其他 Profile'));
        }
      } catch (err) {
        if ((err as Error).name === 'ExitPromptError') return;
        console.error(chalk.red(`✗ 删除失败: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
