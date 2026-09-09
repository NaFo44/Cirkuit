export class UnionFind {
    private readonly parents = new Map<string, string>();

    add(key: string): void {
        if (!this.parents.has(key)) {
            this.parents.set(key, key);
        }
    }

    find(key: string): string {
        const parent = this.parents.get(key);

        if (parent === undefined) {
            throw new Error(`Unknown union-find key: ${key}`);
        }

        if (parent === key) {
            return key;
        }

        const root = this.find(parent);
        this.parents.set(key, root);

        return root;
    }

    union(firstKey: string, secondKey: string): void {
        const firstRoot = this.find(firstKey);
        const secondRoot = this.find(secondKey);

        if (firstRoot === secondRoot) {
            return;
        }

        if (firstRoot < secondRoot) {
            this.parents.set(secondRoot, firstRoot);
        } else {
            this.parents.set(firstRoot, secondRoot);
        }
    }
}
