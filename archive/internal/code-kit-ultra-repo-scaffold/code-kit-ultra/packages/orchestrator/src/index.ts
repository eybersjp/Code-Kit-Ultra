import { MemoryStore } from '../../memory/src';
import { SkillEngine } from '../../skill-engine/src';
import { ProjectIdea } from '../../types/src';

export class Orchestrator {
  constructor(
    private readonly memory = new MemoryStore(),
    private readonly skills = new SkillEngine()
  ) {}

  initProject(idea: ProjectIdea) {
    return this.memory.initialize(idea);
  }

  getSkillEngine(): SkillEngine {
    return this.skills;
  }
}
