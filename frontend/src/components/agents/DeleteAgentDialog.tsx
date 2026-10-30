import React from 'react';
import { Agent } from '../../types/index';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface DeleteAgentDialogProps {
  agent: Agent;
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteAgentDialog({ agent, isOpen, onConfirm, onCancel }: DeleteAgentDialogProps): React.ReactElement {
  // ConfirmDialog expects a sync () => void callback; we fire the async
  // operation and let the caller handle loading/error state.
  const handleConfirm = () => { void onConfirm(); };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Delete Agent"
      description={`Are you sure you want to delete "${agent.name}"? This will also delete all associated tasks and cannot be undone.`}
      confirmLabel="Delete Agent"
      onConfirm={handleConfirm}
      onCancel={onCancel}
    />
  );
}

export default DeleteAgentDialog;
