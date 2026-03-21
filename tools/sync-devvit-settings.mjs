import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const SETTINGS = [
  {
    envKey: 'SUPABASE_URL',
    settingKey: 'supabase_url',
    required: true,
    secret: false,
  },
  {
    envKey: 'SUPABASE_SERVICE_ROLE_KEY',
    settingKey: 'supabase_service_role_key',
    required: true,
    secret: true,
  },
  {
    envKey: 'SUPABASE_TABLE',
    settingKey: 'supabase_table',
    required: false,
    secret: false,
    defaultValue: 'reddit_posts',
  },
  {
    envKey: 'ARCHIVE_FETCH_LIMIT',
    settingKey: 'archive_fetch_limit',
    required: false,
    secret: false,
    defaultValue: '5000',
  },
];

const CONFIG_PATH = 'devvit.json';
const ENV_PATH = '.env';
const SKIP_SYNC = process.env.SKIP_DEVVIT_SETTINGS_SYNC === '1';

const stripOuterQuotes = (value) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
};

const parseEnvFile = (filePath) => {
  const out = {};
  if (!existsSync(filePath)) return out;

  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = stripOuterQuotes(line.slice(eqIndex + 1).trim());
    out[key] = value;
  }

  return out;
};

const runDevvit = (args, input) => {
  const result = spawnSync('npx', ['devvit', ...args, '--config', CONFIG_PATH], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    input,
  });

  if (result.status !== 0) {
    const details = `${result.stdout || ''}${result.stderr || ''}`.trim();
    const command = `npx devvit ${args.join(' ')} --config ${CONFIG_PATH}`;
    throw new Error(
      details ||
        `${command}\nCheck that Devvit CLI is logged in (\`npm run login\`) and network access is available.`
    );
  }

  return `${result.stdout || ''}${result.stderr || ''}`;
};

const isUnsupportedSettingsListError = (message) =>
  /GetAppSettingsFields|GetForm|Unimplemented/i.test(message);

const isUnsupportedSettingsSetError = (message) =>
  /ValidateAppForm|UpdateSettings|Unimplemented/i.test(message);

const envFromFile = parseEnvFile(ENV_PATH);
const readEnv = (key) => {
  const runtimeValue = process.env[key];
  if (typeof runtimeValue === 'string' && runtimeValue.trim().length > 0) {
    return runtimeValue.trim();
  }
  const fileValue = envFromFile[key];
  if (typeof fileValue === 'string' && fileValue.trim().length > 0) {
    return fileValue.trim();
  }
  return undefined;
};

if (SKIP_SYNC) {
  console.log('[sync:settings] skipped (SKIP_DEVVIT_SETTINGS_SYNC=1)');
  process.exit(0);
}

try {
  console.log('[sync:settings] checking current Devvit settings...');
  let listOutput = '';
  let canVerifyRemote = true;
  let canWriteRemote = true;

  try {
    listOutput = runDevvit(['settings', 'list']);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!isUnsupportedSettingsListError(message)) {
      throw error;
    }

    canVerifyRemote = false;
    console.warn(
      '[sync:settings] `devvit settings list` is unsupported by this Devvit environment; falling back to best-effort sync from local .env values only.'
    );
  }

  const missingRequired = [];
  const summary = [];

  for (const entry of SETTINGS) {
    const configuredLocally = readEnv(entry.envKey) ?? entry.defaultValue;
    const hasRemoteValue = canVerifyRemote && listOutput.includes(entry.settingKey);

    if (configuredLocally) {
      if (canWriteRemote) {
        try {
          runDevvit(['settings', 'set', entry.settingKey], `${configuredLocally}\n`);
          summary.push(
            `[sync:settings] set ${entry.settingKey} from ${entry.envKey}${entry.secret ? ' (secret)' : ''}`
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!isUnsupportedSettingsSetError(message)) {
            throw error;
          }

          canWriteRemote = false;
          summary.push(
            `[sync:settings] remote settings update unsupported by this Devvit environment; skipping sync for ${entry.settingKey}`
          );
          summary.push(
            '[sync:settings] deploy/publish can continue, but archive settings may remain unchanged remotely'
          );
        }
      } else {
        summary.push(
          `[sync:settings] skipped remote write for ${entry.settingKey} because app settings updates are unsupported in this environment`
        );
      }
      continue;
    }

    if (canVerifyRemote && hasRemoteValue) {
      summary.push(`[sync:settings] kept existing remote value for ${entry.settingKey}`);
      continue;
    }

    if (entry.required) {
      if (canVerifyRemote) {
        missingRequired.push(`${entry.envKey} (${entry.settingKey})`);
      } else {
        summary.push(
          `[sync:settings] could not verify remote required setting ${entry.settingKey}; provide ${entry.envKey} locally if launch still fails later`
        );
      }
    } else {
      summary.push(`[sync:settings] optional ${entry.settingKey} not set`);
    }
  }

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required settings. Provide in .env or set remotely:\n- ${missingRequired.join('\n- ')}`
    );
  }

  console.log(summary.join('\n'));
  if (!canWriteRemote) {
    console.warn(
      '[sync:settings] completed without remote updates. If the deployed app still needs archive settings, configure them through a Devvit environment that supports app settings mutations.'
    );
  }
  console.log('[sync:settings] complete');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[sync:settings] failed: ${message}`);
  process.exit(1);
}
