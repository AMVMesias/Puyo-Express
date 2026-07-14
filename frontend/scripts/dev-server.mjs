import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let dockerIsRunning = false;

try {
  const response = await fetch('http://127.0.0.1:8088/', {
    signal: AbortSignal.timeout(1500),
  });
  if (response.ok) {
    dockerIsRunning = true;
    console.log('Puyo Express ya está ejecutándose con Docker en http://127.0.0.1:8088');
  }
} catch {
  // Docker is not serving the app, so local development may start.
}

if (!dockerIsRunning) {
  const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
  const child = spawn(process.execPath, [vite, '--port=3000', '--host=127.0.0.1'], {
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
}
