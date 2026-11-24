// API interna do Vertal Dev (creative-router) para o Vertal Fluxos.
//
// Cada usuário do Vertal Dev conecta os apps do Vertal Fluxos pelo próprio
// Vertal Dev. As conexões ficam guardadas (criptografadas) aqui, em nome de um
// usuário de serviço; o Vertal Dev guarda qual conexão é de qual usuário e só
// chama esta API pelo servidor, com a chave VERTAL_INTERNAL_KEY.
//
// Rotas (todas exigem o cabeçalho x-vertal-internal-key):
//   GET    /internal/vertal/apps/:key                  definição do app (campos de login, ações, buscas)
//   POST   /internal/vertal/connections                {appKey, formattedData} → {id}
//   POST   /internal/vertal/connections/:id/auth-url    → {url}
//   POST   /internal/vertal/connections/:id/complete    {formattedData} → {verified, screenName}
//   POST   /internal/vertal/connections/:id/verify      → {verified, screenName}
//   DELETE /internal/vertal/connections/:id
//   POST   /internal/vertal/run      {appKey, kind: action|trigger, key, connectionId?, parameters}
//   POST   /internal/vertal/dynamic-data {appKey, key, connectionId?, parameters}
import crypto from 'node:crypto';
import { Router } from 'express';
import App from '@/models/app.js';
import Connection from '@/models/connection.js';
import User from '@/models/user.js';
import Role from '@/models/role.js';
import globalVariable from '@/engine/global-variable.js';
import EarlyExitError from '@/errors/early-exit.js';
import AlreadyProcessedError from '@/errors/already-processed.js';
import HttpError from '@/errors/http.js';
import { logger } from '@/helpers/logger.js';

const router = Router();

const MAX_TRIGGER_ITEMS = 20;
const RUN_TIMEOUT_MS = 50_000;

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb) && a.length === b.length;
}

export function requireVertalKey(req, res, next) {
  const expected = process.env.VERTAL_INTERNAL_KEY;
  if (!expected || expected.length < 32) {
    return res.status(503).json({ error: 'not_configured' });
  }
  if (!safeEqual(req.get('x-vertal-internal-key') || '', expected)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}

router.use(requireVertalKey);

let serviceUserCache = null;
async function serviceUser() {
  if (serviceUserCache) return serviceUserCache;
  const email = process.env.VERTAL_SERVICE_USER_EMAIL;
  let user = email
    ? await User.query().findOne({ email: email.toLowerCase() })
    : null;
  if (!user) {
    const admin = await Role.findAdmin();
    user = await User.query()
      .where({ role_id: admin.id })
      .orderBy('created_at', 'asc')
      .first();
  }
  if (!user) throw new Error('service_user_missing');
  serviceUserCache = user;
  return user;
}

async function loadApp(key) {
  if (typeof key !== 'string' || !/^[a-z0-9-]{1,64}$/.test(key)) return null;
  try {
    return await App.findOneByKey(key, false);
  } catch {
    return null;
  }
}

async function loadConnection(id, appKey) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const user = await serviceUser();
  const conn = await user
    .$relatedQuery('connections')
    .findById(id);
  if (!conn) return null;
  if (appKey && conn.key !== appKey) return null;
  return conn;
}

// Campo de argumento em formato simples para o agente/formulário.
export function describeArgument(arg) {
  const out = {
    key: arg.key,
    label: arg.label,
    type: arg.type,
    required: !!arg.required,
  };
  if (arg.description) out.description = String(arg.description).slice(0, 300);
  if (Array.isArray(arg.options)) {
    out.options = arg.options.slice(0, 50).map((o) => ({
      label: o.label,
      value: o.value,
    }));
  }
  if (arg.source?.type === 'query') {
    const k = arg.source.arguments?.find((a) => a.name === 'key')?.value;
    if (k) out.dynamicData = k;
  }
  if (arg.additionalFields) out.hasDynamicFields = true;
  if (arg.type === 'dynamic' && Array.isArray(arg.fields)) {
    out.fields = arg.fields.map(describeArgument);
  }
  return out;
}

export function describeApp(app) {
  const authFields = (app.auth?.fields || [])
    .filter((f) => f.key !== 'oAuthRedirectUrl' && !f.readOnly)
    .map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: !!f.required,
      description: f.description
        ? String(f.description).replace(/Automatisch/g, 'Vertal Fluxos')
        : undefined,
      placeholder: f.placeholder || undefined,
      value: f.value ?? undefined,
      options: Array.isArray(f.options) ? f.options : undefined,
    }));
  return {
    key: app.key,
    name: app.name,
    supportsConnections: app.supportsConnections !== false && !!app.auth,
    oauth: !!app.auth?.generateAuthUrl,
    authFields,
    actions: (app.actions || []).map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      arguments: (a.arguments || []).map(describeArgument),
    })),
    searches: (app.triggers || [])
      .filter((t) => t.type !== 'webhook' && typeof t.run === 'function')
      .map((t) => ({
        key: t.key,
        name: t.name,
        description: t.description,
        arguments: (t.arguments || []).map(describeArgument),
      })),
  };
}

function screenNameOf(conn) {
  return conn?.formattedData?.screenName || null;
}

function errorPayload(error) {
  if (error instanceof HttpError) {
    return { error: 'provider_error', details: error.details };
  }
  return { error: 'failed', message: String(error?.message || error).slice(0, 500) };
}

router.get('/apps/:key', async (req, res) => {
  const app = await loadApp(req.params.key);
  if (!app) return res.status(404).json({ error: 'app_not_found' });
  return res.json(describeApp(app));
});

