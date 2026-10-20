import { spawn } from 'node:child_process';

const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

console.log('');
console.log(`[db:migrate] Token de reinicio: ${token}`);
console.log('[db:migrate] Deten tu "expo start" actual (este comando arranca su propio servidor).');
console.log('[db:migrate] Abre la app en Expo Go escaneando el QR de ESTE servidor.');
console.log('[db:migrate] La base de datos se reiniciara una sola vez y correran las migraciones.');
console.log('[db:migrate] Cuando termine, puedes detener con Ctrl+C y usar "pnpm start" normal.');
console.log('');

const expoBin = process.platform === 'win32' ? 'expo.cmd' : 'expo';

const child = spawn(expoBin, ['start', '-c'], {
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_DB_RESET: token },
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
