import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import dgram from 'node:dgram';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { once } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const SFU_CLIENT_PATH = path.join(ROOT, 'assets', 'sfu-client.js');
const GUARD_ID = 'ownlybiz-phase7-loopback-runtime-guard-20260821';
const CONFIRM_KEY = 'ownlybiz_phase7_loopback';
const CONFIRM_VALUE = 'RUN_LOCAL_BROWSER_RTC';
const TURN_KEY = 'ownlybiz_phase7_turn';
const TURN_VALUE = 'REQUIRE_LOOPBACK_TURN';
const TURN_PORT_KEY = 'ownlybiz_phase7_turn_port';
const SENTINEL = 'ownlybiz-phase7-browser-rtc-v1\n';
const CHROME_DEFAULT = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const COTURN_DEFAULT = '/opt/homebrew/opt/coturn/bin/turnserver';
const MAX_WS_PAYLOAD = 2 * 1024 * 1024;
const SYNTHETIC_CLIENT_TOKEN = 'PHASE7_SYNTHETIC_CLIENT_TOKEN';
const SYNTHETIC_EXPERT_TOKEN = 'PHASE7_SYNTHETIC_EXPERT_TOKEN';
const CLI_USAGE = Object.freeze({
  browser_contract:'--run',
  host_only_contract:'--run-host-only',
  preflight:'--preflight',
  contract:'--contract-test',
});
let verificationStage = 'argument_validation';
let verificationDiagnostic = null;

function output(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function ensureNode20() {
  if (Number(process.versions.node.split('.')[0]) !== 20) fail('node20_required');
}

function parseMode(argv) {
  if (argv.length === 0) fail('explicit_run_required');
  if (argv.length !== 1) fail('invalid_argument_combination');
  const mode = argv[0];
  if (!Object.values(CLI_USAGE).includes(mode)) fail('unknown_argument');
  return mode;
}

function readSfuClientSource() {
  let source = '';
  try {
    const stat = fs.statSync(SFU_CLIENT_PATH);
    if (!stat.isFile() || stat.size <= 0) fail('sfu_client_asset_unavailable');
    source = fs.readFileSync(SFU_CLIENT_PATH, 'utf8');
  } catch(error) {
    if (error?.code === 'sfu_client_asset_unavailable') throw error;
    fail('sfu_client_asset_unavailable');
  }
  if (!source.includes('ExpertSfuClient')
    || !source.includes('installOneToOneRtcPatch')
    || !source.includes('__obSfuPatched')) {
    fail('sfu_client_patch_unavailable');
  }
  return source;
}

function sfuClientReady() {
  try { readSfuClientSource(); return true; } catch { return false; }
}

function guardSource(html) {
  const escaped = GUARD_ID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match, 'phase7 guard missing');
  return match[1];
}

function rtcRuntimeSource(html) {
  const marker = html.indexOf('WEBRTC VOICE/VIDEO MODULE');
  assert(marker >= 0, 'rtc runtime marker missing');
  const open = html.lastIndexOf('<script', marker);
  const body = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', marker);
  assert(open >= 0 && body > open && close > marker, 'rtc runtime framing invalid');
  return html.slice(body, close);
}

function assertGuardPrecedesExternalScripts(source, guardEnd) {
  const firstExternalScript = source.search(/<script\b[^>]*\bsrc\s*=/i);
  assert(firstExternalScript === -1 || guardEnd < firstExternalScript,
    'guard must precede external scripts when the shell has any');
  return firstExternalScript;
}

function fakeGuardContext(search) {
  const policies = [];
  const peerConfigs = [];
  const networkCalls = [];
  function NativeWebSocket(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    networkCalls.push({kind:'websocket'});
  }
  Object.assign(NativeWebSocket, {CONNECTING:0, OPEN:1, CLOSING:2, CLOSED:3});
  function NativePeerConnection(configuration) {
    this.configuration = configuration;
    peerConfigs.push(configuration);
  }
  function NativeEventSource(url) { this.url = url; networkCalls.push({kind:'eventsource'}); }
  function NativeXHR() {}
  NativeXHR.prototype.open = function(method, url) { networkCalls.push({kind:'xhr'}); this.url = url; };
  const document = {
    head:{appendChild(node){policies.push(node.content || '');}},
    documentElement:{appendChild(node){policies.push(node.content || '');}},
    createElement(){return {};},
  };
  const location = {
    search,
    hostname:'127.0.0.1',
    host:'127.0.0.1:43111',
    port:'43111',
    protocol:'http:',
    origin:'http://127.0.0.1:43111',
    href:`http://127.0.0.1:43111/${search}`,
  };
  const sandbox = {
    window:null, document, location, navigator:{sendBeacon(){networkCalls.push({kind:'beacon'}); return true;}},
    URL, URLSearchParams, Object, Array, Number, String, Boolean, Math, JSON, Promise, TypeError,
    fetch(){networkCalls.push({kind:'fetch'}); return Promise.resolve({ok:true});},
    XMLHttpRequest:NativeXHR, WebSocket:NativeWebSocket, EventSource:NativeEventSource,
    RTCPeerConnection:NativePeerConnection, webkitRTCPeerConnection:NativePeerConnection,
  };
  sandbox.window = sandbox;
  return {sandbox, policies, peerConfigs, networkCalls, native:{NativeWebSocket, NativePeerConnection}};
}

