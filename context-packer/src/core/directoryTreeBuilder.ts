import { opendir } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { join } from 'node:path';
import type { Ignore } from 'ignore';

export class DirectoryTreeBuilder {
    constructor(
        private readonly rootDir: string,
        private readonly ignoreFilter: Ignore
    ) {}

    public async build(): Promise<string> {
        const lines: string[] = [];

        await this.walk(this.rootDir, '', lines);

        return lines.join('\n');
    }

    private async walk(
        currentDir: string,
        prefix: string,
        lines: string[]
    ): Promise<void> {
        const dir = await opendir(currentDir);

        const entries: Dirent[] = [];

        for await (const entry of dir) {
            entries.push(entry);
        }

        entries.sort((a, b) => a.name.localeCompare(b.name));

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]!;

            const fullPath = join(currentDir, entry.name);

            const relativePath = fullPath
                .replace(this.rootDir, '')
                .replace(/^[/\\]/, '');

            if (this.ignoreFilter.ignores(relativePath)) {
                continue;
            }

            const isLast = i === entries.length - 1;

            const connector = isLast
                ? '└── '
                : '├── ';

            lines.push(prefix + connector + entry.name);

            if (entry.isDirectory()) {
                const nextPrefix = isLast
                    ? prefix + '    '
                    : prefix + '│   ';

                await this.walk(
                    fullPath,
                    nextPrefix,
                    lines
                );
            }
        }
    }
}