/**
 * ccfg default — 切换回 Anthropic 官方默认配置
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { resetToDefault, isDefaultProfile } from '../config.js';

export function registerDefaultCommand(program: Command): void {
  program
    .command('default')
    .description('切换回 Anthropic 官方默认配置（清除 env）')
    .action(async () => {
      try {
        const alreadyDefault = await isDefaultProfile();
        if (alreadyDefault) {
          console.log(chalk.dim('当前已是 Anthropic 官方默认配置'));
          return;
        }

        await resetToDefault();

        console.log(chalk.green('✓ 已切换回 Anthropic 官方默认配置'));
        console.log(chalk.dim('  已从 settings.json 中移除 env 字段'));
        console.log('');
        console.log(chalk.yellow('⚠ 请重启 Claude Code 以使配置生效'));
      } catch (err) {
        console.error(chalk.red(`✗ 切换失败: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
