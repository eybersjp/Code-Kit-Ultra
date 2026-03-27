import { ProjectIdea } from '../../types/src';

export interface ProjectMemory {
  idea: ProjectIdea;
  assumptions: string[];
  decisions: string[];
  openQuestions: string[];
}

export class MemoryStore {
  private state: ProjectMemory | null = null;

  initialize(idea: ProjectIdea): ProjectMemory {
    this.state = { idea, assumptions: [], decisions: [], openQuestions: [] };
    return this.state;
  }

  getState(): ProjectMemory | null {
    return this.state;
  }
}
