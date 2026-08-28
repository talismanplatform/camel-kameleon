import {DependencyNode, DependencyTrees, MODULE_GROUPS, Vulnerability} from '@models/CveModels';

/**
 * The Camel artifacts of a ref that depend on a given `groupId:artifactId:version`,
 * one entry per coordinate found anywhere in the module trees.
 *
 * A ref carries tens of thousands of tree nodes and a report a few hundred
 * findings, so the trees are walked once into this index rather than once per
 * finding: `dependents` is then a lookup instead of a traversal.
 */
export type DependentIndex = Map<string, string[]>;

/** How a dependency is keyed in the index, version included: a finding is about one version. */
const key = (groupId: string, artifactId: string, version: string) => `${groupId}:${artifactId}:${version}`;

/** Every coordinate of one module tree, the module itself included, without duplicates. */
function coordinatesOf(node: DependencyNode, into: Set<string>): Set<string> {
    into.add(key(node.g, node.a, node.v));
    (node.children ?? []).forEach(child => coordinatesOf(child, into));
    return into;
}

/**
 * Folds the module trees of a ref into the artifacts depending on each
 * coordinate. The root of a tree is the Camel module, so that is the artifact
 * reported as the dependent; a module is listed once however many branches of
 * it reach the dependency.
 */
export function dependentIndex(trees: DependencyTrees): DependentIndex {
    const index: DependentIndex = new Map();
    MODULE_GROUPS.flatMap(group => trees[group] ?? []).forEach(module => {
        coordinatesOf(module, new Set()).forEach(coordinate => {
            const artifacts = index.get(coordinate);
            if (artifacts) {
                artifacts.push(module.a);
            } else {
                index.set(coordinate, [module.a]);
            }
        });
    });
    index.forEach(artifacts => artifacts.sort());
    return index;
}

/**
 * The Camel artifacts affected by one finding: those whose dependency tree
 * reaches the reported artifact at the installed version. A finding without
 * maven coordinates cannot be placed in a tree, so it affects nothing rather
 * than everything sharing the scanner's package name.
 */
export function dependents(index: DependentIndex | undefined, vulnerability: Vulnerability): string[] {
    const {groupId, artifactId, installed} = vulnerability;
    if (!index || !groupId || !artifactId) {
        return [];
    }
    return index.get(key(groupId, artifactId, installed)) ?? [];
}
