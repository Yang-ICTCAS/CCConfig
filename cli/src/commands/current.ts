/**
 * ccfg current — 查看当前配置
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getCurrentProfile, maskApiKey, loadSettings } from '../config.js';

export function registerCurrentCommand(program: Command): void {
  program
    .command('current')
    .description('查看当前激活的 Profile')
    .option('--raw', '以 JSON 格式输出')
    .action(async (options: { raw?: boolean }) => {
      try {
        const profile = await getCurrentProfile();

        if (!profile) {
          console.log(chalk.bold('⚡ 当前配置\n'));
          console.log(`  ${chalk.green('● Anthropic 官方默认配置')}`);
          console.log(chalk.dim('  （settings.json 中无 env 字段，使用 Claude 官方 API）'));
          console.log('');
          console.log(chalk.dim('使用 ccfg use <id> 切换到其他 Profile'));
          return;
        }

        if (options.raw) {
          const output = {
            ...profile,
            env: {
              ...profile.env,
              ANTHROPIC_AUTH_TOKEN: maskApiKey(profile.env.ANTHROPIC_AUTH_TOKEN),
            },
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        console.log(chalk.bold('⚡ 当前 Profile\n'));
        console.log(`  ${chalk.dim('名称:')} ${chalk.bold(profile.name)}`);
        console.log(`  ${chalk.dim('ID:')} ${profile.id}`);
        console.log(`  ${chalk.dim('提供商:')} ${profile.provider}`);
        console.log(`  ${chalk.dim('模型:')} ${chalk.cyan(profile.env.ANTHROPIC_MODEL)}`);
        console.log(`  ${chalk.dim('Base URL:')} ${profile.env.ANTHROPIC_BASE_URL}`);
        console.log(`  ${chalk.dim('API Key:')} ${maskApiKey(profile.env.ANTHROPIC_AUTH_TOKEN)}`);

        if (profile.optionalEnv?.ANTHROPIC_SMALL_FAST_MODEL) {
          console.log(`  ${chalk.dim('小快模型:')} ${profile.optionalEnv.ANTHROPIC_SMALL_FAST_MODEL}`);
        }
        if (profile.notes) {
          console.log(`  ${chalk.dim('备注:')} ${profile.notes}`);
        }

        // 验证 settings.json 是否同步
        const settings = await loadSettings();
        const envModel = settings.env?.ANTHROPIC_MODEL;
        if (envModel && envModel !== profile.env.ANTHROPIC_MODEL) {
          console.log('');
          console.log(
            chalk.yellow(
              `⚠ settings.json 中的模型 (${envModel}) 与 Profile 不一致，可能被外部修改`
            )
          );
        }
      } catch (err) {
        console.error(chalk.red(`✗ 读取失败: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
