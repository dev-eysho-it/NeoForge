
export interface Plugin {
  name: string;
  description: string;
  status: 'Active' | 'Idle' | 'Maintenance' | 'Offline';
  version: string;
  icon: string;
}