function runContract() {
  ensureNode20();
  verificationStage = 'contract_execution_interlock';
  assert.throws(() => parseMode([]), (error) => error?.code === 'explicit_run_required');
  assert.throws(() => parseMode(['--run','--host-only']), (error) => error?.code === 'invalid_argument_combination');
  assert.throws(() => parseMode(['--host-only']), (error) => error?.code === 'unknown_argument');
  assert.equal(parseMode(['--run']), CLI_USAGE.browser_contract);
  assert.equal(parseMode(['--run-host-only']), CLI_USAGE.host_only_contract);
  assert.equal(parseMode(['--preflight']), CLI_USAGE.preflight);
  assert.equal(parseMode(['--contract-test']), CLI_USAGE.contract);
  verificationStage = 'contract_source_order';
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const sfuSource = readSfuClientSource();
  assert(sfuSource.length > 0, 'sfu client asset missing');
  const source = guardSource(html);
  const guardStart = html.indexOf(`<script id="${GUARD_ID}">`);
  const guardEnd = html.indexOf('</script>', guardStart);
  const firstHostedConstant = html.indexOf('https://ownlybiz-backend-production.up.railway.app');
  const firstRuntimeSocket = html.indexOf('new WebSocket(', guardEnd);
  assert(guardStart >= 0 && guardEnd > guardStart, 'guard framing invalid');
  assert(guardEnd < firstHostedConstant, 'guard must precede hosted constants');
  assertGuardPrecedesExternalScripts(html, guardEnd);
  assert(guardEnd < firstRuntimeSocket, 'guard must precede runtime sockets');
  const mutation = `<script src="https://phase7-order.invalid/before-guard.js"></script>${html}`;
  const mutatedGuardStart = mutation.indexOf(`<script id="${GUARD_ID}">`);
  const mutatedGuardEnd = mutation.indexOf('</script>', mutatedGuardStart);
  assert.throws(
    () => assertGuardPrecedesExternalScripts(mutation, mutatedGuardEnd),
    /guard must precede external scripts/,
    'a full-document scan must reject an external script inserted before the guard',
  );

  verificationStage = 'contract_default_inactive';
  const inactive = fakeGuardContext('?ordinary=1');
  vm.runInNewContext(source, inactive.sandbox, {filename:'phase7-loopback-runtime-guard.js'});
  assert.equal(inactive.sandbox.__OB_PHASE7_LOOPBACK__, undefined);
  assert.equal(inactive.sandbox.WebSocket, inactive.native.NativeWebSocket);
  assert.equal(inactive.sandbox.RTCPeerConnection, inactive.native.NativePeerConnection);
  assert.equal(inactive.policies.length, 0);

  verificationStage = 'contract_active_guard';
  const active = fakeGuardContext(`?${CONFIRM_KEY}=${CONFIRM_VALUE}&${TURN_KEY}=${TURN_VALUE}&${TURN_PORT_KEY}=45123`);
  vm.runInNewContext(source, active.sandbox, {filename:'phase7-loopback-runtime-guard.js'});
  assert.equal(active.sandbox.__OB_PHASE7_LOOPBACK__.active, true);
  assert.equal(active.sandbox.__OB_PHASE7_LOOPBACK__.mode, 'turn_relay');
  assert.equal(active.sandbox.OWNLYBIZ_API_URL, active.sandbox.location.origin);
  active.sandbox.OWNLYBIZ_API_URL = 'https://blocked.invalid';
  assert.equal(active.sandbox.OWNLYBIZ_API_URL, active.sandbox.location.origin);
  let syncError = null;
  try { new active.sandbox.WebSocket('wss://blocked.invalid/socket'); } catch(error) { syncError = error; }
  assert(syncError, 'non-loopback WebSocket must throw synchronously');
  assert.equal(syncError.message, 'OWNLYBIZ_PHASE7_LOOPBACK_BLOCKED');
  assert(!/phase7-blocked|\.invalid|wss:\/\/|\/socket/i.test(syncError.message), 'guard error must not echo an identifier');
  verificationStage = 'contract_turn_sanitization';
  const peer = new active.sandbox.RTCPeerConnection({
    iceServers:[
      {urls:'turn:127.0.0.1:45123?transport=udp',username:'synthetic',credential:'synthetic'},
      {urls:'stun:blocked.invalid:3478'},
    ],
  });
  assert.equal(peer.configuration.iceTransportPolicy, 'relay');
  assert.deepEqual(JSON.parse(JSON.stringify(peer.configuration.iceServers)), [
    {urls:'turn:127.0.0.1:45123?transport=udp',username:'synthetic',credential:'synthetic'},
  ]);
  assert(active.policies.some((policy) => /connect-src 'self' ws:\/\/127\.0\.0\.1:43111/.test(policy)));

  verificationStage = 'contract_rejected_activation';
  const rejected = fakeGuardContext(`?${CONFIRM_KEY}=WRONG`);
  vm.runInNewContext(source, rejected.sandbox, {filename:'phase7-loopback-runtime-guard.js'});
  assert.equal(rejected.sandbox.__OB_PHASE7_LOOPBACK__.active, false);
  assert(rejected.policies.some((policy) => policy === "default-src 'none'; style-src 'unsafe-inline'"));

  output({
    status:'PASS',
    phase:'phase7_browser_rtc_contract',
    checks:{guard_order:true,default_inactive:true,activation_fail_closed:true,identifier_free_rejection:true,turn_sanitized:true,explicit_execution_interlock:true,sfu_patch_asset:true},
    evidence:{browser:false,turn_traffic:false,synthetic_relay:true,phase7_closure:false},
    invocations:CLI_USAGE,
  });
}

function isExecutable(file) {
  try { fs.accessSync(file, fs.constants.R_OK | fs.constants.X_OK); return fs.statSync(file).isFile(); }
  catch { return false; }
}

function findPlaywrightDir() {
  const explicit = String(process.env.OWNLYBIZ_PLAYWRIGHT_DIR || '');
  if (explicit) return path.resolve(explicit);
  const npxRoot = path.join(os.homedir(), '.npm', '_npx');
  let candidates = [];
  try {
    candidates = fs.readdirSync(npxRoot).map((name) => path.join(npxRoot, name, 'node_modules', 'playwright'));
  } catch {}
  const installed = candidates.flatMap((dir) => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      return pkg.name === 'playwright' ? [{dir, version:String(pkg.version || '0.0.0')}] : [];
    } catch { return []; }
  });
  installed.sort((a, b) => b.version.localeCompare(a.version, undefined, {numeric:true}));
  return installed[0]?.dir || '';
}

function dependencyState({hostOnly = false} = {}) {
  const chrome = path.resolve(String(process.env.OWNLYBIZ_CHROME_BIN || CHROME_DEFAULT));
  const coturn = path.resolve(String(process.env.OWNLYBIZ_COTURN_BIN || COTURN_DEFAULT));
  const playwrightDir = findPlaywrightDir();
  const sfuClient = sfuClientReady();
  let playwright = false;
  if (playwrightDir) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(playwrightDir, 'package.json'), 'utf8'));
      playwright = pkg.name === 'playwright' && fs.existsSync(path.join(playwrightDir, 'index.mjs'));
    } catch {}
  }
  return {
    ready:Number(process.versions.node.split('.')[0]) === 20 && isExecutable(chrome) && playwright && sfuClient && (hostOnly || isExecutable(coturn)),
    node20:Number(process.versions.node.split('.')[0]) === 20,
    chrome:isExecutable(chrome), playwright, sfuClient, coturn:hostOnly ? null : isExecutable(coturn),
    paths:{chrome, coturn, playwrightDir},
  };
}

function runPreflight({hostOnly = false} = {}) {
  const state = dependencyState({hostOnly});
  output({
    status:state.ready ? 'READY' : 'BLOCKED_INFRASTRUCTURE',
    phase:'phase7_browser_rtc_preflight',
    mode:hostOnly ? 'host_only_contract' : 'turn_relay_contract',
    checks:{node20:state.node20,system_chrome:state.chrome,playwright:state.playwright,sfu_client_asset:state.sfuClient,coturn:state.coturn},
    execute:hostOnly ? CLI_USAGE.host_only_contract : CLI_USAGE.browser_contract,
  });
  process.exitCode = state.ready ? 0 : 2;
}

function makeScratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ownlybiz-phase7-browser-rtc-'));
  fs.writeFileSync(path.join(dir, '.ownlybiz-phase7-sentinel'), SENTINEL, {encoding:'utf8',mode:0o600,flag:'wx'});
  return dir;
}

function cleanupScratch(dir) {
  const resolved = path.resolve(dir);
  const tempRoot = path.resolve(os.tmpdir());
  if (!resolved.startsWith(`${tempRoot}${path.sep}`) || !path.basename(resolved).startsWith('ownlybiz-phase7-browser-rtc-')) fail('scratch_cleanup_refused');
  const sentinel = fs.readFileSync(path.join(resolved, '.ownlybiz-phase7-sentinel'), 'utf8');
  if (sentinel !== SENTINEL) fail('scratch_sentinel_mismatch');
  fs.rmSync(resolved, {recursive:true,force:false});
}

async function closeNetServer(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function closeUdp(socket) {
  await new Promise((resolve) => {
    try { socket.close(resolve); } catch { resolve(); }
  });
}

async function reserveDualPort() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const tcp = net.createServer();
    await new Promise((resolve, reject) => {
      tcp.once('error', reject);
      tcp.listen(0, '127.0.0.1', resolve);
    });
    const port = tcp.address().port;
    const udp = dgram.createSocket('udp4');
    try {
      await new Promise((resolve, reject) => {
        udp.once('error', reject);
        udp.bind(port, '127.0.0.1', resolve);
      });
      await closeUdp(udp);
      await closeNetServer(tcp);
      return port;
    } catch {
      await closeUdp(udp);
      await closeNetServer(tcp);
    }
  }
  fail('loopback_port_unavailable');
}

async function reserveUdpRange(size = 24, excludedPort = 0) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const first = crypto.randomInt(40000, 61000 - size);
    if (excludedPort >= first && excludedPort < first + size) continue;
    const sockets = [];
    try {
      for (let offset = 0; offset < size; offset += 1) {
        const socket = dgram.createSocket('udp4');
        sockets.push(socket);
        await new Promise((resolve, reject) => {
          socket.once('error', reject);
          socket.bind(first + offset, '127.0.0.1', resolve);
        });
      }
      await Promise.all(sockets.map(closeUdp));
      return {min:first,max:first + size - 1};
    } catch {
      await Promise.all(sockets.map(closeUdp));
    }
  }
  fail('turn_relay_range_unavailable');
}

function waitForTcp(port, child, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const probe = () => {
      if (child.exitCode !== null || child.signalCode) return reject(Object.assign(new Error('turn_start_failed'), {code:'turn_start_failed'}));
      const socket = net.createConnection({host:'127.0.0.1',port});
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - started >= timeoutMs) reject(Object.assign(new Error('turn_start_timeout'), {code:'turn_start_timeout'}));
        else setTimeout(probe, 100);
      });
    };
    probe();
  });
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode) return true;
  child.kill('SIGTERM');
  let timer;
  const timed = new Promise((resolve) => { timer = setTimeout(() => resolve(false), 5000); });
  const exited = once(child, 'exit').then(() => true);
  const graceful = await Promise.race([timed, exited]);
  clearTimeout(timer);
  if (!graceful && child.exitCode === null && !child.signalCode) {
    child.kill('SIGKILL');
    await once(child, 'exit').catch(() => {});
  }
  return child.exitCode !== null || !!child.signalCode;
}

async function startTurn({bin, scratch, port, range, username, credential}) {
  const configPath = path.join(scratch, 'turnserver.conf');
  fs.writeFileSync(configPath, `user=${username}:${credential}\n`, {encoding:'utf8',mode:0o600,flag:'wx'});
  const args = [
    '-c', configPath,
    `--listening-ip=127.0.0.1`,
    `--relay-ip=127.0.0.1`,
    `--listening-port=${port}`,
    `--min-port=${range.min}`,
    `--max-port=${range.max}`,
    '--fingerprint',
    '--lt-cred-mech',
    '--realm=phase7.local',
    '--allow-loopback-peers',
    '--allowed-peer-ip=127.0.0.1',
    '--denied-peer-ip=0.0.0.0-126.255.255.255',
    '--denied-peer-ip=127.0.0.0-127.0.0.0',
    '--denied-peer-ip=127.0.0.2-255.255.255.255',
    '--no-multicast-peers',
    '--no-tls',
    '--no-dtls',
    '--no-rfc5780',
    '--user-quota=4',
    '--total-quota=4',
    '--relay-threads=1',
    '--cpus=1',
    '--no-software-attribute',
    '--simple-log',
    '--no-stdout-log',
    `--pidfile=${path.join(scratch, 'turn.pid')}`,
    `--log-file=${path.join(scratch, 'turn.log')}`,
  ];
  const child = spawn(bin, args, {
    cwd:scratch,
    stdio:['ignore','pipe','pipe'],
    env:{PATH:'/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin',LANG:'C',LC_ALL:'C'},
  });
  let outputBytes = 0;
  const consume = (chunk) => { outputBytes += chunk.length; if (outputBytes > 128 * 1024) child.kill('SIGTERM'); };
  child.stdout.on('data', consume);
  child.stderr.on('data', consume);
  await waitForTcp(port, child);
  return child;
}

function wsFrame(opcode, payload = Buffer.alloc(0)) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  let header;
  if (body.length < 126) {
    header = Buffer.from([0x80 | opcode, body.length]);
  } else if (body.length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(body.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(body.length), 2);
  }
  return Buffer.concat([header, body]);
}

class LocalWsClient {
  constructor(socket, relay) {
    this.socket = socket;
    this.relay = relay;
    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    this.fragmentOpcode = 0;
    this.closed = false;
    this.role = '';
    this.joined = new Set();
    this.subscriptions = new Set();
    this.signalTypes = new Set();
    this.deliveredTypes = new Map();
    this.relayCandidates = 0;
    socket.on('data', (chunk) => this.consume(chunk));
    socket.on('error', () => this.destroy());
    socket.on('close', () => this.destroy());
  }

  send(value) {
    if (this.closed || this.socket.destroyed) return;
    this.socket.write(wsFrame(0x1, Buffer.from(JSON.stringify(value))));
  }

  close() {
    if (this.closed) return;
    try { this.socket.write(wsFrame(0x8, Buffer.from([0x03, 0xe8]))); } catch {}
    this.socket.end();
  }

  destroy() {
    if (this.closed) return;
    this.closed = true;
    this.relay.clients.delete(this);
    try { this.socket.destroy(); } catch {}
  }

  protocolError() {
    try { this.socket.write(wsFrame(0x8, Buffer.from([0x03, 0xea]))); } catch {}
    this.destroy();
  }

