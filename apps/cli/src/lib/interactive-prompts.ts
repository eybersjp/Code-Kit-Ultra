import inquirer from "inquirer";
import chalk from "chalk";

/**
 * Interactive CLI prompt utilities for common workflows.
 * Makes it easier to work with CKU via Y/N questions.
 */

type Mode = "turbo" | "builder" | "pro" | "expert" | "safe" | "balanced" | "god";

export interface InteractiveOptions {
  idea?: string;
  mode?: Mode;
  requiresAuth?: boolean;
  dryRun?: boolean;
  skipApproval?: boolean;
}

/**
 * Ask user if they need authentication.
 */
export async function promptAuthentication(): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "needsAuth",
      message: chalk.cyan("Do you need authentication?"),
      default: true,
    },
  ]);
  return answer.needsAuth;
}

/**
 * Ask user to select execution mode.
 */
export async function promptMode(): Promise<Mode> {
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "mode",
      message: chalk.cyan("Select execution mode:"),
      choices: [
        {
          name: chalk.green("Safe") + " — Maximum questions, early escalation",
          value: "safe",
        },
        {
          name: chalk.yellow("Balanced") + " — Reasonable assumptions, policy escalation",
          value: "balanced",
        },
        {
          name: chalk.red("God") + " — Velocity-optimized, obeys all gates",
          value: "god",
        },
      ],
      default: "balanced",
    },
  ]);
  return answer.mode as Mode;
}

/**
 * Ask user for execution idea/goal.
 */
export async function promptIdea(): Promise<string> {
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "idea",
      message: chalk.cyan("What do you want to accomplish?"),
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return "Please enter a description of what you want to do.";
        }
        return true;
      },
    },
  ]);
  return answer.idea;
}

/**
 * Ask user for multiple options in sequence.
 */
export async function promptRunSetup(): Promise<InteractiveOptions> {
  const idea = await promptIdea();
  const mode = await promptMode();
  const needsAuth = await promptAuthentication();

  const dryRun = await inquirer.prompt([
    {
      type: "confirm",
      name: "dryRun",
      message: chalk.cyan("Run in dry-run mode (no actual changes)?"),
      default: false,
    },
  ]);

  const skipApproval = await inquirer.prompt([
    {
      type: "confirm",
      name: "skip",
      message: chalk.cyan("Skip approval gates if possible?"),
      default: false,
    },
  ]);

  return {
    idea,
    mode,
    requiresAuth: needsAuth,
    dryRun: dryRun.dryRun,
    skipApproval: skipApproval.skip,
  };
}

/**
 * Confirm an important action with the user.
 */
export async function confirmAction(message: string): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message: chalk.yellow(message),
      default: false,
    },
  ]);
  return answer.confirmed;
}

/**
 * Ask user to select from a list of options.
 */
export async function selectFromList(
  message: string,
  choices: Array<{ name: string; value: any }>
): Promise<any> {
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "selected",
      message: chalk.cyan(message),
      choices,
    },
  ]);
  return answer.selected;
}

/**
 * Ask user to select multiple items from a list.
 */
export async function selectMultiple(
  message: string,
  choices: Array<{ name: string; value: any }>
): Promise<any[]> {
  const answer = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selected",
      message: chalk.cyan(message),
      choices,
    },
  ]);
  return answer.selected;
}

/**
 * Ask user a yes/no question.
 */
export async function promptYesNo(question: string, defaultValue = false): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "answer",
      message: chalk.cyan(question),
      default: defaultValue,
    },
  ]);
  return answer.answer;
}

/**
 * Ask for text input with validation.
 */
export async function promptText(
  question: string,
  validate?: (input: string) => boolean | string
): Promise<string> {
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "text",
      message: chalk.cyan(question),
      validate: validate || ((input) => input.length > 0 || "Input cannot be empty"),
    },
  ]);
  return answer.text;
}

/**
 * Show a menu of actions and let user select one.
 */
export async function showMenu(actions: Array<{ name: string; value: string }>): Promise<string> {
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: chalk.cyan("Select an action:"),
      choices: actions,
    },
  ]);
  return answer.action;
}

/**
 * Workflow: Prompt user for all options needed to create and run a governed execution.
 */
export async function interactiveRunWorkflow(): Promise<InteractiveOptions> {
  console.log(chalk.bold.cyan("\n🚀 Code Kit Ultra — Interactive Run Setup\n"));

  const options = await promptRunSetup();

  console.log(chalk.green("\n✓ Setup complete!\n"));
  console.log(chalk.dim("Configuration:"));
  console.log(chalk.dim(`  Idea: ${options.idea}`));
  console.log(chalk.dim(`  Mode: ${options.mode}`));
  console.log(chalk.dim(`  Auth: ${options.requiresAuth ? "required" : "not required"}`));
  console.log(chalk.dim(`  Dry run: ${options.dryRun ? "yes" : "no"}`));
  console.log(chalk.dim(`  Skip approval: ${options.skipApproval ? "yes" : "no"}\n`));

  const confirmed = await confirmAction("Proceed with this configuration?");

  if (!confirmed) {
    console.log(chalk.yellow("Setup cancelled.\n"));
    process.exit(0);
  }

  return options;
}
