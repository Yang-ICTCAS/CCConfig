/**
 * ccfg use <id> — 快捷切换 Profile
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { switchProfile, findProfile } from '../config.js';

export function registerUseCommand(program: Command): void {
  program
    .command('use <id>')
    .description('切换到指定 Profile')
    .action(async (id: string) => {
      try {
        const exists = await findProfile(id);
        if (!exists) {
          console.error(chalk.red(`✗ Profile "${id}" 不存在`));
          console.log(chalk.dim('使用 ccfg list 查看所有可用的 Profile'));
          process.exit(1);
        }

        const profile = await switchProfile(id);
        console.log(chalk.green('✓ 已切换到：'));
        console.log(`  ${chalk.bold(profile.name)} ${chalk.dim(`(${profile.provider})`)}`);
        console.log(`  模型: ${chalk.cyan(profile.env.ANTHROPIC_MODEL)}`);
        console.log('');
        console.log(chalk.yellow('⚠ 请重启 Claude Code 以使配置生效'));
      } catch (err) {
        console.error(chalk.red(`✗ 切换失败: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