  consume(chunk) {
    if (this.closed) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const fin = !!(first & 0x80);
      const opcode = first & 0x0f;
      const masked = !!(second & 0x80);
      let length = second & 0x7f;
      let offset = 2;
      if (!masked || (first & 0x70)) return this.protocolError();
      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        const wide = this.buffer.readBigUInt64BE(2);
        if (wide > BigInt(MAX_WS_PAYLOAD)) return this.protocolError();
        length = Number(wide);
        offset = 10;
      }
      if (length > MAX_WS_PAYLOAD) return this.protocolError();
      if (this.buffer.length < offset + 4 + length) return;
      const mask = this.buffer.subarray(offset, offset + 4);
      offset += 4;
      const payload = Buffer.from(this.buffer.subarray(offset, offset + length));
      this.buffer = this.buffer.subarray(offset + length);
      for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i % 4];
      if (opcode === 0x8) { this.close(); return; }
      if (opcode === 0x9) { this.socket.write(wsFrame(0xA, payload)); continue; }
      if (opcode === 0xA) continue;
      if (opcode === 0x0) {
        if (!this.fragmentOpcode) return this.protocolError();
        this.fragments.push(payload);
        if (fin) {
          const complete = Buffer.concat(this.fragments);
          const original = this.fragmentOpcode;
          this.fragments = [];
          this.fragmentOpcode = 0;
          if (original !== 0x1) return this.protocolError();
          this.message(complete);
        }
        continue;
      }
      if (opcode !== 0x1 || this.fragmentOpcode) return this.protocolError();
      if (!fin) {
        this.fragmentOpcode = opcode;
        this.fragments = [payload];
        continue;
      }
      this.message(payload);
    }
  }

  message(payload) {
    let message;
    try { message = JSON.parse(payload.toString('utf8')); } catch { return this.protocolError(); }
    this.relay.handle(this, message);
  }
}

class LocalRelay {
  constructor({clientToken, expertToken}) {
    this.clientToken = clientToken;
    this.expertToken = expertToken;
    this.clients = new Set();
    this.allowedOrigin = '';
    this.allowedHost = '';
  }

  upgrade(request, socket) {
    const remote = String(socket.remoteAddress || '');
    const key = String(request.headers['sec-websocket-key'] || '');
    const connection = String(request.headers.connection || '').toLowerCase().split(',').map((value) => value.trim());
    let validKey = false;
    try { validKey = /^[A-Za-z0-9+/]{22}==$/.test(key) && Buffer.from(key, 'base64').length === 16; } catch {}
    if (
      request.url !== '/ws'
      || (remote !== '127.0.0.1' && remote !== '::ffff:127.0.0.1')
      || request.headers.host !== this.allowedHost
      || request.headers.origin !== this.allowedOrigin
      || String(request.headers.upgrade || '').toLowerCase() !== 'websocket'
      || !connection.includes('upgrade')
      || String(request.headers['sec-websocket-version'] || '') !== '13'
      || !validKey
    ) {
      socket.destroy();
      return;
    }
    const accept = crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n',
    ].join('\r\n'));
    socket.setNoDelay(true);
    this.clients.add(new LocalWsClient(socket, this));
  }

  handle(client, message) {
    const type = String(message?.type || '');
    if (type === 'auth') {
      if (message.token === this.clientToken) client.role = 'client';
      else if (message.token === this.expertToken) client.role = 'expert';
      else return client.send({type:'error',code:'phase7_auth_rejected'});
      client.send({type:'authed',role:client.role});
      return;
    }
    if (!client.role) return client.send({type:'error',code:'phase7_auth_required'});
    if (type === 'join' || type === 'join_session') {
      const sid = String(message.session_id || message.sessionId || '');
      if (!sid) return;
      client.joined.add(sid);
      client.send({type:type === 'join' ? 'joined' : 'session_joined',session_id:sid,session:{id:sid,status:'active',channel:'voice'}});
      return;
    }
    if (type === 'session_subscribe') {
      const sid = String(message.session_id || '');
      if (!sid) return;
      client.subscriptions.add(sid);
      client.send({type:'session_subscribed',session_id:sid,subscribed:true,history:[]});
      return;
    }
    if (type.startsWith('rtc_')) {
      const sid = String(message.session_id || message.sessionId || '');
      if (!sid || !client.joined.has(sid)) return;
      client.signalTypes.add(type);
      if (type === 'rtc_ice' && /\btyp relay\b/i.test(String(message.candidate?.candidate || message.candidate || ''))) client.relayCandidates += 1;
      for (const peer of this.clients) {
        if (peer !== client && peer.role && peer.joined.has(sid)) {
          peer.deliveredTypes.set(type, Number(peer.deliveredTypes.get(type) || 0) + 1);
          peer.send(message);
        }
      }
    }
  }

  inject(message) {
    for (const client of this.clients) client.send(message);
  }

  summary() {
    const live = [...this.clients].filter((client) => !client.closed);
    return {
      connections:live.length,
      roles:live.map((client) => client.role).sort(),
      relayCandidates:Object.fromEntries(live.map((client) => [client.role, client.relayCandidates])),
      subscriptions:Object.fromEntries(live.map((client) => [client.role, client.subscriptions.size])),
      signals:Object.fromEntries(live.map((client) => [client.role, [...client.signalTypes].sort()])),
      deliveries:Object.fromEntries(live.map((client) => [client.role, Object.fromEntries(client.deliveredTypes)])),
    };
  }

  closeAll() {
    for (const client of [...this.clients]) client.close();
  }
}

function localCsp(port) {
  return `default-src 'self' blob: data:; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' ws://127.0.0.1:${port}`;
}

