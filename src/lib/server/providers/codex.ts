import { spawn } from 'node:child_process';
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import type { AIProvider } from '../../providers/contracts';
import { ImportError } from '../import-errors';

// Use official Codex CLI authentication; never read/copy authentication tokens.
// Drop API keys so this optional adapter cannot silently incur API billing.
function codexEnvironment() {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.CODEX_API_KEY;
  return env;
}
async function executable() {
  const configured = process.env.FORGE_CODEX_BIN;
  const candidates = configured ? [configured] : (process.env.PATH || '').split(path.delimiter).map(dir => path.join(dir, 'codex'));
  for (const candidate of candidates) {
    try { await access(candidate, constants.X_OK); return candidate; } catch { /* Try next PATH entry. */ }
  }
  throw new ImportError('Codex was not found. Install Codex CLI or set FORGE_CODEX_BIN in .env.local, then restart Forge.', 503);
}

function run(binary: string, args: string[], cwd: string, input = '', timeout = 180000) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(binary, args, { cwd, env: codexEnvironment(), shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeout);
    const capture = (chunk: Buffer, isError: boolean) => {
      if (isError) stderr = (stderr + chunk.toString()).slice(-20000);
      else stdout += chunk.toString();
      if (stdout.length > 1_000_000) child.kill('SIGKILL');
    };
    child.stdout.on('data', chunk => capture(chunk, false));
    child.stderr.on('data', chunk => capture(chunk, true));
    child.stdin.on('error', () => { /* Process exit is handled below. */ });
    child.on('error', () => { clearTimeout(timer); reject(new ImportError('Could not start Codex. Check its installation and restart Forge.', 503)); });
    child.on('close', code => {
      clearTimeout(timer);
      if (timedOut) return reject(new ImportError('Codex took too long. Your saved work is safe; retry generation.', 504));
      if (code !== 0) {
        const limit = /usage limit|rate.limit|quota|credits/i.test(stderr);
        reject(new ImportError(limit ? 'Your Codex usage allowance is currently unavailable. Retry later or save without AI.' : 'Codex could not finish. Check that codex login uses ChatGPT and that your connection is working. Your saved work is unchanged.', 503));
      } else resolve(stdout + (args[0] === 'login' ? stderr : ''));
    });
    child.stdin.end(input);
  });
}

export async function codexStatus() {
  try {
    const binary = await executable();
    const result = await run(binary, ['login', 'status'], tmpdir(), '', 10000);
    const connected = /Logged in using ChatGPT/i.test(result);
    return { connected, message: connected ? 'Connected with ChatGPT · uses your Codex allowance' : 'Sign in using ChatGPT with codex login. API-key billing is not enabled in Forge.' };
  } catch (error) {
    return { connected: false, message: error instanceof Error ? error.message : 'Codex is unavailable.' };
  }
}

export class CodexProvider implements AIProvider {
  async generateStructured<T>(prompt: string, schema: z.ZodType<T>, imagePaths: string[] = []): Promise<T> {
    const status = await codexStatus();
    if (!status.connected) throw new ImportError(status.message, 503);
    const directory = await mkdtemp(path.join(tmpdir(), 'forge-codex-'));
    try {
      const schemaFile = path.join(directory, 'schema.json');
      const outputFile = path.join(directory, 'result.json');
      await writeFile(schemaFile, JSON.stringify(z.toJSONSchema(schema)));
      const imageArgs: string[] = [];
      for (const [index, source] of imagePaths.slice(0,8).entries()) {
        const destination = path.join(directory, `asset-${index+1}.jpg`);
        await copyFile(source,destination);
        imageArgs.push('--image',destination);
      }
      await run(await executable(), [
        'exec', '--ignore-user-config', '--ephemeral', '--skip-git-repo-check',
        '--sandbox', 'read-only', '-c', 'approval_policy="never"',
        '-c', 'model_reasoning_effort="low"', '-c', 'web_search="disabled"', '-c', 'features.shell_tool=false',
        '--output-schema', schemaFile, '--output-last-message', outputFile, ...imageArgs, '-',
      ], directory, prompt);
      return schema.parse(JSON.parse(await readFile(outputFile, 'utf8')));
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
  async generateText(prompt: string) {
    const result = await this.generateStructured(prompt, z.object({ text: z.string() }));
    return result.text;
  }
  async analyzeImage<T>(_path: string, _prompt: string, _schema: z.ZodType<T>): Promise<T> {
    throw new ImportError('Image analysis is not enabled yet. App profiles currently use the imported listing text.', 501);
  }
}
