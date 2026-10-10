"use client"

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { togglePlatformSuspension, grantFreeMonths, updateTenantFeatureFlag, triggerStripeReconciliation, addSupportNote } from "@/actions/admin";

export function ImpersonateButton({ userId, tenantId, label }: { userId: string, tenantId: string, label: string }) {
  const { update } = useSession();
  const router = useRouter();

  const handleImpersonate = async () => {
    if (confirm(`Are you sure you want to impersonate ${label}?`)) {
      await update({ impersonate: { userId, tenantId } });
      toast.success("Impersonation started");
      router.push("/dashboard");
    }
  };

  return (
    <button onClick={handleImpersonate} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
      Impersonate {label}
    </button>
  );
}

export function SuspendTenantButton({ tenantId, isSuspended }: { tenantId: string, isSuspended: boolean }) {
  const [reason, setReason] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = async () => {
    if (isSuspended) {
      if (confirm("Remove platform suspension?")) {
        await togglePlatformSuspension(tenantId, null);
        toast.success("Suspension removed");
      }
    } else {
      setIsOpen(true);
    }
  };

  const handleConfirmSuspend = async () => {
    if (confirm("Are you absolutely sure you want to operationally suspend this tenant?")) {
      await togglePlatformSuspension(tenantId, reason || "No reason provided");
      toast.success("Tenant suspended");
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <button 
        onClick={handleToggle} 
        className={`px-3 py-1 rounded text-sm ${isSuspended ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
      >
        {isSuspended ? "Reactivate Tenant" : "Suspend Tenant"}
      </button>

      {isOpen && !isSuspended && (
        <div className="mt-2 space-y-2">
          <input 
            type="text" 
            placeholder="Suspension Reason (internal)" 
            value={reason} 
            onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-sm text-white"
          />
          <button onClick={handleConfirmSuspend} className="px-3 py-1 bg-red-600 text-white rounded text-sm">
            Confirm Suspension
          </button>
        </div>
      )}
    </div>
  );
}

export function FreeMonthsForm({ tenantId }: { tenantId: string }) {
  const [months, setMonths] = useState(1);
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm(`Grant ${months} free month(s) to this tenant?`)) {
      await grantFreeMonths(tenantId, months, reason || "Support extension");
      toast.success("Free months granted");
      setReason("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input 
          type="number" 
          min={1}
          max={12}
          value={months} 
          onChange={e => setMonths(parseInt(e.target.value))}
          className="w-20 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-sm text-white"
        />
        <input 
          type="text" 
          placeholder="Reason (internal)" 
          value={reason} 
          onChange={e => setReason(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-sm text-white"
        />
      </div>
      <button type="submit" className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">
        Grant Extension
      </button>
    </form>
  );
}

export function FeatureFlagToggle({ tenantId, flagName, isEnabled, globalDefault }: { tenantId: string, flagName: string, isEnabled: boolean | null, globalDefault: boolean }) {
  const effective = isEnabled !== null ? isEnabled : globalDefault;
  
  const handleToggle = async () => {
    if (confirm(`Change feature flag ${flagName} to ${!effective}?`)) {
      await updateTenantFeatureFlag(tenantId, flagName, !effective);
      toast.success("Flag updated");
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded">
      <div>
        <div className="font-medium text-sm">{flagName}</div>
        <div className="text-xs text-neutral-500">
          Global default: {globalDefault ? 'ON' : 'OFF'} | Override: {isEnabled === null ? 'NONE' : (isEnabled ? 'ON' : 'OFF')}
        </div>
      </div>
      <button 
        onClick={handleToggle}
        className={`px-3 py-1 rounded text-sm ${effective ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-300'}`}
      >
        {effective ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  );
}

export function SupportNoteForm({ tenantId }: { tenantId: string }) {
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      await addSupportNote(tenantId, content);
      setContent("");
      toast.success("Note added");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <textarea 
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Add internal support note..."
        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white min-h-[100px]"
      />
      <button type="submit" className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-sm">
        Add Note
      </button>
    </form>
  );
}

export function ReconcileButton({ tenantId }: { tenantId: string }) {
  const handleReconcile = async () => {
    if (confirm("Reconcile Stripe subscription status?")) {
      try {
        await triggerStripeReconciliation(tenantId);
        toast.success("Reconciled successfully");
      } catch (err: any) {
        toast.error(err.message || "Failed to reconcile");
      }
    }
  };

  return (
    <button onClick={handleReconcile} className="px-3 py-1 bg-neutral-800 border border-neutral-700 text-white rounded text-sm hover:bg-neutral-700">
      Reconcile Stripe
    </button>
  );
}
