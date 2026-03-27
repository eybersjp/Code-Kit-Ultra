import { Orchestrator } from '../../../packages/orchestrator/src';

const command = process.argv[2] ?? 'help';
const orchestrator = new Orchestrator();

switch (command) {
  case 'init': {
    const project = orchestrator.initProject({
      title: 'New Project',
      summary: 'Replace with real project intake.',
      mode: 'balanced'
    });
    console.log('Initialized project:', project);
    break;
  }
  default:
    console.log('Usage: npm run cli -- init');
}
