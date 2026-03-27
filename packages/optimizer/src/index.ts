import type { RunBundle, Task } from "../../shared/src/types.js";

export interface OptimizationResult {
    optimizedBundle: RunBundle;
    changes: string[];
}

export class PlanOptimizer {
    static async optimize(bundle: RunBundle): Promise<OptimizationResult> {
        console.log(`[PlanOptimizer] Optimizing plan for run ${bundle.state.runId}...`);
        
        const changes: string[] = [];
        const originalTasks = [...bundle.plan.tasks];
        
        // Example optimization: replace trash-adapter with premium-llm-v1
        const optimizedTasks = originalTasks.map(task => {
            if (task.adapterId === "trash-adapter") {
                changes.push(`ADAPTER_SWAP: Swapped 'trash-adapter' for 'premium-llm-v1' on task ${task.id}`);
                return { ...task, adapterId: "premium-llm-v1" };
            }
            return task;
        });

        const optimizedBundle = {
            ...bundle,
            plan: {
                ...bundle.plan,
                tasks: optimizedTasks,
            }
        };

        if (changes.length > 0) {
            console.log(`[PlanOptimizer] Optimization applied: ${changes.length} changes.`);
            changes.forEach(c => console.log(`  - ${c}`));
        } else {
            console.log(`[PlanOptimizer] No optimizations needed.`);
        }

        return { optimizedBundle, changes };
    }
}
