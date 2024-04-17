export enum ResourceType {
  DEFAULT = 'default',
  CHECKPOINT = 'Checkpoint',
  CONTROLNET = 'ControlNet',
  UPSCALER = 'Upscaler',
  HYPERNETWORK = 'Hypernetwork',
  TEXTUAL_INVERSION = 'Embeddings',
  LORA = 'Lora',
  LO_CON = 'LoCon',
  VAE = 'VAE',
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  KICKED = 'kicked',
}

export enum ActivityType {
  Downloaded = 'downloaded',
  Deleted = 'deleted',
  Cancelled = 'cancelled',
  Downloading = 'downloading',
  ADDED_VAULT = 'added vault',
  REMOVED_VAULT = 'removed vault',
}
