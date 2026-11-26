import defineAction from '../../../helpers/define-action.js';
import { optionsArg, stringArg } from '../../../helpers/vertal-app-kit.js';
import { CLOUDFLARE_API, DNS_TYPES, buildDnsRecord, cfGet, cfId, getUser, unwrap } from '../common.js';

const getProfile = defineAction({
  name: 'Get my user',
  key: 'getUser',
  description: 'Returns the connected Cloudflare user (id, e-mail, name).',
  arguments: [],
  async run($) {
    $.setActionItem({ raw: await getUser($) });
  },
});

const listAccounts = defineAction({
  name: 'List accounts',
  key: 'listAccounts',
  description: 'Lists the Cloudflare accounts this connection can access (id and name).',
  arguments: [],
  async run($) {
    const accounts = await cfGet($, '/accounts', { per_page: 50 });
    $.setActionItem({ raw: { accounts: (accounts || []).map((a) => ({ id: a.id, name: a.name, type: a.type })) } });
  },
});

const listZones = defineAction({
  name: 'List zones (domains)',
  key: 'listZones',
  description: 'Lists the domains (zones) with id, status and name servers. Optional filter by domain name.',
  arguments: [stringArg('name', 'Domain name (optional)')],
  async run($) {
    const { name } = $.step.parameters;
    const zones = await cfGet($, '/zones', { per_page: 50, ...(name ? { name: String(name).trim() } : {}) });
    $.setActionItem({
      raw: {
        zones: (zones || []).map((z) => ({
          id: z.id, name: z.name, status: z.status, plan: z.plan?.name, account: z.account?.name, name_servers: z.name_servers,
        })),
      },
    });
  },
});

const listDnsRecords = defineAction({
  name: 'List DNS records',
  key: 'listDnsRecords',
  description: 'Lists the DNS records of a zone (use List zones to get the zone id).',
  arguments: [stringArg('zoneId', 'Zone ID', { required: true }), optionsArg('type', 'Type (optional)', [{ label: 'All', value: '' }, ...DNS_TYPES], { required: false })],
  async run($) {
    const { zoneId, type } = $.step.parameters;
    const records = await cfGet($, `/zones/${cfId(zoneId, 'Zone ID')}/dns_records`, { per_page: 100, ...(type ? { type } : {}) });
    $.setActionItem({
      raw: { records: (records || []).map((r) => ({ id: r.id, type: r.type, name: r.name, content: r.content, proxied: r.proxied, ttl: r.ttl })) },
    });
  },
});

const createDnsRecord = defineAction({
  name: 'Create DNS record',
  key: 'createDnsRecord',
  description: 'Creates a DNS record (A, AAAA, CNAME, TXT, MX, NS, SRV, CAA) in a zone.',
  arguments: [
    stringArg('zoneId', 'Zone ID', { required: true }),
    optionsArg('type', 'Type', DNS_TYPES, { value: 'A' }),
    stringArg('name', 'Name (e.g. www or app.example.com)', { required: true }),
    stringArg('content', 'Content (IP, target host or text)', { required: true }),
    stringArg('ttl', 'TTL in seconds (1 = automatic)', { value: '1' }),
    optionsArg('proxied', 'Proxied through Cloudflare (A/AAAA/CNAME)', ['false', 'true'], { required: false, value: 'false' }),
    stringArg('priority', 'Priority (MX only)'),
    stringArg('comment', 'Comment'),
  ],
  async run($) {
    const p = $.step.parameters;
    const zone = cfId(p.zoneId, 'Zone ID');
    const { data } = await $.http.post(`${CLOUDFLARE_API}/zones/${zone}/dns_records`, buildDnsRecord(p));
    const r = unwrap(data);
    $.setActionItem({ raw: { id: r.id, type: r.type, name: r.name, content: r.content, proxied: r.proxied, ttl: r.ttl } });
  },
});

const listWorkers = defineAction({
  name: 'List Workers',
  key: 'listWorkers',
  description: 'Lists the Workers scripts of an account (use List accounts to get the account id).',
  arguments: [stringArg('accountId', 'Account ID', { required: true })],
  async run($) {
    const scripts = await cfGet($, `/accounts/${cfId($.step.parameters.accountId, 'Account ID')}/workers/scripts`);
    $.setActionItem({ raw: { workers: (scripts || []).map((s) => ({ id: s.id, created_on: s.created_on, modified_on: s.modified_on })) } });
  },
});

const listPagesProjects = defineAction({
  name: 'List Pages projects',
  key: 'listPagesProjects',
  description: 'Lists the Cloudflare Pages projects of an account (needs the optional Pages permission).',
  arguments: [stringArg('accountId', 'Account ID', { required: true })],
  async run($) {
    const projects = await cfGet($, `/accounts/${cfId($.step.parameters.accountId, 'Account ID')}/pages/projects`);
    $.setActionItem({ raw: { projects: (projects || []).map((p) => ({ name: p.name, subdomain: p.subdomain, domains: p.domains, production_branch: p.production_branch })) } });
  },
});

const purgeCache = defineAction({
  name: 'Purge cache',
  key: 'purgeCache',
  description: 'Purges the cache of a zone: everything, or only the given URLs (comma separated). Needs the optional Cache Purge permission.',
  arguments: [stringArg('zoneId', 'Zone ID', { required: true }), stringArg('urls', 'URLs (comma separated; empty = everything)')],
  async run($) {
    const { zoneId, urls } = $.step.parameters;
    const files = String(urls || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30);
    if (files.some((u) => !/^https?:\/\//i.test(u))) throw new Error('Cloudflare: each URL must start with http(s)://');
    const body = files.length ? { files } : { purge_everything: true };
    const { data } = await $.http.post(`${CLOUDFLARE_API}/zones/${cfId(zoneId, 'Zone ID')}/purge_cache`, body);
    $.setActionItem({ raw: { purged: files.length ? files : 'everything', result: unwrap(data) } });
  },
});

export default [getProfile, listAccounts, listZones, listDnsRecords, createDnsRecord, listWorkers, listPagesProjects, purgeCache];
