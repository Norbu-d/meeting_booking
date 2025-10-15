import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export async function getMAC() {
  try {
    // Windows
    const { stdout } = await execAsync('getmac /FO CSV /NH');
    return stdout.split(',')[0]?.replace(/"/g, '').trim();
    
    // Linux alternative:
    // const { stdout } = await execAsync("cat /sys/class/net/$(ip route show default | awk '/default/ {print $5}')/address");
    // return stdout.trim();
  } catch (err) {
    console.error('MAC detection failed:', err);
    return null;
  }
}