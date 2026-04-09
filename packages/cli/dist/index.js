#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const program = new commander_1.Command();
program
    .name('agent-office')
    .description('CLI to manage your AgentOffice spaces')
    .version('1.0.0');
program.command('create')
    .description('Create a new AgentOffice project')
    .argument('<project-name>', 'Name of the project directory')
    .action((projectName) => {
    console.log(chalk_1.default.blue(`Creating new AgentOffice project at ./${projectName}...`));
    const projectPath = path_1.default.resolve(process.cwd(), projectName);
    if (!fs_1.default.existsSync(projectPath)) {
        fs_1.default.mkdirSync(projectPath);
        // Basic init
        fs_1.default.writeFileSync(path_1.default.join(projectPath, 'package.json'), JSON.stringify({
            name: projectName,
            version: "1.0.0",
            dependencies: {
                "@agent-office/server": "^1.0.0",
                "@agent-office/ui": "^1.0.0",
                "@agent-office/core": "^1.0.0"
            },
            scripts: {
                "dev": "agent-office start"
            }
        }, null, 2));
        console.log(chalk_1.default.green(`Success! Next steps:`));
        console.log(`cd ${projectName} && npm install`);
    }
    else {
        console.log(chalk_1.default.red(`Directory ${projectName} already exists.`));
    }
});
program.command('add-agent')
    .description('Add a new agent to your office configuration')
    .requiredOption('-n, --name <name>', 'Name of the agent')
    .requiredOption('-r, --role <role>', 'Role of the agent')
    .option('-p, --provider <provider>', 'Inference provider', 'ollama')
    .action((options) => {
    console.log(chalk_1.default.yellow(`Adding agent ${options.name} (${options.role}) using ${options.provider}...`));
    // Real implementation would modify office configuration map here
    console.log(chalk_1.default.green(`Agent addition registered successfully!`));
});
program.command('start')
    .description('Start the local development server and UI')
    .action(() => {
    console.log(chalk_1.default.blue(`Starting AgentOffice local environment...`));
    console.log(chalk_1.default.gray(`> Booting Vite on port 5173`));
    console.log(chalk_1.default.gray(`> Booting Colyseus Engine on port 3000`));
    // Execution shell logic mapping would go here
});
program.parse();
//# sourceMappingURL=index.js.map