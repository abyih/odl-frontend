import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import type { Flow } from '@/types/odl';

interface FlowFormProps {
  nodeId: string;
  tableId: number;
  onSubmit: (flowData: { flowId: string; flowData: Partial<Flow> }) => Promise<void>;
  isSubmitting?: boolean;
}

export function FlowForm({ nodeId, tableId, onSubmit, isSubmitting }: FlowFormProps) {
  const [open, setOpen] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [priority, setPriority] = useState('100');
  const [inPort, setInPort] = useState('');
  const [ethType, setEthType] = useState('');
  const [ipv4Src, setIpv4Src] = useState('');
  const [ipv4Dst, setIpv4Dst] = useState('');
  const [actionType, setActionType] = useState<string>('output');
  const [outputPort, setOutputPort] = useState('');
  const [idleTimeout, setIdleTimeout] = useState('0');
  const [hardTimeout, setHardTimeout] = useState('0');

  const resetForm = () => {
    setFlowName('');
    setPriority('100');
    setInPort('');
    setEthType('');
    setIpv4Src('');
    setIpv4Dst('');
    setActionType('output');
    setOutputPort('');
    setIdleTimeout('0');
    setHardTimeout('0');
  };

  const handleSubmit = async () => {
    const flowId = flowName || `flow-${Date.now()}`;

    const match: Flow['match'] = {};
    if (inPort) match['in-port'] = `${nodeId}:${inPort}`;
    if (ethType) {
      match['ethernet-match'] = {
        'ethernet-type': { type: parseInt(ethType) },
      };
    }
    if (ipv4Src) match['ipv4-source'] = ipv4Src;
    if (ipv4Dst) match['ipv4-destination'] = ipv4Dst;

    const flowData: Partial<Flow> = {
      'flow-name': flowName || flowId,
      priority: parseInt(priority),
      match,
      'idle-timeout': parseInt(idleTimeout),
      'hard-timeout': parseInt(hardTimeout),
      instructions: {
        instruction: [{
          order: 0,
          'apply-actions': {
            action: actionType === 'output'
              ? [{ order: 0, 'output-action': { 'output-node-connector': outputPort || 'NORMAL', 'max-length': 65535 } }]
              : [{ order: 0, 'drop-action': {} }],
          },
        }],
      },
    };

    await onSubmit({ flowId, flowData });
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="h-4 w-4" />
        Add Flow
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add New Flow</DialogTitle>
          <DialogDescription>
            Create a new OpenFlow entry on <span className="font-mono text-foreground">{nodeId}</span> table {tableId}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flow-name">Flow Name</Label>
              <Input
                id="flow-name"
                placeholder="my-flow-rule"
                value={flowName}
                onChange={e => setFlowName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="65535"
                value={priority}
                onChange={e => setPriority(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Match Criteria</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="in-port">In Port</Label>
                <Input
                  id="in-port"
                  placeholder="1"
                  value={inPort}
                  onChange={e => setInPort(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eth-type">Ethernet Type</Label>
                <Input
                  id="eth-type"
                  placeholder="0x0800 (IPv4)"
                  value={ethType}
                  onChange={e => setEthType(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv4-src">IPv4 Source</Label>
                <Input
                  id="ipv4-src"
                  placeholder="10.0.0.0/24"
                  value={ipv4Src}
                  onChange={e => setIpv4Src(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipv4-dst">IPv4 Destination</Label>
                <Input
                  id="ipv4-dst"
                  placeholder="10.0.0.0/24"
                  value={ipv4Dst}
                  onChange={e => setIpv4Dst(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Actions</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={actionType} onValueChange={(v) => { if (v) setActionType(v); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="output">Output</SelectItem>
                    <SelectItem value="drop">Drop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {actionType === 'output' && (
                <div className="space-y-2">
                  <Label htmlFor="output-port">Output Port</Label>
                  <Input
                    id="output-port"
                    placeholder="NORMAL, ALL, or port #"
                    value={outputPort}
                    onChange={e => setOutputPort(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="idle-timeout">Idle Timeout (s)</Label>
              <Input
                id="idle-timeout"
                type="number"
                min="0"
                value={idleTimeout}
                onChange={e => setIdleTimeout(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hard-timeout">Hard Timeout (s)</Label>
              <Input
                id="hard-timeout"
                type="number"
                min="0"
                value={hardTimeout}
                onChange={e => setHardTimeout(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Install Flow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
