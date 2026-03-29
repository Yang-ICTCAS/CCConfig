/**
 * ccfg list — 列出所有 Profile
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadProfiles, maskApiKey } from '../config.js';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('列出所有 Profile')
    .option('-v, --verbose', '显示详细信息')
    .action(async (options: { verbose?: boolean }) => {
      try {
        const config = await loadProfiles();

        if (config.profiles.length === 0) {
          console.log(chalk.dim('暂无 Profile，使用 ccfg add 添加'));
          return;
        }

        console.log(chalk.bold('📋 Profile 列表\n'));

        for (const profile of config.profiles) {
          const isActive = profile.id === config.activeProfile;
          const marker = isActive ? chalk.green('● ') : chalk.dim('○ ');
          const activeTag = isActive ? chalk.green(' ✓') : '';

          console.log(`${marker}${chalk.bold(profile.name)}${activeTag}`);
          console.log(`  ${chalk.dim('ID:')} ${profile.id}`);
          console.log(`  ${chalk.dim('提供商:')} ${profile.provider}`);
          console.log(`  ${chalk.dim('模型:')} ${chalk.cyan(profile.env.ANTHROPIC_MODEL)}`);

          if (options.verbose) {
            console.log(`  ${chalk.dim('Base URL:')} ${profile.env.ANTHROPIC_BASE_URL}`);
            console.log(`  ${chalk.dim('API Key:')} ${maskApiKey(profile.env.ANTHROPIC_AUTH_TOKEN)}`);
            if (profile.notes) {
              console.log(`  ${chalk.dim('备注:')} ${profile.notes}`);
            }
            if (profile.optionalEnv?.ANTHROPIC_SMALL_FAST_MODEL) {
              console.log(`  ${chalk.dim('小模型:')} ${profile.optionalEnv.ANTHROPIC_SMALL_FAST_MODEL}`);
            }
          }

          console.log('');
        }

        console.log(chalk.dim(`共 ${config.profiles.length} 个 Profile`));
      } catch (err) {
        console.error(chalk.red(`✗ 读取配置失败: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