async function startLocalApp({turn, username, credential}) {
  const relay = new LocalRelay({clientToken:SYNTHETIC_CLIENT_TOKEN,expertToken:SYNTHETIC_EXPERT_TOKEN});
  const sourceHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  const sfuClientSource = readSfuClientSource();
  let sfuAssetRequests = 0;
  const phase7Page = `<!doctype html><html><head><meta charset="utf-8"><script id="${GUARD_ID}">${guardSource(sourceHtml)}</script></head><body><div id="rtc-status"></div><div id="expert-rtc-area"><video id="expert-rtc-local-video" autoplay muted playsinline></video><video id="expert-rtc-remote-video" autoplay playsinline></video></div><video id="rtc-local-video" autoplay muted playsinline></video><video id="rtc-remote-video" autoplay playsinline></video><script>${rtcRuntimeSource(sourceHtml)}</script><script src="/assets/sfu-client.js"></script></body></html>`;
  const server = http.createServer((request, response) => {
    const remote = String(request.socket.remoteAddress || '');
    const address = server.address();
    const expectedHost = address && typeof address === 'object' ? `127.0.0.1:${address.port}` : '';
    if (
      (remote !== '127.0.0.1' && remote !== '::ffff:127.0.0.1')
      || request.headers.host !== expectedHost
      || request.method !== 'GET'
    ) {
      response.writeHead(403, {'Content-Type':'application/json'}).end('{"error":"loopback_required"}');
      return;
    }
    const parsed = new URL(request.url || '/', 'http://127.0.0.1');
    const headers = {
      'Cache-Control':'no-store',
      'Cross-Origin-Opener-Policy':'same-origin',
      'Permissions-Policy':'camera=(self), microphone=(self)',
      'Referrer-Policy':'no-referrer',
      'X-Content-Type-Options':'nosniff',
    };
    if (parsed.pathname === '/api/config') {
      const rtc = turn ? {
        ice_servers:[{urls:`turn:127.0.0.1:${turn.port}?transport=udp`,username,credential}],
        connection_timeout_ms:16000,
        reconnect_grace_ms:5000,
        failure_grace_ms:3000,
        billing_stable_ms:250,
      } : {
        ice_servers:[],
        connection_timeout_ms:12000,
        reconnect_grace_ms:4000,
        failure_grace_ms:2500,
        billing_stable_ms:250,
      };
      response.writeHead(200, {...headers,'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify({rtc,plans:{},default_rates:{}}));
      return;
    }
    if (parsed.pathname.startsWith('/api/')) {
      response.writeHead(404, {...headers,'Content-Type':'application/json; charset=utf-8'}).end('{"success":false,"error":"phase7_local_unimplemented"}');
      return;
    }
    if (parsed.pathname === '/phase7-browser-rtc') {
      response.writeHead(200, {...headers,'Content-Security-Policy':localCsp(server.address().port),'Content-Type':'text/html; charset=utf-8'}).end(phase7Page);
      return;
    }
    if (parsed.pathname === '/assets/sfu-client.js') {
      sfuAssetRequests += 1;
      response.writeHead(200, {...headers,'Content-Security-Policy':localCsp(server.address().port),'Content-Type':'text/javascript; charset=utf-8'}).end(sfuClientSource);
      return;
    }
    response.writeHead(404, {...headers,'Content-Type':'text/plain; charset=utf-8'}).end('not found');
  });
  server.on('upgrade', (request, socket) => relay.upgrade(request, socket));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  relay.allowedHost = `127.0.0.1:${port}`;
  relay.allowedOrigin = `http://${relay.allowedHost}`;
  return {server,relay,port,sfuAssetRequests:() => sfuAssetRequests};
}

async function waitUntil(predicate, {timeoutMs = 10000, intervalMs = 50, code = 'wait_timeout'} = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  fail(code);
}

function pageErrorCategory(error) {
  const message = String(error?.message || '');
  if (message.includes('OWNLYBIZ_PHASE7_LOOPBACK_BLOCKED')) return 'loopback_guard_rejection';
  if (/phase7_local_unimplemented|Request failed|HTTP 404/i.test(message)) return 'local_api_stub_rejection';
  if (/Failed to fetch|NetworkError/i.test(message)) return 'network_rejection';
  if (/Cannot redefine property/i.test(message)) return 'endpoint_pin_rejection';
  return 'other';
}

function addPageError(target, error) {
  const category = pageErrorCategory(error);
  target[category] = Number(target[category] || 0) + 1;
}

function pageErrorSummary(byRole) {
  const categories = {};
  for (const roleCounts of Object.values(byRole)) {
    for (const [category, count] of Object.entries(roleCounts)) categories[category] = Number(categories[category] || 0) + Number(count || 0);
  }
  return {total:Object.values(categories).reduce((sum, count) => sum + count, 0),categories};
}

async function loadPlaywright(dir) {
  const module = await import(pathToFileURL(path.join(dir, 'index.mjs')).href);
  if (!module.chromium) fail('playwright_chromium_unavailable');
  return module;
}

function attachNetworkGuard(context, evidence, allowedPort) {
  return context.route('**/*', async (route) => {
    let allowed = false;
    try {
      const parsed = new URL(route.request().url());
      allowed = (parsed.protocol === 'http:' || parsed.protocol === 'ws:')
        && parsed.hostname === '127.0.0.1'
        && parsed.port === String(allowedPort);
    } catch {}
    if (!allowed) {
      evidence.externalRequests += 1;
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
}

async function preparePage(page, token) {
  await page.waitForFunction(() => !!(
    window.OB_RTC?.__obSfuPatched
    && window.OB_RTC?.__obPeerRtc
    && window.ExpertSfuClient?.installOneToOneRtcPatch
    && window.__OB_PHASE7_LOOPBACK__?.active
  ), null, {timeout:20000});
  return page.evaluate((syntheticToken) => {
    const patchInstalled = window.ExpertSfuClient.installOneToOneRtcPatch() === true;
    const peerRtc = window.OB_RTC?.__obPeerRtc;
    if (!patchInstalled || !peerRtc || typeof peerRtc.start !== 'function') throw new Error('phase7_sfu_patch_unavailable');
    window.__phase7SfuPeerFallbackStarts = 0;
    const peerStart = peerRtc.start;
    peerRtc.start = function phase7ObservedPeerStart(){
      window.__phase7SfuPeerFallbackStarts += 1;
      return peerStart.apply(this, arguments);
    };
    for (const name of ['_obClientWs','_expertWs','_obWs']) {
      const socket = window[name];
      try { if (socket && socket.readyState <= 1) socket.close(1000); } catch {}
      window[name] = null;
    }
    window._obExpertRealtime = null;
    window.obIsMiniSuiteRoute = function(){ return false; };
    window.OB_CLIENT_CONTEXT = null;
    window.__phase7RtcReceived = {};
    const originalRtcHandler = window._handleRTCMessage;
    window._handleRTCMessage = function(message){
      const type = String(message?.type || '');
      window.__phase7RtcReceived[type] = Number(window.__phase7RtcReceived[type] || 0) + 1;
      return originalRtcHandler.call(window, message);
    };
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('ob_t', syntheticToken);
    window.ExpertSfuClient.refreshConfig();
    let message = '';
    try { new WebSocket('wss://phase7-blocked.invalid/socket'); } catch(error) { message = String(error?.message || ''); }
    return {
      guard:window.__OB_PHASE7_LOOPBACK__.snapshot(),
      rejection:message,
      token:sessionStorage.getItem('ob_t'),
      sfu:{asset_loaded:true,patch_installed:patchInstalled,peer_fallback_available:!!peerRtc},
    };
  }, token);
}

async function installCanonicalSocket(page, role, sessionId) {
  return page.evaluate(({roleName,sid}) => new Promise((resolve, reject) => {
    const token = sessionStorage.getItem('ob_t') || '';
    const socket = new WebSocket(`${window.OWNLYBIZ_WS_URL}/ws`);
    const timer = setTimeout(() => { try { socket.close(1000); } catch {} reject(new Error('phase7_canonical_socket_timeout')); }, 5000);
    let joined = false;
    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'authed') {
        socket.send(JSON.stringify({type:'join',session_id:sid}));
        socket.send(JSON.stringify({type:'join_session',sessionId:sid}));
        return;
      }
      if ((message.type === 'joined' || message.type === 'session_joined') && !joined) {
        joined = true;
        clearTimeout(timer);
        resolve(true);
        return;
      }
      if (String(message.type || '').startsWith('rtc_') && typeof window._handleRTCMessage === 'function') window._handleRTCMessage(message);
    });
    socket.addEventListener('error', () => { if (!joined) { clearTimeout(timer); reject(new Error('phase7_canonical_socket_error')); } });
    socket.addEventListener('open', () => socket.send(JSON.stringify({type:'auth',token})));
    if (roleName === 'expert') {
      window._expertWs = socket;
      window._obExpertRealtime = {
        rtcSessionId:sid,
        principalKey:'phase7-synthetic-expert',
        principalGeneration:1,
        isExpertIdentity:function(){ return true; },
        checkIdentity:function(){ return true; },
        setRtcSession:function(nextSid){ this.rtcSessionId = String(nextSid || ''); },
        whenOpen:function(callback){ if (socket.readyState === WebSocket.OPEN) callback(socket); else socket.addEventListener('open', () => callback(socket), {once:true}); },
        ingest:function(){},
      };
    } else {
      window._obClientWs = socket;
    }
  }), {roleName:role,sid:sessionId});
}

async function startRtc(page, role, sessionId) {
  const result = await page.evaluate(async ({roleName,sid}) => ({
    started:await window.OB_RTC.start(sid, 'voice', roleName),
    patched:window.OB_RTC?.__obSfuPatched === true,
    peer_fallback_starts:Number(window.__phase7SfuPeerFallbackStarts || 0),
  }), {roleName:role,sid:sessionId});
  assert.equal(result.started, true, 'rtc start failed');
  assert.equal(result.patched, true, 'sfu rtc patch missing');
  assert.equal(result.peer_fallback_starts, 1, 'sfu peer fallback path not exercised');
  return result;
}

async function subscribeOnRtcSocket(page, sessionIds, role) {
  return page.evaluate(({ids,roleName}) => new Promise((resolve, reject) => {
    const socket = roleName === 'expert' ? window._expertWs : window._obClientWs;
    if (!socket || socket.readyState !== WebSocket.OPEN) return reject(new Error('phase7_socket_not_open'));
    const pending = new Set(ids);
    const timer = setTimeout(() => { socket.removeEventListener('message', onMessage); reject(new Error('phase7_subscribe_timeout')); }, 5000);
    function onMessage(event) {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.type !== 'session_subscribed') return;
      pending.delete(String(data.session_id || ''));
      if (!pending.size) {
        clearTimeout(timer);
        socket.removeEventListener('message', onMessage);
        resolve(ids.length);
      }
    }
    socket.addEventListener('message', onMessage);
    ids.forEach((sid) => socket.send(JSON.stringify({type:'session_subscribe',session_id:sid})));
  }), {ids:sessionIds,roleName:role});
}

async function rtcStats(page) {
  return page.evaluate(async () => {
    const peers = window.__OB_PHASE7_LOOPBACK__.peerConnections();
    const pc = peers[peers.length - 1];
    if (!pc) return null;
    const report = await pc.getStats();
    let pair = null;
    const audio = {outboundPackets:0,outboundBytes:0,inboundPackets:0,inboundBytes:0};
    for (const item of report.values()) {
      if (item.type === 'transport' && item.selectedCandidatePairId) pair = report.get(item.selectedCandidatePairId) || pair;
      if (item.type === 'candidate-pair' && item.state === 'succeeded' && item.nominated) pair = pair || item;
      const kind = String(item.kind || item.mediaType || '');
      if (item.type === 'outbound-rtp' && kind === 'audio' && item.isRemote !== true) {
        audio.outboundPackets += Number(item.packetsSent || 0);
        audio.outboundBytes += Number(item.bytesSent || 0);
      }
      if (item.type === 'inbound-rtp' && kind === 'audio' && item.isRemote !== true) {
        audio.inboundPackets += Number(item.packetsReceived || 0);
        audio.inboundBytes += Number(item.bytesReceived || 0);
      }
    }
    if (!pair) return null;
    const local = report.get(pair.localCandidateId);
    const remote = report.get(pair.remoteCandidateId);
    return {
      connectionState:pc.connectionState,
      localType:local?.candidateType || '',
      remoteType:remote?.candidateType || '',
      audio,
    };
  });
}

function audioRtpDelta(before, after) {
  if (!before?.audio || !after?.audio) return null;
  return {
    outboundPackets:Math.max(0, after.audio.outboundPackets - before.audio.outboundPackets),
    outboundBytes:Math.max(0, after.audio.outboundBytes - before.audio.outboundBytes),
    inboundPackets:Math.max(0, after.audio.inboundPackets - before.audio.inboundPackets),
    inboundBytes:Math.max(0, after.audio.inboundBytes - before.audio.inboundBytes),
  };
}

function positiveAudioRtpDelta(delta) {
  return !!delta
    && delta.outboundPackets > 0
    && delta.outboundBytes > 0
    && delta.inboundPackets > 0
    && delta.inboundBytes > 0;
}

async function cleanupPage(page) {
  return page.evaluate(async () => {
    try { window.ExpertSfuClient?.close(); } catch {}
    try { window.OB_RTC?.cleanup(); } catch {}
    const sockets = [];
    for (const name of ['_obClientWs','_expertWs','_obWs']) {
      const socket = window[name];
      if (socket && !sockets.includes(socket)) sockets.push(socket);
      window[name] = null;
    }
    for (const socket of sockets) {
      try { if (socket.readyState <= 1) socket.close(1000); } catch {}
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    const peers = window.__OB_PHASE7_LOOPBACK__?.peerConnections() || [];
    return {
      active:!!window.OB_RTC?.isActive(),
      openSockets:sockets.filter((socket) => socket.readyState < WebSocket.CLOSING).length,
      openPeers:peers.filter((peer) => peer.connectionState !== 'closed').length,
      attachedMedia:[...document.querySelectorAll('audio,video')].filter((node) => !!node.srcObject).length,
    };
  });
}

async function runBrowser({hostOnly = false} = {}) {
  verificationStage = 'browser_dependencies';
  ensureNode20();
  const dependencies = dependencyState({hostOnly});
  if (!dependencies.ready) {
    output({
      status:'BLOCKED_INFRASTRUCTURE',
      phase:'phase7_browser_rtc',
      mode:hostOnly ? 'host_only_contract' : 'turn_relay_contract',
      checks:{node20:dependencies.node20,system_chrome:dependencies.chrome,playwright:dependencies.playwright,sfu_client_asset:dependencies.sfuClient,coturn:dependencies.coturn},
    });
    process.exitCode = 2;
    return;
  }

  const scratch = makeScratch();
  let turnChild = null;
  let app = null;
  let browser = null;
  let clientContext = null;
  let expertContext = null;
  let scratchRemoved = false;
  let turnStopped = hostOnly;
  let appClosed = false;
  const networkEvidence = {externalRequests:0};
  try {
    verificationStage = 'browser_dependency_load';
    const playwright = await loadPlaywright(dependencies.paths.playwrightDir);
    let turn = null;
    const turnUsername = 'phase7-browser';
    const turnCredential = crypto.randomBytes(24).toString('base64url');
    if (!hostOnly) {
      verificationStage = 'turn_start';
      const turnPort = await reserveDualPort();
      const relayRange = await reserveUdpRange(24, turnPort);
      turnChild = await startTurn({bin:dependencies.paths.coturn,scratch,port:turnPort,range:relayRange,username:turnUsername,credential:turnCredential});
      turn = {port:turnPort};
    }
    verificationStage = 'local_app_start';
    app = await startLocalApp({turn,username:turnUsername,credential:turnCredential});
    verificationStage = 'browser_launch';
    browser = await playwright.chromium.launch({
      executablePath:dependencies.paths.chrome,
      headless:true,
      args:[
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    });
    const contextOptions = {serviceWorkers:'block',permissions:['microphone']};
    clientContext = await browser.newContext(contextOptions);
    expertContext = await browser.newContext(contextOptions);
    await Promise.all([
      attachNetworkGuard(clientContext, networkEvidence, app.port),
      attachNetworkGuard(expertContext, networkEvidence, app.port),
    ]);
    await Promise.all([
      clientContext.addInitScript(() => { window.__OB_TEST_HOOKS__ = {}; }),
      expertContext.addInitScript(() => { window.__OB_TEST_HOOKS__ = {}; }),
    ]);
    const clientPage = await clientContext.newPage();
    const expertPage = await expertContext.newPage();
    const pageErrors = {client:{},expert:{}};
    clientPage.on('pageerror', (error) => addPageError(pageErrors.client, error));
    expertPage.on('pageerror', (error) => addPageError(pageErrors.expert, error));
    const query = new URLSearchParams({[CONFIRM_KEY]:CONFIRM_VALUE});
    if (turn) {
      query.set(TURN_KEY, TURN_VALUE);
      query.set(TURN_PORT_KEY, String(turn.port));
    }
    verificationStage = 'browser_navigation';
    const localUrl = `http://127.0.0.1:${app.port}/phase7-browser-rtc?${query}`;
    await Promise.all([
      clientPage.goto(localUrl, {waitUntil:'domcontentloaded',timeout:30000}),
      expertPage.goto(localUrl, {waitUntil:'domcontentloaded',timeout:30000}),
    ]);
    verificationStage = 'browser_guard_preparation';
    const [clientPrepared, expertPrepared] = await Promise.all([
      preparePage(clientPage, SYNTHETIC_CLIENT_TOKEN),
      preparePage(expertPage, SYNTHETIC_EXPERT_TOKEN),
    ]);
    assert.equal(clientPrepared.guard.mode, hostOnly ? 'host_only' : 'turn_relay');
    assert.equal(expertPrepared.guard.mode, hostOnly ? 'host_only' : 'turn_relay');
    assert.equal(clientPrepared.rejection, 'OWNLYBIZ_PHASE7_LOOPBACK_BLOCKED');
    assert.equal(expertPrepared.rejection, 'OWNLYBIZ_PHASE7_LOOPBACK_BLOCKED');
    assert.equal(clientPrepared.token, SYNTHETIC_CLIENT_TOKEN);
    assert.equal(expertPrepared.token, SYNTHETIC_EXPERT_TOKEN);
    assert.deepEqual(clientPrepared.sfu, {asset_loaded:true,patch_installed:true,peer_fallback_available:true});
    assert.deepEqual(expertPrepared.sfu, {asset_loaded:true,patch_installed:true,peer_fallback_available:true});
    assert.equal(app.sfuAssetRequests(), 2, 'sfu asset must load in both isolated contexts');

    verificationStage = 'rtc_start';
    const rtcSession = 'phase7-rtc-session';
    await Promise.all([
      installCanonicalSocket(clientPage, 'client', rtcSession),
      installCanonicalSocket(expertPage, 'expert', rtcSession),
    ]);
    const expertSfuStart = await startRtc(expertPage, 'expert', rtcSession);
    const clientSfuStart = await startRtc(clientPage, 'client', rtcSession);
    verificationStage = 'rtc_connected';
    try {
      await Promise.all([
        clientPage.waitForFunction(() => {
          const health = window.OB_RTC?.getMediaHealth?.();
          return health?.connection_state === 'connected' && health?.remote_seen === true;
        }, null, {timeout:25000}),
        expertPage.waitForFunction(() => {
          const health = window.OB_RTC?.getMediaHealth?.();
          return health?.connection_state === 'connected' && health?.remote_seen === true;
        }, null, {timeout:25000}),
      ]);
    } catch(error) {
      const safeHealth = (page) => page.evaluate(() => {
        const health = window.OB_RTC?.getMediaHealth?.() || {};
        return {active:!!health.active,connection_state:String(health.connection_state || ''),ice_connection_state:String(health.ice_connection_state || ''),remote_seen:!!health.remote_seen};
      }).catch(() => ({active:false,connection_state:'unavailable',ice_connection_state:'unavailable',remote_seen:false}));
      const summary = app.relay.summary();
      verificationDiagnostic = {
        connections:summary.connections,
        roles:summary.roles,
        signals:summary.signals,
        deliveries:summary.deliveries,
        relay_candidates:summary.relayCandidates,
        health:await Promise.all([safeHealth(clientPage),safeHealth(expertPage)]),
        handler_receipts:await Promise.all([
          clientPage.evaluate(() => Object.assign({}, window.__phase7RtcReceived || {})).catch(() => ({})),
          expertPage.evaluate(() => Object.assign({}, window.__phase7RtcReceived || {})).catch(() => ({})),
        ]),
        page_errors:pageErrorSummary(pageErrors),
      };
      throw error;
    }

    const rtpBaseline = await Promise.all([rtcStats(clientPage),rtcStats(expertPage)]);
    assert(rtpBaseline.every(Boolean), 'rtp baseline unavailable');
    verificationStage = 'synthetic_subscription_contract';
    const subscriptionIds = ['phase7-chat-one','phase7-chat-two'];
    await Promise.all([
      subscribeOnRtcSocket(clientPage, subscriptionIds, 'client'),
      subscribeOnRtcSocket(expertPage, subscriptionIds, 'expert'),
    ]);
    verificationStage = 'decoy_isolation';
    app.relay.inject({type:'rtc_offer',session_id:'phase7-decoy-session',sdp:'phase7-decoy-sdp'});
    app.relay.inject({type:'rtc_end',session_id:'phase7-decoy-session',ended_by:'system'});
    await new Promise((resolve) => setTimeout(resolve, 300));
    const afterDecoy = await Promise.all([rtcStats(clientPage),rtcStats(expertPage)]);
    assert(afterDecoy.every((item) => item?.connectionState === 'connected'), 'decoy isolation failed');
    assert.equal(await clientPage.evaluate(() => window.OB_RTC.getSid()), rtcSession);
    assert.equal(await expertPage.evaluate(() => window.OB_RTC.getSid()), rtcSession);

    verificationStage = hostOnly ? 'host_rtc_contract_evidence' : 'turn_relay_contract_evidence';
    let finalStats = null;
    let finalRtpDeltas = null;
    await waitUntil(async () => {
      const summary = app.relay.summary();
      if (summary.connections !== 2) return false;
      if (summary.subscriptions.client !== 2 || summary.subscriptions.expert !== 2) return false;
      finalStats = await Promise.all([rtcStats(clientPage),rtcStats(expertPage)]);
      finalRtpDeltas = finalStats.map((item, index) => audioRtpDelta(rtpBaseline[index], item));
      const connected = finalStats.every((item) => item?.connectionState === 'connected');
      const candidateTypes = hostOnly
        ? finalStats.every((item) => item?.localType === 'host' && item?.remoteType === 'host')
        : finalStats.every((item) => item?.localType === 'relay' && item?.remoteType === 'relay');
      const relayCandidates = hostOnly
        || (summary.relayCandidates.client > 0 && summary.relayCandidates.expert > 0);
      return connected && candidateTypes && relayCandidates && finalRtpDeltas.every(positiveAudioRtpDelta);
    }, {timeoutMs:15000,code:hostOnly?'host_rtc_evidence_timeout':'turn_relay_evidence_timeout'});

    verificationStage = 'rtc_evidence_assertions';
    const relaySummary = app.relay.summary();
    const finalPageErrors = pageErrorSummary(pageErrors);
    assert.deepEqual(relaySummary.roles, ['client','expert']);
    assert.equal(networkEvidence.externalRequests, 0);
    assert.equal(finalPageErrors.total, 0, 'browser runtime errors detected');
    assert(relaySummary.signals.client.includes('rtc_offer'));
    assert(relaySummary.signals.expert.includes('rtc_answer'));
    assert(finalStats.every((item) => item.localType === (hostOnly ? 'host' : 'relay') && item.remoteType === (hostOnly ? 'host' : 'relay')));
    assert(finalRtpDeltas.every(positiveAudioRtpDelta));
    assert(afterDecoy.every(Boolean));
    assert(expertSfuStart.patched && clientSfuStart.patched);
    assert.equal(expertSfuStart.peer_fallback_starts, 1);
    assert.equal(clientSfuStart.peer_fallback_starts, 1);

    verificationStage = 'browser_cleanup';
    const cleanup = await Promise.all([cleanupPage(clientPage),cleanupPage(expertPage)]);
    assert(cleanup.every((item) => !item.active && item.openSockets === 0 && item.openPeers === 0 && item.attachedMedia === 0));
    await waitUntil(() => app.relay.summary().connections === 0, {timeoutMs:5000,code:'websocket_cleanup_timeout'});
    await clientContext.close(); clientContext = null;
    await expertContext.close(); expertContext = null;
    await browser.close(); browser = null;
    app.relay.closeAll();
    await closeNetServer(app.server); appClosed = true;
    turnStopped = await stopChild(turnChild); turnChild = null;
    cleanupScratch(scratch); scratchRemoved = true;

    output({
      status:'PASS_CONTRACT_ONLY',
      phase:'phase7_browser_rtc',
      mode:hostOnly ? 'host_only_contract' : 'turn_relay_contract',
      invocation:hostOnly ? CLI_USAGE.host_only_contract : CLI_USAGE.browser_contract,
      browser:{system_chrome:true,isolated_contexts:2,fake_media:true,page_errors:finalPageErrors},
      network:{loopback_only:true,app_transport:'http_ws',external_requests:0,websocket_connections:2},
      sfu_client:{asset_loaded:true,isolated_context_loads:2,production_patch_installed:true,peer_fallback_exercised:true},
      rtc:{connected_peers:2,relay_candidates:hostOnly ? null : {client:relaySummary.relayCandidates.client,expert:relaySummary.relayCandidates.expert},selected_pair:hostOnly ? 'host' : 'relay',audio_rtp_packet_byte_deltas_positive:finalRtpDeltas.every(positiveAudioRtpDelta)},
      synthetic_signaling:{subscriptions_per_connection:2,same_synthetic_socket:true,decoy_session_isolated:true},
      cleanup:{rtc_inactive:true,websockets_closed:true,http_closed:appClosed,turn_stopped:turnStopped,scratch_removed:scratchRemoved},
      limitations:[
        'synthetic_relay','http_ws_only','no_reconnect','no_real_chat','not_phase7_closure',
        hostOnly ? 'turn_not_exercised' : 'loopback_turn_only',
      ],
    });
  } finally {
    try { if (clientContext) await clientContext.close(); } catch {}
    try { if (expertContext) await expertContext.close(); } catch {}
    try { if (browser) await browser.close(); } catch {}
    try { if (app) { app.relay.closeAll(); await closeNetServer(app.server); } } catch {}
    try { if (turnChild) await stopChild(turnChild); } catch {}
    try { if (!scratchRemoved && fs.existsSync(scratch)) cleanupScratch(scratch); } catch {}
  }
}

try {
  const mode = parseMode(process.argv.slice(2));
  if (mode === CLI_USAGE.contract) runContract();
  else if (mode === CLI_USAGE.preflight) runPreflight();
  else await runBrowser({hostOnly:mode === CLI_USAGE.host_only_contract});
} catch(error) {
  const code = error?.code && error.code !== 'ERR_ASSERTION' ? error.code : verificationStage;
  const failure = {status:'FAIL',phase:'phase7_browser_rtc',code:String(code).replace(/[^a-z0-9_]/gi,'_').toLowerCase()};
  if (verificationStage === 'argument_validation') failure.invocations = CLI_USAGE;
  if (verificationDiagnostic) failure.diagnostic = verificationDiagnostic;
  output(failure);
  process.exitCode = 1;
}
