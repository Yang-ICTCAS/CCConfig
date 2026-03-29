#!/usr/bin/env node

/**
 * ccfg — Claude Code 配置切换工具
 *
 * 直接运行 ccfg（无参数）进入交互式选择模式。
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadProfiles, switchProfile, resetToDefault, maskApiKey } from './config.js';
import { registerUseCommand } from './commands/use.js';
import { registerListCommand } from './commands/list.js';
import { registerAddCommand } from './commands/add.js';
import { registerEditCommand } from './commands/edit.js';
import { registerRemoveCommand } from './commands/remove.js';
import { registerCurrentCommand } from './commands/current.js';
import { registerImportCommand } from './commands/import.js';
import { registerDefaultCommand } from './commands/default.js';

const program = new Command();

program
  .name('ccfg')
  .description('Claude Code 配置切换工具 — 快速切换 API 提供商和配置')
  .version('1.0.0');

// 注册所有子命令
registerUseCommand(program);
registerListCommand(program);
registerAddCommand(program);
registerEditCommand(program);
registerRemoveCommand(program);
registerCurrentCommand(program);
registerImportCommand(program);
registerDefaultCommand(program);

// 默认行为：无参数时交互式选择
program.action(async () => {
  try {
    const config = await loadProfiles();

    if (config.profiles.length === 0) {
      console.log(chalk.bold('⚡ CCConfig\n'));
      console.log(chalk.dim('暂无 Profile'));
      console.log('');

      const { action } = await inquirer.prompt<{ action: string }>([
        {
          type: 'list',
          name: 'action',
          message: '选择操作：',
          choices: [
            { name: '从 settings.json 导入现有配置', value: 'import' },
            { name: '添加新 Profile', value: 'add' },
            { name: '退出', value: 'exit' },
          ],
        },
      ]);

      if (action === 'import') {
        await program.parseAsync(['node', 'claudecfg', 'import']);
      } else if (action === 'add') {
        await program.parseAsync(['node', 'claudecfg', 'add']);
      }
      return;
    }

    // 构建选择列表：默认选项 + Profile 列表
    const isDefault = !config.activeProfile;
    const defaultChoice = {
      name: `${isDefault ? chalk.green('●') : chalk.dim('○')} Anthropic 官方默认${isDefault ? chalk.green(' ← 当前') : ''}`,
      value: '__default__',
      short: 'Anthropic 默认',
    };

    const profileChoices = config.profiles.map((p) => {
      const active = p.id === config.activeProfile;
      const marker = active ? chalk.green('●') : chalk.dim('○');
      const tag = active ? chalk.green(' ← 当前') : '';
      return {
        name: `${marker} ${p.name} ${chalk.dim(`(${p.provider} / ${p.env.ANTHROPIC_MODEL})`)}${tag}`,
        value: p.id,
        short: p.name,
      };
    });

    const choices: any[] = [
      defaultChoice,
      new inquirer.Separator(),
      ...profileChoices,
      new inquirer.Separator(),
      { name: chalk.dim('+ 添加新 Profile'), value: '__add__', short: '添加' },
      { name: chalk.dim('  退出'), value: '__exit__', short: '退出' },
    ];

    console.log(chalk.bold('⚡ CCConfig — 切换 Profile\n'));

    const { selected } = await inquirer.prompt<{ selected: string }>([
      {
        type: 'list',
        name: 'selected',
        message: '选择要切换的 Profile：',
        choices,
        default: config.activeProfile,
      },
    ]);

    if (selected === '__exit__') return;
    if (selected === '__add__') {
      await program.parseAsync(['node', 'ccfg', 'add']);
      return;
    }

    // 切换到默认
    if (selected === '__default__') {
      if (isDefault) {
        console.log(chalk.dim('当前已是 Anthropic 官方默认配置'));
        return;
      }
      await resetToDefault();
      console.log('');
      console.log(chalk.green('✓ 已切换回 Anthropic 官方默认配置'));
      console.log(chalk.dim('  已从 settings.json 中移除 env 字段'));
      console.log('');
      console.log(chalk.yellow('⚠ 请重启 Claude Code 以使配置生效'));
      return;
    }

    if (selected === config.activeProfile) {
      console.log(chalk.dim('当前已是该 Profile，无需切换'));
      return;
    }

    const profile = await switchProfile(selected);
    console.log('');
    console.log(chalk.green('✓ 已切换到：'));
    console.log(`  ${chalk.bold(profile.name)} ${chalk.dim(`(${profile.provider})`)}`);
    console.log(`  模型: ${chalk.cyan(profile.env.ANTHROPIC_MODEL)}`);
    console.log('');
    console.log(chalk.yellow('⚠ 请重启 Claude Code 以使配置生效'));
  } catch (err) {
    if ((err as Error).name === 'ExitPromptError') return;
    console.error(chalk.red(`✗ 错误: ${(err as Error).message}`));
    process.exit(1);
  }
});

program.parse();