router.post('/connections', async (req, res) => {
  const { appKey, formattedData } = req.body || {};
  const app = await loadApp(appKey);
  if (!app || !app.auth) return res.status(404).json({ error: 'app_not_found' });
  const user = await serviceUser();
  const data =
    formattedData && typeof formattedData === 'object' ? formattedData : {};
  try {
    const conn = await user.$relatedQuery('connections').insertAndFetch({
      key: appKey,
      formattedData: data,
      verified: false,
    });
    return res.status(201).json({ id: conn.id });
  } catch (error) {
    logger.error(error);
    return res.status(400).json(errorPayload(error));
  }
});

router.post('/connections/:id/auth-url', async (req, res) => {
  const conn = await loadConnection(req.params.id);
  if (!conn) return res.status(404).json({ error: 'connection_not_found' });
  try {
    const { url } = await conn.generateAuthUrl();
    return res.json({ url });
  } catch (error) {
    logger.error(error);
    return res.status(400).json(errorPayload(error));
  }
});

async function verify(conn, res) {
  try {
    const updated = await conn.verifyAndUpdateConnection();
    return res.json({ verified: true, screenName: screenNameOf(updated) });
  } catch (error) {
    logger.error(error);
    return res.status(400).json({ verified: false, ...errorPayload(error) });
  }
}

router.post('/connections/:id/complete', async (req, res) => {
  const conn = await loadConnection(req.params.id);
  if (!conn) return res.status(404).json({ error: 'connection_not_found' });
  const formattedData = req.body?.formattedData;
  if (!formattedData || typeof formattedData !== 'object') {
    return res.status(400).json({ error: 'invalid_input' });
  }
  const updated = await conn.updateFormattedData({ formattedData });
  return verify(updated, res);
});

router.post('/connections/:id/verify', async (req, res) => {
  const conn = await loadConnection(req.params.id);
  if (!conn) return res.status(404).json({ error: 'connection_not_found' });
  return verify(conn, res);
});

router.delete('/connections/:id', async (req, res) => {
  const conn = await loadConnection(req.params.id);
  if (!conn) return res.status(204).end();
  const steps = await conn.$relatedQuery('steps').limit(1);
  if (steps.length > 0) {
    // Usada num fluxo: só apaga os dados de login, o registro fica.
    await conn.reset();
    await conn.$query().patch({ verified: false });
    return res.status(200).json({ ok: true, kept: true });
  }
  await conn.$query().delete();
  return res.status(200).json({ ok: true });
});

function withTimeout(promise, ms) {
  let t;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      t = setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]).finally(() => clearTimeout(t));
}

async function buildContext(body) {
  const { appKey, connectionId, parameters } = body || {};
  const app = await loadApp(appKey);
  if (!app) return { status: 404, error: 'app_not_found' };
  let connection = null;
  if (app.auth && app.supportsConnections !== false) {
    connection = await loadConnection(connectionId, appKey);
    if (!connection) return { status: 404, error: 'connection_not_found' };
  }
  const step = {
    appKey,
    parameters:
      parameters && typeof parameters === 'object' ? { ...parameters } : {},
    isTrigger: false,
    isAction: true,
  };
  const $ = await globalVariable({ connection, app, step, testRun: true });
  return { app, $ };
}

router.post('/run', async (req, res) => {
  const { kind = 'action', key } = req.body || {};
  const ctx = await buildContext(req.body);
  if (ctx.error) return res.status(ctx.status).json({ error: ctx.error });
  const { app, $ } = ctx;

  if (kind === 'trigger') {
    const trigger = app.triggers?.find((t) => t.key === key);
    if (!trigger || trigger.type === 'webhook' || !trigger.run) {
      return res.status(404).json({ error: 'search_not_found' });
    }
    const items = [];
    $.pushTriggerItem = (item) => {
      items.push(item?.raw ?? item);
      if (items.length >= MAX_TRIGGER_ITEMS) throw new EarlyExitError();
    };
    try {
      await withTimeout(Promise.resolve(trigger.run($)), RUN_TIMEOUT_MS);
    } catch (error) {
      if (
        !(error instanceof EarlyExitError) &&
        !(error instanceof AlreadyProcessedError)
      ) {
        logger.error(error);
        return res.status(200).json({ ok: false, ...errorPayload(error) });
      }
    }
    return res.json({ ok: true, items });
  }

  const action = app.actions?.find((a) => a.key === key);
  if (!action || !action.run) {
    return res.status(404).json({ error: 'action_not_found' });
  }
  try {
    await withTimeout(Promise.resolve(action.run($)), RUN_TIMEOUT_MS);
  } catch (error) {
    if (!(error instanceof EarlyExitError)) {
      logger.error(error);
      return res.status(200).json({ ok: false, ...errorPayload(error) });
    }
  }
  if ($.actionOutput.error) {
    return res.json({ ok: false, error: 'failed', details: $.actionOutput.error });
  }
  return res.json({ ok: true, data: $.actionOutput.data?.raw ?? null });
});

router.post('/dynamic-data', async (req, res) => {
  const { key } = req.body || {};
  const ctx = await buildContext(req.body);
  if (ctx.error) return res.status(ctx.status).json({ error: ctx.error });
  const { app, $ } = ctx;
  const command = app.dynamicData?.find((d) => d.key === key);
  if (!command) return res.status(404).json({ error: 'dynamic_data_not_found' });
  try {
    const result = await withTimeout(Promise.resolve(command.run($)), RUN_TIMEOUT_MS);
    const data = Array.isArray(result?.data) ? result.data.slice(0, 200) : [];
    return res.json({ ok: true, data });
  } catch (error) {
    logger.error(error);
    return res.status(200).json({ ok: false, ...errorPayload(error) });
  }
});

export default router;
