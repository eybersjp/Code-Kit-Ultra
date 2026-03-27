import { SkillManifest } from '../../types/src';

export class SkillEngine {
  private skills: SkillManifest[] = [];

  register(skill: SkillManifest): void {
    this.skills.push(skill);
  }

  list(): SkillManifest[] {
    return this.skills;
  }

  generateDynamicSkill(name: string, description: string): SkillManifest {
    const generated: SkillManifest = {
      id: `generated/${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      description,
      triggers: ['dynamic-request']
    };
    this.register(generated);
    return generated;
  }
}
